// /js/reportes.js
import { $, toast, setLoading, fmtDate } from "./ui.js";

function toISODate(d) {
  return d ? new Date(d).toISOString() : null;
}

function buildWorkbook(sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function downloadWb(wb, filename) {
  XLSX.writeFile(wb, filename);
}

function filterByDateRange(items, dateField, desde, hasta) {
  if (!desde && !hasta) return items;

  const d0 = desde ? new Date(desde + "T00:00:00") : null;
  const d1 = hasta ? new Date(hasta + "T23:59:59") : null;

  return items.filter(it => {
    const v = it[dateField];
    if (!v) return false;
    const dv = new Date(v);
    if (d0 && dv < d0) return false;
    if (d1 && dv > d1) return false;
    return true;
  });
}

export function initReportes() {
  const btnC = $("#btnExcelContratos");
  const btnI = $("#btnExcelInterventorias");
  const info = $("#info");

  btnC.addEventListener("click", async () => {
    try {
      setLoading(btnC, true, "Generando...");
      const desde = $("#desde").value || null;
      const hasta = $("#hasta").value || null;
      const estado = $("#estadoContrato").value || null;

      let q = supabaseClient.from("contratos").select("*").order("created_at", { ascending: false });
      if (estado) q = q.eq("estado", estado);

      const { data, error } = await q;
      if (error) throw error;

      let rows = filterByDateRange(data || [], "fecha_solicitud", desde, hasta);

      const out = rows.map(r => ({
        codigo: r.codigo,
        estado: r.estado,
        fecha_solicitud: r.fecha_solicitud,
        fecha_recepcion: r.fecha_recepcion,
        area_solicitante: r.area_solicitante,
        servicios_requeridos: r.servicios_requeridos,
        motivo_solicitud: r.motivo_solicitud,
        honorarios_tipo: r.honorarios_tipo,
        honorarios_otro: r.honorarios_otro,
        honorarios_valor: r.honorarios_valor,
        forma_pago: r.forma_pago,
        duracion: r.duracion,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        objeto_contrato: r.objeto_contrato,
        obligaciones_contratista: r.obligaciones_contratista,
        interventoria_obligatoria: r.interventoria_obligatoria ? "SI" : "NO",
        afecta_socio: r.afecta_socio ? "SI" : "NO",
        mayor_10m_anual: r.mayor_10m_anual ? "SI" : "NO",
        concesion_espacio: r.concesion_espacio ? "SI" : "NO",
        doc_propuesta: r.doc_propuesta ? "SI" : "NO",
        doc_rut: r.doc_rut ? "SI" : "NO",
        doc_camara: r.doc_camara ? "SI" : "NO",
        doc_cert_bancaria: r.doc_cert_bancaria ? "SI" : "NO",
        doc_seg_social: r.doc_seg_social ? "SI" : "NO",
        doc_hoja_vida: r.doc_hoja_vida ? "SI" : "NO",
        doc_otro: r.doc_otro ? "SI" : "NO",
        doc_otro_cual: r.doc_otro_cual
      }));

      const wb = buildWorkbook("Contratos", out);
      const fname = `Reporte_Contratos_${desde || "NA"}_${hasta || "NA"}.xlsx`;
      downloadWb(wb, fname);

      info.textContent = `Excel generado: ${out.length} registros.`;
      toast("Excel de contratos generado.", "success");
    } catch (e) {
      toast(e.message || "No se pudo generar Excel.", "error");
    } finally {
      setLoading(btnC, false);
    }
  });

  btnI.addEventListener("click", async () => {
    try {
      setLoading(btnI, true, "Generando...");
      const desde = $("#desde").value || null;
      const hasta = $("#hasta").value || null;

      const { data, error } = await supabaseClient
        .from("interventorias")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let rows = filterByDateRange(data || [], "fecha_informe", desde, hasta);

      const out = rows.map(r => ({
        codigo: r.codigo,
        estado: r.estado,
        fecha_informe: r.fecha_informe,
        tipo_contrato: r.tipo_contrato,
        nombre_contratista: r.nombre_contratista,
        nombre_interventor: r.nombre_interventor,
        cargo_interventor: r.cargo_interventor,
        calidad: r.calidad === null ? "" : (r.calidad ? "SI" : "NO"),
        oportunidad: r.oportunidad === null ? "" : (r.oportunidad ? "SI" : "NO"),
        recursos: r.recursos === null ? "" : (r.recursos ? "SI" : "NO"),
        laboral_prestaciones: r.laboral_prestaciones === null ? "" : (r.laboral_prestaciones ? "SI" : "NO"),
        sst: r.sst === null ? "" : (r.sst ? "SI" : "NO"),
        firmas_requeridas: r.firmas_requeridas ? "SI" : "NO",
        original_asuntos_legales: r.original_asuntos_legales ? "SI" : "NO",
        copia_interventor: r.copia_interventor ? "SI" : "NO",
        contrato_vigente: r.contrato_vigente ? "SI" : "NO",
        actualizado_planilla: r.actualizado_planilla ? "SI" : "NO",
        observaciones: r.observaciones
      }));

      const wb = buildWorkbook("Interventorias", out);
      const fname = `Reporte_Interventorias_${desde || "NA"}_${hasta || "NA"}.xlsx`;
      downloadWb(wb, fname);

      info.textContent = `Excel generado: ${out.length} registros.`;
      toast("Excel de interventorías generado.", "success");
    } catch (e) {
      toast(e.message || "No se pudo generar Excel.", "error");
    } finally {
      setLoading(btnI, false);
    }
  });
}
