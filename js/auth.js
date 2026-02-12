// /js/auth.js
import { ROLE_BY_EMAIL, AREA_BY_EMAIL } from "./roles.js";

export async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "./index.html";
    return null;
  }
  await ensureProfile(session.user);
  return session;
}

export async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "./index.html";
}

export async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await ensureProfile(data.user);
  window.location.href = "./dashboard.html";
}

export async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;

  // Si el proyecto requiere confirmación por email, avisamos:
  if (!data.session) {
    return { needsEmailConfirm: true };
  }
  await ensureProfile(data.user);
  window.location.href = "./dashboard.html";
}

export async function ensureProfile(user) {
  const email = (user.email || "").toLowerCase().trim();
  const rol = ROLE_BY_EMAIL[email] || "director";
  const area = AREA_BY_EMAIL[email] || null;

  // ¿Existe profile?
  const { data: existing, error: selErr } = await supabaseClient
    .from("profiles")
    .select("id,email,rol,area,activo")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr) throw selErr;

  if (!existing) {
    const { error: insErr } = await supabaseClient.from("profiles").insert([{
      id: user.id,
      email,
      rol,
      area,
      activo: true,
      nombre: null
    }]);
    if (insErr) throw insErr;
  }
}

export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,rol,area,nombre")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  return data;
}
