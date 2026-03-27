// Estado da aplicação
let currentUser = null;
let isAdmin = false;
let notasFiscais = [];
let editingNFId = null;
let deleteNFId = null;

// Controle de ordenação
let currentSortColumn = 'data';
let currentSortDirection = 'desc';
let sortHistory = [];

// Variável para o cliente Supabase
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

// ========================================
// FUNÇÕES DE FORMATAÇÃO (declaradas cedo para hoisting explícito)
// ========================================

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function formatCurrencyDisplay(value) {
    if (!value) return 'R$ 0,00';
    const num = parseFloat(value);
    return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function formatNFNumber(value) {
    if (!value) return '';
    let numStr = value.toString().replace(/\./g, '');
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        supabaseClient = window.supabaseClient;

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

// Atualizar exibição do usuário
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

    // Exportar Relatório — único listener
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
    document.getElementById('filterData').addEventListener('click', openDatePicker);
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

// Setup listeners de ordenação
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

        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: password
        });

        if (authError) {
            console.error('Erro de autenticação:', authError);
            throw new Error('Senha incorreta');
        }

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

        const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
        renderNotasFiscais(sorted);

        setupSortListeners();

    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        alert('Erro ao carregar notas fiscais');
    }
}

// Renderizar notas fiscais (desktop e mobile)
function renderNotasFiscais(notas) {
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
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = column === 'data' ? 'desc' : 'asc';
    }

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

    applyFilters();
}

function sortNotas(notas, column, direction) {
    return notas.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;

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

    document.getElementById('modalTitle').textContent = isAdmin ? 'Editar Nota Fiscal' : 'Atualizar Nota Fiscal';
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
    document.getElementById('statusGroup').style.display = isAdmin ? 'flex' : 'none';

    // Campos bloqueados para fiscal (somente leitura)
    const fiscalReadonly = !isAdmin;
    const lockFields = ['nfData', 'nfFornecedor', 'nfNumero', 'nfValor', 'nfHoraChegada', 'nfObservacao'];
    lockFields.forEach(fid => {
        const el = document.getElementById(fid);
        if (fiscalReadonly) {
            el.setAttribute('readonly', true);
            el.style.background = '#f8fafc';
            el.style.color = '#94a3b8';
            el.style.cursor = 'not-allowed';
        } else {
            el.removeAttribute('readonly');
            el.style.background = '';
            el.style.color = '';
            el.style.cursor = '';
        }
    });

    // Campos editáveis para fiscal
    const editableFields = ['nfTemperatura', 'nfHoraSaida'];
    editableFields.forEach(fid => {
        const el = document.getElementById(fid);
        el.removeAttribute('readonly');
        el.style.background = '';
        el.style.color = '';
        el.style.cursor = '';
    });

    nfModal.classList.add('active');
}

function closeNFModal() {
    nfModal.classList.remove('active');
    editingNFId = null;
    nfForm.reset();
    // Restaurar todos os campos para estado normal
    ['nfData','nfFornecedor','nfNumero','nfValor','nfHoraChegada','nfObservacao','nfTemperatura','nfHoraSaida'].forEach(fid => {
        const el = document.getElementById(fid);
        if (el) {
            el.removeAttribute('readonly');
            el.style.background = '';
            el.style.color = '';
            el.style.cursor = '';
        }
    });
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
            formData.status = document.getElementById('nfStatus').value;

            const { error } = await supabaseClient
                .from('notas_fiscais')
                .update(formData)
                .eq('id', editingNFId);

            if (error) throw error;
            console.log('✅ Nota fiscal atualizada');
        } else {
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
    const datas = selectedDates;

    const filtered = notasFiscais.filter(nota => {
        const matchFornecedor = !fornecedor || nota.fornecedor.toLowerCase().includes(fornecedor);
        const matchNF = !nf || nota.numero_nf.toString().includes(nf.replace(/\./g, ''));
        const matchData = datas.length === 0 || datas.includes(nota.data);
        const matchStatus = !status || nota.status === status;

        return matchFornecedor && matchNF && matchData && matchStatus;
    });

    const sorted = sortNotas([...filtered], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
}

function clearFilters() {
    document.getElementById('filterFornecedor').value = '';
    document.getElementById('filterNF').value = '';
    document.getElementById('filterStatus').value = '';

    rangeStart = null;
    rangeEnd   = null;
    selectedDates = [];
    updateRangeDisplay();

    const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
}

// ========================================
// TOAST DE NOTIFICAÇÃO
// ========================================
function showToast(msg, tipo = 'success') {
    // Remove toast anterior se existir
    const existing = document.getElementById('appToast');
    if (existing) existing.remove();

    const bgMap = {
        success: '#16a34a',
        info:    '#0284c7',
        error:   '#dc2626'
    };

    const toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: ${bgMap[tipo] || bgMap.success};
        color: white;
        padding: 12px 22px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.25s ease;
        white-space: nowrap;
        max-width: 90vw;
        text-align: center;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
    });

    // Remover após 3.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ========================================
// EXPORTAR RELATÓRIO PROFISSIONAL
// ========================================
async function exportReport() {
    // Coletar notas visíveis na tabela (respeita filtros ativos)
    // Usa o array notasFiscais filtrado via DOM para garantir contagem correta
    const linhas = document.querySelectorAll('#notasTableBody tr');
    const notas = [];

    linhas.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length > 0) {
            // Status: lê o data-id da linha e busca no array notasFiscais para garantir valor correto
            const rowId = tr.getAttribute('data-id');
            const notaOriginal = notasFiscais.find(n => n.id === rowId);
            const statusReal = notaOriginal ? notaOriginal.status : (tds[8]?.querySelector('.status-badge')?.innerText?.trim() || '');

            notas.push({
                data: tds[0]?.innerText?.trim() || '',
                fornecedor: tds[1]?.innerText?.trim() || '',
                numero_nf: tds[2]?.innerText?.trim() || '',
                valor: tds[3]?.innerText?.trim() || '',
                status: statusReal
            });
        }
    });

    if (notas.length === 0) {
        showToast('Nenhuma nota para exportar.', 'info');
        return;
    }

    const hoje = new Date().toLocaleDateString('pt-BR');
    const valorTotal = notas.reduce((acc, n) => {
        const v = parseFloat(n.valor.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        return acc + v;
    }, 0);

    // Contagem correta diretamente do array
    const qtdAcatadas    = notas.filter(n => n.status === 'Acatada').length;
    const qtdNaoAcatadas = notas.filter(n => n.status === 'Não Acatada').length;
    const qtdDevolvidas  = notas.filter(n => n.status === 'Devolvida').length;

    // Helper de cor dos badges no relatório
    // Acatada=verde, Não Acatada=vermelho, Devolvida=amarelo/âmbar
    function statusStyle(status) {
        if (status === 'Acatada')     return { bg: '#f0fdf4', color: '#15803d' };
        if (status === 'Não Acatada') return { bg: '#fef2f2', color: '#b91c1c' };
        if (status === 'Devolvida')   return { bg: '#fffbeb', color: '#b45309' };
        return { bg: '#f0f9ff', color: '#0369a1' };
    }

    // ---- Montar HTML do relatório profissional ----
    const reportHTML = `
        <div id="relatorioContainer" style="
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            width: 860px;
            padding: 40px 48px;
            box-sizing: border-box;
            color: #1e293b;
        ">
            <!-- Cabeçalho -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #0284c7;">
                <div>
                    <h1 style="margin:0; font-size:22px; font-weight:700; color:#0284c7;">📋 Relatório de Notas Fiscais</h1>
                    <p style="margin:6px 0 0; font-size:13px; color:#64748b;">Gerado em ${hoje}</p>
                </div>
                <div style="text-align:right; font-size:13px; color:#64748b;">
                    <strong style="font-size:14px; color:#0f172a;">${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}</strong><br>
                    Valor total: <strong style="color:#0f172a;">R$ ${valorTotal.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}</strong>
                </div>
            </div>

            <!-- Resumo — 4 cards com cores corretas -->
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px;">
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#0284c7;">${notas.length}</div>
                    <div style="font-size:11px; color:#0369a1; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">Total</div>
                </div>
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#16a34a;">${qtdAcatadas}</div>
                    <div style="font-size:11px; color:#15803d; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">Acatadas</div>
                </div>
                <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:14px; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#dc2626;">${qtdNaoAcatadas}</div>
                    <div style="font-size:11px; color:#b91c1c; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">Não Acatadas</div>
                </div>
                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px; text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#d97706;">${qtdDevolvidas}</div>
                    <div style="font-size:11px; color:#b45309; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">Devolvidas</div>
                </div>
            </div>

            <!-- Tabela de notas -->
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #e2e8f0; color:#334155; font-weight:600; width:80px;">Data</th>
                        <th style="padding:10px 8px; text-align:left; border-bottom:2px solid #e2e8f0; color:#334155; font-weight:600;">Fornecedor</th>
                        <th style="padding:10px 8px; text-align:right; border-bottom:2px solid #e2e8f0; color:#334155; font-weight:600; width:105px;">Valor</th>
                        <th style="padding:10px 8px; text-align:center; border-bottom:2px solid #e2e8f0; color:#334155; font-weight:600; width:100px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${notas.map((n, i) => {
                        const bgRow = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                        const s = statusStyle(n.status);
                        return `
                            <tr style="background:${bgRow};">
                                <td style="padding:9px 8px; border-bottom:1px solid #f1f5f9; color:#475569; text-align:center;">${n.data}</td>
                                <td style="padding:9px 8px; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:500;">${n.fornecedor}</td>
                                <td style="padding:9px 8px; border-bottom:1px solid #f1f5f9; text-align:right; color:#0f172a; font-weight:600;">${n.valor}</td>
                                <td style="padding:9px 8px; border-bottom:1px solid #f1f5f9; text-align:center;">
                                    <span style="background:${s.bg}; color:${s.color}; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:700; white-space:nowrap; display:inline-block;">${n.status}</span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <!-- Rodapé -->
            <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center;">
                Relatório gerado automaticamente pelo sistema NF Manager
            </div>
        </div>
    `;

    // Inserir no body fora da tela visível
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed; left:-9999px; top:0; z-index:-1;';
    wrapper.innerHTML = reportHTML;
    document.body.appendChild(wrapper);

    const container = wrapper.querySelector('#relatorioContainer');

    showToast('⏳ Gerando relatório...', 'info');

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            width: container.offsetWidth,
            height: container.offsetHeight
        });

        // Download da imagem
        const link = document.createElement('a');
        link.download = `relatorio-nf-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        console.log('✅ Relatório exportado');
    } catch (err) {
        console.error('Erro ao gerar imagem:', err);
        showToast('❌ Erro ao gerar o relatório. Verifique o console.', 'error');
        document.body.removeChild(wrapper);
        return;
    }

    document.body.removeChild(wrapper);

    // ---- Texto para WhatsApp ----
    const valorFmt = 'R$ ' + valorTotal.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    const listaTexto = notas.map(n => `${n.data} | ${n.fornecedor} | ${n.valor} | ${n.status}`).join('\n');
    const textoWhatsApp =
`📊 *Relatório de Notas Fiscais*
📅 Data: ${hoje}
📦 Total: ${notas.length}
💰 Valor: ${valorFmt}
✅ Acatadas: ${qtdAcatadas}
❌ Não Acatadas: ${qtdNaoAcatadas}
↩️ Devolvidas: ${qtdDevolvidas}

*Lista:*
Data | Fornecedor | Valor | Status
${listaTexto}`;

    try {
        await navigator.clipboard.writeText(textoWhatsApp);
        showToast('✅ Relatório salvo e texto copiado para o WhatsApp!', 'success');
    } catch {
        showToast('✅ Relatório salvo! (texto não copiado — permissão negada)', 'success');
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

// ========================================
// RANGE DATE PICKER (calendário de período)
// ========================================

let rangeStart = null;   // string 'YYYY-MM-DD'
let rangeEnd   = null;
let calViewYear  = null;
let calViewMonth = null;
let calOpen = false;

// Alias mantido para compatibilidade com clearFilters e applyFilters
let selectedDates = [];

function openDatePicker() {
    const cal = document.getElementById('rangeCalendar');
    if (calOpen) {
        closeRangeCalendar();
        return;
    }
    const now = new Date();
    calViewYear  = now.getFullYear();
    calViewMonth = now.getMonth();
    renderCalendar();
    // Position below the input field
    const btn = document.getElementById('openDatePicker');
    const rect = btn.getBoundingClientRect();
    cal.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
    cal.style.left = (rect.left  + window.scrollX)     + 'px';
    cal.classList.add('open');
    calOpen = true;
}

function closeRangeCalendar() {
    const cal = document.getElementById('rangeCalendar');
    cal.classList.remove('open');
    calOpen = false;
}

function renderCalendar() {
    const cal = document.getElementById('rangeCalendar');
    const today = new Date();
    today.setHours(0,0,0,0);

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const weekDays = ['D','S','T','Q','Q','S','S'];

    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    // Build day cells
    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        cells += `<div class="rc-day rc-empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calViewYear}-${String(calViewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dateObj = new Date(calViewYear, calViewMonth, d);

        let cls = 'rc-day';
        const isToday = dateObj.getTime() === today.getTime();
        if (isToday) cls += ' rc-today';

        if (rangeStart && rangeEnd) {
            const s = new Date(rangeStart + 'T00:00:00');
            const e = new Date(rangeEnd   + 'T00:00:00');
            if (dateStr === rangeStart) cls += ' rc-start rc-range-left';
            else if (dateStr === rangeEnd) cls += ' rc-end rc-range-right';
            else if (dateObj > s && dateObj < e) cls += ' rc-in-range';
        } else if (rangeStart && dateStr === rangeStart) {
            cls += ' rc-start';
        }

        cells += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
    }

    const hintText = !rangeStart
        ? 'Clique no 1º dia'
        : (!rangeEnd ? 'Clique no último dia' : '');

    cal.innerHTML = `
        <div class="rc-header">
            <button type="button" id="rcPrev" title="Mês anterior">&#8249;</button>
            <span class="rc-month-label">${months[calViewMonth]} ${calViewYear}</span>
            <button type="button" id="rcNext" title="Próximo mês">&#8250;</button>
        </div>
        <div class="rc-weekdays">
            ${weekDays.map(w => `<div class="rc-weekday">${w}</div>`).join('')}
        </div>
        <div class="rc-days" id="rcDaysGrid">
            ${cells}
        </div>
        <div class="rc-footer">
            <span class="rc-hint">${hintText}</span>
            <button type="button" class="rc-clear" id="rcClearBtn">Limpar</button>
        </div>
    `;

    document.getElementById('rcPrev').addEventListener('click', (e) => {
        e.stopPropagation();
        calViewMonth--;
        if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
        renderCalendar();
    });

    document.getElementById('rcNext').addEventListener('click', (e) => {
        e.stopPropagation();
        calViewMonth++;
        if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
        renderCalendar();
    });

    document.getElementById('rcDaysGrid').addEventListener('click', (e) => {
        const cell = e.target.closest('.rc-day');
        if (!cell || cell.classList.contains('rc-empty') || cell.classList.contains('rc-other-month')) return;
        const date = cell.dataset.date;
        handleRangeClick(date);
    });

    document.getElementById('rcClearBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        rangeStart = null;
        rangeEnd   = null;
        selectedDates = [];
        updateRangeDisplay();
        applyFilters();
        renderCalendar();
    });
}

function handleRangeClick(dateStr) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start fresh selection
        rangeStart = dateStr;
        rangeEnd   = null;
    } else {
        // Second click — set end, ensure order
        if (dateStr < rangeStart) {
            rangeEnd   = rangeStart;
            rangeStart = dateStr;
        } else if (dateStr === rangeStart) {
            // Same day — single day selection
            rangeEnd = dateStr;
        } else {
            rangeEnd = dateStr;
        }
        // Build selectedDates array with all dates in range
        buildSelectedDatesFromRange();
        updateRangeDisplay();
        applyFilters();
        // Close after selecting end
        setTimeout(closeRangeCalendar, 120);
    }
    renderCalendar();
}

function buildSelectedDatesFromRange() {
    if (!rangeStart || !rangeEnd) { selectedDates = []; return; }
    const result = [];
    const cur = new Date(rangeStart + 'T00:00:00');
    const end = new Date(rangeEnd   + 'T00:00:00');
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth()+1).padStart(2,'0');
        const d = String(cur.getDate()).padStart(2,'0');
        result.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
    }
    selectedDates = result;
}

function updateRangeDisplay() {
    const input   = document.getElementById('filterData');
    const display = document.getElementById('selectedDatesDisplay');

    if (!rangeStart) {
        input.value = '';
        display.innerHTML = '';
        return;
    }

    if (rangeStart && !rangeEnd) {
        input.value = formatDate(rangeStart);
        display.innerHTML = '';
        return;
    }

    if (rangeStart === rangeEnd) {
        input.value = formatDate(rangeStart);
    } else {
        input.value = `${formatDate(rangeStart)} → ${formatDate(rangeEnd)}`;
    }

    display.innerHTML = `
        <div class="date-tag">
            ${input.value}
            <button type="button" onclick="clearDateRange()">×</button>
        </div>
    `;
}

function clearDateRange() {
    rangeStart = null;
    rangeEnd   = null;
    selectedDates = [];
    updateRangeDisplay();
    applyFilters();
}

// Legacy: updateDateDisplay called from clearFilters
function updateDateDisplay() {
    updateRangeDisplay();
}

// Close calendar when clicking outside
document.addEventListener('click', (e) => {
    if (!calOpen) return;
    const cal  = document.getElementById('rangeCalendar');
    const btn  = document.getElementById('openDatePicker');
    const inp  = document.getElementById('filterData');
    if (!cal.contains(e.target) && e.target !== btn && e.target !== inp) {
        closeRangeCalendar();
    }
});

function removeDate(date) {
    selectedDates = selectedDates.filter(d => d !== date);
    updateRangeDisplay();
    applyFilters();
}

// Tornar funções globais
window.editNotaFiscal = editNotaFiscal;
window.confirmDelete = confirmDelete;
window.removeDate = removeDate;
window.clearDateRange = clearDateRange;
