// Configuração do Supabase
const SUPABASE_URL = 'https://goxfwzqftyqagpblzowd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdveGZ3enFmdHlxYWdwYmx6b3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzE4MTQsImV4cCI6MjA4NjMwNzgxNH0.-X1E2IqizXDtRIs7N0sAery9Ni1TS19DeWEEfBSXgNc';

// Inicializar cliente Supabase e exportar para window
try {
    if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase SDK não carregado');
    }
    
    // Criar cliente e exportar
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Exportar para window para que app.js possa acessar
    window.supabaseClient = supabaseClient;
    
    console.log('✅ Supabase inicializado com sucesso!');
    console.log('📍 URL:', SUPABASE_URL);
    
} catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    alert('Erro ao conectar com o banco de dados. Verifique o console (F12).');
}
