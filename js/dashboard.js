let atual=null;
function toggleFiltro(){
const f=document.getElementById('filtros');
f.style.display=f.style.display==='grid'?'none':'grid';
}
async function carregar(){
let q=supabase.from('recebimentos').select('*').order('created_at',{ascending:false});
if(fNF.value)q=q.ilike('nf','%'+fNF.value+'%');
if(fFornecedor.value)q=q.ilike('fornecedor','%'+fFornecedor.value+'%');
if(fAcatada.value)q=q.eq('acatada',fAcatada.value==='true');
const {data}=await q;
cards.innerHTML='';
data.forEach(r=>{
cards.innerHTML+=`<div class="card">
<b>NF ${r.nf}</b>
<span>${r.fornecedor}</span>
<span>Chegada: ${r.hora_chegada}</span>
<span>Saída: ${r.hora_saida||'Pendente'}</span>
<span class="${r.acatada?'status-ok':'status-pendente'}">
${r.acatada?'Acatada':'Não Acatada'}</span>
${!r.hora_saida?`<button onclick="abrirSaida('${r.id}')">Informar Saída</button>`:''}
</div>`;
});
}
async function salvar(){
await supabase.from('recebimentos').insert({
data:data.value,
fornecedor:fornecedor.value,
nf:nf.value,
valor:valor.value,
hora_chegada:hora_chegada.value,
temperatura:temperatura.value||null
});
fecharModal();carregar();
}
function abrirModal(){modal.style.display='flex'}
function fecharModal(){modal.style.display='none'}
function abrirSaida(id){atual=id;modalSaida.style.display='flex'}
function fecharSaida(){modalSaida.style.display='none'}
async function salvarSaida(){
await supabase.from('recebimentos').update({
hora_saida:hora_saida.value,
liberacao:liberacao.value
}).eq('id',atual);
fecharSaida();carregar();
}
carregar();