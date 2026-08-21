import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

const PORT = process.env.PORT || 3000;

// WhatsApp Bot State
let whatsappClient: Client | null = null;
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
};

// Auto-response menu
const MENU = `Olá, seja bem-vindo à *Marmoraria Imperial*! 🏛️

Digite uma opção:

1️⃣ Consultar Solicitação
2️⃣ Acompanhar Status
3️⃣ Falar com Atendente
4️⃣ Financeiro
5️⃣ Informações Gerais`;

const INFO_GERAIS = `*Informações Gerais - Marmoraria Imperial* 🏛️

📍 *Endereço:* Av. dos Mármores, 1500 - Galpão 4, Distrito Industrial - São Paulo/SP
🕐 *Horário:* Seg a Sex: 08:00 às 18:00 | Sáb: 08:00 às 12:00
📞 *Telefone:* (11) 3456-7890
📧 *Email:* contato@marmorariaimperial.com.br
🌐 *Site:* www.marmorariaimperial.com.br
📱 *Instagram:* @marmorariaimperial

Digite 0 para voltar ao menu.`;

const FINANCEIRO = `*Financeiro* 💰

Para consultas financeiras, fale com nosso atendente.
Digite 3 para falar com um atendente.

Digite 0 para voltar ao menu.`;

const CONSULTAR_SOLICITACAO = `*Consultar Solicitação* 📋

Por favor, informe o número do seu pedido ou CPF/CNPJ para consultarmos sua solicitação.

Digite 0 para voltar ao menu.`;

const ACOMPANHAR_STATUS = `*Acompanhar Status* 📊

Por favor, informe o número do seu pedido para verificarmos o status.

Digite 0 para voltar ao menu.`;

const FALAR_COM_ATENDENTE = `*Atendente* 👨‍💼

Um de nossos atendentes será conectado em breve!
Horário de atendimento: Seg a Sex: 08:00 às 18:00

Digite 0 para voltar ao menu.`;

function handleAutoResponse(message: any): string | null {
  const body = message.body?.trim();
  if (!body) return null;

  // Menu navigation
  if (body === '0') return MENU;
  if (body === '1') return CONSULTAR_SOLICITACAO;
  if (body === '2') return ACOMPANHAR_STATUS;
  if (body === '3') return FALAR_COM_ATENDENTE;
  if (body === '4') return FINANCEIRO;
  if (body === '5') return INFO_GERAIS;

  // Keywords
  const lower = body.toLowerCase();
  if (lower.includes('menu') || lower.includes('início') || lower.includes('inicio')) return MENU;
  if (lower.includes('olá') || lower.includes('ola') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite')) {
    return `Olá! 👋 Bem-vindo à *Marmoraria Imperial*!\n\n${MENU}`;
  }
  if (lower.includes('obrigado') || lower.includes('obrigada')) return 'De nada! Foi um prazer ajudar! 😊\n\nDigite 0 para voltar ao menu.';
  if (lower.includes('tchau') || lower.includes('até mais')) return 'Até mais! 👋 Caso precise, é só chamar novamente!';

  return null;
}

async function initializeWhatsApp() {
  if (whatsappClient) {
    try { await whatsappClient.destroy(); } catch {}
  }

  botStatus = {
    isReady: false, isConnecting: true, hasQr: false, qrCode: null,
    number: null, name: null, profilePic: null,
    lastConnectionTime: null, lastDisconnectionTime: null,
    lastError: null, messagesProcessed: 0, errorCount: 0,
    reconnectAttempts: 0, uptime: 0, logs: [],
  };
  io.emit('bot:status', botStatus);
  addLog('Iniciando cliente WhatsApp...');

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  whatsappClient.on('qr', async (qr) => {
    addLog('QR Code recebido, gerando imagem...');
    try {
      const qrImage = await QRCode.toDataURL(qr, { width: 256 });
      botStatus.hasQr = true;
      botStatus.qrCode = qrImage;
      botStatus.isConnecting = true;
      io.emit('bot:status', botStatus);
      io.emit('bot:qr', qrImage);
      addLog('QR Code gerado com sucesso');
    } catch (err) {
      addLog(`Erro ao gerar QR Code: ${err}`);
    }
  });

  whatsappClient.on('ready', async () => {
    addLog('WhatsApp conectado!');
    botStatus.isReady = true;
    botStatus.isConnecting = false;
    botStatus.hasQr = false;
    botStatus.lastConnectionTime = new Date().toISOString();
    try {
      const info = whatsappClient!.info;
      botStatus.number = info?.wid?.user || null;
      botStatus.name = info?.pushname || null;
      if (info?.wid) {
        try {
          const pic = await whatsappClient!.getProfilePicUrl(info.wid);
          botStatus.profilePic = pic;
        } catch {}
      }
    } catch {}
    io.emit('bot:status', botStatus);
  });

  whatsappClient.on('authenticated', () => {
    addLog('Autenticado com sucesso');
  });

  whatsappClient.on('auth_failure', (msg) => {
    addLog(`Falha na autenticação: ${msg}`);
    botStatus.lastError = `Auth failure: ${msg}`;
    botStatus.errorCount++;
    io.emit('bot:status', botStatus);
  });

  whatsappClient.on('disconnected', (reason) => {
    addLog(`Desconectado: ${reason}`);
    botStatus.isReady = false;
    botStatus.isConnecting = false;
    botStatus.lastDisconnectionTime = new Date().toISOString();
    botStatus.lastError = `Disconnected: ${reason}`;
    io.emit('bot:status', botStatus);
    // Auto-reconnect after 5 seconds
    setTimeout(() => {
      addLog('Tentando reconexão automática...');
      botStatus.reconnectAttempts++;
      initializeWhatsApp();
    }, 5000);
  });

  whatsappClient.on('message', async (msg) => {
    botStatus.messagesProcessed++;
    io.emit('bot:status', botStatus);
    io.emit('bot:message', {
      from: msg.from,
      body: msg.body,
      timestamp: new Date().toISOString(),
    });

    // Auto-response
    const response = handleAutoResponse(msg);
    if (response) {
      try {
        await msg.reply(response);
        addLog(`Resposta automática enviada para ${msg.from}`);
      } catch (err) {
        addLog(`Erro ao enviar resposta: ${err}`);
      }
    }
  });

  try {
    await whatsappClient.initialize();
  } catch (err) {
    addLog(`Erro ao inicializar: ${err}`);
    botStatus.lastError = `Init error: ${err}`;
    botStatus.errorCount++;
    botStatus.isConnecting = false;
    io.emit('bot:status', botStatus);
  }
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/bot/status', (_req, res) => {
  res.json(botStatus);
});

app.post('/api/bot/connect', async (_req, res) => {
  try {
    initializeWhatsApp();
    res.json({ success: true, message: 'Conexão iniciada' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/disconnect', async (_req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
      whatsappClient = null;
    }
    botStatus.isReady = false;
    botStatus.isConnecting = false;
    botStatus.qrCode = null;
    botStatus.number = null;
    botStatus.name = null;
    botStatus.lastDisconnectionTime = new Date().toISOString();
    io.emit('bot:status', botStatus);
    addLog('WhatsApp desconectado manualmente');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/send', async (req, res) => {
  const { number, message } = req.body;
  if (!whatsappClient || !botStatus.isReady) {
    return res.status(400).json({ success: false, error: 'Bot não conectado' });
  }
  try {
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.emit('bot:status', botStatus);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

// Start
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sistema Marmoraria rodando em http://0.0.0.0:${PORT}`);
    console.log(`📱 WhatsApp Bot API disponível em /api/bot/*`);
    // Auto-start WhatsApp
    initializeWhatsApp();
  });
}

start();