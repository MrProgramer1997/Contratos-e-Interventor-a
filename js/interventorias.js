// /js/interventorias.js
import { $, toast, setLoading, safeText, fmtDate, statusBadge, qsParam } from "./ui.js";

/* =========================
   LISTADO
========================= */

function rowTemplate(x) {
  return `
    <tr>
      <td>${x.codigo ?? ""}</td>
      <td>${fmtDate(x.fecha_informe) || ""}</td>
      <td>${safeText(x.nombre_contratista)}</td>
      <td>${safeText(x.nombre_interventor)}</td>
      <td>${safeText(x.tipo_contrato)}</td>
      <td>${statusBadge(x.estado)}</td>
      <td><a class="btn secondary" href="./interventoria_detalle.html?id=${x.id}">Abrir</a></td>
    </tr>
  `;
}

async function fetchInterventorias() {
  const { data, error } = await supabaseClient
    .from("interventorias")
    .select("id,codigo,fecha_informe,nombre_contratista,nombre_interventor,tipo_contrato,estado")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function applyFilters(all) {
  const q = safeText($("#q").value).toLowerCase().trim();
  const estado = safeText($("#fEstado").value).trim();

  return all.filter(x => {
    const hayQ =
      !q ||
      safeText(x.codigo).toLowerCase().includes(q) ||
      safeText(x.nombre_contratista).toLowerCase().includes(q) ||
      safeText(x.nombre_interventor).toLowerCase().includes(q) ||
      safeText(x.tipo_contrato).toLowerCase().includes(q);

    const hayEstado = !estado || safeText(x.estado) === estado;
    return hayQ && hayEstado;
  });
}

function readNew(profile) {
  return {
    contrato_id: $("#contrato_id").value.trim() || null,
    fecha_informe: $("#fecha_informe").value || null,
    nombre_contratista: $("#nombre_contratista").value || null,
    nombre_interventor: $("#nombre_interventor").value || null,
    cargo_interventor: $("#cargo_interventor").value || null,
    tipo_contrato: $("#tipo_contrato").value || null,
    estado: "BORRADOR",
    creado_por: profile.id
  };
}

function validateNew(p) {
  // Permitimos crear en blanco, pero recomendamos algo mínimo
  if (!p.fecha_informe && !p.nombre_contratista && !p.nombre_interventor) {
    return "Completa al menos Fecha del informe o Nombre del contratista/interventor.";
  }
  return null;
}

export async function initInterventoriasPage(profile) {
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
      setLoading(btnGuardar, true, "Creando...");
      const payload = readNew(profile);
      const err = validateNew(payload);
      if (err) return toast(err, "error");

      const { data, error } = await supabaseClient
        .from("interventorias")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;

      toast("Interventoría creada en BORRADOR.", "success");
      panel.style.display = "none";
      window.location.href = `./interventoria_detalle.html?id=${data.id}`;
    } catch (e) {
      toast(e.message || "No se pudo crear.", "error");
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
    all = await fetchInterventorias();
    await render();
  } catch (e) {
    toast(e.message || "No se pudieron cargar interventorías.", "error");
  }
}

/* =========================
   DETALLE
========================= */

async function loadInterventoria(id) {
  const { data, error } = await supabaseClient
    .from("interventorias")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function loadPlanAccionItems(interventoriaId) {
  const { data, error } = await supabaseClient
    .from("interventoria_plan_accion_items")
    .select("*")
    .eq("interventoria_id", interventoriaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function loadAdjuntosInterventoria(id) {
  const { data, error } = await supabaseClient
    .from("adjuntos")
    .select("*")
    .eq("tipo", "interventoria")
    .eq("ref_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function setRadio(name, value) {
  if (value === null || value === undefined) return;
  const v = value ? "true" : "false";
  document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
    r.checked = (r.value === v);
  });
}

function getRadio(name) {
  const r = document.querySelector(`input[name="${name}"]:checked`);
  if (!r) return null;
  return r.value === "true";
}

function fillForm(x) {
  $("#codigo").textContent = x.codigo ?? "—";
  $("#estadoBadge").innerHTML = statusBadge(x.estado);
  $("#meta").textContent = `Creado: ${new Date(x.created_at).toLocaleString("es-CO")}`;

  $("#nombre_contratista").value = x.nombre_contratista || "";
  $("#fecha_informe").value = x.fecha_informe || "";
  $("#nombre_interventor").value = x.nombre_interventor || "";
  $("#cargo_interventor").value = x.cargo_interventor || "";
  $("#tipo_contrato").value = x.tipo_contrato || "";

  setRadio("calidad", x.calidad);
  setRadio("oportunidad", x.oportunidad);
  setRadio("recursos", x.recursos);
  setRadio("laboral_prestaciones", x.laboral_prestaciones);
  setRadio("sst", x.sst);

  $("#firmas_requeridas").checked = !!x.firmas_requeridas;
  $("#original_asuntos_legales").checked = !!x.original_asuntos_legales;
  $("#copia_interventor").checked = !!x.copia_interventor;
  $("#contrato_vigente").checked = !!x.contrato_vigente;
  $("#actualizado_planilla").checked = !!x.actualizado_planilla;

  $("#observaciones").value = x.observaciones || "";
}

function getUpdatePayload() {
  return {
    nombre_contratista: $("#nombre_contratista").value || null,
    fecha_informe: $("#fecha_informe").value || null,
    nombre_interventor: $("#nombre_interventor").value || null,
    cargo_interventor: $("#cargo_interventor").value || null,
    tipo_contrato: $("#tipo_contrato").value || null,

    calidad: getRadio("calidad"),
    oportunidad: getRadio("oportunidad"),
    recursos: getRadio("recursos"),
    laboral_prestaciones: getRadio("laboral_prestaciones"),
    sst: getRadio("sst"),

    firmas_requeridas: $("#firmas_requeridas").checked,
    original_asuntos_legales: $("#original_asuntos_legales").checked,
    copia_interventor: $("#copia_interventor").checked,
    contrato_vigente: $("#contrato_vigente").checked,
    actualizado_planilla: $("#actualizado_planilla").checked,

    observaciones: $("#observaciones").value || null
  };
}

function renderPA(rows) {
  if (!rows.length) return `<tr><td colspan="4" class="small">Sin actividades.</td></tr>`;
  return rows.map(r => `
    <tr>
      <td>${safeText(r.actividad)}</td>
      <td>${fmtDate(r.fecha) || ""}</td>
      <td>${safeText(r.responsable)}</td>
      <td><button class="btn danger" data-del="${r.id}">Eliminar</button></td>
    </tr>
  `).join("");
}

function renderAdj(rows) {
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

export async function initInterventoriaDetalle(profile) {
  const id = qsParam("id");
  if (!id) {
    toast("Falta id de la interventoría.", "error");
    window.location.href = "./interventorias.html";
    return;
  }

  const btnGuardar = $("#btnGuardar");
  const btnFinalizar = $("#btnFinalizar");
  const btnAddPA = $("#btnAddPA");
  const btnSubir = $("#btnSubir");
  const btnRefresh = $("#btnRefresh");

  let inter = null;

  async function refreshAll() {
    inter = await loadInterventoria(id);
    fillForm(inter);

    const pa = await loadPlanAccionItems(id);
    $("#paRows").innerHTML = renderPA(pa);
    $("#paRows").querySelectorAll("button[data-del]").forEach(b => {
      b.addEventListener("click", async () => {
        try {
          const { error } = await supabaseClient
            .from("interventoria_plan_accion_items")
            .delete()
            .eq("id", b.dataset.del);
          if (error) throw error;
          toast("Actividad eliminada.", "success");
          await refreshAll();
        } catch (e) {
          toast(e.message || "No se pudo eliminar.", "error");
        }
      });
    });

    const adj = await loadAdjuntosInterventoria(id);
    $("#adjRows").innerHTML = renderAdj(adj);
    $("#adjRows").querySelectorAll("button[data-path]").forEach(b => {
      b.addEventListener("click", async () => {
        try { await downloadFromStorage(b.dataset.path); }
        catch (e) { toast(e.message || "No se pudo descargar.", "error"); }
      });
    });
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
        .from("interventorias")
        .update(payload)
        .eq("id", id);

      if (error) throw error;
      toast("Guardado.", "success");
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo guardar.", "error");
    } finally {
      setLoading(btnGuardar, false);
    }
  });

  btnFinalizar.addEventListener("click", async () => {
    try {
      setLoading(btnFinalizar, true, "Finalizando...");
      const payload = getUpdatePayload();

      const { error: e1 } = await supabaseClient
        .from("interventorias")
        .update({ ...payload, estado: "FINALIZADA" })
        .eq("id", id);
      if (e1) throw e1;

      toast("Interventoría finalizada.", "success");
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo finalizar.", "error");
    } finally {
      setLoading(btnFinalizar, false);
    }
  });

  btnAddPA.addEventListener("click", async () => {
    try {
      setLoading(btnAddPA, true, "Agregando...");
      const actividad = $("#pa_actividad").value.trim();
      if (!actividad) return toast("La actividad es obligatoria.", "error");

      const payload = {
        interventoria_id: id,
        actividad,
        fecha: $("#pa_fecha").value || null,
        responsable: $("#pa_responsable").value || null
      };

      const { error } = await supabaseClient
        .from("interventoria_plan_accion_items")
        .insert([payload]);
      if (error) throw error;

      $("#pa_actividad").value = "";
      $("#pa_fecha").value = "";
      $("#pa_responsable").value = "";

      toast("Actividad agregada.", "success");
      await refreshAll();
    } catch (e) {
      toast(e.message || "No se pudo agregar.", "error");
    } finally {
      setLoading(btnAddPA, false);
    }
  });

  btnSubir.addEventListener("click", async () => {
    try {
      setLoading(btnSubir, true, "Subiendo...");
      const file = $("#file").files?.[0];
      if (!file) return toast("Selecciona un archivo.", "error");

      const baseName = $("#file_name").value?.trim() || file.name;
      const safeName = baseName.replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_");
      const storagePath = `interventorias/${id}/${Date.now()}_${safeName}`;

      const up = await supabaseClient.storage
        .from("documentos-contratos")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (up.error) throw up.error;

      const { error } = await supabaseClient.from("adjuntos").insert([{
        tipo: "interventoria",
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

  try {
    await refreshAll();
  } catch (e) {
    toast(e.message || "No se pudo cargar la interventoría.", "error");
  }
}
