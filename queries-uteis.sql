-- ============================================
-- QUERIES SQL ÚTEIS - ADMINISTRAÇÃO DO SISTEMA
-- ============================================

-- 1. CRIAR NOVO USUÁRIO FISCAL
-- Primeiro: Criar no Supabase Authentication (interface web)
-- Depois: Executar este SQL substituindo os valores

INSERT INTO usuarios (nome, username, email, role)
VALUES ('Nome Completo', 'nome.sobrenome', 'email@loja.com', 'fiscal');

-- 2. CRIAR NOVO USUÁRIO ADMIN

INSERT INTO usuarios (nome, username, email, role)
VALUES ('Nome Admin', 'admin2', 'admin2@loja.com', 'admin');

-- 3. ALTERAR ROLE DE USUÁRIO (de fiscal para admin ou vice-versa)

UPDATE usuarios
SET role = 'admin'  -- ou 'fiscal'
WHERE username = 'nome.sobrenome';

-- 4. LISTAR TODOS OS USUÁRIOS

SELECT nome, username, email, role, created_at
FROM usuarios
ORDER BY role, nome;

-- 5. VERIFICAR TODAS AS NOTAS FISCAIS

SELECT 
    data,
    fornecedor,
    numero_nf,
    valor,
    fiscal_nome,
    status,
    created_at
FROM notas_fiscais
ORDER BY data DESC, hora_chegada DESC;

-- 6. NOTAS FISCAIS NÃO ACATADAS

SELECT 
    data,
    fornecedor,
    numero_nf,
    valor,
    fiscal_nome
FROM notas_fiscais
WHERE status = 'Não Acatada'
ORDER BY data DESC;

-- 7. TOTAL DE NOTAS POR FISCAL

SELECT 
    fiscal_nome,
    COUNT(*) as total_notas,
    SUM(valor) as valor_total
FROM notas_fiscais
GROUP BY fiscal_nome
ORDER BY total_notas DESC;

-- 8. NOTAS POR FORNECEDOR

SELECT 
    fornecedor,
    COUNT(*) as total_notas,
    SUM(valor) as valor_total,
    AVG(valor) as valor_medio
FROM notas_fiscais
GROUP BY fornecedor
ORDER BY total_notas DESC;

-- 9. NOTAS DE HOJE

SELECT *
FROM notas_fiscais
WHERE data = CURRENT_DATE
ORDER BY hora_chegada DESC;

-- 10. NOTAS DO MÊS ATUAL

SELECT *
FROM notas_fiscais
WHERE EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY data DESC, hora_chegada DESC;

-- 11. RELATÓRIO MENSAL COM TOTAIS

SELECT 
    TO_CHAR(data, 'MM/YYYY') as mes_ano,
    COUNT(*) as total_notas,
    SUM(valor) as valor_total,
    COUNT(CASE WHEN status = 'Acatada' THEN 1 END) as acatadas,
    COUNT(CASE WHEN status = 'Não Acatada' THEN 1 END) as nao_acatadas
FROM notas_fiscais
GROUP BY TO_CHAR(data, 'MM/YYYY')
ORDER BY TO_CHAR(data, 'MM/YYYY') DESC;

-- 12. NOTAS COM TEMPERATURA (produtos refrigerados)

SELECT 
    data,
    fornecedor,
    numero_nf,
    temperatura,
    fiscal_nome
FROM notas_fiscais
WHERE temperatura IS NOT NULL
ORDER BY data DESC;

-- 13. NOTAS SEM HORA DE SAÍDA (ainda em processo)

SELECT 
    data,
    fornecedor,
    numero_nf,
    hora_chegada,
    fiscal_nome
FROM notas_fiscais
WHERE hora_saida IS NULL
ORDER BY data DESC, hora_chegada ASC;

-- 14. TEMPO MÉDIO DE PERMANÊNCIA (notas com hora de saída)

SELECT 
    fornecedor,
    COUNT(*) as total_entregas,
    AVG(
        EXTRACT(EPOCH FROM (hora_saida::time - hora_chegada::time)) / 3600
    )::numeric(10,2) as horas_media
FROM notas_fiscais
WHERE hora_saida IS NOT NULL
GROUP BY fornecedor
ORDER BY horas_media DESC;

-- 15. DELETAR NOTA FISCAL (use com cuidado!)

DELETE FROM notas_fiscais
WHERE id = 'UUID_DA_NOTA_AQUI';

-- 16. ATUALIZAR STATUS DE VÁRIAS NOTAS DE UMA VEZ

UPDATE notas_fiscais
SET status = 'Acatada'
WHERE fornecedor = 'Nome do Fornecedor'
  AND data BETWEEN '2024-01-01' AND '2024-01-31';

-- 17. BACKUP: EXPORTAR TODAS AS NOTAS (copie o resultado)

SELECT * FROM notas_fiscais
ORDER BY data DESC;

-- 18. LIMPAR TODAS AS NOTAS (use APENAS para testes - CUIDADO!)

-- DELETE FROM notas_fiscais; -- Remova o comentário para executar

-- 19. RESETAR SENHA DE USUÁRIO
-- Não é possível via SQL, deve ser feito no Supabase Authentication
-- Vá em Authentication > Users > Clique no usuário > Reset Password

-- 20. ESTATÍSTICAS GERAIS DO SISTEMA

SELECT 
    COUNT(*) as total_notas,
    COUNT(DISTINCT fornecedor) as total_fornecedores,
    COUNT(DISTINCT fiscal_nome) as total_fiscais,
    SUM(valor) as valor_total_geral,
    AVG(valor) as valor_medio,
    MIN(data) as primeira_nota,
    MAX(data) as ultima_nota,
    COUNT(CASE WHEN status = 'Acatada' THEN 1 END) as total_acatadas,
    COUNT(CASE WHEN status = 'Não Acatada' THEN 1 END) as total_nao_acatadas
FROM notas_fiscais;

-- ============================================
-- DICAS DE USO:
-- ============================================

-- Para executar estas queries:
-- 1. Acesse o Supabase Dashboard
-- 2. Clique em "SQL Editor"
-- 3. Cole a query desejada
-- 4. Clique em "Run"

-- Sempre faça backup antes de executar UPDATE ou DELETE!

-- Para visualizar dados em formato mais amigável:
-- Use a aba "Table Editor" no Supabase
