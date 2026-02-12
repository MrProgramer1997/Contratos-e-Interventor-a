// /js/ui.js
export function $(sel) {
  return document.querySelector(sel);
}
export function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

export function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = "toast";
  el.style.position = "fixed";
  el.style.right = "16px";
  el.style.bottom = "16px";
  el.style.zIndex = "9999";
  el.style.maxWidth = "420px";
  el.style.borderLeft = type === "error" ? "6px solid var(--danger)"
    : type === "success" ? "6px solid var(--accent)"
    : "6px solid var(--primary)";
  el.textContent = message;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(num);
}

export function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

export function safeText(s) {
  return (s ?? "").toString();
}

export function qsParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function setLoading(btn, loading, textLoading = "Procesando...") {
  if (!btn) return;
  if (loading) {
    btn.dataset._txt = btn.textContent;
    btn.textContent = textLoading;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset._txt || btn.textContent;
    btn.disabled = false;
  }
}

export function statusBadge(status) {
  const s = (status || "").toUpperCase();
  const map = {
    BORRADOR: "badge",
    RADICADO: "badge",
    EN_REVISION_JURIDICA: "badge",
    APROBADO_JURIDICO: "badge",
    RECHAZADO_JURIDICO: "badge",
    PENDIENTE_ACEPTACION: "badge",
    ACEPTADO: "badge",
    RECHAZADO: "badge",
    CERRADO: "badge",
    FINALIZADA: "badge"
  };
  return `<span class="${map[s] || "badge"}">${s}</span>`;
}
