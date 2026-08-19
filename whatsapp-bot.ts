import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs as any;
import QRCodeLib from 'qrcode';
import qrcode from 'qrcode-terminal';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========== CONFIG ==========
const PORT = 3001;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 3000;
const SESSION_DIR = './whatsapp-session';
const LOG_FILE = './bot-logs.log';
const SUPABASE_URL = 'https://bxtghkxoobjhenapbmse.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8f5E5FprlK2rjTYEDCktpg_T67mntBa';

// ========== SUPABASE ==========
let supabase: SupabaseClient | null = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  log('Supabase conectado - sincronizacao ativa');
} catch (e: any) {
  log('Erro ao conectar Supabase: ' + e.message);
}

// ========== STATE ==========
let client: any = null;
let isReady = false;
let isConnecting = false;
let qrCode: string | null = null;
let qrCodeBase64: string | null = null;
let botNumber: string | null = null;
let botName: string | null = null;
let reconnectAttempts = 0;
let lastConnectionTime: string | null = null;
let lastDisconnectionTime: string | null = null;
let lastError: string | null = null;
let messagesProcessed = 0;
let errorCount = 0;
let startTime = new Date().toISOString();
let connectionLogs: string[] = [];
let pendingReconnect: ReturnType<typeof setTimeout> | null = null;

// ========== LOGGING ==========
function log(msg: string) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  connectionLogs.push(line);
  if (connectionLogs.length > 100) connectionLogs.shift();
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

// ========== SUPABASE SYNC ==========
async function saveIncomingMessage(phone: string, name: string, message: string) {
  if (!supabase) return;
  try {
    await supabase.from('whatsapp_messages').insert({
      phone,
      contact_name: name,
      message,
      direction: 'incoming',
      status: 'received',
      created_at: new Date().toISOString(),
    });
    log(`MSG salva no Supabase: ${name} (${phone})`);
  } catch (e: any) {
    log('Erro ao salvar msg no Supabase: ' + e.message);
  }
}

async function saveOutgoingMessage(phone: string, message: string, type: string) {
  if (!supabase) return;
  try {
    await supabase.from('whatsapp_messages').insert({
      phone,
      contact_name: '',
      message,
      direction: 'outgoing',
      message_type: type,
      status: 'sent',
      created_at: new Date().toISOString(),
    });
    log(`MSG ENVIADA salva no Supabase: ${phone}`);
  } catch (e: any) {
    log('Erro ao salvar envio no Supabase: ' + e.message);
  }
}

async function updateBotStatus() {
  if (!supabase) return;
  try {
    await supabase.from('bot_status').upsert({
      id: 'main',
      connected: isReady,
      connecting: isConnecting,
      bot_number: botNumber,
      bot_name: botName,
      messages_processed: messagesProcessed,
      error_count: errorCount,
      last_error: lastError,
      last_connection: lastConnectionTime,
      last_disconnection: lastDisconnectionTime,
      updated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    // Silent fail for status updates
  }
}

// Poll pending messages from Supabase (Vercel frontend can queue messages)
let lastPollTime = new Date().toISOString();
async function pollPendingMessages() {
  if (!supabase || !isReady || !client) return;
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('direction', 'outgoing')
      .eq('status', 'pending')
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(5);

    if (error || !data || data.length === 0) return;

    for (const msg of data) {
      try {
        const digits = msg.phone.replace(/\D/g, '');
        const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
        await client.sendMessage(`${cleanPhone}@c.us`, msg.message);
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', msg.id);
        messagesProcessed++;
        log(`MSG PENDENTE ENVIADA para ${cleanPhone}`);
      } catch (e: any) {
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_message: e.message })
          .eq('id', msg.id);
        log(`ERRO ao enviar msg pendente: ${e.message}`);
        errorCount++;
      }
    }
  } catch (e: any) {
    // Silent fail for polling
  }
}

// ========== EXPRESS ==========
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ========== HEALTH CHECK ==========
app.get('/api/bot/health', (_req, res) => {
  const uptime = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  res.json({
    status: isReady ? 'online' : isConnecting ? 'connecting' : 'offline',
    uptime,
    startTime,
    bot: {
      connected: isReady,
      connecting: isConnecting,
      number: botNumber,
      name: botName,
    },
    stats: {
      messagesProcessed,
      errorCount,
      reconnectAttempts,
      lastError,
      lastConnectionTime,
      lastDisconnectionTime,
    },
    logs: connectionLogs.slice(-20),
  });
});

// ========== STATUS (compativel com frontend) ==========
app.get('/api/bot/status', (_req, res) => {
  res.json({
    isReady,
    isConnecting,
    hasQr: qrCode !== null,
    qrCode: qrCodeBase64,
    number: botNumber,
    name: botName,
    lastConnectionTime,
    lastDisconnectionTime,
    lastError,
    messagesProcessed,
    errorCount,
    reconnectAttempts,
    uptime: Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
    logs: connectionLogs.slice(-10),
  });
});

// ========== WHATSAPP CLIENT ==========
function initializeClient() {
  // Limpar timeout pendente
  if (pendingReconnect) {
    clearTimeout(pendingReconnect);
    pendingReconnect = null;
  }

  // Evitar multiplas inicializacoes
  if (isConnecting) {
    log('Ignorado: inicializacao ja em andamento');
    return;
  }

  // Destruir client anterior se existir
  if (client) {
    try {
      client.removeAllListeners();
    } catch {}
    try {
      client.destroy();
    } catch {}
    client = null;
  }

  isConnecting = true;
  isReady = false;
  qrCode = null;
  qrCodeBase64 = null;

  log(`Iniciando client WhatsApp (tentativa ${reconnectAttempts + 1})...`);

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
      ],
    },
  });

  // ===== EVENTOS =====

  client.on('qr', async (qr: string) => {
    qrCode = qr;
    isConnecting = true;
    try {
      qrCodeBase64 = await QRCodeLib.toDataURL(qr, { width: 300, margin: 2 });
    } catch (e) {
      log('Erro ao gerar QR base64: ' + e);
      qrCodeBase64 = null;
    }
    log('QR Code gerado - escaneie com WhatsApp');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    isConnecting = false;
    reconnectAttempts = 0;
    qrCode = null;
    qrCodeBase64 = null;
    lastConnectionTime = new Date().toISOString();
    botNumber = client.info?.wid?.user || null;
    botName = client.info?.pushname || null;
    log(`CONECTADO - Numero: ${botNumber}, Nome: ${botName}`);
  });

  client.on('authenticated', () => {
    log('Autenticado com sucesso');
    isConnecting = true;
  });

  client.on('auth_failure', (msg: string) => {
    log(`FALHA AUTENTICACAO: ${msg}`);
    isReady = false;
    isConnecting = false;
    lastError = `Auth failure: ${msg}`;
    errorCount++;
    scheduleReconnect();
  });

  client.on('disconnected', (reason: string) => {
    log(`DESCONECTADO: ${reason}`);
    isReady = false;
    isConnecting = false;
    lastDisconnectionTime = new Date().toISOString();
    lastError = `Disconnected: ${reason}`;
    botNumber = null;
    botName = null;
    qrCode = null;
    qrCodeBase64 = null;
    scheduleReconnect();
  });

  client.on('message', async (msg: any) => {
    try {
      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const name = contact.pushname || contact.name || 'Desconhecido';
      const phone = chat.id.user;
      messagesProcessed++;
      log(`MSG ${name} (${phone}): ${msg.body}`);

      // Salvar mensagem recebida no Supabase
      await saveIncomingMessage(phone, name, msg.body);

      // Atualizar status do bot no Supabase
      await updateBotStatus();

      if (msg.body.toLowerCase() === 'menu' || msg.body === '1') {
        const reply =
          'Olá! Bem-vindo ao atendimento automático.\n\n' +
          '1️⃣ - Ver orçamento\n' +
          '2️⃣ - Agendar visita\n' +
          '3️⃣ - Status do pedido\n' +
          '4️⃣ - Falar com atendente\n\n' +
          'Digite o número da opção desejada.';
        await msg.reply(reply);
        await saveOutgoingMessage(phone, reply, 'auto_reply');
      } else if (msg.body === '4' || msg.body.toLowerCase() === 'atendente') {
        const reply = '_Transferindo para um atendente... Aguarde um momento!_';
        await msg.reply(reply);
        await saveOutgoingMessage(phone, reply, 'auto_reply');
      }
    } catch (e: any) {
      log(`Erro ao processar mensagem: ${e.message}`);
      errorCount++;
    }
  });

  client.on('error', (err: any) => {
    const errMsg = err?.message || String(err);
    log(`ERRO CLIENT: ${errMsg}`);
    lastError = errMsg;
    errorCount++;
  });

  // Inicializar
  try {
    client.initialize();
    log('Client inicializado, aguardando eventos...');
  } catch (e: any) {
    log(`ERRO FATAL ao inicializar: ${e.message}`);
    isReady = false;
    isConnecting = false;
    lastError = `Init error: ${e.message}`;
    errorCount++;
    scheduleReconnect();
  }
}

// ========== RECONEXAO COM BACKOFF ==========
function scheduleReconnect() {
  if (pendingReconnect) return;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log(`Maximo de ${MAX_RECONNECT_ATTEMPTS} tentativas atingido. Aguardando reinicio manual.`);
    isConnecting = false;
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(RECONNECT_BASE_DELAY * reconnectAttempts, 30000);
  log(`Reconectando em ${delay / 1000}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  isConnecting = true;
  pendingReconnect = setTimeout(() => {
    pendingReconnect = null;
    initializeClient();
  }, delay);
}

// ========== API ENDPOINTS ==========

app.post('/api/bot/send', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.', connected: false });
  }
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios.' });
  }
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    log(`MSG ENVIADA para ${cleanPhone}`);
    await saveOutgoingMessage(cleanPhone, message, 'manual');
    await updateBotStatus();
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    errorCount++;
    log(`ERRO ENVIO: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/orcamento', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  const { phone, clientName, companyName, servico, material, valor, obs } = req.body;
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! Tudo bem? Aqui é da *${companyName || 'Marmoraria'}*.\n\n` +
      `Elaboramos o orçamento para o seu projeto de *${servico || 'Marmoraria'}* em *${material || 'Pedra Nobre'}*.\n\n` +
      `💰 *Valor total:* R$ ${valor || 'Consulte'}\n\n` +
      `${obs ? `📝 *Obs:* ${obs}\n\n` : ''}` +
      `Podemos tirar alguma dúvida ou agendar uma data para início? 😊`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    log(`ORCAMENTO enviado para ${cleanPhone}`);
    await saveOutgoingMessage(cleanPhone, message, 'orcamento');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    errorCount++;
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/visita', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  const { phone, clientName, companyName, data, hora, endereco, responsavel, googleCalendarUrl } = req.body;
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! Aqui é da *${companyName || 'Marmoraria'}*! 📐✨\n\n` +
      `Visita Técnica / Medição agendada:\n` +
      `📅 *Data:* ${data || 'a combinar'}\n` +
      `⏰ *Horário:* ${hora || 'Horário comercial'}\n` +
      `${endereco ? `📍 *Endereço:* ${endereco}\n` : ''}` +
      `${responsavel ? `👷 *Responsável:* ${responsavel}\n` : ''}` +
      `${googleCalendarUrl ? `\n📅 *Google Agenda:* \n${googleCalendarUrl}\n` : ''}` +
      `Confirme o recebimento. Obrigado!`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    log(`VISITA enviada para ${cleanPhone}`);
    await saveOutgoingMessage(cleanPhone, message, 'visita');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    errorCount++;
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/producao', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  const { phone, clientName, companyName, servico, status, previsao } = req.body;
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! 📋\n\n` +
      `Atualização do seu projeto de *${servico || 'Marmoraria'}* na *${companyName || 'Marmoraria'}*:\n\n` +
      `📊 *Status:* ${status || 'Em produção'}\n` +
      `${previsao ? `📅 *Previsão:* ${previsao}\n` : ''}` +
      `\nObrigado pela paciência! 😊`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    log(`PRODUCAO enviada para ${cleanPhone}`);
    await saveOutgoingMessage(cleanPhone, message, 'producao');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    errorCount++;
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/instalacao', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  const { phone, clientName, companyName, data, hora, endereco } = req.body;
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! 🔧\n\n` +
      `Instalação agendada pela *${companyName || 'Marmoraria'}*!\n\n` +
      `📅 *Data:* ${data || 'a confirmar'}\n` +
      `⏰ *Horário:* ${hora || 'Horário comercial'}\n` +
      `${endereco ? `📍 *Local:* ${endereco}\n` : ''}` +
      `\nCertifique-se de que o local esteja acessível. 😊`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    log(`INSTALACAO enviada para ${cleanPhone}`);
    await saveOutgoingMessage(cleanPhone, message, 'instalacao');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    errorCount++;
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bot/chats', async (_req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  try {
    const chats = await client.getChats();
    const recent = chats.slice(0, 20).map((c: any) => ({
      id: c.id.user,
      name: c.name,
      isGroup: c.isGroup,
      lastMessage: c.lastMessage?.body?.substring(0, 100) || '',
      timestamp: c.lastMessage?.timestamp || null,
    }));
    res.json({ chats: recent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/disconnect', async (_req, res) => {
  try {
    if (client) {
      await client.destroy();
      isReady = false;
      isConnecting = false;
      qrCode = null;
      qrCodeBase64 = null;
      botNumber = null;
      botName = null;
      lastDisconnectionTime = new Date().toISOString();
      log('Desconectado pelo usuario (sem auto-restart)');
      await updateBotStatus();
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Reconexao manual
app.post('/api/bot/reconnect', async (_req, res) => {
  if (isReady) {
    return res.json({ success: true, message: 'Bot ja esta conectado' });
  }
  reconnectAttempts = 0;
  lastError = null;
  log('Reconectando manualmente...');
  initializeClient();
  await updateBotStatus();
  res.json({ success: true, message: 'Reconexao iniciada' });
});

// Reset de tentativas
app.post('/api/bot/reset', (_req, res) => {
  reconnectAttempts = 0;
  lastError = null;
  errorCount = 0;
  log('Contadores resetados');
  res.json({ success: true });
});

// ========== START ==========
console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║    MAR100 - WhatsApp Bot v2.0        ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

app.listen(PORT, '0.0.0.0', () => {
  log(`API Bot rodando em http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`  GET  /api/bot/status`);
  console.log(`  GET  /api/bot/health`);
  console.log(`  POST /api/bot/send`);
  console.log(`  POST /api/bot/orcamento`);
  console.log(`  POST /api/bot/visita`);
  console.log(`  POST /api/bot/producao`);
  console.log(`  POST /api/bot/instalacao`);
  console.log(`  POST /api/bot/disconnect`);
  console.log(`  POST /api/bot/reconnect`);
  console.log('');
  console.log(`  Sync Supabase: ATIVO (a cada 5s)`);
  console.log(`  Vercel: https://https-github-com-levisite-cloud-mar.vercel.app/`);
  console.log('');
  initializeClient();

  // Poll pending messages from Supabase every 5s
  setInterval(pollPendingMessages, 5000);
  // Update bot status in Supabase every 10s
  setInterval(updateBotStatus, 10000);
});
