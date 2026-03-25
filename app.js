// Estado da aplicação
let currentUser = null;
let isAdmin = false;
let notasFiscais = [];
let editingNFId = null;
let deleteNFId = null;

// Controle de ordenação
let currentSortColumn = 'data';
let currentSortDirection = 'desc'; // desc = mais recente primeiro
let sortHistory = []; // Histórico de ordenações para ordenação multi-nível

// Variável para o cliente Supabase (será preenchida após carregamento)
let supabaseClient = null;

// Elementos do DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserName = document.getElementById('currentUserName');
const currentUserRole = document.getElementById('currentUserRole');
const newNFBtn = document.getElementById('newNFBtn');
const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
const exportReportBtn = document.getElementById('exportReportBtn');
const filtersWrapper = document.getElementById('filtersWrapper');
const nfModal = document.getElementById('nfModal');
const confirmModal = document.getElementById('confirmModal');
const nfForm = document.getElementById('nfForm');
const notasTableBody = document.getElementById('notasTableBody');
const emptyState = document.getElementById('emptyState');
const totalNotas = document.getElementById('totalNotas');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar config.js carregar
    setTimeout(() => {
        // Pegar cliente do window
        supabaseClient = window.supabaseClient;
        
        // Verificar se o Supabase foi inicializado
        if (!supabaseClient) {
            console.error('❌ Supabase não inicializado');
            showConfigError();
            return;
        }
        
        console.log('✅ Supabase carregado com sucesso!');
        checkAuth();
        setupEventListeners();
    }, 500);
});

// Mostrar erro de configuração
function showConfigError() {
    if (loginError) {
        loginError.innerHTML = `
            <strong>⚠️ Erro ao Conectar com Supabase</strong><br>
            Verifique se as credenciais estão corretas no arquivo <code>config.js</code><br>
            <small>Abra o Console (F12) para mais detalhes do erro.</small>
        `;
        loginError.classList.add('active');
    }
}

// Verificar autenticação
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        await loadUserData(session.user);
        showMainScreen();
    } else {
        showLoginScreen();
    }
}

// Carregar dados do usuário
async function loadUserData(user) {
    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();
    
    if (data) {
        currentUser = data;
        isAdmin = data.role === 'admin';
        updateUserDisplay();
    }
}

// Atualizar exibição do usuário (funciona para desktop e mobile)
function updateUserDisplay() {
    const userNameElements = document.querySelectorAll('#currentUserName');
    const userRoleElements = document.querySelectorAll('#currentUserRole');
    
    userNameElements.forEach(el => {
        el.textContent = currentUser.nome;
    });
    
    userRoleElements.forEach(el => {
        el.textContent = isAdmin ? 'Administrador' : 'Fiscal';
    });
}

// Event Listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Nova NF (desktop)
    newNFBtn.addEventListener('click', openNewNFModal);
    
    // Nova NF (mobile FAB)
    const fabMobile = document.getElementById('fabMobile');
    if (fabMobile) {
        fabMobile.addEventListener('click', openNewNFModal);
    }
    
    // Toggle Filtros
    toggleFiltersBtn.addEventListener('click', toggleFilters);
    
    // Exportar Relatório
    exportReportBtn.addEventListener('click', exportReport);
    
    // Sidebar Toggle (mobile)
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Fechar sidebar ao clicar fora (mobile)
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    if (sidebar && mainContent) {
        mainContent.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
    
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
    document.getElementById('openDatePicker').addEventListener('click', openDatePicker);
    document.getElementById('datePickerHelper').addEventListener('change', handleDateSelection);
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

// Toggle Sidebar (mobile)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Toggle Filtros
function toggleFilters() {
    const filtersContent = document.getElementById('filtersContent');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    
    filtersContent.classList.toggle('active');
    toggleBtn.classList.toggle('active');
}

// Setup listeners de ordenação (chamado após carregar dados)
function setupSortListeners() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            handleSort(column);
        });
    });
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    loginError.textContent = '';
    loginError.classList.remove('active');
    
    try {
        // Primeiro, buscar o email do usuário pelo username
        const { data: usuarios, error: searchError } = await supabaseClient
            .from('usuarios')
            .select('email')
            .eq('username', username);
        
        if (searchError) {
            console.error('Erro ao buscar usuário:', searchError);
            throw new Error('Erro ao conectar com o banco de dados');
        }
        
        if (!usuarios || usuarios.length === 0) {
            throw new Error('Usuário não encontrado');
        }
        
        const userEmail = usuarios[0].email;
        
        // Fazer login com Supabase Auth usando o email
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: password
        });
        
        if (authError) {
            console.error('Erro de autenticação:', authError);
            throw new Error('Senha incorreta');
        }
        
        // Buscar dados completos do usuário após login bem-sucedido
        const { data: userData, error: userError } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', userEmail)
            .single();
        
        if (userError || !userData) {
            throw new Error('Erro ao carregar dados do usuário');
        }
        
        currentUser = userData;
        isAdmin = userData.role === 'admin';
        
        console.log('✅ Login realizado com sucesso!');
        console.log('Usuário:', currentUser.nome);
        console.log('Role:', currentUser.role);
        
        showMainScreen();
        loadNotasFiscais();
        
    } catch (error) {
        console.error('Erro no login:', error);
        loginError.textContent = error.message || 'Erro ao fazer login';
        loginError.classList.add('active');
    }
}

// Logout
async function handleLogout() {
    await supabaseClient.auth.signOut();
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
    updateUserDisplay();
    loadNotasFiscais();
}

// Carregar notas fiscais
async function loadNotasFiscais() {
    try {
        const { data, error } = await supabaseClient
            .from('notas_fiscais')
            .select('*')
            .order('data', { ascending: false });
        
        if (error) throw error;
        
        notasFiscais = data || [];
        
        // Aplicar ordenação inicial (data desc)
        const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
        renderNotasFiscais(sorted);
        
        // Setup listeners de ordenação
        setupSortListeners();
        
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        alert('Erro ao carregar notas fiscais');
    }
}

// Renderizar notas fiscais (desktop e mobile)
function renderNotasFiscais(notas) {
    // Atualizar contadores
    const total = notas.length;
    totalNotas.textContent = `${total} ${total === 1 ? 'nota' : 'notas'}`;
    
    const totalNotasMobile = document.getElementById('totalNotasMobile');
    if (totalNotasMobile) {
        totalNotasMobile.textContent = `${total} ${total === 1 ? 'nota' : 'notas'}`;
    }
    
    // Desktop: Tabela
    if (total === 0) {
        notasTableBody.innerHTML = '';
        emptyState.classList.add('active');
    } else {
        emptyState.classList.remove('active');
        notasTableBody.innerHTML = notas.map(nota => {
            const statusClass = nota.status.toLowerCase().replace(/\s/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            return `
                <tr data-id="${nota.id}">
                    <td>${formatDate(nota.data)}</td>
                    <td>${nota.fornecedor}</td>
                    <td>${formatNFNumber(nota.numero_nf)}</td>
                    <td>${formatCurrencyDisplay(nota.valor)}</td>
                    <td>${nota.hora_chegada || '-'}</td>
                    <td>${nota.temperatura || '-'}</td>
                    <td>${nota.hora_saida || '-'}</td>
                    <td title="${nota.observacao || ''}">${nota.observacao || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${nota.status}</span></td>
                    <td class="actions-column">
                        <div class="action-buttons">
                            <button class="btn-action edit" onclick="editNotaFiscal('${nota.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" onclick="confirmDelete('${nota.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Mobile: Cards
    const notasCards = document.getElementById('notasCards');
    const emptyStateMobile = document.getElementById('emptyStateMobile');
    
    if (notasCards && emptyStateMobile) {
        if (total === 0) {
            notasCards.innerHTML = '';
            emptyStateMobile.classList.add('active');
        } else {
            emptyStateMobile.classList.remove('active');
            notasCards.innerHTML = notas.map(nota => {
                const statusClass = nota.status.toLowerCase().replace(/\s/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                
                return `
                    <div class="nota-card" data-id="${nota.id}">
                        <div class="nota-card-header">
                            <div class="nota-card-title">
                                <div class="nota-card-fornecedor">${nota.fornecedor}</div>
                                <div class="nota-card-numero">NF ${formatNFNumber(nota.numero_nf)}</div>
                            </div>
                            <div class="nota-card-status">
                                <span class="status-badge ${statusClass}">${nota.status}</span>
                            </div>
                        </div>
                        <div class="nota-card-body">
                            <div class="nota-card-field">
                                <div class="nota-card-label">Data</div>
                                <div class="nota-card-value">${formatDate(nota.data)}</div>
                            </div>
                            <div class="nota-card-field">
                                <div class="nota-card-label">Valor</div>
                                <div class="nota-card-value">${formatCurrencyDisplay(nota.valor)}</div>
                            </div>
                            <div class="nota-card-field">
                                <div class="nota-card-label">Chegada</div>
                                <div class="nota-card-value">${nota.hora_chegada || '-'}</div>
                            </div>
                            <div class="nota-card-field">
                                <div class="nota-card-label">Saída</div>
                                <div class="nota-card-value">${nota.hora_saida || '-'}</div>
                            </div>
                            ${nota.temperatura ? `
                                <div class="nota-card-field">
                                    <div class="nota-card-label">Temperatura</div>
                                    <div class="nota-card-value">${nota.temperatura}</div>
                                </div>
                            ` : ''}
                            ${nota.observacao ? `
                                <div class="nota-card-field nota-card-observacao">
                                    <div class="nota-card-label">Observação</div>
                                    <div class="nota-card-value">${nota.observacao}</div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="nota-card-actions">
                            <button class="btn-action edit" onclick="editNotaFiscal('${nota.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-action delete" onclick="confirmDelete('${nota.id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Ordenação
function handleSort(column) {
    // Se clicou na mesma coluna, inverte direção
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nova coluna: sempre começa ascendente, exceto data que começa descendente
        currentSortColumn = column;
        currentSortDirection = column === 'data' ? 'desc' : 'asc';
    }
    
    // Atualizar indicadores visuais
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('active');
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.textContent = '⇅';
    });
    
    const activeHeader = document.querySelector(`[data-column="${column}"]`);
    if (activeHeader) {
        activeHeader.classList.add('active');
        const icon = activeHeader.querySelector('.sort-icon');
        if (icon) {
            icon.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
        }
    }
    
    // Aplicar ordenação
    applyFilters();
}

function sortNotas(notas, column, direction) {
    return notas.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Tratar valores nulos
        if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;
        
        // Conversão de tipos para comparação correta
        if (column === 'valor') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        } else if (column === 'numero_nf') {
            aVal = aVal.toString();
            bVal = bVal.toString();
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        // Comparação
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return direction === 'asc' ? comparison : -comparison;
    });
}

// Modals
function openNewNFModal() {
    editingNFId = null;
    document.getElementById('modalTitle').textContent = 'Nova Nota Fiscal';
    document.getElementById('statusGroup').style.display = 'none';
    nfForm.reset();
    nfModal.classList.add('active');
}

async function editNotaFiscal(id) {
    editingNFId = id;
    const nota = notasFiscais.find(n => n.id === id);
    
    if (!nota) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Nota Fiscal';
    document.getElementById('nfId').value = nota.id;
    document.getElementById('nfData').value = nota.data;
    document.getElementById('nfFornecedor').value = nota.fornecedor;
    document.getElementById('nfNumero').value = formatNFNumber(nota.numero_nf);
    document.getElementById('nfValor').value = formatCurrencyDisplay(nota.valor);
    document.getElementById('nfHoraChegada').value = nota.hora_chegada || '';
    document.getElementById('nfTemperatura').value = nota.temperatura || '';
    document.getElementById('nfHoraSaida').value = nota.hora_saida || '';
    document.getElementById('nfObservacao').value = nota.observacao || '';
    document.getElementById('nfStatus').value = nota.status;
    document.getElementById('statusGroup').style.display = 'flex';
    
    nfModal.classList.add('active');
}

function closeNFModal() {
    nfModal.classList.remove('active');
    editingNFId = null;
    nfForm.reset();
}

function confirmDelete(id) {
    deleteNFId = id;
    confirmModal.classList.add('active');
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    deleteNFId = null;
}

// Submit form
async function handleNFSubmit(e) {
    e.preventDefault();
    
    const formData = {
        data: document.getElementById('nfData').value,
        fornecedor: document.getElementById('nfFornecedor').value,
        numero_nf: document.getElementById('nfNumero').value.replace(/\./g, ''),
        valor: parseCurrency(document.getElementById('nfValor').value),
        hora_chegada: document.getElementById('nfHoraChegada').value,
        temperatura: document.getElementById('nfTemperatura').value || null,
        hora_saida: document.getElementById('nfHoraSaida').value || null,
        observacao: document.getElementById('nfObservacao').value || null,
        fiscal_nome: currentUser.nome,
        fiscal_id: currentUser.id
    };
    
    try {
        if (editingNFId) {
            // Atualizar
            formData.status = document.getElementById('nfStatus').value;
            
            const { error } = await supabaseClient
                .from('notas_fiscais')
                .update(formData)
                .eq('id', editingNFId);
            
            if (error) throw error;
            
            console.log('✅ Nota fiscal atualizada');
        } else {
            // Criar nova
            formData.status = 'Não Acatada';
            
            const { error } = await supabaseClient
                .from('notas_fiscais')
                .insert([formData]);
            
            if (error) throw error;
            
            console.log('✅ Nova nota fiscal criada');
        }
        
        closeNFModal();
        await loadNotasFiscais();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao salvar nota fiscal:', error);
        alert('Erro ao salvar nota fiscal');
    }
}

// Deletar
async function deleteNotaFiscal() {
    if (!deleteNFId) return;
    
    try {
        const { error } = await supabaseClient
            .from('notas_fiscais')
            .delete()
            .eq('id', deleteNFId);
        
        if (error) throw error;
        
        console.log('✅ Nota fiscal excluída');
        closeConfirmModal();
        await loadNotasFiscais();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao excluir nota fiscal:', error);
        alert('Erro ao excluir nota fiscal');
    }
}

// Filtros
function applyFilters() {
    const fornecedor = document.getElementById('filterFornecedor').value.toLowerCase();
    const nf = document.getElementById('filterNF').value;
    const status = document.getElementById('filterStatus').value;
    
    // Usar selectedDates global
    const datas = selectedDates;
    
    const filtered = notasFiscais.filter(nota => {
        const matchFornecedor = !fornecedor || nota.fornecedor.toLowerCase().includes(fornecedor);
        const matchNF = !nf || nota.numero_nf.toString().includes(nf.replace(/\./g, ''));
        const matchData = datas.length === 0 || datas.includes(nota.data);
        const matchStatus = !status || nota.status === status;
        
        return matchFornecedor && matchNF && matchData && matchStatus;
    });
    
    // Aplicar ordenação atual
    const sorted = sortNotas([...filtered], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
}

function clearFilters() {
    document.getElementById('filterFornecedor').value = '';
    document.getElementById('filterNF').value = '';
    document.getElementById('filterData').value = '';
    document.getElementById('filterStatus').value = '';
    
    // Limpar datas selecionadas
    selectedDates = [];
    updateDateDisplay();
    
    // Aplicar ordenação atual
    const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
}

// Exportar relatório
async function exportReport() {
    try {
        const table = document.querySelector('.table-section');
        if (!table) return;
        
        const canvas = await html2canvas(table, {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        
        const link = document.createElement('a');
        link.download = `relatorio-notas-fiscais-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        console.log('✅ Relatório exportado');
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Erro ao exportar relatório');
    }
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
    if (value.length > 3) {
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    e.target.value = value;
}

function formatNFNumber(value) {
    if (!value) return '';
    let numStr = value.toString().replace(/\./g, '');
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Sistema de múltiplas datas
let selectedDates = [];

function openDatePicker() {
    document.getElementById('datePickerHelper').showPicker();
}

function handleDateSelection(e) {
    const selectedDate = e.target.value;
    if (!selectedDate) return;
    
    // Adicionar se não existir
    if (!selectedDates.includes(selectedDate)) {
        selectedDates.push(selectedDate);
        updateDateDisplay();
        applyFilters();
    }
    
    // Limpar o helper para permitir nova seleção
    e.target.value = '';
}

function updateDateDisplay() {
    const display = document.getElementById('selectedDatesDisplay');
    const input = document.getElementById('filterData');
    
    if (selectedDates.length === 0) {
        display.innerHTML = '';
        input.value = '';
        return;
    }
    
    // Atualizar input oculto com datas
    input.value = selectedDates.join(',');
    
    // Criar tags visuais
    display.innerHTML = selectedDates
        .map(date => {
            const displayDate = formatDate(date);
            return `
                <div class="date-tag">
                    ${displayDate}
                    <button type="button" onclick="removeDate('${date}')">×</button>
                </div>
            `;
        })
        .join('');
}

function removeDate(date) {
    selectedDates = selectedDates.filter(d => d !== date);
    updateDateDisplay();
    applyFilters();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Tornar funções globais
window.editNotaFiscal = editNotaFiscal;
window.confirmDelete = confirmDelete;
window.removeDate = removeDate;


/* ===== NOVO RELATÓRIO ===== */

function gerarRelatorioCustom(notas) {
    const hoje = new Date().toLocaleDateString('pt-BR');
    let total = notas.reduce((acc, n) => acc + (parseFloat(n.valor) || 0), 0);

    let html = `
    <div style="font-family: Arial; padding:20px; width:600px; background:white;">
        <h2 style="color:#2563eb;">Relatório de Notas Fiscais</h2>
        <p><strong>Data:</strong> ${hoje}</p>
        <p><strong>Total de notas:</strong> ${notas.length}</p>
        <p><strong>Valor total:</strong> R$ ${total.toFixed(2)}</p>
        <hr>
        ${notas.map(n => `
            <div style="margin-bottom:10px;">
                <strong>${n.fornecedor}</strong><br>
                NF: ${n.numero_nf} | 
                Valor: R$ ${n.valor} | 
                Status: ${n.status}
            </div>
        `).join("")}
    </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    html2canvas(container).then(canvas => {
        const link = document.createElement("a");
        link.download = "relatorio.png";
        link.href = canvas.toDataURL();
        link.click();
        document.body.removeChild(container);
    });

    const texto = `📊 *Relatório de Notas Fiscais*\n📅 Data: ${hoje}\n📦 Quantidade: ${notas.length}\n💰 Total: R$ ${total.toFixed(2)}`;
    navigator.clipboard.writeText(texto);
}
