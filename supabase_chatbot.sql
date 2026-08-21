-- ==============================================================================
-- SCHEMA DO CHATBOT WHATSAPP - MARMORARIA IMPERIAL
-- ==============================================================================

-- 1. TABELA DE SESSÕES WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id TEXT PRIMARY KEY DEFAULT 'default',
    phone_number TEXT,
    name TEXT,
    profile_pic TEXT,
    status TEXT DEFAULT 'disconnected',
    last_connection TIMESTAMPTZ,
    last_disconnection TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONVERSAS
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    client_name TEXT,
    status TEXT DEFAULT 'active',
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE ESTATÍSTICAS
CREATE TABLE IF NOT EXISTS public.chatbot_stats (
    id TEXT PRIMARY KEY DEFAULT 'total',
    messages_received INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    conversations_total INTEGER DEFAULT 0,
    conversations_active INTEGER DEFAULT 0,
    avg_response_time NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE LOGS
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.chat_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.chat_messages(created_at DESC);

-- RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir acesso completo whatsapp_sessions" ON public.whatsapp_sessions FOR ALL USING (true);
CREATE POLICY "Permitir acesso completo chat_conversations" ON public.chat_conversations FOR ALL USING (true);
CREATE POLICY "Permitir acesso completo chat_messages" ON public.chat_messages FOR ALL USING (true);
CREATE POLICY "Permitir acesso completo chatbot_stats" ON public.chatbot_stats FOR ALL USING (true);
CREATE POLICY "Permitir acesso completo chatbot_logs" ON public.chatbot_logs FOR ALL USING (true);

-- Dados iniciais
INSERT INTO public.chatbot_stats (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.whatsapp_sessions (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;