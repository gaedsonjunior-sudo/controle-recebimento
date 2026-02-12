// Configuração do Supabase
// IMPORTANTE: Substitua estas variáveis pelas suas credenciais do Supabase

const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE';

// Inicialização do cliente Supabase
let supabase = null;

// Verificar se as credenciais foram configuradas
if (SUPABASE_URL === 'SUA_URL_DO_SUPABASE' || SUPABASE_ANON_KEY === 'SUA_CHAVE_ANON_DO_SUPABASE') {
    console.error('❌ ERRO: Credenciais do Supabase não configuradas!');
    console.error('Por favor, edite o arquivo config.js e adicione suas credenciais.');
    console.error('Veja o README.md para instruções detalhadas.');
    
    // Mostrar alerta visual
    document.addEventListener('DOMContentLoaded', () => {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ef4444;
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                font-family: system-ui, sans-serif;
                font-weight: 600;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                z-index: 9999;
                text-align: center;
                max-width: 90%;
            `;
            errorDiv.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 16px; margin-bottom: 8px;">Configuração Pendente</div>
                <div style="font-size: 14px; opacity: 0.95;">
                    Por favor, configure as credenciais do Supabase no arquivo <code>config.js</code>
                </div>
            `;
            document.body.appendChild(errorDiv);
        }
    });
} else {
    // Verificar se o Supabase SDK está carregado
    if (typeof window.supabase === 'undefined') {
        console.error('❌ ERRO: Supabase SDK não carregado!');
        console.error('Verifique sua conexão com a internet.');
    } else {
        // Inicializar cliente
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase inicializado com sucesso!');
        } catch (error) {
            console.error('❌ ERRO ao inicializar Supabase:', error);
        }
    }
}
