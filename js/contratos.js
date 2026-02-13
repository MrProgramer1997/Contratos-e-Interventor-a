// /js/contratos.js
import { $, toast, setLoading, safeText, fmtDate, statusBadge, qsParam } from "./ui.js";

/* ======================================================
   HELPERS
====================================================== */

function safeName(name) {
  return (name || "archivo").replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_");
}

async function getAuthId() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  const authId = data?.user?.id;
  if (!authId) throw new Error("Sesión no válida.");
  return authId;
}

/* ======================================================
   DETALLE: LOADERS
====================================================== */

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

/* ======================================================
   DETALLE: RENDER
====================================================== */

function fillForm(c) {
  if ($("#codigo")) $("#codigo").textContent = c.codigo ?? "—";
  if ($("#estadoBadge")) $("#estadoBadge").innerHTML = statusBadge(c.estado);
  if ($("#meta")) $("#meta").textContent = `Creado: ${new Date(c.created_at).toLocaleString("es-CO")}`;

  if ($("#fecha_solicitud")) $("#fecha_solicitud").value = c.fecha_solicitud || "";
  if ($("#fecha_recepcion")) $("#fecha_recepcion").value = c.fecha_recepcion || "";
  if ($("#servicios_requeridos")) $("#servicios_requeridos").value = c.servicios_requeridos || "";
  if ($("#area_solicitante")) $("#area_solicitante").value = c.area_solicitante || "";
  if ($("#motivo_solicitud")) $("#motivo_solicitud").value = c.motivo_solicitud || "";

  if ($("#honorarios_tipo")) $("#honorarios_tipo").value = c.honorarios_tipo || "";
  if ($("#honorarios_otro")) $("#honorarios_otro").value = c.honorarios_otro || "";
  if ($("#honorarios_valor")) $("#honorarios_valor").value = c.honorarios_valor ?? "";
  if ($("#forma_pago")) $("#forma_pago").value = c.forma_pago || "";
  if ($("#duracion")) $("#duracion").value = c.duracion || "";
  if ($("#fecha_inicio")) $("#fecha_inicio").value = c.fecha_inicio || "";
  if ($("#fecha_fin")) $("#fecha_fin").value = c.fecha_fin || "";

  if ($("#afecta_socio")) $("#afecta_socio").checked = !!c.afecta_socio;
  if ($("#mayor_10m_anual")) $("#mayor_10m_anual").checked = !!c.mayor_10m_anual;
  if ($("#concesion_espacio")) $("#concesion_espacio").checked = !!c.concesion_espacio;
  if ($("#interventoria_obligatoria")) $("#interventoria_obligatoria").value = c.interventoria_obligatoria ? "Sí" : "No";

  if ($("#doc_propuesta")) $("#doc_propuesta").checked = !!c.doc_propuesta;
  if ($("#doc_rut")) $("#doc_rut").checked = !!c.doc_rut;
  if ($("#doc_camara")) $("#doc_camara").checked = !!c.doc_camara;
  if ($("#doc_cert_bancaria")) $("#doc_cert_bancaria").checked = !!c.doc_cert_bancaria;
  if ($("#doc_seg_social")) $("#doc_seg_social").checked = !!c.doc_seg_social;
  if ($("#doc_hoja_vida")) $("#doc_hoja_vida").checked = !!c.doc_hoja_vida;
  if ($("#doc_otro")) $("#doc_otro").checked = !!c.doc_otro;
  if ($("#doc_otro_cual")) $("#doc_otro_cual").value = c.doc_otro_cual || "";

  if ($("#objeto_contrato")) $("#objeto_contrato").value = c.objeto_contrato || "";
  if ($("#obligaciones_contratista")) $("#obligaciones_contratista").value = c.obligaciones_contratista || "";
}

function getUpdatePayload() {
  const honorarios_tipo = $("#honorarios_tipo") ? $("#honorarios_tipo").value : null;

  return {
    fecha_solicitud: $("#fecha_solicitud")?.value || null,
    fecha_recepcion: $("#fecha_recepcion")?.value || null,
    servicios_requeridos: $("#servicios_requeridos")?.value || null,
    area_solicitante: $("#area_solicitante")?.value || null,
    motivo_solicitud: $("#motivo_solicitud")?.value || null,

    honorarios_tipo: honorarios_tipo || null,
    honorarios_otro: honorarios_tipo === "otro" ? ($("#honorarios_otro")?.value || null) : null,
    honorarios_valor: $("#honorarios_valor")?.value ? Number($("#honorarios_valor").value) : null,
    forma_pago: $("#forma_pago")?.value || null,
    duracion: $("#duracion")?.value || null,
    fecha_inicio: $("#fecha_inicio")?.value || null,
    fecha_fin: $("#fecha_fin")?.value || null,

    objeto_contrato: $("#objeto_contrato")?.value || null,
    obligaciones_contratista: $("#obligaciones_contratista")?.value || null,

    afecta_socio: !!$("#afecta_socio")?.checked,
    mayor_10m_anual: !!$("#mayor_10m_anual")?.checked,
    concesion_espacio: !!$("#concesion_espacio")?.checked,

    doc_propuesta: !!$("#doc_propuesta")?.checked,
    doc_rut: !!$("#doc_rut")?.checked,
    doc_camara: !!$("#doc_camara")?.checked,
    doc_cert_bancaria: !!$("#doc_cert_bancaria")?.checked,
    doc_seg_social: !!$("#doc_seg_social")?.checked,
    doc_hoja_vida: !!$("#doc_hoja_vida")?.checked,
    doc_otro: !!$("#doc_otro")?.checked,
    doc_otro_cual: $("#doc_otro")?.checked ? ($("#doc_otro_cual")?.value || null) : null,
  };
}

function renderHist(items) {
  if (!items.length) return "<div class='small'>Sin movimientos aún.</div>";
  return items
    .map(i => {
      const when = new Date(i.created_at).toLocaleString("es-CO");
      const cmt = safeText(i.comentario);
      return `<div class="card" style="margin-top:10px;">
        <div><b>${safeText(i.estado_anterior || "—")} → ${safeText(i.estado_nuevo || "—")}</b></div>
        <div class="small">${when}</div>
        ${cmt ? `<div style="margin-top:6px;">${cmt}</div>` : ""}
      </div>`;
    })
    .join("");
}

function renderAdjRows(rows) {
  if (!rows.length) return `<tr><td colspan="3" class="small">Sin adjuntos.</td></tr>`;
  return rows
    .map(r => `
      <tr>
        <td>${safeText(r.nombre_archivo)}</td>
        <td>${new Date(r.created_at).toLocaleString("es-CO")}</td>
        <td><button class="btn secondary" data-path="${r.storage_path}" type="button">Descargar</button></td>
      </tr>
    `)
    .join("");
}

async function downloadFromStorage(path) {
  const { data, error } = await supabaseClient.storage
    .from("documentos-contratos")
    .createSignedUrl(path, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

/* ======================================================
   ✅ Upload por tipo de documento (Parte 5)
====================================================== */

const DOC_MAP = {
  doc_propuesta: { label: "Propuesta comercial", fileId: "file_doc_propuesta", btnId: "btn_doc_propuesta", linkId: "link_doc_propuesta" },
  doc_rut: { label: "RUT", fileId: "file_doc_rut", btnId: "btn_doc_rut", linkId: "link_doc_rut" },
  doc_camara: { label: "Cámara de Comercio", fileId: "file_doc_camara", btnId: "btn_doc_camara", linkId: "link_doc_camara" },
  doc_cert_bancaria: { label: "Certificación bancaria", fileId: "file_doc_cert_bancaria", btnId: "btn_doc_cert_bancaria", linkId: "link_doc_cert_bancaria" },
  doc_seg_social: { label: "Seguridad social", fileId: "file_doc_seg_social", btnId: "btn_doc_seg_social", linkId: "link_doc_seg_social" },
  doc_hoja_vida: { label: "Hoja de vida", fileId: "file_doc_hoja_vida", btnId: "btn_doc_hoja_vida", linkId: "link_doc_hoja_vida" },
  doc_otro: { label: "Otro", fileId: "file_doc_otro", btnId: "btn_doc_otro", linkId: "link_doc_otro" },
};

function docKeyToTag(docKey) {
  return docKey.replace("doc_", "").toUpperCase();
}

function setDocLink(docKey, adjunto) {
  const elId = DOC_MAP[docKey].linkId;
  const linkBox = document.getElementById(elId);
  if (!linkBox) return;

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
  return (adjs || []).find(a => (a.nombre_archivo || "").startsWith(tag)) || null;
}

async function uploadDocAdjunto({ contratoId, profileId, docKey }) {
  const info = DOC_MAP[docKey];
  const input = document.getElementById(info.fileId);
  if (!input) throw new Error("No se encontró el input de archivo en el HTML.");
  const file = input.files?.[0];
  if (!file) throw new Error("Selecciona un archivo.");

  const tag = docKeyToTag(docKey);
  const baseName =
    docKey === "doc_otro"
      ? ((document.getElementById("doc_otro_cual")?.value || "").trim() || "OTRO")
      : tag;

  const finalName = safeName(`[${tag}] ${baseName} - ${file.name}`);
  const storagePath = `contratos/${contratoId}/anexos/${tag}/${Date.now()}_${safeName(file.name)}`;

  const up = await supabaseClient.storage
    .from("documentos-contratos")
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (up.error) throw up.error;

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

  input.value = "";
}

/* ======================================================
   Interventoría guiada
====================================================== */

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
    creado_por: profile?.id || null
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
  const box = document.getElementById("ivBox");
  const btnCrear = document.getElementById("btnCrearInterventoria");
  const btnAbrir = document.getElementById("btnAbrirInterventoria");

  if (!box || !btnCrear || !btnAbrir) return;

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

/* ======================================================
   INIT DETALLE (contrato_detalle.html)
====================================================== */

export async function initContratoDetalle(profile) {
  const id = qsParam("id");
  if (!id) {
    toast("Falta id del contrato.", "error");
    window.location.href = "./contratos.html";
    return;
  }

  const btnGuardar = document.getElementById("btnGuardar");
  const btnSubir = document.getElementById("btnSubir");
  const btnRefresh = document.getElementById("btnRefresh");

  let contrato = null;
  let adjuntos = [];

  // Bind botones de Parte 5 (si existen)
  Object.keys(DOC_MAP).forEach(docKey => {
    const btn = document.getElementById(DOC_MAP[docKey].btnId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        const chk = document.getElementById(docKey);
        if (!chk || !chk.checked) {
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
    const adjRows = document.getElementById("adjRows");
    if (adjRows) {
      adjRows.innerHTML = renderAdjRows(adjuntos);
      adjRows.querySelectorAll("button[data-path]").forEach(b => {
        b.addEventListener("click", async () => {
          try { await downloadFromStorage(b.dataset.path); }
          catch (e) { toast(e.message || "No se pudo descargar.", "error"); }
        });
      });
    }

    // Links por documento (Parte 5)
    Object.keys(DOC_MAP).forEach(docKey => {
      const a = pickDocAdjunto(adjuntos, docKey);
      setDocLink(docKey, a);
    });

    const hist = await loadHistorial("contrato", id);
    const histEl = document.getElementById("hist");
    if (histEl) histEl.innerHTML = renderHist(hist);

    if (document.getElementById("estadoBadge")) {
      document.getElementById("estadoBadge").innerHTML = statusBadge(contrato.estado);
    }
    if (document.getElementById("codigo")) {
      document.getElementById("codigo").textContent = contrato.codigo ?? "—";
    }
  }

  btnRefresh?.addEventListener("click", async () => {
    try { await refreshAll(); toast("Actualizado.", "success"); }
    catch (e) { toast(e.message || "Error actualizando.", "error"); }
  });

  btnGuardar?.addEventListener("click", async () => {
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
  btnSubir?.addEventListener("click", async () => {
    try {
      setLoading(btnSubir, true, "Subiendo...");

      const fileInput = document.getElementById("file");
      const file = fileInput?.files?.[0];
      if (!file) return toast("Selecciona un archivo.", "error");

      const baseName = document.getElementById("file_name")?.value?.trim() || file.name;
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

      if (fileInput) fileInput.value = "";
      const fn = document.getElementById("file_name");
      if (fn) fn.value = "";

      toast("Adjunto cargado.", "success");
      await refreshAll();
    } catch (e) {
      console.error("UPLOAD ERROR:", e);
      toast(e?.message || "No se pudo subir adjunto.", "error");
    } finally {
      setLoading(btnSubir, false);
    }
  });

  // Botón: Enviar a revisión jurídica (si existe)
  const btnEnviarJuridica = document.getElementById("btnEnviarJuridica");
  if (btnEnviarJuridica) {
    btnEnviarJuridica.addEventListener("click", async () => {
      try {
        const comentario = document.getElementById("comentario")?.value || null;
        const prev = contrato?.estado;
        const next = "EN_REVISION_JURIDICA";

        const { error } = await supabaseClient
          .from("contratos")
          .update({ estado: next })
          .eq("id", id);

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
        const c = document.getElementById("comentario");
        if (c) c.value = "";
        await refreshAll();
      } catch (e) {
        toast(e.message || "No se pudo cambiar estado.", "error");
      }
    });
  }

  try {
    await refreshAll();
  } catch (e) {
    toast(e.message || "No se pudo cargar el contrato.", "error");
  }
}

/* ======================================================
   INIT LISTADO (contratos.html)
====================================================== */

async function loadContratosListado() {
  // RLS ya filtrará según policies. Aquí solo traemos campos básicos.
  const { data, error } = await supabaseClient
    .from("contratos")
    .select("id,codigo,created_at,area_solicitante,servicios_requeridos,estado,interventoria_obligatoria")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function renderListadoRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="6" class="small">No hay registros para mostrar.</td></tr>`;
  }

  return rows.map(r => {
    const fecha = r.created_at ? new Date(r.created_at).toLocaleDateString("es-CO") : "—";
    const area = safeText(r.area_solicitante || "—");
    const serv = safeText(r.servicios_requeridos || "—");
    const est = statusBadge(r.estado || "—");
    const iv = r.interventoria_obligatoria ? "Sí" : "No";

    return `
      <tr>
        <td><a href="./contrato_detalle.html?id=${r.id}">${safeText(r.codigo ?? "—")}</a></td>
        <td>${fecha}</td>
        <td>${area}</td>
        <td>${serv}</td>
        <td>${est}</td>
        <td>${iv}</td>
      </tr>
    `;
  }).join("");
}

export async function initContratosPage(profile) {
  console.log("initContratosPage OK", profile);

  // Botón Nuevo (compatible con ids antiguos)
  const btnNuevo =
    document.getElementById("btnNuevoContrato") ||
    document.getElementById("btnNuevo");

  if (btnNuevo) {
    const puedeCrear = ["director", "admin"].includes(profile?.rol);
    btnNuevo.style.display = puedeCrear ? "inline-block" : "none";

    btnNuevo.addEventListener("click", async () => {
      try {
        btnNuevo.disabled = true;

        // 🔥 CLAVE: usar auth.uid real para cumplir RLS
        const authId = await getAuthId();

const { data, error } = await supabaseClient
  .from("contratos")
  .insert([{
    estado: "BORRADOR",
    creado_por: authId,                 // auth.users.id
    solicitante_id: profile.id,         // profiles.id  ✅ (ESTO ARREGLA TU ERROR)
    area_solicitante: profile?.area || null,
    servicios_requeridos: null,
    interventoria_obligatoria: false
  }])
  .select("id")
  .single();


        if (error) throw error;
        if (!data?.id) throw new Error("No se obtuvo el ID del contrato.");

        window.location.href = `./contrato_detalle.html?id=${data.id}`;
      } catch (e) {
        console.error(e);
        alert(e?.message || "No se pudo crear el contrato.");
      } finally {
        btnNuevo.disabled = false;
      }
    });
  }

  // Cargar listado si existe tabla/tbody
  const tbody =
    document.getElementById("rows") ||
    document.getElementById("tblRows") ||
    document.querySelector("tbody");

  if (tbody) {
    try {
      const rows = await loadContratosListado();
      tbody.innerHTML = renderListadoRows(rows);
    } catch (e) {
      console.error(e);
      toast(e.message || "No se pudo cargar el listado.", "error");
    }
  }
}
