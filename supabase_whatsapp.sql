-- =====================================================
-- TABELAS WHATSAPP BOT - SINCRONIZACAO COM VERCEL
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Tabela de mensagens WhatsApp (incoming + outgoing)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    contact_name TEXT DEFAULT '',
    message TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type TEXT DEFAULT 'text',
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'sent', 'pending', 'failed')),
    error_message TEXT DEFAULT '',
    atendimento_id BIGINT REFERENCES public.atendimentos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Tabela de status do bot
CREATE TABLE IF NOT EXISTS public.bot_status (
    id TEXT PRIMARY KEY DEFAULT 'main',
    connected BOOLEAN DEFAULT false,
    connecting BOOLEAN DEFAULT false,
    bot_number TEXT DEFAULT '',
    bot_name TEXT DEFAULT '',
    messages_processed INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT DEFAULT '',
    last_connection TIMESTAMPTZ,
    last_disconnection TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso WhatsApp Messages" ON public.whatsapp_messages;
CREATE POLICY "Acesso WhatsApp Messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Bot Status" ON public.bot_status;
CREATE POLICY "Acesso Bot Status" ON public.bot_status FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_status;

-- Index para polling eficiente
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pending 
    ON public.whatsapp_messages (direction, status, created_at) 
    WHERE direction = 'outgoing' AND status = 'pending';
