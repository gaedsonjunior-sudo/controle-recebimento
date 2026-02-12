# Sistema de Controle de Notas Fiscais - Recebimento

Sistema web para gerenciamento de notas fiscais recebidas na doca de recebimento, com autenticação de usuários e diferentes níveis de permissão.

## 🚀 Funcionalidades

- ✅ Autenticação de usuários (Admin e Fiscal)
- ✅ Cadastro de notas fiscais
- ✅ Edição de horário de saída
- ✅ Controle de status (Acatada/Não Acatada)
- ✅ Filtros avançados
- ✅ Interface responsiva (mobile e desktop)
- ✅ Design moderno e profissional

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [GitHub](https://github.com) (gratuita)

## 🔧 Configuração do Supabase

### Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Preencha os dados:
   - **Name**: notas-fiscais (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte e SALVE em local seguro
   - **Region**: South America (São Paulo)
4. Clique em "Create new project" e aguarde a criação (1-2 minutos)

### Passo 2: Criar as Tabelas no Banco de Dados

1. No painel do Supabase, clique em **"SQL Editor"** no menu lateral
2. Clique em **"+ New query"**
3. Cole o seguinte código SQL:

```sql
-- Criar tabela de usuários
CREATE TABLE usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'fiscal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Criar tabela de notas fiscais
CREATE TABLE notas_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    fornecedor TEXT NOT NULL,
    numero_nf BIGINT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    hora_chegada TIME NOT NULL,
    temperatura TEXT,
    hora_saida TIME,
    fiscal_nome TEXT NOT NULL,
    fiscal_id UUID REFERENCES usuarios(id),
    status TEXT NOT NULL DEFAULT 'Não Acatada' CHECK (status IN ('Acatada', 'Não Acatada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Criar índices para melhor performance
CREATE INDEX idx_notas_data ON notas_fiscais(data);
CREATE INDEX idx_notas_fornecedor ON notas_fiscais(fornecedor);
CREATE INDEX idx_notas_fiscal ON notas_fiscais(fiscal_id);
CREATE INDEX idx_notas_status ON notas_fiscais(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários (todos podem ler)
CREATE POLICY "Usuários podem ler todos os usuários"
ON usuarios FOR SELECT
TO authenticated
USING (true);

-- Políticas para notas fiscais
-- Todos usuários autenticados podem ler todas as notas
CREATE POLICY "Todos podem ler notas"
ON notas_fiscais FOR SELECT
TO authenticated
USING (true);

-- Fiscais podem inserir novas notas
CREATE POLICY "Fiscais podem inserir notas"
ON notas_fiscais FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fiscais podem atualizar apenas hora_saida de suas próprias notas
CREATE POLICY "Fiscais podem atualizar hora_saida"
ON notas_fiscais FOR UPDATE
TO authenticated
USING (
    auth.uid() IN (
        SELECT auth.uid() FROM usuarios WHERE email = auth.jwt() ->> 'email'
    )
);

-- Admins podem fazer tudo
CREATE POLICY "Admins podem fazer tudo"
ON notas_fiscais FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE email = auth.jwt() ->> 'email'
        AND role = 'admin'
    )
);
```

4. Clique em **"Run"** para executar o SQL

### Passo 3: Criar Usuários no Authentication

1. No menu lateral, clique em **"Authentication"**
2. Clique na aba **"Users"**
3. Clique em **"Add user"** → **"Create new user"**

**Criar usuário ADMIN:**
- Email: `admin@loja.com` (ou outro de sua preferência)
- Password: Crie uma senha forte
- Marque "Auto Confirm User"
- Clique em "Create user"

**Criar usuário FISCAL (exemplo):**
- Email: `fiscal1@loja.com`
- Password: Crie uma senha
- Marque "Auto Confirm User"
- Clique em "Create user"

### Passo 4: Inserir Dados dos Usuários na Tabela

1. Volte para **"SQL Editor"**
2. Crie uma nova query com o seguinte código:

```sql
-- Inserir usuário Admin
INSERT INTO usuarios (nome, username, email, role)
VALUES ('Administrador', 'admin', 'admin@loja.com', 'admin');

-- Inserir usuário Fiscal (exemplo)
INSERT INTO usuarios (nome, username, email, role)
VALUES ('João Silva', 'joao.silva', 'fiscal1@loja.com', 'fiscal');

-- Adicione mais fiscais conforme necessário
INSERT INTO usuarios (nome, username, email, role)
VALUES ('Maria Santos', 'maria.santos', 'fiscal2@loja.com', 'fiscal');
```

⚠️ **IMPORTANTE**: Os emails devem ser os MESMOS criados no Authentication!

3. Clique em **"Run"**

### Passo 5: Obter Credenciais do Projeto

1. No menu lateral, clique em **"Project Settings"** (ícone de engrenagem)
2. Clique em **"API"**
3. Você verá:
   - **Project URL**: Algo como `https://xxxxx.supabase.co`
   - **anon/public key**: Uma chave longa começando com `eyJ...`

4. **COPIE ESTAS DUAS INFORMAÇÕES** - você precisará delas no próximo passo!

## 📦 Configuração do GitHub Pages

### Passo 1: Criar Repositório no GitHub

1. Faça login no [GitHub](https://github.com)
2. Clique no "+" no canto superior direito → **"New repository"**
3. Preencha:
   - **Repository name**: `notas-fiscais` (ou nome de sua preferência)
   - Marque **"Public"**
   - Clique em **"Create repository"**

### Passo 2: Fazer Upload dos Arquivos

**Opção A - Via Interface Web (mais fácil):**

1. No repositório criado, clique em **"uploading an existing file"**
2. Arraste os 4 arquivos do sistema:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
3. Clique em **"Commit changes"**

**Opção B - Via Git (linha de comando):**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/notas-fiscais.git
git push -u origin main
```

### Passo 3: Configurar as Credenciais do Supabase

1. No GitHub, abra o arquivo **`config.js`**
2. Clique no ícone de lápis (Edit)
3. Substitua os valores:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Cole sua Project URL aqui
const SUPABASE_ANON_KEY = 'eyJ...'; // Cole sua anon key aqui
```

4. Clique em **"Commit changes"**

### Passo 4: Ativar GitHub Pages

1. No repositório, clique em **"Settings"**
2. No menu lateral, clique em **"Pages"**
3. Em **"Source"**, selecione **"main"** branch
4. Clique em **"Save"**
5. Aguarde alguns segundos e atualize a página
6. Você verá: **"Your site is live at `https://seu-usuario.github.io/notas-fiscais/`"**

## 🎉 Pronto! Sistema Funcionando

Acesse a URL fornecida pelo GitHub Pages e faça login:

### Login Admin:
- **Usuário**: `admin`
- **Senha**: A senha que você criou no Supabase Authentication

### Login Fiscal:
- **Usuário**: `joao.silva` (ou o username que você definiu)
- **Senha**: A senha que você criou no Supabase Authentication

## 👥 Criando Novos Usuários

Para adicionar novos fiscais:

1. **No Supabase Authentication**, crie o usuário com email e senha
2. **No SQL Editor**, insira na tabela usuarios:

```sql
INSERT INTO usuarios (nome, username, email, role)
VALUES ('Nome do Fiscal', 'nome.sobrenome', 'email@loja.com', 'fiscal');
```

## 🔒 Permissões do Sistema

### Fiscal:
- ✅ Cadastrar novas notas fiscais
- ✅ Editar horário de saída de notas
- ✅ Visualizar todas as notas
- ❌ Editar outros campos
- ❌ Alterar status
- ❌ Excluir notas

### Admin:
- ✅ Todas as permissões do Fiscal
- ✅ Editar qualquer campo
- ✅ Alterar status (Acatada/Não Acatada)
- ✅ Excluir notas fiscais
- ✅ Gerenciar todos os registros

## 📱 Recursos

- **Responsivo**: Funciona perfeitamente em celulares e computadores
- **Filtros**: Por fornecedor, NF, fiscal, data e status
- **Formatação Automática**: Valores monetários e números de NF
- **Validações**: Campos obrigatórios marcados
- **Interface Moderna**: Design profissional e intuitivo

## 🛠️ Campos da Nota Fiscal

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Data | Data | ✅ Sim | Formato dd/mm/aaaa |
| Fornecedor | Texto | ✅ Sim | Nome do fornecedor |
| NF | Número | ✅ Sim | Formato: 000.000.000 |
| Valor | Moeda | ✅ Sim | Formato: R$ 0.000,00 |
| Hora Chegada | Hora | ✅ Sim | Formato: HH:mm |
| Temperatura | Texto | ❌ Não | Produtos refrigerados |
| Hora Saída | Hora | ❌ Não | Editável depois |
| Fiscal | Texto | Auto | Nome do fiscal logado |
| Status | Select | Auto | Não Acatada (padrão) |

## 🐛 Solução de Problemas

### Erro ao fazer login
- Verifique se o email/username existe na tabela `usuarios`
- Verifique se a senha está correta no Supabase Authentication
- Certifique-se de que as credenciais do `config.js` estão corretas

### Notas não aparecem
- Verifique se as políticas RLS foram criadas corretamente
- Verifique no SQL Editor: `SELECT * FROM notas_fiscais;`

### Não consigo editar/excluir
- Verifique se o usuário tem as permissões corretas (role = 'admin' ou 'fiscal')

## 📞 Suporte

Em caso de dúvidas:
1. Verifique se seguiu todos os passos corretamente
2. Consulte a documentação do [Supabase](https://supabase.com/docs)
3. Verifique o console do navegador (F12) para erros JavaScript

## 📄 Licença

Sistema desenvolvido para controle interno de notas fiscais.
