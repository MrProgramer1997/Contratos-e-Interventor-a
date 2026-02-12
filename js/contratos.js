// /js/contratos.js
import { $, toast, setLoading, safeText, fmtDate, statusBadge, qsParam } from "./ui.js";

/* =========================
   LISTADO
========================= */

function rowTemplate(c) {
  const servicio = safeText(c.servicios_requeridos).slice(0, 60);
  return `
    <tr>
      <td>${c.codigo ?? ""}</td>
      <td>${fmtDate(c.fecha_solicitud) || ""}</td>
      <td>${safeText(c.area_solicitante)}</td>
      <td title="${safeText(c.servicios_requeridos)}">${servicio}${safeText(c.servicios_requeridos).length > 60 ? "…" : ""}</td>
      <td>${statusBadge(c.estado)}</td>
      <td>${c.interventoria_obligatoria ? "Sí" : "No"}</td>
      <td><a class="btn secondary" href="./contrato_detalle.html?id=${c.id}">Abrir</a></td>
    </tr>
  `;
}

async function fetchContratos() {
  const { data, error } = await supabaseClient
    .from("contratos")
    .select("id,codigo,fecha_solicitud,area_solicitante,servicios_requeridos,estado,interventoria_obligatoria")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function applyFilters(all) {
  const q = safeText($("#q").value).toLowerCase().trim();
  const estado = safeText($("#fEstado").value).trim();

  return all.filter(c => {
    const hayQ =
      !q ||
      safeText(c.codigo).toLowerCase().includes(q) ||
      safeText(c.area_solicitante).toLowerCase().includes(q) ||
      safeText(c.servicios_requeridos).toLowerCase().includes(q);

    const hayEstado = !estado || safeText(c.estado) === estado;
    return hayQ && hayEstado;
  });
}

function readFormNew(profile) {
  const honorarios_tipo = $("#honorarios_tipo").value;
  return {
    fecha_solicitud: $("#fecha_solicitud").value || null,
    fecha_recepcion: $("#fecha_recepcion").value || null,

    servicios_requeridos: $("#servicios_requeridos").value || null,
    area_solicitante: $("#area_solicitante").value || (profile.area || null),
    motivo_solicitud: $("#motivo_solicitud").value || null,

    honorarios_tipo: honorarios_tipo || null,
    honorarios_otro: honorarios_tipo === "otro" ? ($("#honorarios_otro").value || null) : null,
    honorarios_valor: $("#honorarios_valor").value ? Number($("#honorarios_valor").value) : null,
    forma_pago: $("#forma_pago").value || null,
    duracion: $("#duracion").value || null,
    fecha_inicio: $("#fecha_inicio").value || null,
    fecha_fin: $("#fecha_fin").value || null,

    objeto_contrato: $("#objeto_contrato").value || null,
    obligaciones_contratista: $("#obligaciones_contratista").value || null,

    afecta_socio: $("#afecta_socio").checked,
    mayor_10m_anual: $("#mayor_10m_anual").checked,
    concesion_espacio: $("#concesion_espacio").checked,

    doc_propuesta: $("#doc_propuesta").checked,
    doc_rut: $("#doc_rut").checked,
    doc_camara: $("#doc_camara").checked,
    doc_cert_bancaria: $("#doc_cert_bancaria").checked,
    doc_seg_social: $("#doc_seg_social").checked,
    doc_hoja_vida: $("#doc_hoja_vida").checked,
    doc_otro: $("#doc_otro").checked,
    doc_otro_cual: $("#doc_otro").checked ? ($("#doc_otro_cual").value || null) : null,

    solicitante_id: profile.id,
    estado: "RADICADO"
  };
}

function validateNew(payload) {
  if (!payload.fecha_solicitud) return "La fecha de solicitud es obligatoria.";
  if (!payload.servicios_requeridos) return "Servicios requeridos es obligatorio.";
  if (!payload.area_solicitante) return "Área solicitante es obligatoria.";
  if (!payload.motivo_solicitud) return "Motivo de solicitud es obligatorio.";
  if (!payload.honorarios_tipo) return "Tipo honorarios es obligatorio.";
  if (payload.honorarios_tipo === "otro" && !payload.honorarios_otro) return "Especifica el tipo de honorarios (Otro).";
  return null;
}

export async function initContratosPage(profile) {
  let all = [];

  const panel = $("#panelNuevo");
  const btnNuevo = $("#btnNuevo");
  const btnCancelar = $("#btnCancelarNuevo");
  const btnGuardar = $("#btnGuardarNuevo");

  btnNuevo.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });
  btnCancelar.addEventListener("click", () => {
    panel.style.display = "none";
  });

  btnGuardar.addEventListener("click", async () => {
    try {
      setLoading(btnGuardar, true, "Guardando...");
      const payload = readFormNew(profile);
      const err = validateNew(payload);
      if (err) return toast(err, "error");

      const { data: ab, error: e1 } = await supabaseClient
        .from("profiles").select("id").eq("email", "asuntoslegales@campestrepereira.com").maybeSingle();
      if (e1) throw e1;

      const { data: rep, error: e2 } = await supabaseClient
        .from("profiles").select("id").eq("email", "gerencia@campestrepereira.com").maybeSingle();
      if (e2) throw e2;

      payload.abogado_asignado_id = ab?.id ?? null;
      payload.representante_asignado_id = rep?.id ?? null;

      const { data, error } = await supabaseClient
        .from("contratos")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;

      toast("Contrato radicado correctamente.", "success");
      panel.style.display = "none";
      window.location.href = `./contrato_detalle.html?id=${data.id}`;
    } catch (e) {
      toast(e.message || "Error guardando contrato.", "error");
    } finally {
      setLoading(btnGuardar, false);
    }
  });

  async function render() {
    const filtered = applyFilters(all);
    $("#rows").innerHTML = filtered.map(rowTemplate).join("") || `
      <tr><td colspan="7" class="small">No hay registros para mostrar.</td></tr>
    `;
  }

  $("#q").addEventListener("input", render);
  $("#fEstado").addEventListener("change", render);

  try {
    all = await fetchContratos();
    await render();
  } catch (e) {
    toast(e.message || "No se pudieron cargar contratos.", "error");
  }
}

/* =========================
   DETALLE
========================= */

async function loadContrato(id) {
  const { data, error } = await supabaseClient
    .from("contratos")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function getInterventoriaByContrato(contratoId) {
  const { data, error } = await supabaseClient
    .from("interventorias")
    .select("id,codigo,estado,contrato_id")
    .eq("contrato_id", contratoId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function createInterventoriaFromContrato(profile, contrato) {
  // Se crea BORRADOR y vinculada al contrato (manual guiada)
  const payload = {
    contrato_id: contrato.id,
    nombre_contratista: null,
    nombre_interventor: null,
    cargo_interventor: null,
    fecha_informe: null,
    tipo_contrato: null,
    estado: "BORRADOR",
    creado_por: profile.id
  };

  const { data, error } = await supabaseClient
    .from("interventorias")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function loadAdjuntosContrato(id) {
  const { data, error } = await supabaseClient
    .from("adjuntos")
    .select("*")
    .eq("tipo", "contrato")
    .eq("ref_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function loadHistorial(tipo, refId) {
  const { data, error } = await supabaseClient
    .from("historial_estados")
    .select("*")
    .eq("tipo", tipo)
    .eq("ref_id", refId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function fillForm(c) {
  $("#codigo").textContent = c.codigo ?? "—";
  $("#estadoBadge").innerHTML = statusBadge(c.estado);
  $("#meta").textContent = `Creado: ${new Date(c.created_at).toLocaleString("es-CO")}`;

  $("#fecha_solicitud").value = c.fecha_solicitud || "";
  $("#fecha_recepcion").value = c.fecha_recepcion || "";
  $("#servicios_requeridos").value = c.servicios_requeridos || "";
  $("#area_solicitante").value = c.area_solicitante || "";
  $("#motivo_solicitud").value = c.motivo_solicitud || "";

  $("#honorarios_tipo").value = c.honorarios_tipo || "";
  $("#honorarios_otro").value = c.honorarios_otro || "";
  $("#honorarios_valor").value = c.honorarios_valor ?? "";
  $("#forma_pago").value = c.forma_pago || "";
  $("#duracion").value = c.duracion || "";
  $("#fecha_inicio").value = c.fecha_inicio || "";
  $("#fecha_fin").value = c.fecha_fin || "";

  $("#afecta_socio").checked = !!c.afecta_socio;
  $("#mayor_10m_anual").checked = !!c.mayor_10m_anual;
  $("#concesion_espacio").checked = !!c.concesion_espacio;
  $("#interventoria_obligatoria").value = c.interventoria_obligatoria ? "Sí" : "No";

  $("#doc_propuesta").checked = !!c.doc_propuesta;
  $("#doc_rut").checked = !!c.doc_rut;
  $("#doc_camara").checked = !!c.doc_camara;
  $("#doc_cert_bancaria").checked = !!c.doc_cert_bancaria;
  $("#doc_seg_social").checked = !!c.doc_seg_social;
  $("#doc_hoja_vida").checked = !!c.doc_hoja_vida;
  $("#doc_otro").checked = !!c.doc_otro;
  $("#doc_otro_cual").value = c.doc_otro_cual || "";

  $("#objeto_contrato").value = c.objeto_contrato || "";
  $("#obligaciones_contratista").value = c.obligaciones_contratista || "";
}

function getUpdatePayload() {
  const honorarios_tipo = $("#honorarios_tipo").value || null;
  return {
    fecha_solicitud: $("#fecha_solicitud").value || null,
    fecha_recepcion: $("#fecha_recepcion").value || null,
    servicios_requeridos: $("#servicios_requeridos").value || null,
    area_solicitante: $("#area_solicitante").value || null,
    motivo_solicitud: $("#motivo_solicitud").value || null,

    honorarios_tipo,
    honorarios_otro: honorarios_tipo === "otro" ? ($("#honorarios_otro").value || null) : null,
    honorarios_valor: $("#honorarios_valor").value ? Number($("#honorarios_valor").value) : null,
    forma_pago: $("#forma_pago").value || null,
    duracion: $("#duracion").value || null,
    fecha_inicio: $("#fecha_inicio").value || null,
    fecha_fin: $("#fecha_fin").value || null,

    objeto_contrato: $("#objeto_contrato").value || null,
    obligaciones_contratista: $("#obligaciones_contratista").value || null,

    afecta_socio: $("#afecta_socio").checked,
    mayor_10m_anual: $("#mayor_10m_anual").checked,
    concesion_espacio: $("#concesion_espacio").checked,

    doc_propuesta: $("#doc_propuesta").checked,
    doc_rut: $("#doc_rut").checked,
    doc_camara: $("#doc_camara").checked,
    doc_cert_bancaria: $("#doc_cert_bancaria").checked,
    doc_seg_social: $("#doc_seg_social").checked,
    doc_hoja_vida: $("#doc_hoja_vida").checked,
    doc_otro: $("#doc_otro").checked,
    doc_otro_cual: $("#doc_otro").checked ? ($("#doc_otro_cual").value || null) : null,
  };
}

function canShowActions(profile, contrato) {
  const isOwner = profile.id === contrato.solicitante_id;

  $("#btnEnviarJuridica").style.display =
    (isOwner && (contrato.estado === "RADICADO" || contrato.estado === "BORRADOR")) ? "block" : "none";

  $("#btnAprobarJuridico").style.display =
    (profile.rol === "abogado" && contrato.estado === "EN_REVISION_JURIDICA") ? "block" : "none";
  $("#btnRechazarJuridico").style.display =
    (profile.rol === "abogado" && contrato.estado === "EN_REVISION_JURIDICA") ? "block" : "none";

  $("#btnAceptar").style.display =
    (profile.rol === "representante" && contrato.estado === "PENDIENTE_ACEPTACION") ? "block" : "none";
  $("#btnRechazar").style.display =
    (profile.rol === "representante" && contrato.estado === "PENDIENTE_ACEPTACION") ? "block" : "none";
}

async function addHist(tipo, refId, prev, next, comentario, profileId) {
  const { error } = await supabaseClient.from("historial_estados").insert([{
    tipo,
    ref_id: refId,
    estado_anterior: prev,
    estado_nuevo: next,
    comentario: comentario || null,
    cambiado_por: profileId
  }]);
  if (error) throw error;
}

function renderHist(items) {
  if (!items.length) return "<div class='small'>Sin movimientos aún.</div>";
  return items.map(i => {
    const when = new Date(i.created_at).toLocaleString("es-CO");
    const cmt = safeText(i.comentario);
    return `<div class="card" style="margin-top:10px;">
      <div><b>${safeText(i.estado_anterior || "—")} → ${safeText(i.estado_nuevo || "—")}</b></div>
      <div class="small">${when}</div>
      ${cmt ? `<div style="margin-top:6px;">${cmt}</div>` : ""}
    </div>`;
  }).join("");
}

function renderAdjRows(rows) {
  if (!rows.length) return `<tr><td colspan="3" class="small">Sin adjuntos.</td></tr>`;
  return rows.map(r => `
    <tr>
      <td>${safeText(r.nombre_archivo)}</td>
      <td>${new Date(r.created_at).toLocaleString("es-CO")}</td>
      <td><button class="btn secondary" data-path="${r.storage_path}">Descargar</button></td>
    </tr>
  `).join("");
}

async function downloadFromStorage(path) {
  const { data, error } = await supabaseClient.storage
    .from("documentos-contratos")
    .createSignedUrl(path, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

async function setupInterventoriaGuided(profile, contrato) {
  const box = $("#ivBox");
  const btnCrear = $("#btnCrearInterventoria");
  const btnAbrir = $("#btnAbrirInterventoria");

  if (!contrato.interventoria_obligatoria) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  const existing = await getInterventoriaByContrato(contrato.id);
  if (existing) {
    btnCrear.style.display = "none";
    btnAbrir.style.display = "inline-block";
    btnAbrir.href = `./interventoria_detalle.html?id=${existing.id}`;
    return;
  }

  btnAbrir.style.display = "none";
  btnCrear.style.display = "inline-block";

  btnCrear.onclick = async () => {
    try {
      setLoading(btnCrear, true, "Creando...");
      const created = await createInterventoriaFromContrato(profile, contrato);
      toast("Interventoría creada en BORRADOR.", "success");
      window.location.href = `./interventoria_detalle.html?id=${created.id}`;
    } catch (e) {
      toast(e.message || "No se pudo crear interventoría.", "error");
    } finally {
      setLoading(btnCrear, false);
    }
  };
}

export async function initContratoDetalle(profile) {
  const id = qsParam("id");
  if (!id) {
    toast("Falta id del contrato.", "error");
    window.location.href = "./contratos.html";
    return;
  }

  const btnGuardar = $("#btnGuardar");
  const btnSubir = $("#btnSubir");
  const btnRefresh = $("#btnRefresh");

  let contrato = null;

  async function refreshAll() {
    contrato = await loadContrato(id);
    fillForm(contrato);

    await setupInterventoriaGuided(profile, contrato);

    canShowActions(profile, contrato);

    const adj = await loadAdjuntosContrato(id);
    $("#adjRows").innerHTML = renderAdjRows(adj);
    $("#adjRows").querySelectorAll("button[data-path]").forEach(b => {
      b.addEventListener("click", async () => {
        try { await downloadFromStorage(b.dataset.path); }
        catch (e) { toast(e.message || "No se pudo descargar.", "error"); }
      });
    });

    const hist = await loadHistorial("contrato", id);
    $("#hist").innerHTML = renderHist(hist);

    $("#estadoBadge").innerHTML = statusBadge(contrato.estado);
    $("#codigo").textContent = contrato.codigo ?? "—";
  }

  btnRefresh.addEventListener("click", async () => {
    try { await refreshAll(); toast("Actualizado.", "success"); }
    catch (e) { toast(e.message || "Error actualizando.", "error"); }
  });

  btnGuardar.addEventListener("click", async () => {
    try {
      setLoading(btnGuardar, true, "Guardando...");
      const payload = getUpdatePayload();

      const { error } = await supabaseClient
        .from("contratos")
        .update(payload)
        .eq("id", id);

      if (error) throw error;
      toast("Cambios guardados.", "success");
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudieron guardar cambios.", "error");
    } finally {
      setLoading(btnGuardar, false);
    }
  });

  btnSubir.addEventListener("click", async () => {
    try {
      setLoading(btnSubir, true, "Subiendo...");
      const file = $("#file").files?.[0];
      if (!file) return toast("Selecciona un archivo.", "error");

      const baseName = $("#file_name").value?.trim() || file.name;
      const safeName = baseName.replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_");
      const storagePath = `contratos/${id}/${Date.now()}_${safeName}`;

      const up = await supabaseClient.storage
        .from("documentos-contratos")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (up.error) throw up.error;

      const { error } = await supabaseClient.from("adjuntos").insert([{
        tipo: "contrato",
        ref_id: id,
        nombre_archivo: safeName,
        storage_path: storagePath,
        mime_type: file.type || null,
        size_bytes: file.size || null,
        subido_por: profile.id
      }]);
      if (error) throw error;

      $("#file").value = "";
      $("#file_name").value = "";
      toast("Adjunto cargado.", "success");
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo subir adjunto.", "error");
    } finally {
      setLoading(btnSubir, false);
    }
  });

  // Estados
 $("#btnEnviarJuridica").addEventListener("click", async () => {
  try {
    const comentario = $("#comentario").value || null;
    const prev = contrato.estado;
    const next = "EN_REVISION_JURIDICA";

    const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
    if (error) throw error;

    await addHist("contrato", id, prev, next, comentario, profile.id);
    toast("Enviado a revisión jurídica.", "success");
    $("#comentario").value = "";
    await refreshAll();
  } catch (e) {
    toast(e.message || "No se pudo cambiar estado.", "error");
  }
});


  $("#btnAprobarJuridico").addEventListener("click", async () => {
    try {
      const comentario = $("#comentario").value || null;
      const prev = contrato.estado;
      const next = "PENDIENTE_ACEPTACION";

      const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
      if (error) throw error;

      await addHist("contrato", id, prev, next, comentario, profile.id);
      toast("Aprobado jurídico. Pendiente aceptación.", "success");
      $("#comentario").value = "";
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo aprobar.", "error");
    }
  });

  $("#btnRechazarJuridico").addEventListener("click", async () => {
    try {
      const comentario = $("#comentario").value || null;
      const prev = contrato.estado;
      const next = "RECHAZADO_JURIDICO";

      const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
      if (error) throw error;

      await addHist("contrato", id, prev, next, comentario, profile.id);
      toast("Rechazado por jurídica.", "success");
      $("#comentario").value = "";
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo rechazar.", "error");
    }
  });

  $("#btnAceptar").addEventListener("click", async () => {
    try {
      const comentario = $("#comentario").value || null;
      const prev = contrato.estado;
      const next = "ACEPTADO";

      const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
      if (error) throw error;

      await addHist("contrato", id, prev, next, comentario, profile.id);
      toast("Contrato aceptado.", "success");
      $("#comentario").value = "";
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo aceptar.", "error");
    }
  });

  $("#btnRechazar").addEventListener("click", async () => {
    try {
      const comentario = $("#comentario").value || null;
      const prev = contrato.estado;
      const next = "RECHAZADO";

      const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
      if (error) throw error;

      await addHist("contrato", id, prev, next, comentario, profile.id);
      toast("Contrato rechazado.", "success");
      $("#comentario").value = "";
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo rechazar.", "error");
    }
  });

  try {
    await refreshAll();
  } catch (e) {
    toast(e.message || "No se pudo cargar el contrato.", "error");
  }
}
