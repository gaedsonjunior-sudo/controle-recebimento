const role = localStorage.getItem('role');

function toggleFiltros() {
  document.getElementById('filtros').classList.toggle('open');
}

function abrirModal() {
  document.getElementById('modal').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
}
async function salvar() {
  const data = document.getElementById('data').value;
  const fornecedor = document.getElementById('fornecedor').value;
  const nf = document.getElementById('nf').value;
  const valor = document.getElementById('valor').value;
  const hora_chegada = document.getElementById('hora_chegada').value;
  const temperatura = document.getElementById('temperatura').value || null;

  if (!data || !fornecedor || !nf || !valor || !hora_chegada) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  const { error } = await supabaseClient
    .from('recebimentos')
    .insert([{
      data,
      fornecedor,
      nf,
      valor,
      hora_chegada,
      temperatura,
      acatada: false
    }]);

  if (error) {
    alert('Erro ao salvar: ' + error.message);
    return;
  }

  fecharModal();
  carregar();
}

async function carregar() {
  const { data } = await supabaseClient.from('recebimentos').select('*');
  const cards = document.getElementById('cards');
  cards.innerHTML = '';

  data.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <strong>${r.fornecedor}</strong>
      <span>NF: ${r.nf}</span>
      <span>Valor: R$ ${r.valor}</span>
      <span>Status: ${r.acatada ? 'Acatada' : 'Pendente'}</span>
      ${role === 'admin' ? `<button onclick="toggleAcatada('${r.id}', ${r.acatada})">Acatada</button>` : ''}
    `;
    cards.appendChild(card);
  });
}

async function toggleAcatada(id, atual) {
  await supabaseClient
    .from('recebimentos')
    .update({ acatada: !atual })
    .eq('id', id);
  carregar();
}

carregar();
