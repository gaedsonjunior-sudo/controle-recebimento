// =================================================================
// SISTEMA DE GERENCIAMENTO DE NOTAS FISCAIS
// Mantém 100% da funcionalidade original
// NOVO DESIGN: Apenas melhorias visuais e UX
// =================================================================

// Estado global
let currentUser = null;
let allNotas = [];
let selectedDates = [];
let sortColumn = null;
let sortDirection = 'asc';
let deleteNFId = null;

// =================================================================
// AUTENTICAÇÃO
// =================================================================

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // NOVO DESIGN: Loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline-flex';
    
    errorDiv.textContent = '';
    
    try {
        const { data: usuarios, error } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('username', username)
            .eq('password', password);
        
        if (error) {
            console.error('Erro Supabase:', error);
            throw new Error('Erro ao conectar com o banco de dados');
        }
        
        if (!usuarios || usuarios.length === 0) {
            throw new Error('Credenciais inválidas');
        }
        
        currentUser = usuarios[0];
        
        // Transição suave para tela principal
        setTimeout(() => {
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('mainScreen').classList.add('active');
            
            // NOVO DESIGN: Atualizar UI do usuário
            updateUserUI();
            loadNotas();
        }, 300);
        
    } catch (error) {
        console.error('Erro no login:', error);
        errorDiv.textContent = 'Usuário ou senha incorretos';
        
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
});

// NOVO DESIGN: Função para atualizar UI do usuário
function updateUserUI() {
    const userName = currentUser.nome || currentUser.username;
    const userRole = currentUser.role === 'admin' ? 'Administrador' : 'Fiscal';
    
    document.getElementById('currentUserName').textContent = userName;
    document.getElementById('currentUserRole').textContent = userRole;
    
    // NOVO DESIGN: Criar iniciais para avatar
    const initials = userName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    
    const avatarEl = document.getElementById('userInitials');
    if (avatarEl) {
        avatarEl.textContent = initials;
    }
    
    // Mostrar campo status apenas para admin
    if (currentUser.role === 'admin') {
        document.getElementById('statusGroup').style.display = 'block';
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
});

// =================================================================
// CARREGAR E FILTRAR NOTAS
// =================================================================

async function loadNotas() {
    try {
        const { data, error } = await window.supabaseClient
            .from('notasfiscais')
            .select('*')
            .order('data', { ascending: false });
        
        if (error) throw error;
        
        allNotas = data || [];
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        alert('Erro ao carregar notas fiscais');
    }
}

function applyFilters() {
    let filtered = [...allNotas];
    
    const fornecedor = document.getElementById('filterFornecedor').value.toLowerCase();
    const nf = document.getElementById('filterNF').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    
    if (fornecedor) {
        filtered = filtered.filter(n => 
            n.fornecedor.toLowerCase().includes(fornecedor)
        );
    }
    
    if (nf) {
        filtered = filtered.filter(n => 
            n.numero_nf.toLowerCase().includes(nf)
        );
    }
    
    if (selectedDates.length > 0) {
        filtered = filtered.filter(n => selectedDates.includes(n.data));
    }
    
    if (status) {
        filtered = filtered.filter(n => n.status === status);
    }
    
    renderTable(filtered);
}

// =================================================================
// RENDERIZAR TABELA
// =================================================================

function renderTable(notas) {
    const tbody = document.getElementById('notasTableBody');
    const emptyState = document.getElementById('emptyState');
    const totalEl = document.getElementById('totalNotas');
    
    // NOVO DESIGN: Atualizar badge com contador
    totalEl.textContent = `${notas.length} nota${notas.length !== 1 ? 's' : ''}`;
    
    if (notas.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.add('active');
        return;
    }
    
    emptyState.classList.remove('active');
    
    tbody.innerHTML = notas.map(nota => {
        // NOVO DESIGN: Status badge colorido
        const statusClass = nota.status === 'Acatada' ? 'status-acatada' : 
                          nota.status === 'Devolvida' ? 'status-devolvida' : 
                          'status-nao-acatada';
        
        return `
            <tr>
                <td>${formatDate(nota.data)}</td>
                <td>${nota.fornecedor}</td>
                <td>${formatNF(nota.numero_nf)}</td>
                <td>${formatCurrency(nota.valor)}</td>
                <td>${nota.hora_chegada}</td>
                <td>${nota.temperatura || '-'}</td>
                <td>${nota.hora_saida || '-'}</td>
                <td>${nota.observacao || '-'}</td>
                <td><span class="status-badge ${statusClass}">${nota.status}</span></td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editNota(${nota.id})" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                            </svg>
                        </button>
                        ${currentUser.role === 'admin' ? `
                            <button class="action-btn delete" onclick="confirmDelete(${nota.id})" title="Excluir">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3 6 5 6 21 6" stroke-width="2"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// =================================================================
// FORMATAÇÃO
// =================================================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatNF(nf) {
    if (!nf) return '-';
    const clean = nf.replace(/\D/g, '');
    if (clean.length === 9) {
        return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    }
    return nf;
}

function formatCurrency(value) {
    if (!value) return 'R$ 0,00';
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

// =================================================================
// ORDENAÇÃO
// =================================================================

document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.dataset.column;
        
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
        
        // NOVO DESIGN: Atualizar classes de ordenação
        document.querySelectorAll('.sortable').forEach(t => {
            t.classList.remove('sorted', 'asc', 'desc');
        });
        th.classList.add('sorted', sortDirection);
        
        sortTable();
    });
});

function sortTable() {
    let filtered = [...allNotas];
    
    // Aplicar filtros primeiro
    const fornecedor = document.getElementById('filterFornecedor').value.toLowerCase();
    const nf = document.getElementById('filterNF').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    
    if (fornecedor) filtered = filtered.filter(n => n.fornecedor.toLowerCase().includes(fornecedor));
    if (nf) filtered = filtered.filter(n => n.numero_nf.toLowerCase().includes(nf));
    if (selectedDates.length > 0) filtered = filtered.filter(n => selectedDates.includes(n.data));
    if (status) filtered = filtered.filter(n => n.status === status);
    
    // Ordenar
    if (sortColumn) {
        filtered.sort((a, b) => {
            let aVal = a[sortColumn] || '';
            let bVal = b[sortColumn] || '';
            
            if (sortColumn === 'valor') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    renderTable(filtered);
}

// =================================================================
// FILTROS
// =================================================================

document.getElementById('toggleFiltersBtn').addEventListener('click', () => {
    document.getElementById('filtersWrapper').classList.toggle('active');
});

document.getElementById('filterFornecedor').addEventListener('input', applyFilters);
document.getElementById('filterNF').addEventListener('input', applyFilters);
document.getElementById('filterStatus').addEventListener('change', applyFilters);

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterFornecedor').value = '';
    document.getElementById('filterNF').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterData').value = '';
    selectedDates = [];
    updateSelectedDatesDisplay();
    applyFilters();
});

// Date picker
document.getElementById('openDatePicker').addEventListener('click', () => {
    document.getElementById('datePickerHelper').showPicker();
});

document.getElementById('datePickerHelper').addEventListener('change', (e) => {
    const dateValue = e.target.value;
    if (dateValue && !selectedDates.includes(dateValue)) {
        selectedDates.push(dateValue);
        updateSelectedDatesDisplay();
        applyFilters();
    }
});

function updateSelectedDatesDisplay() {
    const display = document.getElementById('selectedDatesDisplay');
    const input = document.getElementById('filterData');
    
    if (selectedDates.length === 0) {
        display.innerHTML = '';
        input.value = '';
        return;
    }
    
    input.value = `${selectedDates.length} data(s) selecionada(s)`;
    
    display.innerHTML = selectedDates.map(date => `
        <span class="date-tag">
            ${formatDate(date)}
            <button type="button" onclick="removeDate('${date}')">×</button>
        </span>
    `).join('');
}

function removeDate(date) {
    selectedDates = selectedDates.filter(d => d !== date);
    updateSelectedDatesDisplay();
    applyFilters();
}

// =================================================================
// MODAL NOVA/EDITAR NOTA
// =================================================================

const modal = document.getElementById('nfModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');

// NOVO DESIGN: FAB Mobile também abre modal
document.getElementById('newNFBtn').addEventListener('click', openNewNFModal);
document.querySelector('.fab-mobile')?.addEventListener('click', openNewNFModal);

function openNewNFModal() {
    document.getElementById('modalTitle').textContent = 'Nova Nota Fiscal';
    document.getElementById('nfForm').reset();
    document.getElementById('nfId').value = '';
    
    // Preencher data atual
    document.getElementById('nfData').valueAsDate = new Date();
    
    modal.classList.add('active');
}

closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Editar nota
function editNota(id) {
    const nota = allNotas.find(n => n.id === id);
    if (!nota) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Nota Fiscal';
    document.getElementById('nfId').value = nota.id;
    document.getElementById('nfData').value = nota.data;
    document.getElementById('nfFornecedor').value = nota.fornecedor;
    document.getElementById('nfNumero').value = nota.numero_nf;
    document.getElementById('nfValor').value = formatCurrency(nota.valor);
    document.getElementById('nfHoraChegada').value = nota.hora_chegada;
    document.getElementById('nfTemperatura').value = nota.temperatura || '';
    document.getElementById('nfHoraSaida').value = nota.hora_saida || '';
    document.getElementById('nfObservacao').value = nota.observacao || '';
    
    if (currentUser.role === 'admin') {
        document.getElementById('nfStatus').value = nota.status;
    }
    
    modal.classList.add('active');
}

// Salvar nota
document.getElementById('nfForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // NOVO DESIGN: Loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline-flex';
    
    const id = document.getElementById('nfId').value;
    const valorStr = document.getElementById('nfValor').value;
    const valorNumerico = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    
    const notaData = {
        data: document.getElementById('nfData').value,
        fornecedor: document.getElementById('nfFornecedor').value,
        numero_nf: document.getElementById('nfNumero').value,
        valor: valorNumerico,
        hora_chegada: document.getElementById('nfHoraChegada').value,
        temperatura: document.getElementById('nfTemperatura').value || null,
        hora_saida: document.getElementById('nfHoraSaida').value || null,
        observacao: document.getElementById('nfObservacao').value || null,
    };
    
    if (currentUser.role === 'admin') {
        notaData.status = document.getElementById('nfStatus').value;
    } else if (!id) {
        notaData.status = 'Não Acatada';
    }
    
    try {
        if (id) {
            const { error } = await window.supabaseClient
                .from('notasfiscais')
                .update(notaData)
                .eq('id', id);
            
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient
                .from('notasfiscais')
                .insert([notaData]);
            
            if (error) throw error;
        }
        
        modal.classList.remove('active');
        await loadNotas();
        
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        alert('Erro ao salvar nota fiscal');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
});

// Formatação automática de valor
document.getElementById('nfValor').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
        value = (parseInt(value) / 100).toFixed(2);
        e.target.value = `R$ ${value.replace('.', ',')}`;
    }
});

// Formatação automática de NF
document.getElementById('nfNumero').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 9) value = value.slice(0, 9);
    e.target.value = value;
});

// =================================================================
// DELETAR NOTA
// =================================================================

const confirmModal = document.getElementById('confirmModal');
const closeConfirmBtn = document.getElementById('closeConfirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

function confirmDelete(id) {
    deleteNFId = id;
    confirmModal.classList.add('active');
}

closeConfirmBtn.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    deleteNFId = null;
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    deleteNFId = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!deleteNFId) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('notasfiscais')
            .delete()
            .eq('id', deleteNFId);
        
        if (error) throw error;
        
        confirmModal.classList.remove('active');
        deleteNFId = null;
        await loadNotas();
        
    } catch (error) {
        console.error('Erro ao deletar nota:', error);
        alert('Erro ao deletar nota fiscal');
    }
});

// =================================================================
// EXPORTAR RELATÓRIO
// =================================================================

document.getElementById('exportReportBtn').addEventListener('click', async () => {
    const btn = document.getElementById('exportReportBtn');
    
    // NOVO DESIGN: Feedback visual
    btn.disabled = true;
    btn.classList.add('loading');
    
    try {
        await exportReport();
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
});

async function exportReport() {
    const table = document.getElementById('notasTable');
    
    try {
        const canvas = await html2canvas(table, {
            scale: 2,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `relatorio_notas_${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        
        // Gerar mensagem WhatsApp
        const notas = Array.from(document.querySelectorAll('#notasTableBody tr'));
        let message = `📊 *Relatório de Notas Fiscais*\n`;
        message += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
        
        notas.forEach((row, idx) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                message += `*NF ${idx + 1}*\n`;
                message += `📅 ${cells[0].textContent}\n`;
                message += `🏢 ${cells[1].textContent}\n`;
                message += `📄 ${cells[2].textContent}\n`;
                message += `💰 ${cells[3].textContent}\n`;
                message += `✅ ${cells[8].textContent.trim()}\n\n`;
            }
        });
        
        console.log('Mensagem WhatsApp gerada:', message);
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao gerar relatório');
    }
}
