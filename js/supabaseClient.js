// /js/supabaseClient.js
// ✅ Este archivo debe cargarse ANTES de usar supabaseClient en otros módulos.

const SUPABASE_URL = "https://hsphbscyrlbhpmmcygpq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcGhic2N5cmxiaHBtbWN5Z3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTE5MjcsImV4cCI6MjA4NjQ4NzkyN30.HpfXIrlbeMzlq8gStIFJyU3mobqMreOtZfxujjBSG1A";

// Validación básica
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en js/supabaseClient.js");
}

// La librería supabase (UMD) debe estar cargada (cdn @supabase/supabase-js@2)
if (typeof supabase === "undefined") {
  console.error("La librería Supabase no cargó. Revisa el <script src> del CDN.");
} else {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
