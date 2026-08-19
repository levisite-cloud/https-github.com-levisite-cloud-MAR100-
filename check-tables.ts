import { createClient } from '@supabase/supabase-js';
const s = createClient('https://bxtghkxoobjhenapbmse.supabase.co', 'sb_publishable_8f5E5FprlK2rjTYEDCktpg_T67mntBa');

async function run() {
  // Check whatsapp_messages
  const { error: e1 } = await s.from('whatsapp_messages').select('id').limit(1);
  if (e1) {
    console.log('Tabela whatsapp_messages precisa ser criada:', e1.message);
    console.log('Execute o SQL do arquivo supabase_whatsapp.sql no Supabase SQL Editor');
  } else {
    console.log('whatsapp_messages: OK');
  }

  // Check bot_status
  const { error: e2 } = await s.from('bot_status').select('id').limit(1);
  if (e2) {
    console.log('Tabela bot_status precisa ser criada:', e2.message);
    console.log('Execute o SQL do arquivo supabase_whatsapp.sql no Supabase SQL Editor');
  } else {
    console.log('bot_status: OK');
  }

  // Try to create tables via REST
  console.log('\nTentando criar tabelas via REST API...');

  const sql1 = `CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    contact_name TEXT DEFAULT '',
    message TEXT NOT NULL,
    direction TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    status TEXT NOT NULL DEFAULT 'received',
    error_message TEXT DEFAULT '',
    atendimento_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
  );`;

  const sql2 = `CREATE TABLE IF NOT EXISTS public.bot_status (
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
  );`;

  const sql3 = `ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;`;
  const sql4 = `ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;`;
  const sql5 = `DROP POLICY IF EXISTS "Acesso WhatsApp Messages" ON public.whatsapp_messages;`;
  const sql6 = `CREATE POLICY "Acesso WhatsApp Messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);`;
  const sql7 = `DROP POLICY IF EXISTS "Acesso Bot Status" ON public.bot_status;`;
  const sql8 = `CREATE POLICY "Acesso Bot Status" ON public.bot_status FOR ALL USING (true) WITH CHECK (true);`;

  for (const [label, sql] of [['whatsapp_messages', sql1], ['bot_status', sql2], ['RLS msgs', sql3], ['RLS status', sql4], ['Policy msgs drop', sql5], ['Policy msgs create', sql6], ['Policy status drop', sql7], ['Policy status create', sql8]]) {
    const { error } = await s.rpc('exec_sql', { sql });
    if (error) {
      console.log(`${label}: ${error.message}`);
    } else {
      console.log(`${label}: OK`);
    }
  }
}

run().catch(console.error);
