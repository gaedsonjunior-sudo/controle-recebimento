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

    // Toggle Filtros (botão removido, mas mantém segurança caso reativado)
    if (toggleFiltersBtn) toggleFiltersBtn.addEventListener('click', toggleFilters);

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
    document.getElementById('openDatePicker').addEventListener('click', toggleRangeCal);
    document.getElementById('filterData').addEventListener('click', toggleRangeCal);
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
        // O Supabase retorna no máximo 1000 registros por requisição.
        // Fazemos buscas em páginas de 1000 até esgotar todos os registros.
        const PAGE_SIZE = 1000;
        let allData = [];
        let from = 0;
        let keepFetching = true;

        while (keepFetching) {
            const { data, error } = await supabaseClient
                .from('notas_fiscais')
                .select('*')
                .order('data', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;

            const page = data || [];
            allData = allData.concat(page);

            if (page.length < PAGE_SIZE) {
                keepFetching = false; // última página
            } else {
                from += PAGE_SIZE;
            }
        }

        notasFiscais = allData;

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
                            ${isAdmin ? `
                                <button class="btn-action delete" onclick="confirmDelete('${nota.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
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
                            ${isAdmin ? `
                                <button class="btn-action delete" onclick="confirmDelete('${nota.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            ` : ''}
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
    const lockFields = ['nfData', 'nfFornecedor', 'nfNumero', 'nfValor', 'nfHoraChegada'];
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

    // ✅ usa a variável correta
    if (!isAdmin) {
        alert('Você não tem permissão para excluir notas fiscais.');
        return;
    }

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
    document.getElementById('filterData').value = '';
    document.getElementById('filterStatus').value = '';

    selectedDates = [];
    updateDateDisplay();

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
    const linhas = document.querySelectorAll('#notasTableBody tr');
    const notas  = [];

    linhas.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length === 0) return;
        const rowId       = tr.getAttribute('data-id');
        const notaOrig    = notasFiscais.find(n => n.id === rowId);
        const statusReal  = notaOrig ? notaOrig.status
                          : (tds[8]?.querySelector('.status-badge')?.innerText?.trim() || '');
        notas.push({
            data:       tds[0]?.innerText?.trim() || '',
            fornecedor: tds[1]?.innerText?.trim() || '',
            numero_nf:  tds[2]?.innerText?.trim() || '',
            valor:      tds[3]?.innerText?.trim() || '',
            status:     statusReal
        });
    });

    if (notas.length === 0) { showToast('Nenhuma nota para exportar.', 'info'); return; }

    const hoje      = new Date().toLocaleDateString('pt-BR');
    const valorTotal = notas.reduce((acc, n) => {
        return acc + (parseFloat(n.valor.replace(/[R$\s.]/g, '').replace(',', '.')) || 0);
    }, 0);
    const qtdAcatadas    = notas.filter(n => n.status === 'Acatada').length;
    const qtdNaoAcatadas = notas.filter(n => n.status === 'Não Acatada').length;
    const qtdDevolvidas  = notas.filter(n => n.status === 'Devolvida').length;

    // Período selecionado no filtro
    const periodoFiltro = (() => {
        if (rangeStart && rangeEnd && rangeStart !== rangeEnd)
            return `${formatDate(rangeStart)} a ${formatDate(rangeEnd)}`;
        if (rangeStart)
            return formatDate(rangeStart);
        return 'Todas as datas';
    })();

    function statusStyle(s) {
        if (s === 'Acatada')     return { bg: '#f0fdf4', color: '#15803d' };
        if (s === 'Não Acatada') return { bg: '#fef2f2', color: '#b91c1c' };
        if (s === 'Devolvida')   return { bg: '#fffbeb', color: '#b45309' };
        return { bg: '#f0f9ff', color: '#0369a1' };
    }

    const reportHTML = `
        <div id="relatorioContainer" style="
            font-family:'Segoe UI',Arial,sans-serif;
            background:#ffffff;
            width:900px;
            padding:40px 48px;
            box-sizing:border-box;
            color:#1e293b;
        ">
            <!-- Cabeçalho -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;
                        margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #0284c7;">
                <div>
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#0284c7;">
                        📋 Relatório de Notas Fiscais
                    </h1>
                    <p style="margin:5px 0 0;font-size:12px;color:#64748b;">
                        Gerado em ${hoje} &nbsp;|&nbsp;
                        <strong style="color:#0369a1;">Período: ${periodoFiltro}</strong>
                    </p>
                </div>
                <div style="text-align:right;font-size:13px;color:#64748b;">
                    <strong style="font-size:14px;color:#0f172a;">
                        ${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}
                    </strong><br>
                    Valor total:
                    <strong style="color:#0f172a;">
                        R$ ${valorTotal.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}
                    </strong>
                </div>
            </div>

            <!-- Cards resumo -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;">
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#0284c7;">${notas.length}</div>
                    <div style="font-size:11px;color:#0369a1;margin-top:4px;font-weight:600;text-transform:uppercase;">Total</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#16a34a;">${qtdAcatadas}</div>
                    <div style="font-size:11px;color:#15803d;margin-top:4px;font-weight:600;text-transform:uppercase;">Acatadas</div>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#dc2626;">${qtdNaoAcatadas}</div>
                    <div style="font-size:11px;color:#b91c1c;margin-top:4px;font-weight:600;text-transform:uppercase;">Não Acatadas</div>
                </div>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#d97706;">${qtdDevolvidas}</div>
                    <div style="font-size:11px;color:#b45309;margin-top:4px;font-weight:600;text-transform:uppercase;">Devolvidas</div>
                </div>
            </div>

            <!-- Tabela -->
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#334155;font-weight:600;width:78px;">Data</th>
                        <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#334155;font-weight:600;">Fornecedor</th>
                        <th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#334155;font-weight:600;width:80px;">Nº NF</th>
                        <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #e2e8f0;color:#334155;font-weight:600;width:105px;">Valor</th>
                        <th style="padding:10px 8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#334155;font-weight:600;width:100px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${notas.map((n, i) => {
                        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                        const s  = statusStyle(n.status);
                        return `
                            <tr style="background:${bg};">
                                <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:center;">${n.data}</td>
                                <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:500;">${n.fornecedor}</td>
                                <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:center;">${n.numero_nf}</td>
                                <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;font-weight:600;">${n.valor}</td>
                                <td style="padding:9px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">
                                    <span style="background:${s.bg};color:${s.color};padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap;display:inline-block;">${n.status}</span>
                                </td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>

            <!-- Rodapé -->
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
                Relatório gerado automaticamente pelo sistema NF Manager
            </div>
        </div>`;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
    wrapper.innerHTML = reportHTML;
    document.body.appendChild(wrapper);
    const container = wrapper.querySelector('#relatorioContainer');

    showToast('⏳ Gerando relatório...', 'info');

    try {
        const canvas = await html2canvas(container, {
            scale: 2, backgroundColor: '#ffffff',
            useCORS: true, logging: false,
            width: container.offsetWidth, height: container.offsetHeight
        });
        const link = document.createElement('a');
        link.download = `relatorio-nf-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Erro ao gerar relatório:', err);
        showToast('❌ Erro ao gerar o relatório.', 'error');
        document.body.removeChild(wrapper);
        return;
    }

    document.body.removeChild(wrapper);

    const valorFmt   = 'R$ ' + valorTotal.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    const listaTexto = notas.map(n => `${n.data} | ${n.fornecedor} | NF ${n.numero_nf} | ${n.valor} | ${n.status}`).join('\n');
    const textoWA =
`📊 *Relatório de Notas Fiscais*
📅 Gerado em: ${hoje}
📆 Período: ${periodoFiltro}
📦 Total: ${notas.length}
💰 Valor: ${valorFmt}
✅ Acatadas: ${qtdAcatadas}
❌ Não Acatadas: ${qtdNaoAcatadas}
↩️ Devolvidas: ${qtdDevolvidas}

*Lista:*
Data | Fornecedor | NF | Valor | Status
${listaTexto}`;

    try {
        await navigator.clipboard.writeText(textoWA);
        showToast('✅ Relatório salvo e texto copiado para o WhatsApp!', 'success');
    } catch {
        showToast('✅ Relatório salvo! (texto não pôde ser copiado)', 'success');
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

// ── RANGE DATE PICKER ────────────────────────────────────────────────────────
// O calendário é inserido no <body> para escapar de qualquer overflow:hidden
let selectedDates = [];
let rangeStart    = null;
let rangeEnd      = null;
let rcYear        = null;
let rcMonth       = null;
let rcIsOpen      = false;
let rcEl          = null; // referência ao elemento do calendário no DOM

function formatDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

// Garante que o elemento existe no body
function getRcEl() {
    if (!rcEl || !document.body.contains(rcEl)) {
        rcEl = document.createElement('div');
        rcEl.id = 'rangeCalendar';
        rcEl.className = 'range-calendar';
        document.body.appendChild(rcEl);
    }
    return rcEl;
}

function positionRcEl() {
    const btn  = document.getElementById('openDatePicker');
    const inp  = document.getElementById('filterData');
    const ref  = btn || inp;
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const cal  = getRcEl();
    const calW = 272;
    let left = rect.left;
    // Não sair da tela pela direita
    if (left + calW > window.innerWidth - 8) left = window.innerWidth - calW - 8;
    cal.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
    cal.style.left = (left + window.scrollX) + 'px';
}

function toggleRangeCal(e) {
    e.preventDefault();
    e.stopPropagation();
    if (rcIsOpen) { closeRangeCal(); return; }
    openRangeCal();
}

function openRangeCal() {
    const now = new Date();
    rcYear  = now.getFullYear();
    rcMonth = now.getMonth();
    const cal = getRcEl();
    renderRangeCal();
    positionRcEl();
    cal.classList.add('rc-open');
    rcIsOpen = true;
}

function closeRangeCal() {
    const cal = getRcEl();
    cal.classList.remove('rc-open');
    rcIsOpen = false;
}

function clearRangeState() {
    rangeStart = null;
    rangeEnd   = null;
    selectedDates = [];
    const inp  = document.getElementById('filterData');
    const disp = document.getElementById('selectedDatesDisplay');
    if (inp)  inp.value = '';
    if (disp) disp.innerHTML = '';
    if (rcIsOpen) renderRangeCal();
}

function buildRange(s, e) {
    const result = [];
    const cur = new Date(s + 'T00:00:00');
    const end = new Date(e + 'T00:00:00');
    while (cur <= end) {
        result.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return result;
}

function updateRangeInput() {
    const inp  = document.getElementById('filterData');
    const disp = document.getElementById('selectedDatesDisplay');
    if (!rangeStart) {
        if (inp)  inp.value = '';
        if (disp) disp.innerHTML = '';
        return;
    }
    if (!rangeEnd) {
        if (inp) inp.value = formatDate(rangeStart);
        if (disp) disp.innerHTML = '';
        return;
    }
    const label = rangeStart === rangeEnd
        ? formatDate(rangeStart)
        : `${formatDate(rangeStart)} → ${formatDate(rangeEnd)}`;
    if (inp)  inp.value = label;
    if (disp) disp.innerHTML =
        `<div class="date-tag">${label}` +
        `<button type="button" onclick="clearRangeState();applyFilters();">×</button></div>`;
}

function renderRangeCal() {
    const cal = getRcEl();

    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const WDAYS  = ['D','S','T','Q','Q','S','S'];

    const today = new Date(); today.setHours(0,0,0,0);
    const first = new Date(rcYear, rcMonth, 1).getDay();
    const total = new Date(rcYear, rcMonth + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < first; i++) cells += '<div class="rc-day rc-empty"></div>';

    for (let d = 1; d <= total; d++) {
        const ds = `${rcYear}-${String(rcMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dt = new Date(rcYear, rcMonth, d);
        let cls  = 'rc-day';
        if (dt.getTime() === today.getTime()) cls += ' rc-today';

        if (rangeStart && rangeEnd) {
            const s = new Date(rangeStart + 'T00:00:00');
            const e = new Date(rangeEnd   + 'T00:00:00');
            if      (ds === rangeStart)  cls += ' rc-start rc-range-left';
            else if (ds === rangeEnd)    cls += ' rc-end rc-range-right';
            else if (dt > s && dt < e)   cls += ' rc-in-range';
        } else if (rangeStart && ds === rangeStart) {
            cls += ' rc-start';
        }
        cells += `<div class="${cls}" data-date="${ds}">${d}</div>`;
    }

    const hint = !rangeStart ? 'Clique no 1º dia' : (!rangeEnd ? 'Agora clique no último' : '');

    cal.innerHTML =
        `<div class="rc-header">` +
            `<button class="rc-nav-btn" id="rcPrev">&#8249;</button>` +
            `<span class="rc-month-label">${MONTHS[rcMonth]} ${rcYear}</span>` +
            `<button class="rc-nav-btn" id="rcNext">&#8250;</button>` +
        `</div>` +
        `<div class="rc-grid">` +
            WDAYS.map(w => `<div class="rc-wday">${w}</div>`).join('') +
            cells +
        `</div>` +
        `<div class="rc-footer">` +
            `<span class="rc-hint">${hint}</span>` +
            `<button class="rc-clear-btn" id="rcClear">Limpar</button>` +
        `</div>`;

    cal.querySelector('#rcPrev').onclick = ev => {
        ev.stopPropagation();
        rcMonth--; if (rcMonth < 0) { rcMonth = 11; rcYear--; }
        renderRangeCal();
    };
    cal.querySelector('#rcNext').onclick = ev => {
        ev.stopPropagation();
        rcMonth++; if (rcMonth > 11) { rcMonth = 0; rcYear++; }
        renderRangeCal();
    };
    cal.querySelector('#rcClear').onclick = ev => {
        ev.stopPropagation();
        clearRangeState();
        applyFilters();
    };
    cal.querySelectorAll('.rc-day:not(.rc-empty)').forEach(cell => {
        cell.onclick = ev => {
            ev.stopPropagation();
            const ds = cell.dataset.date;
            if (!rangeStart || (rangeStart && rangeEnd)) {
                rangeStart = ds; rangeEnd = null;
            } else {
                rangeEnd = ds < rangeStart ? rangeStart : ds;
                if (ds < rangeStart) rangeStart = ds;
                selectedDates = buildRange(rangeStart, rangeEnd);
                updateRangeInput();
                applyFilters();
                setTimeout(closeRangeCal, 150);
            }
            renderRangeCal();
        };
    });
}

// Fechar ao clicar fora
document.addEventListener('click', ev => {
    if (!rcIsOpen) return;
    const cal = getRcEl();
    const btn = document.getElementById('openDatePicker');
    const inp = document.getElementById('filterData');
    if (!cal.contains(ev.target) && ev.target !== btn && ev.target !== inp) {
        closeRangeCal();
    }
}, true);

// Reposicionar ao rolar/redimensionar
window.addEventListener('scroll', () => { if (rcIsOpen) positionRcEl(); }, true);
window.addEventListener('resize', () => { if (rcIsOpen) positionRcEl(); });

function updateDateDisplay() { updateRangeInput(); }
function removeDate() { clearRangeState(); applyFilters(); }

// Tornar funções globais
window.editNotaFiscal  = editNotaFiscal;
window.confirmDelete   = confirmDelete;
window.removeDate      = removeDate;
window.clearRangeState = clearRangeState;
