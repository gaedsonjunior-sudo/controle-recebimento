# ✅ GUIA RÁPIDO DE INSTALAÇÃO
## Sistema de Controle de Notas Fiscais

### 📋 CHECKLIST DE CONFIGURAÇÃO

#### PARTE 1: SUPABASE (15 minutos)

**1️⃣ Criar Conta e Projeto**
- [ ] Acesse https://supabase.com
- [ ] Faça login ou crie conta gratuita
- [ ] Clique em "New Project"
- [ ] Nome: `notas-fiscais`
- [ ] Senha do banco: `[CRIAR_SENHA_FORTE]` ← ANOTE!
- [ ] Região: South America (São Paulo)
- [ ] Aguarde 1-2 minutos

**2️⃣ Criar Estrutura do Banco**
- [ ] Menu lateral → SQL Editor
- [ ] Clique "+ New query"
- [ ] Abra o arquivo `README.md` deste projeto
- [ ] Copie todo o SQL do "Passo 2"
- [ ] Cole no SQL Editor
- [ ] Clique "Run"
- [ ] Deve aparecer "Success. No rows returned"

**3️⃣ Criar Usuários de Autenticação**
- [ ] Menu lateral → Authentication
- [ ] Aba "Users"
- [ ] Clique "Add user" → "Create new user"

**Admin:**
- [ ] Email: `admin@loja.com`
- [ ] Password: `[CRIAR_SENHA]` ← ANOTE!
- [ ] ✅ Marcar "Auto Confirm User"
- [ ] Create user

**Fiscal (exemplo):**
- [ ] Email: `fiscal1@loja.com`
- [ ] Password: `[CRIAR_SENHA]` ← ANOTE!
- [ ] ✅ Marcar "Auto Confirm User"
- [ ] Create user

**4️⃣ Inserir Dados dos Usuários**
- [ ] Voltar para SQL Editor
- [ ] Nova query
- [ ] Copiar SQL do "Passo 4" do README.md
- [ ] IMPORTANTE: Verificar se os emails são os mesmos do passo anterior!
- [ ] Run

**5️⃣ Obter Credenciais**
- [ ] Menu lateral → ⚙️ Project Settings
- [ ] Clicar em "API"
- [ ] Copiar **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copiar **anon public key**: `eyJ...` (chave longa)
- [ ] SALVAR em algum lugar temporário (bloco de notas)

---

#### PARTE 2: GITHUB PAGES (10 minutos)

**6️⃣ Criar Repositório GitHub**
- [ ] Acesse https://github.com
- [ ] Faça login
- [ ] Clique no "+" → "New repository"
- [ ] Repository name: `notas-fiscais`
- [ ] ⚪ Public (deixar marcado)
- [ ] Create repository

**7️⃣ Upload dos Arquivos**
- [ ] Na página do repositório criado
- [ ] Clique "uploading an existing file"
- [ ] Arrastar os arquivos desta pasta:
  - [ ] `index.html`
  - [ ] `styles.css`
  - [ ] `app.js`
  - [ ] `config.js`
  - [ ] `.gitignore` (opcional)
- [ ] Commit changes

**8️⃣ Configurar Credenciais Supabase**
- [ ] No GitHub, abrir arquivo `config.js`
- [ ] Clicar no lápis ✏️ (Edit)
- [ ] Substituir:
  ```javascript
  const SUPABASE_URL = 'COLAR_SUA_PROJECT_URL_AQUI';
  const SUPABASE_ANON_KEY = 'COLAR_SUA_ANON_KEY_AQUI';
  ```
- [ ] Commit changes

**9️⃣ Ativar GitHub Pages**
- [ ] No repositório → Settings
- [ ] Menu lateral → Pages
- [ ] Source: Branch "main"
- [ ] Save
- [ ] Aguardar 30 segundos
- [ ] Atualizar a página
- [ ] Copiar a URL: `https://seu-usuario.github.io/notas-fiscais/`

---

#### PARTE 3: TESTAR SISTEMA (5 minutos)

**🔟 Acessar e Testar**
- [ ] Abrir a URL do GitHub Pages
- [ ] Testar login Admin:
  - [ ] Usuário: `admin`
  - [ ] Senha: [a que você criou no passo 3]
- [ ] Cadastrar uma nota fiscal de teste
- [ ] Aplicar filtros
- [ ] Fazer logout
- [ ] Testar login Fiscal:
  - [ ] Usuário: `joao.silva`
  - [ ] Senha: [a que você criou no passo 3]
- [ ] Verificar permissões limitadas

---

### ⚡ RESUMO - INFORMAÇÕES IMPORTANTES

**🔑 Credenciais Admin:**
```
URL: https://seu-usuario.github.io/notas-fiscais/
Usuário: admin
Senha: [a que você criou]
```

**📊 Supabase Dashboard:**
```
URL: https://supabase.com/dashboard/project/seu-projeto
Email: [seu email de cadastro]
```

---

### 🆘 PROBLEMAS COMUNS

**❌ Erro ao fazer login:**
→ Verificar se o email no SQL é IGUAL ao do Authentication
→ Verificar se as credenciais no config.js estão corretas

**❌ Página não carrega:**
→ Aguardar 2-3 minutos após ativar GitHub Pages
→ Limpar cache do navegador (Ctrl+Shift+R)

**❌ Não aparece nada após login:**
→ Abrir console (F12) e verificar erros
→ Verificar se as políticas RLS foram criadas

**❌ Fiscal não consegue cadastrar:**
→ Verificar role na tabela usuarios
→ Verificar políticas no SQL

---

### 📱 PRÓXIMOS PASSOS

**Adicionar novos fiscais:**
1. Supabase → Authentication → Add user (email/senha)
2. Supabase → SQL Editor → INSERT na tabela usuarios
3. Pronto! Já pode fazer login com username/senha

**Backup dos dados:**
- Menu Supabase → SQL Editor
- Copiar queries do arquivo `queries-uteis.sql`

**Personalizar visual:**
- Editar arquivo `styles.css` no GitHub
- Mudar cores, fontes, etc.

---

### ✅ TUDO PRONTO!

Sistema funcionando em:
🌐 **https://seu-usuario.github.io/notas-fiscais/**

Bom trabalho! 🎉
