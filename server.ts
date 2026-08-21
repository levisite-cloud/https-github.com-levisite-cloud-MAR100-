import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.json());

const PORT = process.env.PORT || 3000;

let whatsappClient: any = null;
let whatsappModule: any = null;
let qrcodeModule: any = null;
let isInitializing = false;

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

const MENU = `Olá, seja bem-vindo à *Marmoraria Imperial*! 🏛️

Digite uma opção:

1️⃣ Consultar Solicitação
2️⃣ Acompanhar Status
3️⃣ Falar com Atendente
4️⃣ Financeiro
5️⃣ Informações Gerais

0️⃣ Voltar ao Menu`;

const RESPOSTAS: Record<string, string> = {
  '1': `📋 *Consultar Solicitação*\n\nPor favor, informe o número do seu pedido ou CPF/CNPJ.\n\nDigite 0 para voltar ao menu.`,
  '2': `📊 *Acompanhar Status*\n\nInforme o número do seu pedido para verificarmos o status.\n\nDigite 0 para voltar ao menu.`,
  '3': `👨‍💼 *Atendente*\n\nUm de nossos atendentes será conectado em breve!\nHorário: Seg a Sex 08:00 às 18:00\n\nDigite 0 para voltar ao menu.`,
  '4': `💰 *Financeiro*\n\nPara consultas financeiras, fale com nosso atendente.\nDigite 3 para falar com um atendente.\n\nDigite 0 para voltar ao menu.`,
  '5': `🏛️ *Informações Gerais*\n\n📍 Av. dos Mármores, 1500 - São Paulo/SP\n🕐 Seg a Sex: 08:00 às 18:00 | Sáb: 08:00 às 12:00\n📞 (11) 3456-7890\n📧 contato@marmorariaimperial.com.br\n\nDigite 0 para voltar ao menu.`,
  '0': MENU,
};

function handleAutoResponse(body: string): string | null {
  if (!body) return null;
  const lower = body.toLowerCase().trim();
  if (RESPOSTAS[body.trim()]) return RESPOSTAS[body.trim()];
  if (lower.includes('menu') || lower.includes('início')) return MENU;
  if (lower.match(/^(olá|ola|bom dia|boa tarde|boa noite|hi|hello)/)) {
    return `Olá! 👋 Bem-vindo à *Marmoraria Imperial*!\n\n${MENU}`;
  }
  if (lower.match(/obrigad[oa]/)) return 'De nada! 😊\n\nDigite 0 para voltar ao menu.';
  if (lower.match(/^(tchau|até mais|bye)/)) return 'Até mais! 👋\n\nDigite 0 para voltar ao menu.';
  return null;
}

async function loadModules() {
  if (!whatsappModule) {
    whatsappModule = await import('whatsapp-web.js');
  }
  if (!qrcodeModule) {
    qrcodeModule = await import('qrcode');
  }
}

async function disconnectWhatsApp() {
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
    } catch {}
    whatsappClient = null;
  }
}

async function initializeWhatsApp() {
  if (isInitializing) {
    addLog('Já está inicializando, aguarde...');
    return;
  }

  isInitializing = true;

  await disconnectWhatsApp();

  botStatus = {
    isReady: false, isConnecting: true, hasQr: false, qrCode: null,
    number: null, name: null, profilePic: null,
    lastConnectionTime: null, lastDisconnectionTime: null,
    lastError: null, messagesProcessed: 0, errorCount: 0,
    reconnectAttempts: 0, uptime: 0, logs: [],
  };
  io.emit('bot:status', botStatus);
  addLog('Iniciando cliente WhatsApp...');

  try {
    await loadModules();
    const { Client } = whatsappModule;

    whatsappClient = new Client({
      authStrategy: undefined,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--no-first-run',
        ],
      },
    });

    whatsappClient.on('qr', async (qr: string) => {
      addLog('QR Code recebido, gerando imagem...');
      try {
        const qrImage = await qrcodeModule.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        botStatus.hasQr = true;
        botStatus.qrCode = qrImage;
        botStatus.isConnecting = true;
        io.emit('bot:status', botStatus);
        io.emit('bot:qr', qrImage);
        addLog('QR Code gerado com sucesso - ESCANEIE AGORA!');
      } catch (err) {
        addLog(`Erro ao gerar QR Code: ${err}`);
      }
    });

    whatsappClient.on('ready', async () => {
      addLog('✅ WhatsApp CONECTADO com sucesso!');
      botStatus.isReady = true;
      botStatus.isConnecting = false;
      botStatus.hasQr = false;
      botStatus.qrCode = null;
      botStatus.lastConnectionTime = new Date().toISOString();
      try {
        const info = whatsappClient.info;
        botStatus.number = info?.wid?.user || null;
        botStatus.name = info?.pushname || null;
        if (info?.wid) {
          try {
            botStatus.profilePic = await whatsappClient.getProfilePicUrl(info.wid);
          } catch {}
        }
      } catch {}
      io.emit('bot:status', botStatus);
    });

    whatsappClient.on('authenticated', () => {
      addLog('✅ Autenticado com sucesso');
    });

    whatsappClient.on('auth_failure', (msg: string) => {
      addLog(`❌ Falha na autenticação: ${msg}`);
      botStatus.lastError = `Auth failure: ${msg}`;
      botStatus.errorCount++;
      botStatus.isConnecting = false;
      io.emit('bot:status', botStatus);
    });

    whatsappClient.on('disconnected', (reason: string) => {
      addLog(`⚠️ Desconectado: ${reason}`);
      botStatus.isReady = false;
      botStatus.isConnecting = false;
      botStatus.lastDisconnectionTime = new Date().toISOString();
      botStatus.lastError = `Disconnected: ${reason}`;
      io.emit('bot:status', botStatus);
      isInitializing = false;
      setTimeout(() => {
        addLog('Tentando reconexão automática...');
        botStatus.reconnectAttempts++;
        initializeWhatsApp();
      }, 5000);
    });

    whatsappClient.on('message', async (msg: any) => {
      botStatus.messagesProcessed++;
      io.emit('bot:status', botStatus);
      io.emit('bot:message', { from: msg.from, body: msg.body, timestamp: new Date().toISOString() });
      addLog(`📩 Mensagem de ${msg.from}: ${msg.body}`);
      const response = handleAutoResponse(msg.body);
      if (response) {
        try {
          await msg.reply(response);
          addLog(`✅ Resposta automática enviada para ${msg.from}`);
        } catch (err) {
          addLog(`❌ Erro ao enviar resposta: ${err}`);
        }
      }
    });

    addLog('Inicializando WhatsApp Web...');
    await whatsappClient.initialize();
    addLog('WhatsApp Web inicializado, aguardando QR Code...');
  } catch (err) {
    addLog(`❌ Erro ao inicializar: ${err}`);
    botStatus.lastError = `Init error: ${String(err)}`;
    botStatus.errorCount++;
    botStatus.isConnecting = false;
    io.emit('bot:status', botStatus);
  } finally {
    isInitializing = false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/bot/status', (_req, res) => {
  res.json(botStatus);
});

app.post('/api/bot/connect', async (_req, res) => {
  try {
    addLog('Recebido pedido de conexão...');
    initializeWhatsApp();
    res.json({ success: true, message: 'Conexão iniciada' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/disconnect', async (_req, res) => {
  try {
    await disconnectWhatsApp();
    botStatus.isReady = false;
    botStatus.isConnecting = false;
    botStatus.hasQr = false;
    botStatus.qrCode = null;
    botStatus.number = null;
    botStatus.name = null;
    botStatus.profilePic = null;
    botStatus.lastDisconnectionTime = new Date().toISOString();
    io.emit('bot:status', botStatus);
    addLog('WhatsApp desconectado manualmente');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/bot/send', async (req, res) => {
  if (!whatsappClient || !botStatus.isReady) {
    return res.status(400).json({ success: false, error: 'Bot não conectado' });
  }
  const { number, message } = req.body;
  try {
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.emit('bot:status', botStatus);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
    console.log('');
    console.log('===========================================');
    console.log('  MARMORARIA IMPERIAL - SISTEMA INICIADO');
    console.log('===========================================');
    console.log(`  🌐 Frontend: http://localhost:${PORT}`);
    console.log(`  📡 Bot API:  http://localhost:${PORT}/api/bot/status`);
    console.log('===========================================');
    console.log('');
    console.log('  Para conectar o WhatsApp:');
    console.log('  1. Acesse http://localhost:3000');
    console.log('  2. Vá em Configurações > WhatsApp');
    console.log('  3. Clique em "Conectar WhatsApp"');
    console.log('  4. Escaneie o QR Code');
    console.log('');
  });
}

start();