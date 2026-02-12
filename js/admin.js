// /js/admin.js
import { $, $all, toast, setLoading, safeText } from "./ui.js";

function roleOptions(current) {
  const roles = ["director", "abogado", "representante", "interventor", "admin"];
  return roles.map(r => `<option value="${r}" ${r === current ? "selected" : ""}>${r}</option>`).join("");
}

function rowTemplate(p) {
  const email = safeText(p.email);
  const nombre = safeText(p.nombre);
  const area = safeText(p.area);
  const rol = safeText(p.rol);
  const activo = !!p.activo;

  return `
    <tr data-id="${p.id}">
      <td title="${email}">${email}</td>
      <td><input class="input" data-k="nombre" value="${nombre.replace(/"/g, "&quot;")}" /></td>
      <td><input class="input" data-k="area" value="${area.replace(/"/g, "&quot;")}" /></td>
      <td>
        <select class="input" data-k="rol">
          ${roleOptions(rol)}
        </select>
      </td>
      <td style="min-width:120px;">
        <label class="small" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" data-k="activo" ${activo ? "checked" : ""}/>
          ${activo ? "Activo" : "Inactivo"}
        </label>
      </td>
      <td style="min-width:140px;">
        <button class="btn" data-action="save">Guardar</button>
      </td>
    </tr>
  `;
}

async function fetchProfiles() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,nombre,rol,area,activo,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function applyFilter(all) {
  const q = safeText($("#q").value).toLowerCase().trim();
  const rol = safeText($("#fRol").value).trim();
  const activo = safeText($("#fActivo").value).trim();

  return all.filter(p => {
    const okQ =
      !q ||
      safeText(p.email).toLowerCase().includes(q) ||
      safeText(p.nombre).toLowerCase().includes(q) ||
      safeText(p.area).toLowerCase().includes(q);

    const okRol = !rol || safeText(p.rol) === rol;

    const okActivo =
      !activo ||
      (activo === "true" ? !!p.activo : !p.activo);

    return okQ && okRol && okActivo;
  });
}

function readRow(tr) {
  const get = (k) => tr.querySelector(`[data-k="${k}"]`);
  const nombre = get("nombre").value.trim() || null;
  const area = get("area").value.trim() || null;
  const rol = get("rol").value;
  const activo = !!get("activo").checked;

  return { nombre, area, rol, activo };
}

export async function initAdminPage(profile) {
  if (profile.rol !== "admin") {
    toast("No autorizado. Solo Admin.", "error");
    window.location.href = "./dashboard.html";
    return;
  }

  let all = [];

  async function render() {
    const filtered = applyFilter(all);
    $("#rows").innerHTML = filtered.map(rowTemplate).join("") || `
      <tr><td colspan="6" class="small">No hay usuarios para mostrar.</td></tr>
    `;

    // Bind guardar por fila
    $all('button[data-action="save"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const payload = readRow(tr);

        try {
          setLoading(btn, true, "Guardando...");
          const { error } = await supabaseClient
            .from("profiles")
            .update(payload)
            .eq("id", id);

          if (error) throw error;
          toast("Usuario actualizado.", "success");

          // refrescar en memoria
          all = all.map(x => x.id === id ? { ...x, ...payload } : x);
          await render();
        } catch (e) {
          toast(e.message || "No se pudo guardar.", "error");
        } finally {
          setLoading(btn, false);
        }
      });
    });
  }

  $("#q").addEventListener("input", render);
  $("#fRol").addEventListener("change", render);
  $("#fActivo").addEventListener("change", render);

  $("#btnRefresh").addEventListener("click", async () => {
    try {
      $("#info").textContent = "Actualizando...";
      all = await fetchProfiles();
      $("#info").textContent = `Usuarios cargados: ${all.length}`;
      await render();
      toast("Actualizado.", "success");
    } catch (e) {
      toast(e.message || "No se pudieron cargar usuarios.", "error");
    }
  });

  // primera carga
  try {
    $("#info").textContent = "Cargando usuarios...";
    all = await fetchProfiles();
    $("#info").textContent = `Usuarios cargados: ${all.length}`;
    await render();
  } catch (e) {
    toast(e.message || "No se pudieron cargar usuarios.", "error");
  }
}
