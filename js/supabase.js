const SUPABASE_URL = "https://goxfwzqftyqagpblzowd.supabase.co";
const SUPABASE_KEY = "COLE_SUA_ANON_KEY_AQUI";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
