-- ==============================================================================
-- SISTEMA DE GESTÃO DE MARMORARIA (MAR100) - SCHEMA COMPLETO DO SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase (https://supabase.com/dashboard)
-- para criar as tabelas, índices e permissões necessárias.

-- 1. TABELA DE ATENDIMENTOS E PEDIDOS
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id BIGINT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT DEFAULT '',
    cpf_cnpj TEXT DEFAULT '',
    cep TEXT DEFAULT '',
    logradouro TEXT DEFAULT '',
    numero TEXT DEFAULT '',
    complemento TEXT DEFAULT '',
    bairro TEXT DEFAULT '',
    cidade TEXT DEFAULT '',
    estado TEXT DEFAULT '',
    endereco TEXT DEFAULT '',
    servico TEXT NOT NULL,
    material TEXT NOT NULL,
    acabamento TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Novo Atendimento',
    prioridade TEXT DEFAULT 'Normal',
    data_prevista TEXT DEFAULT '',
    hora_prevista TEXT DEFAULT '',
    data_medicao TEXT DEFAULT '',
    data_instalacao TEXT DEFAULT '',
    responsavel TEXT DEFAULT '',
    orcamento TEXT DEFAULT 'R$ 0,00',
    desconto NUMERIC DEFAULT 0,
    validade_orcamento TEXT DEFAULT '15 dias',
    condicoes_pagamento TEXT DEFAULT 'À vista ou 10x no cartão',
    itens_orcamento JSONB DEFAULT '[]'::jsonb,
    obs TEXT DEFAULT '',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONFIGURAÇÃO DA EMPRESA
CREATE TABLE IF NOT EXISTS public.empresa_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    nome TEXT NOT NULL DEFAULT 'Marmoraria Imperial Arte em Pedras',
    cnpj TEXT DEFAULT '',
    tel TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    email TEXT DEFAULT '',
    slogan TEXT DEFAULT 'Excelência e sofisticação em granitos, mármores e quartzos nobres.',
    endereco TEXT DEFAULT '',
    horario TEXT DEFAULT 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 12:00',
    site TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    pix_key TEXT DEFAULT '',
    obs TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    cor TEXT DEFAULT '#eab308',
    termos_padrao TEXT DEFAULT '1. Garantia legal de 90 dias contra defeitos de fabricação ou trincas estruturais.\n2. Variações naturais de veios, tonalidades e porosidades são características intrínsecas de rochas naturais.\n3. O cliente deve garantir o vão livre, desobstruído e nivelado na data agendada para instalação.\n4. Prazo de entrega de 7 a 15 dias úteis após a conferência final das medidas no local.\n5. Sinal de 50% no pedido e saldo restante na entrega/conclusão da instalação.',
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES PARA CONSULTA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON public.atendimentos(status);
CREATE INDEX IF NOT EXISTS idx_atendimentos_criado_em ON public.atendimentos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_nome ON public.atendimentos(nome);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (Permite leitura e gravação via Anon Key da aplicação)
DROP POLICY IF EXISTS "Permitir leitura anonima atendimentos" ON public.atendimentos;
CREATE POLICY "Permitir leitura anonima atendimentos" 
ON public.atendimentos FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima atendimentos" ON public.atendimentos;
CREATE POLICY "Permitir insercao anonima atendimentos" 
ON public.atendimentos FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima atendimentos" ON public.atendimentos;
CREATE POLICY "Permitir atualizacao anonima atendimentos" 
ON public.atendimentos FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir exclusao anonima atendimentos" ON public.atendimentos;
CREATE POLICY "Permitir exclusao anonima atendimentos" 
ON public.atendimentos FOR DELETE 
USING (true);

-- Políticas para Empresa Config
DROP POLICY IF EXISTS "Permitir leitura anonima empresa" ON public.empresa_config;
CREATE POLICY "Permitir leitura anonima empresa" 
ON public.empresa_config FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insercao/atualizacao anonima empresa" ON public.empresa_config;
CREATE POLICY "Permitir insercao/atualizacao anonima empresa" 
ON public.empresa_config FOR ALL 
USING (true);

-- 6. HABILITAR REALTIME (Sincronização em tempo real do Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresa_config;

-- 7. DADOS INICIAIS DA EMPRESA (Garante que o registro padrão exista)
INSERT INTO public.empresa_config (id, nome, cnpj, tel, whatsapp, email, slogan, endereco, horario, site, instagram, pix_key, obs, logo, cor, termos_padrao)
VALUES (
    'default',
    'Marmoraria Imperial Arte em Pedras',
    '12.345.678/0001-90',
    '(11) 3456-7890',
    '(11) 98765-4321',
    'contato@marmorariaimperial.com.br',
    'Excelência e sofisticação em granitos, mármores e quartzos nobres.',
    'Av. dos Mármores, 1500 - Galpão 4, Distrito Industrial - São Paulo / SP',
    'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 12:00',
    'www.marmorariaimperial.com.br',
    '@marmorariaimperial',
    'contato@marmorariaimperial.com.br',
    'Atendimento especializado para arquitetos, construtoras e clientes residenciais.',
    '',
    '#eab308',
    '1. Garantia legal de 90 dias contra defeitos de fabricação ou trincas estruturais.\n2. Variações naturais de veios, tonalidades e porosidades são características intrínsecas de rochas naturais.\n3. O cliente deve garantir o vão livre, desobstruído e nivelado na data agendada para instalação.\n4. Prazo de entrega de 7 a 15 dias úteis após a conferência final das medidas no local.\n5. Sinal de 50% no pedido e saldo restante na entrega/conclusão da instalação.'
)
ON CONFLICT (id) DO NOTHING;
