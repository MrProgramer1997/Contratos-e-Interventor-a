// /js/contratos.js
import { $, toast, setLoading, safeText, fmtDate, statusBadge, qsParam } from "./ui.js";

/* =========================
   DETALLE (lo necesario aquí)
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

/* =========================
   ✅ Upload por tipo de documento (Parte 5)
========================= */

const DOC_MAP = {
  doc_propuesta: { label: "Propuesta comercial", fileId: "file_doc_propuesta", btnId: "btn_doc_propuesta", linkId: "link_doc_propuesta" },
  doc_rut: { label: "RUT", fileId: "file_doc_rut", btnId: "btn_doc_rut", linkId: "link_doc_rut" },
  doc_camara: { label: "Cámara de Comercio", fileId: "file_doc_camara", btnId: "btn_doc_camara", linkId: "link_doc_camara" },
  doc_cert_bancaria: { label: "Certificación bancaria", fileId: "file_doc_cert_bancaria", btnId: "btn_doc_cert_bancaria", linkId: "link_doc_cert_bancaria" },
  doc_seg_social: { label: "Seguridad social", fileId: "file_doc_seg_social", btnId: "btn_doc_seg_social", linkId: "link_doc_seg_social" },
  doc_hoja_vida: { label: "Hoja de vida", fileId: "file_doc_hoja_vida", btnId: "btn_doc_hoja_vida", linkId: "link_doc_hoja_vida" },
  doc_otro: { label: "Otro", fileId: "file_doc_otro", btnId: "btn_doc_otro", linkId: "link_doc_otro" },
};

function safeName(name) {
  return (name || "archivo").replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_");
}

function docKeyToTag(docKey) {
  // Ej: doc_rut -> RUT
  return docKey.replace("doc_", "").toUpperCase();
}

function setDocLink(docKey, adjunto) {
  const linkBox = $(DOC_MAP[docKey].linkId);
  if (!adjunto) {
    linkBox.innerHTML = `<span class="small">Sin archivo adjunto.</span>`;
    return;
  }
  linkBox.innerHTML = `
    <span class="small">
      Adjuntado: <b>${safeText(adjunto.nombre_archivo)}</b>
      <button class="btn secondary" data-path="${adjunto.storage_path}" type="button" style="margin-left:10px;">Descargar</button>
    </span>
  `;
  linkBox.querySelector("button[data-path]")?.addEventListener("click", async () => {
    try { await downloadFromStorage(adjunto.storage_path); }
    catch (e) { toast(e.message || "No se pudo descargar.", "error"); }
  });
}

function pickDocAdjunto(adjs, docKey) {
  const tag = `[${docKeyToTag(docKey)}]`;
  // Tomamos el más reciente que tenga ese tag en el nombre
  return (adjs || []).find(a => (a.nombre_archivo || "").startsWith(tag)) || null;
}

async function uploadDocAdjunto({ contratoId, profileId, docKey }) {
  const info = DOC_MAP[docKey];
  const input = $(info.fileId);
  const file = input.files?.[0];
  if (!file) throw new Error("Selecciona un archivo.");

  const tag = docKeyToTag(docKey);
  const baseName =
    docKey === "doc_otro"
      ? ( ($("#doc_otro_cual").value || "").trim() || "OTRO" )
      : tag;

  const finalName = safeName(`[${tag}] ${baseName} - ${file.name}`);
  const storagePath = `contratos/${contratoId}/anexos/${tag}/${Date.now()}_${safeName(file.name)}`;

  // 1) Subir a Storage
  const up = await supabaseClient.storage
    .from("documentos-contratos")
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (up.error) throw up.error;

  // 2) Registrar en tabla adjuntos
  const { error } = await supabaseClient.from("adjuntos").insert([{
    tipo: "contrato",
    ref_id: contratoId,
    nombre_archivo: finalName,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    subido_por: profileId
  }]);

  if (error) throw error;

  // limpiar input
  input.value = "";
}

/* =========================
   Interventoría guiada (sin cambios)
========================= */

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

/* =========================
   INIT DETALLE
========================= */

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
  let adjuntos = [];

  // bind botones de Parte 5
  Object.keys(DOC_MAP).forEach(docKey => {
    const btn = $(DOC_MAP[docKey].btnId);
    btn.addEventListener("click", async () => {
      try {
        if (!$("#" + docKey).checked) {
          return toast("Primero marca la casilla del documento.", "error");
        }
        setLoading(btn, true, "Adjuntando...");
        await uploadDocAdjunto({ contratoId: id, profileId: profile.id, docKey });
        toast("Documento adjuntado.", "success");
        await refreshAll();
      } catch (e) {
        console.error("DOC UPLOAD ERROR:", e);
        toast(e?.message || "No se pudo adjuntar.", "error");
      } finally {
        setLoading(btn, false);
      }
    });
  });

  async function refreshAll() {
    contrato = await loadContrato(id);
    fillForm(contrato);

    await setupInterventoriaGuided(profile, contrato);

    adjuntos = await loadAdjuntosContrato(id);

    // Adjuntos generales
    $("#adjRows").innerHTML = renderAdjRows(adjuntos);
    $("#adjRows").querySelectorAll("button[data-path]").forEach(b => {
      b.addEventListener("click", async () => {
        try { await downloadFromStorage(b.dataset.path); }
        catch (e) { toast(e.message || "No se pudo descargar.", "error"); }
      });
    });

    // Links por documento (Parte 5)
    Object.keys(DOC_MAP).forEach(docKey => {
      const a = pickDocAdjunto(adjuntos, docKey);
      setDocLink(docKey, a);
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

  // Upload general
  btnSubir.addEventListener("click", async () => {
    try {
      setLoading(btnSubir, true, "Subiendo...");
      const file = $("#file").files?.[0];
      if (!file) return toast("Selecciona un archivo.", "error");

      const baseName = $("#file_name").value?.trim() || file.name;
      const finalName = safeName(baseName);
      const storagePath = `contratos/${id}/${Date.now()}_${safeName(file.name)}`;

      const up = await supabaseClient.storage
        .from("documentos-contratos")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (up.error) throw up.error;

      const { error } = await supabaseClient.from("adjuntos").insert([{
        tipo: "contrato",
        ref_id: id,
        nombre_archivo: finalName,
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
      console.error("UPLOAD ERROR:", e);
      toast(e?.message || "No se pudo subir adjunto.", "error");
    } finally {
      setLoading(btnSubir, false);
    }
  });

  // ✅ Asegura que los botones de estados no revienten si no existen en esta versión
  const btnEnviarJuridica = document.getElementById("btnEnviarJuridica");
  if (btnEnviarJuridica) {
    btnEnviarJuridica.addEventListener("click", async () => {
      try {
        const comentario = $("#comentario").value || null;
        const prev = contrato.estado;
        const next = "EN_REVISION_JURIDICA";

        const { error } = await supabaseClient.from("contratos").update({ estado: next }).eq("id", id);
        if (error) throw error;

        const { error: hErr } = await supabaseClient.from("historial_estados").insert([{
          tipo: "contrato",
          ref_id: id,
          estado_anterior: prev,
          estado_nuevo: next,
          comentario,
          cambiado_por: profile.id
        }]);
        if (hErr) throw hErr;

        toast("Enviado a revisión jurídica.", "success");
        $("#comentario").value = "";
        await refreshAll();
      } catch (e) {
        toast(e.message || "No se pudo cambiar estado.", "error");
      }
    });
  }

  // Aquí podrías dejar los demás handlers de estado como ya los tenías…

  try {
    await refreshAll();
  } catch (e) {
    toast(e.message || "No se pudo cargar el contrato.", "error");
  }
}

/* ======================================================
   COMPATIBILIDAD LISTADO (contratos.html)
   ====================================================== */

export async function initContratosPage(profile) {

  console.log("initContratosPage cargado correctamente");
  console.log("Perfil:", profile);

  // Mostrar botón Nuevo contrato solo a director o admin
  const btnNuevo =
    document.getElementById("btnNuevoContrato") ||
    document.getElementById("btnNuevo");

  if (btnNuevo) {
    const puedeCrear = ["director", "admin"].includes(profile?.rol);

    btnNuevo.style.display = puedeCrear ? "inline-block" : "none";

    btnNuevo.addEventListener("click", () => {
      window.location.href = "./contrato_detalle.html";
    });
  }

  // Aquí puedes luego colocar la carga de la tabla
  // Por ahora evitamos que la página se rompa
}
