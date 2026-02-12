// Estado da aplicação
let currentUser = null;
let isAdmin = false;
let notasFiscais = [];
let editingNFId = null;
let deleteNFId = null;

// Elementos do DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserName = document.getElementById('currentUserName');
const currentUserRole = document.getElementById('currentUserRole');
const newNFBtn = document.getElementById('newNFBtn');
const nfModal = document.getElementById('nfModal');
const confirmModal = document.getElementById('confirmModal');
const nfForm = document.getElementById('nfForm');
const notasTableBody = document.getElementById('notasTableBody');
const emptyState = document.getElementById('emptyState');
const totalNotas = document.getElementById('totalNotas');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o Supabase foi inicializado
    if (!supabase) {
        console.error('❌ Supabase não inicializado');
        showConfigError();
        return;
    }
    
    checkAuth();
    setupEventListeners();
});

// Mostrar erro de configuração
function showConfigError() {
    if (loginError) {
        loginError.innerHTML = `
            <strong>⚠️ Erro ao Conectar com Supabase</strong><br>
            Verifique se as credenciais estão corretas no arquivo <code>config.js</code><br>
            <small>Abra o Console (F12) para mais detalhes do erro.</small>
        `;
        loginError.classList.add('show');
        loginError.style.background = '#fee2e2';
        loginError.style.border = '2px solid #ef4444';
        loginError.style.padding = '16px';
        loginError.style.borderRadius = '8px';
    }
}

// Verificar autenticação
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await loadUserData(session.user);
        showMainScreen();
    } else {
        showLoginScreen();
    }
}

// Carregar dados do usuário
async function loadUserData(user) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();
    
    if (data) {
        currentUser = data;
        isAdmin = data.role === 'admin';
        currentUserName.textContent = data.nome;
        currentUserRole.textContent = isAdmin ? 'Administrador' : 'Fiscal';
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      const email = document.getElementById('username').value
      const password = document.getElementById('password').value

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (error) {
        console.error(error)
        return
      }

      console.log('Logado com sucesso!', data)
    })
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Nova NF
    newNFBtn.addEventListener('click', openNewNFModal);
    
    // Fechar modals
    document.getElementById('closeModal').addEventListener('click', closeNFModal);
    document.getElementById('cancelBtn').addEventListener('click', closeNFModal);
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmModal);
    
    // Confirmar delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteNotaFiscal);
    
    // Submit form NF
    nfForm.addEventListener('submit', handleNFSubmit);
    
    // Filtros
    document.getElementById('filterFornecedor').addEventListener('input', applyFilters);
    document.getElementById('filterNF').addEventListener('input', applyFilters);
    document.getElementById('filterFiscal').addEventListener('input', applyFilters);
    document.getElementById('filterData').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    
    // Formatação de valores
    document.getElementById('nfValor').addEventListener('input', formatCurrency);
    document.getElementById('nfNumero').addEventListener('input', formatNF);
    
    // Fechar modal clicando fora
    nfModal.addEventListener('click', (e) => {
        if (e.target === nfModal) closeNFModal();
    });
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirmModal();
    });
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    loginError.textContent = '';
    loginError.classList.remove('show');
    
    try {
        // Buscar usuário
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('username', username)
            .single();
        
        if (userError || !usuario) {
            throw new Error('Usuário ou senha inválidos');
        }
        
        // Fazer login com Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: usuario.email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = usuario;
        isAdmin = usuario.role === 'admin';
        
        showMainScreen();
        loadNotasFiscais();
        
    } catch (error) {
        loginError.textContent = error.message || 'Erro ao fazer login';
        loginError.classList.add('show');
    }
}

// Logout
async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    isAdmin = false;
    showLoginScreen();
    loginForm.reset();
}

// Mostrar telas
function showLoginScreen() {
    loginScreen.classList.add('active');
    mainScreen.classList.remove('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    currentUserName.textContent = currentUser.nome;
    currentUserRole.textContent = isAdmin ? 'Administrador' : 'Fiscal';
    loadNotasFiscais();
}

// Carregar Notas Fiscais
async function loadNotasFiscais() {
    const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .order('data', { ascending: false })
        .order('hora_chegada', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar notas:', error);
        return;
    }
    
    notasFiscais = data || [];
    renderNotasFiscais(notasFiscais);
}

// Renderizar Notas Fiscais
function renderNotasFiscais(notas) {
    notasTableBody.innerHTML = '';
    
    if (notas.length === 0) {
        emptyState.classList.add('show');
        totalNotas.textContent = '0 notas';
        return;
    }
    
    emptyState.classList.remove('show');
    totalNotas.textContent = `${notas.length} nota${notas.length !== 1 ? 's' : ''}`;
    
    notas.forEach(nota => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(nota.data)}</td>
            <td>${nota.fornecedor}</td>
            <td>${formatNFNumber(nota.numero_nf)}</td>
            <td>${formatCurrencyDisplay(nota.valor)}</td>
            <td>${nota.hora_chegada}</td>
            <td>${nota.temperatura || '-'}</td>
            <td>${nota.hora_saida || '-'}</td>
            <td>${nota.fiscal_nome}</td>
            <td>
                <span class="status-badge status-${nota.status === 'Acatada' ? 'acatada' : 'nao-acatada'}">
                    ${nota.status}
                </span>
            </td>
            <td class="actions-column">
                <div class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editNotaFiscal('${nota.id}')">Editar</button>
                    ${isAdmin ? `<button class="action-btn btn-delete" onclick="confirmDelete('${nota.id}')">Excluir</button>` : ''}
                </div>
            </td>
        `;
        notasTableBody.appendChild(tr);
    });
}

// Abrir modal Nova NF
function openNewNFModal() {
    editingNFId = null;
    document.getElementById('modalTitle').textContent = 'Nova Nota Fiscal';
    document.getElementById('nfId').value = '';
    nfForm.reset();
    
    // Setar data e hora atual
    const now = new Date();
    document.getElementById('nfData').value = now.toISOString().split('T')[0];
    document.getElementById('nfHoraChegada').value = now.toTimeString().slice(0, 5);
    
    // Esconder campo status para fiscais
    if (!isAdmin) {
        document.getElementById('statusGroup').style.display = 'none';
    } else {
        document.getElementById('statusGroup').style.display = 'block';
    }
    
    nfModal.classList.add('active');
}

// Editar Nota Fiscal
async function editNotaFiscal(id) {
    editingNFId = id;
    document.getElementById('modalTitle').textContent = 'Editar Nota Fiscal';
    
    const nota = notasFiscais.find(n => n.id === id);
    if (!nota) return;
    
    // Preencher form
    document.getElementById('nfId').value = nota.id;
    document.getElementById('nfData').value = nota.data;
    document.getElementById('nfFornecedor').value = nota.fornecedor;
    document.getElementById('nfNumero').value = formatNFNumber(nota.numero_nf);
    document.getElementById('nfValor').value = formatCurrencyDisplay(nota.valor);
    document.getElementById('nfHoraChegada').value = nota.hora_chegada;
    document.getElementById('nfTemperatura').value = nota.temperatura || '';
    document.getElementById('nfHoraSaida').value = nota.hora_saida || '';
    document.getElementById('nfStatus').value = nota.status;
    
    // Mostrar campo status para admin
    if (isAdmin) {
        document.getElementById('statusGroup').style.display = 'block';
    } else {
        document.getElementById('statusGroup').style.display = 'none';
    }
    
    nfModal.classList.add('active');
}

// Fechar modal NF
function closeNFModal() {
    nfModal.classList.remove('active');
    nfForm.reset();
    editingNFId = null;
}

// Fechar modal confirmação
function closeConfirmModal() {
    confirmModal.classList.remove('active');
    deleteNFId = null;
}

// Confirmar delete
function confirmDelete(id) {
    deleteNFId = id;
    confirmModal.classList.add('active');
}

// Deletar Nota Fiscal
async function deleteNotaFiscal() {
    if (!deleteNFId) return;
    
    const { error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', deleteNFId);
    
    if (error) {
        alert('Erro ao excluir nota fiscal');
        return;
    }
    
    closeConfirmModal();
    loadNotasFiscais();
}

// Submit Form NF
async function handleNFSubmit(e) {
    e.preventDefault();
    
    const nfData = {
        data: document.getElementById('nfData').value,
        fornecedor: document.getElementById('nfFornecedor').value,
        numero_nf: parseCurrency(document.getElementById('nfNumero').value),
        valor: parseCurrency(document.getElementById('nfValor').value),
        hora_chegada: document.getElementById('nfHoraChegada').value,
        temperatura: document.getElementById('nfTemperatura').value || null,
        hora_saida: document.getElementById('nfHoraSaida').value || null,
        fiscal_nome: currentUser.nome,
        fiscal_id: currentUser.id,
        status: isAdmin ? document.getElementById('nfStatus').value : 'Não Acatada'
    };
    
    if (editingNFId) {
        // Atualizar
        // Fiscais só podem editar hora_saida
        const updateData = isAdmin ? nfData : { hora_saida: nfData.hora_saida };
        
        const { error } = await supabase
            .from('notas_fiscais')
            .update(updateData)
            .eq('id', editingNFId);
        
        if (error) {
            alert('Erro ao atualizar nota fiscal');
            return;
        }
    } else {
        // Criar nova
        const { error } = await supabase
            .from('notas_fiscais')
            .insert([nfData]);
        
        if (error) {
            alert('Erro ao criar nota fiscal');
            return;
        }
    }
    
    closeNFModal();
    loadNotasFiscais();
}

// Filtros
function applyFilters() {
    const fornecedor = document.getElementById('filterFornecedor').value.toLowerCase();
    const nf = document.getElementById('filterNF').value;
    const fiscal = document.getElementById('filterFiscal').value.toLowerCase();
    const data = document.getElementById('filterData').value;
    const status = document.getElementById('filterStatus').value;
    
    const filtered = notasFiscais.filter(nota => {
        const matchFornecedor = !fornecedor || nota.fornecedor.toLowerCase().includes(fornecedor);
        const matchNF = !nf || nota.numero_nf.toString().includes(nf.replace(/\./g, ''));
        const matchFiscal = !fiscal || nota.fiscal_nome.toLowerCase().includes(fiscal);
        const matchData = !data || nota.data === data;
        const matchStatus = !status || nota.status === status;
        
        return matchFornecedor && matchNF && matchFiscal && matchData && matchStatus;
    });
    
    renderNotasFiscais(filtered);
}

function clearFilters() {
    document.getElementById('filterFornecedor').value = '';
    document.getElementById('filterNF').value = '';
    document.getElementById('filterFiscal').value = '';
    document.getElementById('filterData').value = '';
    document.getElementById('filterStatus').value = '';
    renderNotasFiscais(notasFiscais);
}

// Formatação
function formatCurrency(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = (parseInt(value) / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    e.target.value = 'R$ ' + value;
}

function formatCurrencyDisplay(value) {
    if (!value) return 'R$ 0,00';
    const num = parseFloat(value);
    return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.'));
}

function formatNF(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(?=\d)/g, '$1.');
    e.target.value = value;
}

function formatNFNumber(value) {
    if (!value) return '';
    return value.toString().replace(/(\d{3})(?=\d)/g, '$1.');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Tornar funções globais
window.editNotaFiscal = editNotaFiscal;
window.confirmDelete = confirmDelete;
