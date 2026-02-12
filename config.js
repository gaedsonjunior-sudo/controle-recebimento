// Configuração do Supabase
// IMPORTANTE: Substitua estas variáveis pelas suas credenciais do Supabase

const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE';

// Inicialização do cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
