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
        loginError.classList.add('show');
        loginError.style.background = '#fee2e2';
        loginError.style.border = '2px solid #ef4444';
        loginError.style.padding = '16px';
        loginError.style.borderRadius = '8px';
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
        currentUserName.textContent = data.nome;
        currentUserRole.textContent = isAdmin ? 'Administrador' : 'Fiscal';
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Nova NF
    newNFBtn.addEventListener('click', openNewNFModal);
    
    // Toggle Filtros
    toggleFiltersBtn.addEventListener('click', toggleFilters);
    
    // Exportar Relatório
    exportReportBtn.addEventListener('click', exportReport);
    
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
    document.getElementById('filterData').addEventListener('change', applyFilters);
    document.getElementById('filterDataMultiplas').addEventListener('input', formatMultipleDates);
    document.getElementById('filterDataMultiplas').addEventListener('input', applyFilters);
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
    loginError.classList.remove('show');
    
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
        loginError.classList.add('show');
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
    loginScreen.style.display = 'flex';
    mainScreen.classList.remove('active');
    mainScreen.style.display = 'none';
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    loginScreen.style.display = 'none';
    mainScreen.classList.add('active');
    mainScreen.style.display = 'block';
    currentUserName.textContent = currentUser.nome;
    currentUserRole.textContent = isAdmin ? 'Administrador' : 'Fiscal';
    loadNotasFiscais();
}

// Carregar Notas Fiscais
async function loadNotasFiscais() {
    const { data, error } = await supabaseClient
        .from('notas_fiscais')
        .select('*');
    
    if (error) {
        console.error('Erro ao carregar notas:', error);
        return;
    }
    
    notasFiscais = data || [];
    
    // Aplicar ordenação padrão (data desc)
    const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
    
    // Atualizar indicador visual
    const defaultHeader = document.querySelector(`[data-column="${currentSortColumn}"]`);
    if (defaultHeader) {
        defaultHeader.classList.add(`sort-${currentSortDirection}`);
    }
    
    // Configurar listeners de ordenação após renderizar tabela
    setupSortListeners();
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
            <td class="observacao-cell">${nota.observacao || '-'}</td>
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

// Toggle Filtros
function toggleFilters() {
    filtersWrapper.classList.toggle('show');
    
    // Atualizar texto do botão
    if (filtersWrapper.classList.contains('show')) {
        toggleFiltersBtn.innerHTML = '<span class="btn-icon">🔍</span> Ocultar Filtros';
    } else {
        toggleFiltersBtn.innerHTML = '<span class="btn-icon">🔍</span> Filtros';
    }
}

// Exportar Relatório
async function exportReport() {
    try {
        // Pegar apenas as linhas visíveis da tabela
        const tableContainer = document.querySelector('.table-container');
        
        if (!tableContainer) {
            alert('Nenhuma tabela encontrada!');
            return;
        }
        
        // Verificar se há notas para exportar
        const rows = document.querySelectorAll('#notasTableBody tr');
        if (rows.length === 0) {
            alert('Nenhuma nota para exportar! Aplique filtros ou adicione notas.');
            return;
        }
        
        // Mostrar loading
        exportReportBtn.disabled = true;
        exportReportBtn.innerHTML = '<span class="btn-icon">⏳</span> Gerando...';
        
        // Criar container para o relatório
        const reportContainer = document.createElement('div');
        reportContainer.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            background: white;
            padding: 30px;
            width: 1000px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        
        // Cabeçalho do relatório
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 20px; border-bottom: 3px solid #007AFF; padding-bottom: 15px;';
        header.innerHTML = `
            <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">📦 Relatório de Notas Fiscais</h1>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Total de registros: ${rows.length}</p>
        `;
        
        // Clonar tabela
        const tableClone = document.querySelector('.notas-table').cloneNode(true);
        tableClone.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
        
        // Remover coluna de ações
        const thActions = tableClone.querySelector('th.actions-column');
        if (thActions) thActions.remove();
        tableClone.querySelectorAll('td.actions-column, .actions-column').forEach(td => td.remove());
        
        // Estilizar tabela
        tableClone.querySelectorAll('th').forEach(th => {
            th.style.cssText = 'background: #F2F2F7; padding: 12px 8px; border: 1px solid #E5E5EA; font-weight: 600; color: #000; text-align: center;';
        });
        
        tableClone.querySelectorAll('td').forEach(td => {
            td.style.cssText = 'padding: 10px 8px; border: 1px solid #E5E5EA; color: #000; text-align: center;';
        });
        
        // Remover linhas vazias do tbody clonado e usar apenas as visíveis
        const tbodyClone = tableClone.querySelector('tbody');
        tbodyClone.innerHTML = '';
        rows.forEach(row => {
            tbodyClone.appendChild(row.cloneNode(true));
        });
        
        // Montar relatório
        reportContainer.appendChild(header);
        reportContainer.appendChild(tableClone);
        document.body.appendChild(reportContainer);
        
        // Capturar como imagem
        const canvas = await html2canvas(reportContainer, {
            backgroundColor: '#ffffff',
            scale: 2, // Melhor qualidade
            logging: false,
            width: 1000,
            windowWidth: 1000
        });
        
        // Remover container temporário
        document.body.removeChild(reportContainer);
        
        // Converter para blob e baixar
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-notas-${new Date().toISOString().slice(0,10)}.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Restaurar botão
            exportReportBtn.disabled = false;
            exportReportBtn.innerHTML = '<span class="btn-icon">📊</span> Exportar Relatório';
            
            alert('Relatório exportado com sucesso! Verifique seus downloads.');
        });
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao gerar relatório. Tente novamente.');
        
        // Restaurar botão
        exportReportBtn.disabled = false;
        exportReportBtn.innerHTML = '<span class="btn-icon">📊</span> Exportar Relatório';
    }
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
    document.getElementById('nfObservacao').value = nota.observacao || '';
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

// Ordenação
function handleSort(column) {
    // Se clicar na mesma coluna, inverte a direção
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nova coluna
        // Adicionar coluna anterior ao histórico (se não for a mesma)
        if (currentSortColumn && currentSortColumn !== column) {
            // Remove da história se já existe
            sortHistory = sortHistory.filter(s => s.column !== currentSortColumn);
            // Adiciona no início
            sortHistory.unshift({
                column: currentSortColumn,
                direction: currentSortDirection
            });
            // Manter apenas últimas 2 ordenações no histórico
            if (sortHistory.length > 2) {
                sortHistory = sortHistory.slice(0, 2);
            }
        }
        
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Atualizar indicadores visuais
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    const activeHeader = document.querySelector(`[data-column="${column}"]`);
    activeHeader.classList.add(`sort-${currentSortDirection}`);
    
    // Aplicar filtros primeiro, depois ordenar
    applyFilters();
}

function sortNotas(notas, column, direction) {
    return notas.sort((a, b) => {
        // Comparar pela coluna principal
        let comparison = compareValues(a[column], b[column], column);
        
        // Se forem iguais, usar histórico de ordenações
        if (comparison === 0 && sortHistory.length > 0) {
            for (let sort of sortHistory) {
                comparison = compareValues(a[sort.column], b[sort.column], sort.column);
                if (comparison !== 0) {
                    // Aplicar direção do histórico
                    comparison = sort.direction === 'asc' ? comparison : -comparison;
                    break;
                }
            }
        }
        
        // Aplicar direção principal
        return direction === 'asc' ? comparison : -comparison;
    });
}

function compareValues(valueA, valueB, column) {
    // Tratar valores nulos
    if (valueA === null || valueA === undefined) return 1;
    if (valueB === null || valueB === undefined) return -1;
    
    if (column === 'valor' || column === 'numero_nf') {
        // Números
        return parseFloat(valueA) - parseFloat(valueB);
    } else if (column === 'data') {
        // Datas
        return new Date(valueA) - new Date(valueB);
    } else if (column === 'hora_chegada' || column === 'hora_saida') {
        // Horas
        return (valueA || '00:00').localeCompare(valueB || '00:00');
    } else {
        // Texto
        return String(valueA).localeCompare(String(valueB), 'pt-BR', { sensitivity: 'base' });
    }
}

// Confirmar delete
function confirmDelete(id) {
    deleteNFId = id;
    confirmModal.classList.add('active');
}

// Deletar Nota Fiscal
async function deleteNotaFiscal() {
    if (!deleteNFId) return;
    
    const { error } = await supabaseClient
        .from('notas_fiscais')
        .delete()
        .eq('id', deleteNFId);
    
    if (error) {
        alert('Erro ao excluir nota fiscal');
        return;
    }
    
    closeConfirmModal();
    await loadNotasFiscais();
    applyFilters(); // Reaplicar filtros após deletar
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
        observacao: document.getElementById('nfObservacao').value || null,
        fiscal_nome: currentUser ? currentUser.nome : 'Sistema', // Manter para compatibilidade
        fiscal_id: currentUser ? currentUser.id : null, // Manter para compatibilidade
        status: isAdmin ? document.getElementById('nfStatus').value : 'Não Acatada'
    };
    
    if (editingNFId) {
        // Atualizar
        // Fiscais podem editar hora_saida e observacao
        const updateData = isAdmin ? nfData : { 
            hora_saida: nfData.hora_saida,
            observacao: nfData.observacao 
        };
        
        const { error } = await supabaseClient
            .from('notas_fiscais')
            .update(updateData)
            .eq('id', editingNFId);
        
        if (error) {
            alert('Erro ao atualizar nota fiscal');
            return;
        }
    } else {
        // Criar nova
        const { error } = await supabaseClient
            .from('notas_fiscais')
            .insert([nfData]);
        
        if (error) {
            console.error('Erro detalhado:', error);
            alert('Erro ao criar nota fiscal: ' + (error.message || 'Erro desconhecido'));
            return;
        }
    }
    
    closeNFModal();
    // Recarregar dados e aplicar filtros mantidos
    await loadNotasFiscais();
    applyFilters(); // Reaplicar filtros após recarregar
}

// Filtros
function applyFilters() {
    const fornecedor = document.getElementById('filterFornecedor').value.toLowerCase();
    const nf = document.getElementById('filterNF').value;
    const dataSingle = document.getElementById('filterData').value; // Data única do calendário
    const dataMultiplasInput = document.getElementById('filterDataMultiplas').value;
    const status = document.getElementById('filterStatus').value;
    
    // Processar múltiplas datas (converter dd/mm/aaaa para aaaa-mm-dd)
    let datas = [];
    
    // Adicionar data única se existir
    if (dataSingle) {
        datas.push(dataSingle);
    }
    
    // Adicionar datas múltiplas se existirem
    if (dataMultiplasInput) {
        const datasExtras = dataMultiplasInput
            .split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0)
            .map(d => {
                // Converter dd/mm/aaaa para aaaa-mm-dd
                const parts = d.split('/');
                if (parts.length === 3) {
                    const [dia, mes, ano] = parts;
                    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                }
                return null;
            })
            .filter(d => d !== null);
        
        datas = [...datas, ...datasExtras];
    }
    
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
    document.getElementById('filterDataMultiplas').value = '';
    document.getElementById('filterStatus').value = '';
    
    // Aplicar ordenação atual
    const sorted = sortNotas([...notasFiscais], currentSortColumn, currentSortDirection);
    renderNotasFiscais(sorted);
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
    // Formatar da direita para esquerda
    if (value.length > 3) {
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    e.target.value = value;
}

function formatNFNumber(value) {
    if (!value) return '';
    // Converter para string e remover pontos existentes
    let numStr = value.toString().replace(/\./g, '');
    // Formatar da direita para esquerda
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Formatar múltiplas datas automaticamente
function formatMultipleDates(e) {
    let value = e.target.value;
    
    // Remove tudo que não é número, vírgula ou barra
    value = value.replace(/[^\d,/]/g, '');
    
    // Divide por vírgula
    let dates = value.split(',');
    
    // Formata cada data
    dates = dates.map(date => {
        // Remove espaços
        date = date.trim().replace(/\D/g, '');
        
        // Adiciona barras automaticamente
        if (date.length >= 2) {
            date = date.slice(0, 2) + '/' + date.slice(2);
        }
        if (date.length >= 5) {
            date = date.slice(0, 5) + '/' + date.slice(5, 9);
        }
        
        return date;
    });
    
    e.target.value = dates.join(', ');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Tornar funções globais
window.editNotaFiscal = editNotaFiscal;
window.confirmDelete = confirmDelete;
