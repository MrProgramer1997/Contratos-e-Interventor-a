// /js/auth.js
import { toast } from "./ui.js";

export async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) toast(error.message || "Error al salir.", "error");
  window.location.href = "./index.html";
}

export async function requireAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) window.location.href = "./index.html";
  return data.session;
}

export async function getMyProfile() {
  const { data: s } = await supabaseClient.auth.getUser();
  const uid = s?.user?.id;
  const email = s?.user?.email;

  if (!uid) throw new Error("No hay sesión.");

  // Buscar profile
  let { data: prof, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  // Si no existe, crearlo (para no depender de trigger)
  if (!prof) {
    const ins = await supabaseClient.from("profiles").insert([{
      id: uid,
      email,
      rol: "director",
      activo: true
    }]).select("*").single();

    if (ins.error) throw ins.error;
    prof = ins.data;
  } else if (error) {
    throw error;
  }

  return prof;
}
