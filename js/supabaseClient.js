// /js/supabaseClient.js
// CDN supabase-js v2
// Reemplaza con tus credenciales
const SUPABASE_URL = "https://hsphbscyrlbhpmmcygpq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcGhic2N5cmxiaHBtbWN5Z3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTE5MjcsImV4cCI6MjA4NjQ4NzkyN30.HpfXIrlbeMzlq8gStIFJyU3mobqMreOtZfxujjBSG1A";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
