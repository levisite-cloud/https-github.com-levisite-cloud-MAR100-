import wwebjs from 'whatsapp-web.js';
const { Client, LocalAuth } = wwebjs as any;
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import qrcode from 'qrcode-terminal';
import express from 'express';
import cors from 'cors';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Erro: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const PORT = 3001;

let isReady = false;
let isConnecting = false;
let botNumber: string | null = null;
let botName: string | null = null;
let lastConnectionTime: string | null = null;
let lastDisconnectionTime: string | null = null;
let lastError: string | null = null;
let messagesProcessed = 0;
let errorCount = 0;
let startTime = new Date().toISOString();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_cache' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    }
});

console.log('🔄 Inicializando o robô da Marmoraria...');

client.on('qr', (qr: string) => {
    console.log('📱 Escaneie o QR Code abaixo com o WhatsApp da empresa:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso e pronto para uso!');
    isReady = true;
    isConnecting = false;
    botNumber = client.info?.wid?.user || null;
    botName = client.info?.pushname || null;
    lastConnectionTime = new Date().toISOString();
    escutarGatilhosDoSupabase();
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso');
    isConnecting = true;
});

client.on('auth_failure', (msg: string) => {
    console.error('❌ Falha na autenticação:', msg);
    isReady = false;
    isConnecting = false;
    lastError = `Auth failure: ${msg}`;
    errorCount++;
});

client.on('disconnected', (reason: string) => {
    console.log('⛔ Desconectado:', reason);
    isReady = false;
    isConnecting = false;
    lastDisconnectionTime = new Date().toISOString();
    lastError = `Disconnected: ${reason}`;
    botNumber = null;
    botName = null;
});

/**
 * 📥 FLUXO DE RECEBIMENTO: Captura novas mensagens e adiciona como leads no Kanban
 */
client.on('message', async (msg: any) => {
    if (msg.from.includes('@g.us')) return;

    const numeroCliente = msg.from.replace('@c.us', '');
    const textoRecebido = msg.body.trim();
    const contato = await msg.getContact();
    const nomeCliente = contato.pushname || 'Cliente WhatsApp';

    console.log(`📩 Nova mensagem de ${nomeCliente} (${numeroCliente}): ${textoRecebido}`);
    messagesProcessed++;

    const { data: clienteExiste, error } = await supabase
        .from('atendimentos')
        .select('id')
        .eq('telefone', numeroCliente)
        .maybeSingle();

    if (error) {
        console.error('Erro ao consultar banco de dados:', error);
        return;
    }

    if (!clienteExiste) {
        const { error: insertError } = await supabase
            .from('atendimentos')
            .insert([
                {
                    nome: nomeCliente,
                    telefone: numeroCliente,
                    status: 'Novo Atendimento',
                    servico: 'Marmoraria',
                    material: 'A definir',
                    endereco: 'A definir',
                    responsavel: 'Atendimento Automático',
                    orcamento: 'R$ 0,00',
                    itens_orcamento: [],
                    data_prevista: '',
                    hora_prevista: '',
                    obs: `Lead gerado automaticamente via WhatsApp. Mensagem inicial: "${textoRecebido}"`,
                    criado_em: new Date().toISOString(),
                    atualizado_em: new Date().toISOString()
                }
            ]);

        if (!insertError) {
            msg.reply(`Olá, ${nomeCliente}! Sou o assistente virtual da marmoraria. Recebemos seu contato e um de nossos consultores já vai te atender! Horário de atendimento: Seg a Sex das 8h às 18h.`);
            console.log(`🆕 Novo lead criado no Kanban para: ${nomeCliente}`);
        } else {
            console.error('Erro ao inserir novo lead:', insertError);
        }
    }
});

/**
 * 📤 FLUXO DE DISPARO AUTOMÁTICO: Escuta alterações no Supabase em tempo real
 */
function escutarGatilhosDoSupabase() {
    console.log('🛰️ Conectando ao canal de atualizações em tempo real do Supabase...');

    supabase
        .channel('mudancas_atendimentos')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'atendimentos' },
            async (payload) => {
                const antigoStatus = payload.old.status;
                const novoStatus = payload.new.status;
                const whatsappCliente = payload.new.telefone;
                const nomeCliente = payload.new.nome;

                if (antigoStatus !== novoStatus && whatsappCliente) {
                    const formattedNumber = `${whatsappCliente}@c.us`;
                    let mensagem = '';

                    switch (novoStatus) {
                        case 'Visita Agendada':
                            mensagem = `Olá, ${nomeCliente}! Sua visita técnica foi agendada com sucesso. Em breve nosso técnico chegará para realizar as medições das pedras.`;
                            break;
                        case 'Orçamento Enviado':
                            mensagem = `Olá, ${nomeCliente}! O orçamento detalhado dos seus acabamentos em mármore/granito foi gerado e enviado para o seu e-mail/sistema. Acesse para conferir!`;
                            break;
                        case 'Em Produção':
                            mensagem = `Boas notícias, ${nomeCliente}! Seu projeto foi aprovado e as pedras já entraram na nossa linha de corte e acabamento em produção.`;
                            break;
                        case 'Instalação Agendada':
                            mensagem = `Olá, ${nomeCliente}! Nossa equipe de instalação já agendou a entrega das suas peças. Por favor, garanta que haverá alguém responsável no local.`;
                            break;
                    }

                    if (mensagem) {
                        try {
                            await client.sendMessage(formattedNumber, mensagem);
                            console.log(`🚀 Mensagem automatizada de status [${novoStatus}] enviada para ${nomeCliente}`);
                        } catch (err) {
                            console.error(`❌ Falha ao enviar mensagem para o número ${formattedNumber}:`, err);
                        }
                    }
                }
            }
        )
        .subscribe();
}

// ═══════════════════════════════════════════════════════════
// SERVIDOR EXPRESS PARA API DO FRONTEND
// ═══════════════════════════════════════════════════════════

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/bot/status', (_req, res) => {
    res.json({
        isReady,
        isConnecting,
        hasQr: false,
        qrCode: null,
        number: botNumber,
        name: botName,
        lastConnectionTime,
        lastDisconnectionTime,
        lastError,
        messagesProcessed,
        errorCount,
        reconnectAttempts: 0,
        uptime: Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
        logs: [],
    });
});

app.get('/api/bot/health', (_req, res) => {
    res.json({
        status: isReady ? 'online' : isConnecting ? 'connecting' : 'offline',
        uptime: Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
        startTime,
        bot: { connected: isReady, connecting: isConnecting, number: botNumber, name: botName },
        stats: { messagesProcessed, errorCount, reconnectAttempts: 0, lastError, lastConnectionTime, lastDisconnectionTime },
        logs: [],
    });
});

app.post('/api/bot/disconnect', async (_req, res) => {
    try {
        await client.destroy();
        isReady = false;
        isConnecting = false;
        botNumber = null;
        botName = null;
        lastDisconnectionTime = new Date().toISOString();
        console.log('Desconectado pelo usuário');
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/bot/reconnect', (_req, res) => {
    if (isReady) return res.json({ success: true, message: 'Bot já está conectado' });
    lastError = null;
    console.log('Reconectando...');
    client.initialize();
    res.json({ success: true, message: 'Reconexão iniciada' });
});

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║    MAR100 - Bot WhatsApp v4.0        ║');
console.log('║    Conectado ao Supabase             ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 API Bot rodando em http://localhost:${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /api/bot/status`);
    console.log(`  GET  /api/bot/health`);
    console.log(`  POST /api/bot/disconnect`);
    console.log(`  POST /api/bot/reconnect`);
    console.log('');
    console.log('⏳ Aguardando conexão com WhatsApp...');
    client.initialize();
});
