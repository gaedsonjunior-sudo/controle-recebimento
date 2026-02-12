// Configuração do Supabase
const SUPABASE_URL = 'https://goxfwzqftyqagpblzowd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdveGZ3enFmdHlxYWdwYmx6b3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzE4MTQsImV4cCI6MjA4NjMwNzgxNH0.-X1E2IqizXDtRIs7N0sAery9Ni1TS19DeWEEfBSXgNc';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
