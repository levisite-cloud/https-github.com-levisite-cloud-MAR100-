import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs as any;
import QRCodeLib from 'qrcode';
import qrcode from 'qrcode-terminal';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

process.on('uncaughtException', (err) => { console.error('Uncaught:', err.message); });
process.on('unhandledRejection', (err: any) => { console.error('Unhandled:', err?.message || err); });

const PORT = 3001;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 3000;
const SESSION_DIR = './whatsapp-session';
const LOG_FILE = './bot-logs.log';
const SUPABASE_URL = 'https://bxtghkxoobjhenapbmse.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8f5E5FprlK2rjTYEDCktpg_T67mntBa';

let supabase: SupabaseClient | null = null;
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

const userConversations: Record<string, { step: string; data: any; timestamp: number }> = {};

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  log('Supabase conectado - sincronizacao ativa');
} catch (e: any) {
  log('Erro ao conectar Supabase: ' + e.message);
}

function log(msg: string) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  connectionLogs.push(line);
  if (connectionLogs.length > 100) connectionLogs.shift();
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

async function saveIncomingMessage(phone: string, name: string, message: string) {
  if (!supabase) return;
  try {
    await supabase.from('whatsapp_messages').insert({
      phone, contact_name: name, message, direction: 'incoming', status: 'received', created_at: new Date().toISOString(),
    });
    log(`MSG salva no Supabase: ${name} (${phone})`);
  } catch (e: any) { log('Erro ao salvar msg: ' + e.message); }
}

async function saveOutgoingMessage(phone: string, message: string, type: string) {
  if (!supabase) return;
  try {
    await supabase.from('whatsapp_messages').insert({
      phone, contact_name: '', message, direction: 'outgoing', message_type: type, status: 'sent', created_at: new Date().toISOString(),
    });
  } catch {}
}

async function updateBotStatus() {
  if (!supabase) return;
  try {
    await supabase.from('bot_status').upsert({
      id: 'main', connected: isReady, connecting: isConnecting, bot_number: botNumber, bot_name: botName,
      messages_processed: messagesProcessed, error_count: errorCount, last_error: lastError,
      last_connection: lastConnectionTime, last_disconnection: lastDisconnectionTime, updated_at: new Date().toISOString(),
    });
  } catch {}
}

async function pollPendingMessages() {
  if (!supabase || !isReady || !client) return;
  try {
    const { data, error } = await supabase.from('whatsapp_messages').select('*')
      .eq('direction', 'outgoing').eq('status', 'pending')
      .order('created_at', { ascending: true }).limit(5);
    if (error || !data || data.length === 0) return;
    for (const msg of data) {
      try {
        const digits = msg.phone.replace(/\D/g, '');
        const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;
        await client.sendMessage(`${cleanPhone}@c.us`, msg.message);
        await supabase.from('whatsapp_messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', msg.id);
        messagesProcessed++;
        log(`MSG PENDENTE ENVIADA para ${cleanPhone}`);
      } catch (e: any) {
        await supabase.from('whatsapp_messages').update({ status: 'failed', error_message: e.message }).eq('id', msg.id);
        errorCount++;
      }
    }
  } catch {}
}

async function normalizePhone(raw: string): Promise<string> {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function findClientByPhone(phone: string): Promise<any | null> {
  if (!supabase) return null;
  try {
    const clean = phone.replace(/\D/g, '');
    const last9 = clean.slice(-9);
    const { data } = await supabase.from('atendimentos').select('*');
    if (!data || data.length === 0) return null;
    return data.find((c: any) => {
      const dbDigits = (c.telefone || '').replace(/\D/g, '');
      return dbDigits.endsWith(last9) || last9.endsWith(dbDigits.slice(-9));
    }) || null;
  } catch { return null; }
}

async function findClientByNameSearch(term: string): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('atendimentos').select('*').ilike('nome', `%${term}%`).order('criado_em', { ascending: false }).limit(5);
    return data || [];
  } catch { return []; }
}

const STATUS_LABELS: Record<string, string> = {
  'Novo Atendimento': '📥 Novo Atendimento',
  'Visita Agendada': '🏠 Visita Agendada',
  'Medição Realizada': '📐 Medição Realizada',
  'Orçamento Enviado': '💰 Orçamento Enviado',
  'Aprovado': '✅ Aprovado',
  'Em Produção': '🏭 Em Produção',
  'Instalação Agendada': '🔧 Instalação Agendada',
  'Concluído': '🎉 Concluído',
};

const STATUS_NEXT: Record<string, string> = {
  'Novo Atendimento': 'Próximo passo: Agendaremos uma visita técnica para medição.',
  'Visita Agendada': 'Próximo passo: Nossa equipe irá até você para medição.',
  'Medição Realizada': 'Próximo passo: Estamos elaborando seu orçamento.',
  'Orçamento Enviado': 'Próximo passo: Aguardamos sua aprovação do orçamento.',
  'Aprovado': 'Próximo passo: Seu projeto entrará em produção em breve.',
  'Em Produção': 'Próximo passo: Assim que finalizar, agendaremos a instalação.',
  'Instalação Agendada': 'Próximo passo: Nossa equipe irá até você para instalação.',
  'Concluído': 'Seu projeto foi concluído! Qualquer dúvida, estamos à disposição.',
};

async function handleConversation(phone: string, name: string, message: string, msg: any): Promise<void> {
  const cleanMsg = message.trim().toLowerCase();
  const conv = userConversations[phone];

  if (conv && Date.now() - conv.timestamp < 300000) {
    if (cleanMsg === 'cancelar' || cleanMsg === 'voltar') {
      delete userConversations[phone];
      await sendReply(msg, phone, '❌ Operação cancelada. Digite *MENU* para ver as opções.');
      return;
    }
  } else if (conv) {
    delete userConversations[phone];
  }

  if (['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'eai', 'eai?'].includes(cleanMsg)) {
    const client = await findClientByPhone(phone);
    const firstName = client?.nome?.split(' ')[0] || name?.split(' ')[0] || '';
    const greeting = getGreeting();
    let reply = `${greeting}${firstName ? ` ${firstName}` : ''}! 👋\n\n`;
    reply += `Bem-vindo(a) à *MAR100 - Marmoraria*!\n`;
    reply += `Como podemos ajudar você hoje?\n\n`;
    reply += `Digite *MENU* para ver todas as opções.`;
    await sendReply(msg, phone, reply);
    return;
  }

  if (cleanMsg === 'menu' || cleanMsg === '1' || cleanMsg === 'opcoes' || cleanMsg === 'opções') {
    await sendMainMenu(msg, phone);
    return;
  }

  if (cleanMsg === '2' || cleanMsg.includes('status') || cleanMsg.includes('pedido') || cleanMsg.includes('andamento')) {
    await handleStatusRequest(msg, phone);
    return;
  }

  if (cleanMsg === '3' || cleanMsg.includes('orcamento') || cleanMsg.includes('orçamento') || cleanMsg.includes('preço') || cleanMsg.includes('valor')) {
    await handleOrcamentoRequest(msg, phone);
    return;
  }

  if (cleanMsg === '4' || cleanMsg.includes('agendar') || cleanMsg.includes('visita') || cleanMsg.includes('medicao') || cleanMsg.includes('medição')) {
    await handleAgendarRequest(msg, phone, name);
    return;
  }

  if (cleanMsg === '5' || cleanMsg.includes('atendente') || cleanMsg.includes('humano') || cleanMsg.includes('pessoa') || cleanMsg.includes('ajuda')) {
    await sendReply(msg, phone, '📞 *Transferindo para um atendente*\n\nAguarde um momento, em breve alguém irá atender você. Nosso horário de atendimento é de Seg a Sex, das 8h às 18h.');
    return;
  }

  if (cleanMsg === '6' || cleanMsg.includes('endereco') || cleanMsg.includes('endereço') || cleanMsg.includes('localizacao') || cleanMsg.includes('localização') || cleanMsg.includes('onde')) {
    await sendReply(msg, phone, '📍 *MAR100 - Marmoraria*\n\n🏠 Endereço: Rua Example, 123 - Centro\n Salvador/BA\n⏰ Horário: Seg a Sex, 8h às 18h\n📞 Telefone: (71) 99999-9999\n📧 Email: contato@mar100.com.br');
    return;
  }

  if (cleanMsg === '7' || cleanMsg.includes('materiais') || cleanMsg.includes('pedra') || cleanMsg.includes('granito') || cleanMsg.includes('marmore') || cleanMsg.includes('mármore')) {
    await sendReply(msg, phone, '🪨 *Nossos Materiais*\n\n• Granito São Gabriel\n• Granito Preto Absoluto\n• Granito Branco Siena\n• Mármore Travertino\n• Mármore Carrara\n• Mármore Nero Marquina\n• Quartzo Branco Stellar\n• Quartzo Calacotta\n• Dekton / Ultracompacto\n\nQual material te interessa? Posso enviar mais detalhes!');
    return;
  }

  if (cleanMsg.includes('obrigad') || cleanMsg.includes('valeu') || cleanMsg.includes('thanks')) {
    await sendReply(msg, phone, 'De nada! 😊 Fico feliz em ajudar. Se precisar de algo mais, é só chamar!');
    return;
  }

  if (cleanMsg.includes('horario') || cleanMsg.includes('horário') || cleanMsg.includes('funcionamento')) {
    await sendReply(msg, phone, '⏰ *Horário de Funcionamento*\n\nSeg a Sex: 8h às 18h\nSábado: 8h às 12h\nDomingo: Fechado\n\n📍 Estamos localizados em Salvador/BA.');
    return;
  }

  await sendReply(msg, phone, `🤔 Não entendi sua mensagem.\n\nDigite *MENU* para ver todas as opções ou *5* para falar com um atendente.`);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️ Bom dia';
  if (hour < 18) return '🌤️ Boa tarde';
  return '🌙 Boa noite';
}

async function sendMainMenu(msg: any, phone: string): Promise<void> {
  const client = await findClientByPhone(phone);
  const firstName = client?.nome?.split(' ')[0] || '';
  const greeting = getGreeting();

  let reply = `${greeting}${firstName ? ` ${firstName}` : ''}! 👋\n\n`;
  reply += `*Bem-vindo à MAR100 - Marmoraria*\n\n`;
  reply += `Como podemos ajudar? Escolha uma opção:\n\n`;
  reply += `1️⃣ - *MENU* - Ver opções\n`;
  reply += `2️⃣ - *STATUS* - Consultar meu pedido\n`;
  reply += `3️⃣ - *ORÇAMENTO* - Ver valores\n`;
  reply += `4️⃣ - *AGENDAR* - Marcar visita/medição\n`;
  reply += `5️⃣ - *ATENDENTE* - Falar com humano\n`;
  reply += `6️⃣ - *ENDEREÇO* - Nossa localização\n`;
  reply += `7️⃣ - *MATERIAIS* - Nossas pedras\n\n`;
  reply += `Digite o número ou palavra-chave.`;

  await sendReply(msg, phone, reply);
}

async function handleStatusRequest(msg: any, phone: string): Promise<void> {
  const client = await findClientByPhone(phone);
  if (!client) {
    await sendReply(msg, phone, '📋 *Consulta de Pedido*\n\n❌ Não encontrei cadastro com esse número.\n\nSe você já possui atendimento conosco, pode me informar seu *nome completo* para localizar seu pedido.');
    return;
  }

  const status = client.status || 'Novo Atendimento';
  const statusLabel = STATUS_LABELS[status] || status;
  const nextStep = STATUS_NEXT[status] || '';

  let reply = `📋 *Pedido de ${client.nome}*\n\n`;
  reply += `📦 *Serviço:* ${client.servico || 'Marmoraria'}\n`;
  reply += `🪨 *Material:* ${client.material || 'A definir'}\n`;
  reply += `📊 *Status:* ${statusLabel}\n`;
  if (nextStep) reply += `\n💡 ${nextStep}\n`;
  if (client.data_prevista) reply += `\n📅 *Previsão:* ${client.data_prevista}`;
  if (client.responsavel) reply += `\n👷 *Responsável:* ${client.responsavel}`;
  if (client.orcamento && client.orcamento !== 'R$ 0,00') reply += `\n💰 *Valor:* ${client.orcamento}`;
  if (client.obs) reply += `\n📝 *Obs:* ${client.obs}`;

  reply += `\n\nPrecisa de mais informações? Digite *MENU*.`;

  await sendReply(msg, phone, reply);
}

async function handleOrcamentoRequest(msg: any, phone: string): Promise<void> {
  const client = await findClientByPhone(phone);
  if (!client) {
    await sendReply(msg, phone, '💰 *Consulta de Orçamento*\n\n❌ Não encontrei cadastro com esse número.\n\nPara solicitar um orçamento, digite *AGENDAR* ou fale com um *ATENDENTE*.');
    return;
  }

  let reply = `💰 *Orçamento - ${client.nome}*\n\n`;
  reply += `📦 *Serviço:* ${client.servico || 'Marmoraria'}\n`;
  reply += `🪨 *Material:* ${client.material || 'A definir'}\n`;

  if (client.orcamento && client.orcamento !== 'R$ 0,00') {
    reply += `💵 *Valor Total:* ${client.orcamento}\n`;
    if (client.desconto && client.desconto > 0) reply += `📉 *Desconto:* ${client.desconto}%\n`;
    if (client.validade_orcamento) reply += `📅 *Validade:* ${client.validade_orcamento}\n`;
    if (client.condicoes_pagamento) reply += `💳 *Pagamento:* ${client.condicoes_pagamento}\n`;
  } else {
    reply += `\n⏳ *Orçamento ainda não elaborado*\n`;
    reply += `Nossa equipe está preparando sua proposta. Em breve entraremos em contato!`;
  }

  if (client.itens_orcamento && client.itens_orcamento.length > 0) {
    reply += `\n📋 *Itens:*\n`;
    client.itens_orcamento.forEach((item: any) => {
      reply += `  • ${item.descricao} - ${item.quantidade}${item.unidade} x R$ ${item.valorUnit}\n`;
    });
  }

  reply += `\n\nDúvidas? Digite *5* para falar com um atendente.`;

  await sendReply(msg, phone, reply);
}

async function handleAgendarRequest(msg: any, phone: string, name: string): Promise<void> {
  userConversations[phone] = { step: 'agendar_nome', data: {}, timestamp: Date.now() };

  const client = await findClientByPhone(phone);
  if (client) {
    let reply = `📅 *Agendamento - ${client.nome}*\n\n`;
    reply += `Encontrei seu cadastro! Para agendar, preciso de algumas informações:\n\n`;
    reply += `Que tipo de serviço deseja agendar?\n\n`;
    reply += `1️⃣ - Visita Técnica\n`;
    reply += `2️⃣ - Medição\n`;
    reply += `3️⃣ - Instalação\n\n`;
    reply += `Digite o número:`;

    userConversations[phone] = { step: 'agendar_tipo', data: { clientId: client.id, nome: client.nome }, timestamp: Date.now() };
    await sendReply(msg, phone, reply);
  } else {
    let reply = `📅 *Agendamento*\n\n`;
    reply += `Para agendar, preciso do seu *nome completo*.\n\n`;
    reply += `Digite seu nome:`;
    await sendReply(msg, phone, reply);
  }
}

async function sendReply(msg: any, phone: string, text: string): Promise<void> {
  try {
    await msg.reply(text);
    await saveOutgoingMessage(phone, text, 'auto_reply');
    messagesProcessed++;
  } catch (e: any) {
    log(`ERRO reply: ${e.message}`);
    errorCount++;
  }
}

async function handleMessage(msg: any): Promise<void> {
  try {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const name = contact.pushname || contact.name || 'Desconhecido';
    const phone = chat.id.user;
    const message = msg.body;
    messagesProcessed++;
    log(`MSG ${name} (${phone}): ${message}`);
    await saveIncomingMessage(phone, name, message);
    await updateBotStatus();

    const conv = userConversations[phone];
    if (conv && Date.now() - conv.timestamp < 300000) {
      await handleConversationStep(phone, name, message, msg, conv);
      return;
    }

    await handleConversation(phone, name, message, msg);
  } catch (e: any) {
    log(`Erro ao processar msg: ${e.message || e}`);
    log(`Stack: ${e.stack || 'none'}`);
    errorCount++;
  }
}

async function handleConversationStep(phone: string, name: string, message: string, msg: any, conv: any): Promise<void> {
  const cleanMsg = message.trim().toLowerCase();

  if (cleanMsg === 'cancelar' || cleanMsg === 'voltar') {
    delete userConversations[phone];
    await sendReply(msg, phone, '❌ Operação cancelada. Digite *MENU* para ver as opções.');
    return;
  }

  switch (conv.step) {
    case 'agendar_tipo': {
      const tipoMap: Record<string, string> = { '1': 'Visita Técnica', '2': 'Medição', '3': 'Instalação' };
      const tipo = tipoMap[cleanMsg] || message.trim();
      conv.data.tipo = tipo;
      conv.step = 'agendar_data';
      conv.timestamp = Date.now();
      await sendReply(msg, phone, `📅 *Agendar ${tipo}*\n\nQual data prefere? (ex: 25/12, segunda-feira, etc)\n\nDigite *cancelar* para voltar.`);
      break;
    }
    case 'agendar_data': {
      conv.data.data = message.trim();
      conv.step = 'agendar_hora';
      conv.timestamp = Date.now();
      await sendReply(msg, phone, `⏰ Qual horário prefere?\n\nEx: 14h, manhã, tarde, etc.`);
      break;
    }
    case 'agendar_hora': {
      conv.data.hora = message.trim();
      delete userConversations[phone];
      let reply = `✅ *Agendamento Solicitado!*\n\n`;
      reply += `📋 *Tipo:* ${conv.data.tipo}\n`;
      reply += `📅 *Data:* ${conv.data.data}\n`;
      reply += `⏰ *Horário:* ${conv.data.hora}\n`;
      reply += `👤 *Cliente:* ${conv.data.nome || name}\n\n`;
      reply += `Solicitação registrada! Nosso time entrará em contato para confirmar. 📞\n\nObrigado pela preferência! 🙏`;
      await sendReply(msg, phone, reply);
      break;
    }
    default:
      delete userConversations[phone];
      await handleConversation(phone, name, message, msg);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/bot/health', (_req, res) => {
  const uptime = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  res.json({
    status: isReady ? 'online' : isConnecting ? 'connecting' : 'offline',
    uptime, startTime,
    bot: { connected: isReady, connecting: isConnecting, number: botNumber, name: botName },
    stats: { messagesProcessed, errorCount, reconnectAttempts, lastError, lastConnectionTime, lastDisconnectionTime },
    logs: connectionLogs.slice(-20),
  });
});

app.get('/api/bot/status', (_req, res) => {
  res.json({
    isReady, isConnecting, hasQr: qrCode !== null, qrCode: qrCodeBase64,
    number: botNumber, name: botName, lastConnectionTime, lastDisconnectionTime, lastError,
    messagesProcessed, errorCount, reconnectAttempts,
    uptime: Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
    logs: connectionLogs.slice(-10),
  });
});

app.post('/api/bot/send', async (req, res) => {
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.', connected: false });
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone e message obrigatórios.' });
  try {
    const cleanPhone = await normalizePhone(phone);
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
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.' });
  const { phone, clientName, companyName, servico, material, valor, obs } = req.body;
  try {
    const cleanPhone = await normalizePhone(phone);
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bot/visita', async (req, res) => {
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.' });
  const { phone, clientName, companyName, data, hora, endereco, responsavel } = req.body;
  try {
    const cleanPhone = await normalizePhone(phone);
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! Aqui é da *${companyName || 'Marmoraria'}*! 📐✨\n\n` +
      `Visita Técnica / Medição agendada:\n` +
      `📅 *Data:* ${data || 'a combinar'}\n` +
      `⏰ *Horário:* ${hora || 'Horário comercial'}\n` +
      `${endereco ? `📍 *Endereço:* ${endereco}\n` : ''}` +
      `${responsavel ? `👷 *Responsável:* ${responsavel}\n` : ''}` +
      `Confirme o recebimento. Obrigado!`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    await saveOutgoingMessage(cleanPhone, message, 'visita');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bot/producao', async (req, res) => {
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.' });
  const { phone, clientName, companyName, servico, status, previsao } = req.body;
  try {
    const cleanPhone = await normalizePhone(phone);
    const first = clientName?.split(' ')[0] || 'Cliente';
    const message =
      `Olá, *${first}*! 📋\n\n` +
      `Atualização do seu projeto de *${servico || 'Marmoraria'}* na *${companyName || 'Marmoraria'}*:\n\n` +
      `📊 *Status:* ${status || 'Em produção'}\n` +
      `${previsao ? `📅 *Previsão:* ${previsao}\n` : ''}` +
      `\nObrigado pela paciência! 😊`;
    const sent = await client.sendMessage(`${cleanPhone}@c.us`, message);
    messagesProcessed++;
    await saveOutgoingMessage(cleanPhone, message, 'producao');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bot/instalacao', async (req, res) => {
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.' });
  const { phone, clientName, companyName, data, hora, endereco } = req.body;
  try {
    const cleanPhone = await normalizePhone(phone);
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
    await saveOutgoingMessage(cleanPhone, message, 'instalacao');
    res.json({ success: true, messageId: sent.id.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bot/chats', async (_req, res) => {
  if (!isReady || !client) return res.status(503).json({ error: 'Bot não conectado.' });
  try {
    const chats = await client.getChats();
    const recent = chats.slice(0, 20).map((c: any) => ({
      id: c.id.user, name: c.name, isGroup: c.isGroup,
      lastMessage: c.lastMessage?.body?.substring(0, 100) || '', timestamp: c.lastMessage?.timestamp || null,
    }));
    res.json({ chats: recent });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bot/disconnect', async (_req, res) => {
  try {
    if (client) {
      await client.destroy();
      isReady = false; isConnecting = false; qrCode = null; qrCodeBase64 = null;
      botNumber = null; botName = null; lastDisconnectionTime = new Date().toISOString();
      log('Desconectado pelo usuario');
      await updateBotStatus();
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bot/reconnect', async (_req, res) => {
  if (isReady) return res.json({ success: true, message: 'Bot ja esta conectado' });
  reconnectAttempts = 0; lastError = null;
  log('Reconectando manualmente...');
  initializeClient();
  await updateBotStatus();
  res.json({ success: true, message: 'Reconexao iniciada' });
});

app.post('/api/bot/reset', (_req, res) => {
  reconnectAttempts = 0; lastError = null; errorCount = 0;
  log('Contadores resetados');
  res.json({ success: true });
});

function initializeClient() {
  if (pendingReconnect) { clearTimeout(pendingReconnect); pendingReconnect = null; }
  if (isConnecting) { log('Ignorado: inicializacao em andamento'); return; }
  if (client) { try { client.removeAllListeners(); } catch {} try { client.destroy(); } catch {} client = null; }

  isConnecting = true; isReady = false; qrCode = null; qrCodeBase64 = null;
  log(`Iniciando client WhatsApp (tentativa ${reconnectAttempts + 1})...`);

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu', '--disable-extensions'],
    },
  });

  client.on('qr', async (qr: string) => {
    qrCode = qr; isConnecting = true;
    try { qrCodeBase64 = await QRCodeLib.toDataURL(qr, { width: 300, margin: 2 }); } catch { qrCodeBase64 = null; }
    log('QR Code gerado - escaneie com WhatsApp');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true; isConnecting = false; reconnectAttempts = 0;
    qrCode = null; qrCodeBase64 = null; lastConnectionTime = new Date().toISOString();
    botNumber = client.info?.wid?.user || null;
    botName = client.info?.pushname || null;
    log(`CONECTADO - Numero: ${botNumber}, Nome: ${botName}`);
  });

  client.on('authenticated', () => { log('Autenticado com sucesso'); isConnecting = true; });
  client.on('auth_failure', (msg: string) => {
    log(`FALHA AUTENTICACAO: ${msg}`); isReady = false; isConnecting = false;
    lastError = `Auth failure: ${msg}`; errorCount++; scheduleReconnect();
  });
  client.on('disconnected', (reason: string) => {
    log(`DESCONECTADO: ${reason}`); isReady = false; isConnecting = false;
    lastDisconnectionTime = new Date().toISOString(); lastError = `Disconnected: ${reason}`;
    botNumber = null; botName = null; qrCode = null; qrCodeBase64 = null; scheduleReconnect();
  });

  client.on('message', async (msg: any) => { 
    try {
      // Verify message has required properties
      if (!msg || !msg.body) {
        log('MSG recebida sem corpo - ignorando');
        return;
      }
      
      const chat = await msg.getChat().catch(e => { log('ERRO getChat: ' + e.message); return null; });
      const contact = await msg.getContact().catch(e => { log('ERRO getContact: ' + e.message); return null; });
      const name = contact?.pushname || contact?.name || 'Desconhecido';
      const phone = chat?.id?.user || '';
      
      if (!phone) {
        log('MSG sem número de telefone - ignorando');
        return;
      }
      
      const message = msg.body;
      messagesProcessed++;
      log(`MSG ${name} (${phone}): ${message}`);
      await saveIncomingMessage(phone, name, message);
      await updateBotStatus();

      const conv = userConversations[phone];
      if (conv && Date.now() - conv.timestamp < 300000) {
        await handleConversationStep(phone, name, message, msg, conv);
        return;
      }

      await handleConversation(phone, name, message, msg);
    } catch (e: any) {
      log(`ERRO handler message: ${e.message || e}`);
      errorCount++;
    }
  });

  client.on('error', (err: any) => {
    const errMsg = err?.message || String(err);
    log(`ERRO CLIENT: ${errMsg}`); lastError = errMsg; errorCount++;
  });

  try {
    client.initialize();
    log('Client inicializado, aguardando eventos...');
  } catch (e: any) {
    log(`ERRO FATAL: ${e.message}`); isReady = false; isConnecting = false;
    lastError = `Init error: ${e.message}`; errorCount++; scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (pendingReconnect) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log(`Maximo de ${MAX_RECONNECT_ATTEMPTS} tentativas. Aguardando reinicio manual.`);
    isConnecting = false; return;
  }
  reconnectAttempts++;
  const delay = Math.min(RECONNECT_BASE_DELAY * reconnectAttempts, 30000);
  log(`Reconectando em ${delay / 1000}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
  isConnecting = true;
  pendingReconnect = setTimeout(() => { pendingReconnect = null; initializeClient(); }, delay);
}

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║    MAR100 - ChatBot v3.0             ║');
console.log('║    Atendimento via WhatsApp          ║');
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
  console.log(`  🤖 ChatBot: ATIVO (auto-reply com clientes)`);
  console.log(`  Sync Supabase: ATIVO (a cada 5s)`);
  console.log('');
  initializeClient();
  setInterval(pollPendingMessages, 5000);
  setInterval(updateBotStatus, 10000);
});
