async function carregarAdmin(){
const {data}=await supabase.from('recebimentos').select('*');
adminTable.innerHTML='';
data.forEach(r=>{
adminTable.innerHTML+=`<tr>
<td>${r.nf}</td>
<td>${r.fornecedor}</td>
<td>
<button onclick="acatar('${r.id}',${!r.acatada})">${r.acatada?'Desfazer':'Acatar'}</button>
<button class="cancel" onclick="excluir('${r.id}')">Excluir</button>
</td>
</tr>`;
});
}
async function acatar(id,v){
await supabase.from('recebimentos').update({acatada:v}).eq('id',id);
carregarAdmin();
}
async function excluir(id){
await supabase.from('recebimentos').delete().eq('id',id);
carregarAdmin();
}
carregarAdmin();