import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), '.wwebjs_auth');

let whatsappClient: any = null;
let whatsappModule: any = null;
let qrcodeModule: any = null;
let isInitializing = false;
let manualDisconnect = false;
let startedAt: number | null = null;

const conversations = new Map<string, 'menu' | 'consultar' | 'status'>();

let botStatus = {
  isReady: false,
  isConnecting: false,
  hasQr: false,
  qrCode: null as string | null,
  number: null as string | null,
  name: null as string | null,
  profilePic: null as string | null,
  lastConnectionTime: null as string | null,
  lastDisconnectionTime: null as string | null,
  lastError: null as string | null,
  messagesProcessed: 0,
  errorCount: 0,
  reconnectAttempts: 0,
  uptime: 0,
  logs: [] as string[],
};

const addLog = (msg: string) => {
  const timestamp = new Date().toISOString();
  botStatus.logs.push(`[${timestamp}] ${msg}`);
  if (botStatus.logs.length > 50) botStatus.logs.shift();
  io.emit('bot:log', { timestamp, message: msg });
  console.log(`[BOT ${timestamp}] ${msg}`);
};

const MENU = `Olá, seja bem-vindo à *Marmoraria Imperial*! 🏛️\n\nDigite uma opção:\n\n1️⃣ Consultar Solicitação\n2️⃣ Acompanhar Status\n3️⃣ Falar com Atendente\n4️⃣ Financeiro\n5️⃣ Informações Gerais\n\n0️⃣ Voltar ao Menu`;

const RESPOSTAS: Record<string, string> = {
  '3': `👨‍💼 *Atendente*\n\nUm de nossos atendentes será conectado em breve!\nHorário: Seg a Sex 08:00 às 18:00\n\nDigite 0 para voltar ao menu.`,
  '4': `💰 *Financeiro*\n\nPara consultas financeiras, fale com nosso atendente.\nDigite 3 para falar com um atendente.\n\nDigite 0 para voltar ao menu.`,
  '5': `🏛️ *Informações Gerais*\n\n📍 Av. dos Mármores, 1500 - São Paulo/SP\n🕐 Seg a Sex: 08:00 às 18:00 | Sáb: 08:00 às 12:00\n📞 (11) 3456-7890\n📧 contato@marmorariaimperial.com.br\n\nDigite 0 para voltar ao menu.`,
};

function normalize(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizePhone(value: string) {
  return String(value || '').replace(/\D/g, '').replace(/^55/, '');
}

function resetConversation(from: string) {
  conversations.set(from, 'menu');
}

function isGreeting(body: string) {
  return /^(ola|olá|oi|bom dia|boa tarde|boa noite|hi|hello)\b/i.test(body.trim());
}

async function loadModules() {
  if (!whatsappModule) {
    const mod: any = await import('whatsapp-web.js');
    // whatsapp-web.js é um pacote CommonJS: dependendo do bundler/runtime,
    // as exportações nomeadas (ex: LocalAuth) só existem dentro de `.default`,
    // enquanto `Client` pode aparecer tanto na raiz quanto em `.default`.
    // Usar `.default` quando presente evita "LocalAuth is not a constructor".
    whatsappModule = mod.default ?? mod;
  }
  if (!qrcodeModule) qrcodeModule = await import('qrcode');
}

async function disconnectWhatsApp() {
  if (!whatsappClient) return;
  try {
    await whatsappClient.destroy();
  } catch (err) {
    addLog(`Aviso ao destruir sessão: ${String(err)}`);
  } finally {
    whatsappClient = null;
  }
}

function getSupabaseConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

async function findAtendimento(identifier: string) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;

  const clean = identifier.trim();
  const phone = normalizePhone(clean);
  const cpf = clean.replace(/\D/g, '');
  const filters = [
    `id.eq.${encodeURIComponent(clean)}`,
    phone ? `telefone.ilike.*${encodeURIComponent(phone)}*` : '',
    cpf ? `cpf_cnpj.ilike.*${encodeURIComponent(cpf)}*` : '',
  ].filter(Boolean);

  try {
    for (const filter of filters) {
      const response = await fetch(`${url}/rest/v1/atendimentos?select=*&${filter}&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok) continue;
      const rows = await response.json();
      if (Array.isArray(rows) && rows[0]) return rows[0];
    }
  } catch (err) {
    addLog(`Falha ao consultar Supabase: ${String(err)}`);
  }
  return null;
}

function formatAtendimento(a: any, onlyStatus = false) {
  if (onlyStatus) {
    return `📊 *Status da solicitação #${a.id}*\n\n` +
      `👤 Cliente: ${a.nome || 'Não informado'}\n` +
      `📌 Status: *${a.status || 'Não informado'}*\n` +
      `📅 Previsão: ${a.data_prevista || 'Não definida'}${a.hora_prevista ? ` às ${a.hora_prevista}` : ''}\n` +
      `👷 Responsável: ${a.responsavel || 'Não definido'}\n\n` +
      `Digite 0 para voltar ao menu.`;
  }

  return `📋 *Solicitação #${a.id}*\n\n` +
    `👤 Cliente: ${a.nome || 'Não informado'}\n` +
    `📱 Telefone: ${a.telefone || 'Não informado'}\n` +
    `🪨 Serviço: ${a.servico || 'Não informado'}\n` +
    `💎 Material: ${a.material || 'Não informado'}\n` +
    `✨ Acabamento: ${a.acabamento || 'Não informado'}\n` +
    `📌 Status: *${a.status || 'Não informado'}*\n` +
    `💰 Orçamento: ${a.orcamento || 'R$ 0,00'}\n` +
    `📅 Previsão: ${a.data_prevista || 'Não definida'}${a.hora_prevista ? ` às ${a.hora_prevista}` : ''}\n\n` +
    `Digite 0 para voltar ao menu.`;
}

async function handleMessage(msg: any) {
  if (!msg?.body || msg.fromMe) return;
  const from = msg.from;
  const body = String(msg.body).trim();
  const normalized = normalize(body);
  const current = conversations.get(from) || 'menu';

  botStatus.messagesProcessed++;
  botStatus.uptime = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  io.emit('bot:status', botStatus);
  io.emit('bot:message', { from, body, timestamp: new Date().toISOString() });
  addLog(`📩 ${from}: ${body}`);

  if (body === '0' || normalized === 'menu' || normalized === 'inicio') {
    resetConversation(from);
    await msg.reply(MENU);
    return;
  }

  if (isGreeting(body) && current === 'menu') {
    resetConversation(from);
    await msg.reply(MENU);
    return;
  }

  if (current === 'consultar' || current === 'status') {
    const atendimento = await findAtendimento(body);
    if (!atendimento) {
      await msg.reply(`❌ Não encontrei uma solicitação com *${body}*.\n\nConfira o número do pedido ou CPF/CNPJ e tente novamente.\n\nDigite 0 para voltar ao menu.`);
      return;
    }
    const response = formatAtendimento(atendimento, current === 'status');
    resetConversation(from);
    await msg.reply(response);
    return;
  }

  if (body === '1') {
    conversations.set(from, 'consultar');
    await msg.reply(`📋 *Consultar Solicitação*\n\nInforme o número do pedido ou CPF/CNPJ do cliente.\n\nDigite 0 para voltar ao menu.`);
    return;
  }

  if (body === '2') {
    conversations.set(from, 'status');
    await msg.reply(`📊 *Acompanhar Status*\n\nInforme o número do pedido.\n\nDigite 0 para voltar ao menu.`);
    return;
  }

  if (RESPOSTAS[body]) {
    await msg.reply(RESPOSTAS[body]);
    return;
  }

  await msg.reply(`Não consegui identificar sua opção. 😊\n\n${MENU}`);
}

async function initializeWhatsApp() {
  if (isInitializing) {
    addLog('Já existe uma inicialização em andamento.');
    return;
  }

  isInitializing = true;
  manualDisconnect = false;
  await disconnectWhatsApp();

  botStatus = {
    ...botStatus,
    isReady: false,
    isConnecting: true,
    hasQr: false,
    qrCode: null,
    number: null,
    name: null,
    profilePic: null,
    lastError: null,
    logs: botStatus.logs.slice(-10),
  };
  io.emit('bot:status', botStatus);
  addLog('Iniciando cliente WhatsApp Web...');

  try {
    await loadModules();
    const { Client, LocalAuth } = whatsappModule;

    fs.mkdirSync(SESSION_PATH, { recursive: true });

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: 'marmoraria-imperial',
        dataPath: SESSION_PATH,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      },
    });

    whatsappClient.on('qr', async (qr: string) => {
      try {
        const qrImage = await qrcodeModule.toDataURL(qr, {
          width: 320,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        botStatus.hasQr = true;
        botStatus.qrCode = qrImage;
        botStatus.isConnecting = true;
        io.emit('bot:status', botStatus);
        io.emit('bot:qr', qrImage);
        addLog('📷 QR Code gerado. Escaneie pelo WhatsApp.');
      } catch (err) {
        botStatus.lastError = `Erro ao gerar QR Code: ${String(err)}`;
        botStatus.errorCount++;
        io.emit('bot:status', botStatus);
        addLog(botStatus.lastError);
      }
    });

    whatsappClient.on('authenticated', () => addLog('✅ WhatsApp autenticado.'));

    whatsappClient.on('ready', async () => {
      botStatus.isReady = true;
      botStatus.isConnecting = false;
      botStatus.hasQr = false;
      botStatus.qrCode = null;
      botStatus.lastConnectionTime = new Date().toISOString();
      botStatus.lastError = null;
      startedAt = Date.now();
      try {
        const info = whatsappClient.info;
        botStatus.number = info?.wid?.user || null;
        botStatus.name = info?.pushname || null;
        if (info?.wid) {
          try { botStatus.profilePic = await whatsappClient.getProfilePicUrl(info.wid); } catch {}
        }
      } catch {}
      io.emit('bot:status', botStatus);
      addLog(`🟢 WhatsApp CONECTADO${botStatus.number ? `: ${botStatus.number}` : ''}`);
    });

    whatsappClient.on('auth_failure', (msg: string) => {
      botStatus.lastError = `Falha na autenticação: ${msg}`;
      botStatus.errorCount++;
      botStatus.isReady = false;
      botStatus.isConnecting = false;
      io.emit('bot:status', botStatus);
      addLog(`❌ ${botStatus.lastError}`);
    });

    whatsappClient.on('disconnected', (reason: string) => {
      botStatus.isReady = false;
      botStatus.isConnecting = false;
      botStatus.hasQr = false;
      botStatus.qrCode = null;
      botStatus.lastDisconnectionTime = new Date().toISOString();
      botStatus.lastError = `WhatsApp desconectado: ${reason}`;
      io.emit('bot:status', botStatus);
      addLog(`⚠️ ${botStatus.lastError}`);
      startedAt = null;
      isInitializing = false;

      if (!manualDisconnect) {
        setTimeout(() => {
          botStatus.reconnectAttempts++;
          addLog('🔄 Tentando reconexão automática...');
          initializeWhatsApp();
        }, 5000);
      }
    });

    whatsappClient.on('message', handleMessage);

    await whatsappClient.initialize();
    addLog('WhatsApp Web inicializado. Aguardando QR Code ou sessão salva...');
  } catch (err) {
    botStatus.lastError = `Erro ao inicializar WhatsApp: ${String(err)}`;
    botStatus.errorCount++;
    botStatus.isConnecting = false;
    botStatus.isReady = false;
    io.emit('bot:status', botStatus);
    addLog(`❌ ${botStatus.lastError}`);
  } finally {
    isInitializing = false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', whatsapp: botStatus.isReady, time: new Date().toISOString() });
});

app.get('/api/bot/status', (_req, res) => {
  botStatus.uptime = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  res.json(botStatus);
});

app.post('/api/bot/connect', async (_req, res) => {
  try {
    manualDisconnect = false;
    initializeWhatsApp();
    res.json({ success: true, message: 'Conexão iniciada' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/disconnect', async (_req, res) => {
  try {
    manualDisconnect = true;
    await disconnectWhatsApp();
    startedAt = null;
    botStatus.isReady = false;
    botStatus.isConnecting = false;
    botStatus.hasQr = false;
    botStatus.qrCode = null;
    botStatus.number = null;
    botStatus.name = null;
    botStatus.profilePic = null;
    botStatus.lastDisconnectionTime = new Date().toISOString();
    io.emit('bot:status', botStatus);
    addLog('🔴 WhatsApp desconectado manualmente.');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/send', async (req, res) => {
  if (!whatsappClient || !botStatus.isReady) {
    return res.status(400).json({ success: false, error: 'Bot não conectado' });
  }
  const { number, message } = req.body || {};
  if (!number || !message) return res.status(400).json({ success: false, error: 'number e message são obrigatórios' });
  try {
    const cleanNumber = String(number).replace(/\D/g, '');
    const chatId = String(number).includes('@c.us') ? String(number) : `${cleanNumber}@c.us`;
    await whatsappClient.sendMessage(chatId, String(message));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

io.on('connection', (socket) => {
  socket.emit('bot:status', botStatus);
  socket.on('disconnect', () => {});
});

setInterval(() => {
  if (startedAt && botStatus.isReady) {
    botStatus.uptime = Math.floor((Date.now() - startedAt) / 1000);
    io.emit('bot:status', botStatus);
  }
}, 1000);

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MARMORARIA IMPERIAL - http://localhost:${PORT}`);
    console.log(`WhatsApp API: http://localhost:${PORT}/api/bot/status`);
    console.log(`Sessão WhatsApp: ${SESSION_PATH}`);
  });
}

start();
