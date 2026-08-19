import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs as any;
import QRCodeLib from 'qrcode';
import qrcode from 'qrcode-terminal';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let client: any = null;
let isReady = false;
let qrCode: string | null = null;
let qrCodeBase64: string | null = null;
let botNumber: string | null = null;
let botName: string | null = null;

function initializeClient() {
  try {
    if (client) {
      try { client.removeAllListeners(); } catch {}
      try { client.destroy(); } catch {}
    }
  } catch {}

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
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

  client.on('qr', async (qr: string) => {
    qrCode = qr;
    try {
      qrCodeBase64 = await QRCodeLib.toDataURL(qr, { width: 300, margin: 2 });
    } catch {}
    console.log('\n📱 Escaneie o QR Code com seu WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\nAguardando leitura...\n');
  });

  client.on('ready', () => {
    isReady = true;
    qrCode = null;
    qrCodeBase64 = null;
    botNumber = client.info?.wid?.user || null;
    botName = client.info?.pushname || null;
    console.log('✅ Bot WhatsApp conectado!');
    console.log(`📱 Número: ${botNumber}`);
    console.log(`👤 Nome: ${botName}\n`);
  });

  client.on('authenticated', () => {
    console.log('🔐 Autenticado!');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('❌ Falha na autenticação:', msg);
    isReady = false;
    botNumber = null;
    botName = null;
  });

  client.on('disconnected', (reason: string) => {
    console.log('⚠️ Desconectado:', reason);
    isReady = false;
    botNumber = null;
    botName = null;
    qrCode = null;
    qrCodeBase64 = null;
    setTimeout(() => {
      try { initializeClient(); } catch (e) { console.error('Erro ao reiniciar:', e); }
    }, 3000);
  });

  client.on('message', async (msg: any) => {
    try {
      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const name = contact.pushname || contact.name || 'Desconhecido';
      console.log(`📩 ${name} (${chat.id.user}): ${msg.body}`);

      if (msg.body.toLowerCase() === 'menu' || msg.body === '1') {
        await msg.reply(
          'Olá! Bem-vindo ao atendimento automático.\n\n' +
          '1️⃣ - Ver orçamento\n' +
          '2️⃣ - Agendar visita\n' +
          '3️⃣ - Status do pedido\n' +
          '4️⃣ - Falar com atendente\n\n' +
          'Digite o número da opção desejada.'
        );
      }
      if (msg.body === '4' || msg.body.toLowerCase() === 'atendente') {
        await msg.reply('_Transferindo para um atendente... Aguarde um momento!_');
      }
    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  });

  client.on('error', (err: any) => {
    console.error('❌ Erro no client:', err.message || err);
  });

  try {
    client.initialize();
    console.log('🤖 Inicializando WhatsApp...');
  } catch (e) {
    console.error('❌ Erro ao inicializar client:', e);
    isReady = false;
  }
}

// ========== API ==========

app.get('/api/bot/status', (_req, res) => {
  res.json({
    isReady,
    hasQr: qrCode !== null,
    qrCode: qrCodeBase64,
    number: botNumber,
    name: botName,
  });
});

app.post('/api/bot/send', async (req, res) => {
  if (!isReady || !client) {
    return res.status(503).json({ error: 'Bot não conectado.' });
  }
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios.' });
  }
  try {
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    console.log(`✅ Enviado para ${cleanPhone}`);
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
    console.error('❌ Erro ao enviar:', e.message);
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
    console.log(`✅ Orçamento enviado para ${cleanPhone}`);
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
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
    console.log(`✅ Visita enviada para ${cleanPhone}`);
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
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
    console.log(`✅ Produção enviada para ${cleanPhone}`);
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
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
    console.log(`✅ Instalação enviada para ${cleanPhone}`);
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) {
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
      qrCode = null;
      qrCodeBase64 = null;
      botNumber = null;
      botName = null;
      console.log('⚠️ Bot desconectado pelo usuário');
      setTimeout(() => {
        try { initializeClient(); } catch {}
      }, 2000);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== START ==========
console.log('🤖 MAR100 WhatsApp Bot\n');
app.listen(PORT, () => {
  console.log(`🌐 API em http://localhost:${PORT}`);
  console.log(`📡 GET  /api/bot/status`);
  console.log(`📡 POST /api/bot/send`);
  console.log(`📡 POST /api/bot/orcamento`);
  console.log(`📡 POST /api/bot/visita`);
  console.log(`📡 POST /api/bot/producao`);
  console.log(`📡 POST /api/bot/instalacao`);
  console.log(`📡 GET  /api/bot/chats\n`);
  initializeClient();
});
