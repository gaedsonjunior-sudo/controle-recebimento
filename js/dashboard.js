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
