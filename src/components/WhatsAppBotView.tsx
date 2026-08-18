import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bot,
  QrCode,
  Smartphone,
  MessageSquare,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserPlus,
  RefreshCw,
  Power,
  Sliders,
  Flame,
  ArrowRight,
  TrendingUp,
  Search,
  Phone,
  ShieldCheck,
  CheckCheck,
  Building2,
  Trash2,
  ExternalLink,
  Kanban,
  BatteryCharging,
  Wifi,
  Smile,
  Mic,
  Paperclip,
  Camera,
  FileText,
  Volume2,
  VolumeX,
  Plus,
  Layers,
  Calculator,
  Radio,
  SendHorizontal,
  DollarSign,
  Download,
  Share2,
  Copy,
  SlidersHorizontal,
  ChevronRight,
  Sparkle,
  Activity,
  Play,
  Pause,
  Terminal,
} from 'lucide-react';
import { ConversaWhatsApp, ItemTabelaPedra } from '../types';

export const WhatsAppBotView: React.FC = () => {
  const {
    botStatus,
    botConfig,
    conversas,
    selectedConversaId,
    setSelectedConversaId,
    botLogs,
    addBotLog,
    updateBotConfig,
    connectBot,
    disconnectBot,
    simulateIncomingLeadAuto,
    sendChatMessage,
    sendImageAttachment,
    generatePdfProposal,
    triggerFollowUp,
    convertLeadToAtendimento,
    createNewConversa,
    deleteConversa,
    updateTabelaPedra,
    addTabelaPedra,
    deleteTabelaPedra,
    toggleBotSkill,
    dispararCampanha,
    addToast,
    empresa,
  } = useApp();

  type TabType = 'conexao' | 'conversas' | 'radar' | 'tabela' | 'skills' | 'campanhas' | 'calculadora' | 'config';
  // Se não conectado, exibir tela de 'conexao' (QR Code), caso contrário 'conversas'
  const [activeTab, setActiveTab] = useState<TabType>(botStatus === 'connected' ? 'conversas' : 'conexao');

  // Estado do Chat
  const [chatInput, setChatInput] = useState('');
  const [sendAsMode, setSendAsMode] = useState<'cliente' | 'atendente'>('cliente');
  const [isTyping, setIsTyping] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'novos' | 'kanban'>('todos');
  const [newChatModal, setNewChatModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Temporizador de Atualização Dinâmica do QR Code
  const [qrCountdown, setQrCountdown] = useState(45);
  const [autoPilot, setAutoPilot] = useState(true);

  // Estado do Modal de Pedras
  const [stoneModal, setStoneModal] = useState(false);
  const [newStone, setNewStone] = useState<Partial<ItemTabelaPedra>>({
    nome: '',
    categoria: 'Granito',
    precoM2: 950,
    corHex: '#334155',
    indicacao: 'Cozinhas e Ãreas Gourmet',
    porosidade: 'Muito Baixa',
    descricao: '',
  });

  // Estado da Campanha
  const [campaignSegment, setCampaignSegment] = useState<'Arquitetos & Designers' | 'Clientes em Reforma' | 'Leads Frios (RecuperaÃ§Ã£o)'>('Arquitetos & Designers');
  const [campaignMsg, setCampaignMsg] = useState(
    'OlÃ¡, {{nome}}! ðŸ’Ž Estamos com lote especial de *Quartzo Calacatta e Granito Preto Absoluto* com 15% de desconto para projetos fechados nesta semana. Deseja receber nosso mostruÃ¡rio digital em PDF?'
  );

  // Estado da Calculadora em Tempo Real
  const [calcMaterial, setCalcMaterial] = useState(botConfig.tabelaPedras[0]?.nome || 'Granito SÃ£o Gabriel');
  const [calcComprimento, setCalcComprimento] = useState(2.2);
  const [calcLargura, setCalcLargura] = useState(0.6);
  const [calcSaia, setCalcSaia] = useState(false);
  const [calcMeiaEsquadria, setCalcMeiaEsquadria] = useState(true);
  const [calcCubaEsculpida, setCalcCubaEsculpida] = useState(false);
  const [calcCooktop, setCalcCooktop] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversa = conversas.find((c) => c.id === selectedConversaId) || conversas[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversa?.mensagens]);

  // Efeito do Temporizador do QR Code
  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev <= 1 ? 50 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Text-To-Speech (Voz do RobÃ´)
  const speakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      addToast('Ãudio indisponÃ­vel', 'Seu navegador nÃ£o suporta sÃ­ntese de voz.', 'info');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_~`]/g, '').replace(/https?:\/\/\S+/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !selectedConversa) return;

    const text = chatInput;
    setChatInput('');

    if (sendAsMode === 'cliente' && botConfig.ativo && botStatus === 'connected') {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1400);
    }

    await sendChatMessage(selectedConversa.id, text, sendAsMode);
  };

  const handleSendSampleImage = async (preset: 'planta' | 'bancada' | 'lavatorio') => {
    if (!selectedConversa) return;

    let url = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80';
    let nome = 'foto_bancada_cliente.jpg';

    if (preset === 'planta') {
      url = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80';
      nome = 'planta_baixa_arquitetura.jpg';
    } else if (preset === 'lavatorio') {
      url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80';
      nome = 'lavatorio_banheiro_reforma.jpg';
    }

    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1500);
    await sendImageAttachment(selectedConversa.id, url, nome);
  };

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      addToast('Nome ObrigatÃ³rio', 'Informe o nome do cliente.', 'warning');
      return;
    }

    const id = createNewConversa(newClientName, newClientPhone || '(11) 9' + Math.floor(10000000 + Math.random() * 90000000));
    setSelectedConversaId(id);
    setNewChatModal(false);
    setNewClientName('');
    setNewClientPhone('');
    addToast('Nova Conversa Criada', `Atendimento com ${newClientName} iniciado.`, 'success');
  };

  const handleAddStoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStone.nome?.trim() || !newStone.precoM2) {
      addToast('Campos ObrigatÃ³rios', 'Preencha o nome e o preÃ§o por mÂ².', 'warning');
      return;
    }

    addTabelaPedra({
      nome: newStone.nome,
      categoria: newStone.categoria || 'Granito',
      precoM2: Number(newStone.precoM2),
      corHex: newStone.corHex || '#334155',
      indicacao: newStone.indicacao || 'Universal',
      porosidade: newStone.porosidade || 'Muito Baixa',
      descricao: newStone.descricao || 'Material nobre de alto padrÃ£o.',
    });

    setStoneModal(false);
    setNewStone({
      nome: '',
      categoria: 'Granito',
      precoM2: 950,
      corHex: '#334155',
      indicacao: 'Cozinhas e Ãreas Gourmet',
      porosidade: 'Muito Baixa',
      descricao: '',
    });
  };

  const filteredConversas = conversas.filter((c) => {
    const matchText =
      c.clienteNome.toLowerCase().includes(filterSearch.toLowerCase()) ||
      c.clienteTelefone.includes(filterSearch);
    if (!matchText) return false;
    if (filterStatus === 'novos') return c.statusLead === 'novo' || c.statusLead === 'em_atendimento';
    if (filterStatus === 'kanban') return c.statusLead === 'cadastrado_kanban';
    return true;
  });

  const totalAtendidos = botConfig.totalAtendimentosBot || conversas.reduce((acc, c) => acc + c.mensagens.length, 0);
  const totalConvertidos = conversas.filter((c) => c.statusLead === 'cadastrado_kanban').length;

  // Fórmula de cálculo em tempo real para simulação
  const selectedPedraObj = botConfig.tabelaPedras.find((p) => p.nome === calcMaterial) || botConfig.tabelaPedras[0];
  const areaM2 = Math.max(0.1, Number((calcComprimento * calcLargura).toFixed(2)));
  const valorBasePedra = areaM2 * (selectedPedraObj?.precoM2 || 850);
  const valorMeiaEsquadria = calcMeiaEsquadria ? (calcComprimento + calcLargura * 2) * 120 : 0;
  const valorSaia = calcSaia ? calcComprimento * 180 : 0;
  const valorCuba = calcCubaEsculpida ? 750 : 0;
  const valorCooktop = calcCooktop ? 150 : 0;
  const valorFreteInstalacao = 350;
  const valorTotalCalculado = Math.round(valorBasePedra + valorMeiaEsquadria + valorSaia + valorCuba + valorCooktop + valorFreteInstalacao);

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Banner Status with Super Bot Branding & Quick QR Action */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 shadow-2xl transition-all ${
                botStatus === 'connected' && botConfig.ativo
                  ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 border-amber-300 text-zinc-950 shadow-amber-400/30'
                  : botStatus === 'pairing'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 animate-pulse'
                  : 'bg-zinc-850 border-zinc-750 text-zinc-400'
              }`}
            >
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5px]" />
            </div>
            {botStatus === 'connected' && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-zinc-900"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                <span>{botConfig.nomeRobo}</span>
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-xs ${
                  botStatus === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : botStatus === 'pairing'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${botStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : botStatus === 'pairing' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                {botStatus === 'connected'
                  ? 'Super RobÃ´ Online (WhatsApp 24h)'
                  : botStatus === 'pairing'
                  ? 'Gerando QR Code do WhatsApp...'
                  : 'Celular Desconectado'}
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-800/90 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini 3.7 Flash & Vision AI</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Super RobÃ´ de Atendimento WhatsApp para Marmorarias: Gera o QR Code, conecta o celular comercial e atende 24h no piloto automÃ¡tico.
            </p>
          </div>
        </div>

        {/* Quick Top Switch Controls & Auto-Pilot Trigger */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => simulateIncomingLeadAuto()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black rounded-2xl text-xs shadow-lg shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
            title="Simula a chegada de um lead no WhatsApp e o robÃ´ agindo na hora"
          >
            <Zap className="w-4 h-4 stroke-[2.5px] text-zinc-950" />
            <span>Simular Lead Chamando Agora</span>
          </button>

          <div className="flex items-center gap-2.5 bg-zinc-850/90 border border-zinc-750 rounded-2xl px-3.5 py-2">
            <span className="text-xs text-zinc-300 font-bold">Auto-Atendimento:</span>
            <button
              onClick={() => updateBotConfig({ ativo: !botConfig.ativo })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                botConfig.ativo ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  botConfig.ativo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-black ${botConfig.ativo ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {botConfig.ativo ? 'LIGADO' : 'PAUSADO'}
            </span>
          </div>

          {botStatus === 'connected' ? (
            <button
              onClick={() => {
                setActiveTab('conexao');
                connectBot(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 border border-amber-400/30 rounded-2xl text-xs font-black transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver QR Code</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setActiveTab('conexao');
                connectBot(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Gerar QR Code Agora</span>
            </button>
          )}
        </div>
      </div>

      {/* Super Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Atendimentos IA</span>
            <div className="text-2xl font-black text-zinc-100 mt-0.5">{totalAtendidos}</div>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" /> 100% AutomÃ¡tico
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Leads no Kanban</span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{totalConvertidos}</div>
            <span className="text-[10px] text-zinc-400 font-mono mt-0.5">SincronizaÃ§Ã£o CRM</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Kanban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Radar de AÃ§Ãµes</span>
            <div className="text-2xl font-black text-blue-400 mt-0.5">{botLogs.length} AÃ§Ãµes</div>
            <span className="text-[10px] text-blue-300 font-semibold mt-0.5">Tempo Real</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Bateria & Sinal Celular</span>
            <div className="text-2xl font-black text-zinc-100 mt-0.5">{botConfig.bateria}% 5G</div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">Gateway Multi-Device</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <BatteryCharging className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar (8 Power Modules) */}
      <div className="flex border-b border-zinc-800 gap-1.5 pb-2 overflow-x-auto">
        {[
          { id: 'conexao', label: 'ðŸ“± Gerar QR Code & Conectar', icon: QrCode },
          { id: 'conversas', label: `ðŸ’¬ Conversas WhatsApp (${conversas.length})`, icon: MessageSquare },
          { id: 'radar', label: `âš¡ Radar de AÃ§Ãµes IA (${botLogs.length})`, icon: Activity },
          { id: 'tabela', label: `ðŸ’Ž Tabela de Pedras (${botConfig.tabelaPedras.length})`, icon: Layers },
          { id: 'skills', label: 'ðŸš€ Super Poderes IA', icon: Zap },
          { id: 'campanhas', label: 'ðŸ“¢ Disparo em Massa', icon: Radio },
          { id: 'calculadora', label: 'ðŸ§® Calculadora de mÂ²', icon: Calculator },
          { id: 'config', label: 'âš™ï¸ ConfiguraÃ§Ãµes', icon: Sliders },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 scale-[1.02]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: CONEXÃƒO & GERADOR DE QR CODE */}
      {activeTab === 'conexao' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Instructions Box */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Pareamento Multi-Aparelhos WhatsApp Web</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-400">Como Parear seu Celular</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Conecte o nÃºmero de WhatsApp comercial da sua marmoraria. O robÃ´ passa a agir respondendo mensagens e fazendo orÃ§amentos automaticamente 24h por dia.
                </p>
              </div>

              <div className="space-y-3.5 text-xs text-zinc-300">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-850 border border-zinc-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-zinc-950 font-black flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-100">Abra o WhatsApp no seu Celular</h4>
                    <p className="text-zinc-400 mt-0.5">
                      No Android: toque nos <strong>3 pontinhos</strong> no topo direito. No iPhone: toque em <strong>ConfiguraÃ§Ãµes</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-850 border border-zinc-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-zinc-950 font-black flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-100">Selecione "Aparelhos Conectados"</h4>
                    <p className="text-zinc-400 mt-0.5">
                      Toque no botÃ£o <strong>"Conectar um aparelho"</strong> para abrir o leitor de QR Code com a cÃ¢mera do celular.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-850 border border-zinc-800">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-zinc-950 font-black flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-100">Aponte a cÃ¢mera para o QR Code ao lado</h4>
                    <p className="text-zinc-400 mt-0.5">
                      A sincronizaÃ§Ã£o Ã© imediata e o robÃ´ passa a agir em todas as conversas novas de clientes!
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Criptografia de Ponta a Ponta (E2EE)</span>
                </h4>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Suas conversas e dados de clientes permanecem protegidos por criptografia direta entre o seu aparelho e a InteligÃªncia Artificial da marmoraria.
                </p>
              </div>
            </div>

            {/* Quick Action Button to start or simulate */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => connectBot(true)}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5px]" />
                <span>Validar ConexÃ£o & Deixar RobÃ´ Agir</span>
              </button>

              <button
                onClick={() => {
                  simulateIncomingLeadAuto();
                  setActiveTab('conversas');
                }}
                className="py-3.5 px-5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-2xl shadow transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 stroke-[2.5px]" />
                <span>Simular Lead</span>
              </button>
            </div>
          </div>

          {/* Interactive QR Code Display */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block mb-1">
                Leitor de QR Code WhatsApp Web
              </span>
              <h3 className="text-lg font-black text-zinc-100">
                {botStatus === 'connected' ? 'âœ… Celular Conectado com Sucesso' : 'Escaneie para Conectar o WhatsApp'}
              </h3>
            </div>

            {/* The QR Card with Laser Scanning Effect */}
            <div className="p-6 bg-white rounded-3xl shadow-2xl border-4 border-amber-400 relative group overflow-hidden">
              {/* Animated Laser Scanning Line */}
              <div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-20 pointer-events-none animate-bounce"
                style={{ animationDuration: '2.5s' }}
              />

              <svg viewBox="0 0 200 200" className="w-60 h-60 sm:w-72 sm:h-72">
                {/* 3 Corner Positioning Blocks */}
                <rect x="10" y="10" width="50" height="50" fill="#000000" rx="6" />
                <rect x="18" y="18" width="34" height="34" fill="#ffffff" rx="4" />
                <rect x="26" y="26" width="18" height="18" fill="#000000" rx="2" />

                <rect x="140" y="10" width="50" height="50" fill="#000000" rx="6" />
                <rect x="148" y="18" width="34" height="34" fill="#ffffff" rx="4" />
                <rect x="156" y="26" width="18" height="18" fill="#000000" rx="2" />

                <rect x="10" y="140" width="50" height="50" fill="#000000" rx="6" />
                <rect x="18" y="148" width="34" height="34" fill="#ffffff" rx="4" />
                <rect x="26" y="156" width="18" height="18" fill="#000000" rx="2" />

                {/* Pattern Matrix */}
                <rect x="70" y="15" width="12" height="12" fill="#000000" />
                <rect x="90" y="15" width="12" height="12" fill="#000000" />
                <rect x="110" y="15" width="12" height="12" fill="#000000" />
                <rect x="70" y="35" width="12" height="12" fill="#000000" />
                <rect x="100" y="35" width="12" height="12" fill="#000000" />
                <rect x="80" y="55" width="12" height="12" fill="#000000" />
                <rect x="110" y="55" width="12" height="12" fill="#000000" />

                <rect x="15" y="75" width="12" height="12" fill="#000000" />
                <rect x="35" y="75" width="12" height="12" fill="#000000" />
                <rect x="65" y="75" width="12" height="12" fill="#000000" />
                <rect x="85" y="75" width="12" height="12" fill="#000000" />
                <rect x="105" y="75" width="12" height="12" fill="#000000" />
                <rect x="135" y="75" width="12" height="12" fill="#000000" />
                <rect x="155" y="75" width="12" height="12" fill="#000000" />
                <rect x="175" y="75" width="12" height="12" fill="#000000" />

                <rect x="25" y="95" width="12" height="12" fill="#000000" />
                <rect x="55" y="95" width="12" height="12" fill="#000000" />
                <rect x="75" y="95" width="12" height="12" fill="#000000" />
                <rect x="115" y="95" width="12" height="12" fill="#000000" />
                <rect x="145" y="95" width="12" height="12" fill="#000000" />
                <rect x="165" y="95" width="12" height="12" fill="#000000" />

                <rect x="15" y="115" width="12" height="12" fill="#000000" />
                <rect x="45" y="115" width="12" height="12" fill="#000000" />
                <rect x="85" y="115" width="12" height="12" fill="#000000" />
                <rect x="105" y="115" width="12" height="12" fill="#000000" />
                <rect x="135" y="115" width="12" height="12" fill="#000000" />
                <rect x="175" y="115" width="12" height="12" fill="#000000" />

                <rect x="70" y="145" width="12" height="12" fill="#000000" />
                <rect x="90" y="145" width="12" height="12" fill="#000000" />
                <rect x="120" y="145" width="12" height="12" fill="#000000" />
                <rect x="150" y="145" width="12" height="12" fill="#000000" />
                <rect x="170" y="145" width="12" height="12" fill="#000000" />

                <rect x="70" y="170" width="12" height="12" fill="#000000" />
                <rect x="100" y="170" width="12" height="12" fill="#000000" />
                <rect x="130" y="170" width="12" height="12" fill="#000000" />
                <rect x="160" y="170" width="12" height="12" fill="#000000" />

                {/* Center WhatsApp Icon Badge */}
                <circle cx="100" cy="100" r="18" fill="#25D366" />
                <circle cx="100" cy="100" r="14" fill="#ffffff" />
                <circle cx="100" cy="100" r="10" fill="#25D366" />
              </svg>

              {botStatus === 'pairing' && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4 z-30">
                  <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                  <span className="text-xs font-black text-zinc-100 mt-2">Sincronizando com o WhatsApp...</span>
                </div>
              )}
            </div>

            {/* Countdown & Status */}
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className={`w-3 h-3 rounded-full ${botStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs sm:text-sm font-black text-zinc-200">
                  {botStatus === 'connected'
                    ? `SessÃ£o Ativa: ${botConfig.telefoneConectado}`
                    : 'Aguardando Leitura da CÃ¢mera'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                QR Code atualiza automaticamente em <strong className="text-amber-400">{qrCountdown}s</strong>
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => connectBot(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-2xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Gerar Novo QR Code</span>
              </button>

              {botStatus === 'connected' && (
                <button
                  onClick={disconnectBot}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-rose-500/20 text-rose-400 border border-zinc-700 hover:border-rose-500/30 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: RADAR EM TEMPO REAL: ROBÃ” AGINDO NO WHATSAPP */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left: Live Terminal Log */}
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/30 mb-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Feed de ExecuÃ§Ã£o em Tempo Real</span>
                </div>
                <h2 className="text-xl font-black text-amber-400">Radar de AÃ§Ãµes AutÃ´nomas da IA</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Acompanhe exatamente o que o robÃ´ estÃ¡ pensando, calculando e respondendo no WhatsApp.
                </p>
              </div>

              <button
                onClick={() => simulateIncomingLeadAuto()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>+ Simular Lead</span>
              </button>
            </div>

            {/* Logs Stream List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {botLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-zinc-850/90 border border-zinc-800 rounded-2xl flex items-start gap-3 text-xs transition-all hover:border-zinc-700"
                >
                  <div className="p-2 rounded-xl bg-zinc-800 text-amber-400 shrink-0 mt-0.5">
                    {log.tipo === 'leitura_msg' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : log.tipo === 'calculo_ia' ? (
                      <Calculator className="w-4 h-4 text-blue-400" />
                    ) : log.tipo === 'geracao_pdf' ? (
                      <FileText className="w-4 h-4 text-emerald-400" />
                    ) : log.tipo === 'conversao_kanban' ? (
                      <Kanban className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-zinc-100">{log.clienteNome}</span>
                      <span className="font-mono text-[11px] text-zinc-500">{log.timestamp}</span>
                    </div>
                    <p className="text-zinc-300 mt-1 leading-relaxed">{log.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auto-Pilot Status & Insights */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                Piloto AutomÃ¡tico do WhatsApp
              </span>

              <div className="p-4 bg-zinc-850 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-bold">Status do Motor IA:</span>
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Ativo 24 Horas
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-bold">Tempo MÃ©dio de Resposta:</span>
                  <span className="text-zinc-100 font-mono font-black">&lt; 2.1 segundos</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-bold">Taxa de ConversÃ£o:</span>
                  <span className="text-amber-400 font-black">94.8%</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>InteligÃªncia Comercial em AÃ§Ã£o</span>
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  O robÃ´ detecta automaticamente quando o cliente tem pressa ou alto poder aquisitivo, priorizando materiais nobres como Quartzitos e Dekton.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('conversas')}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ver Conversas ao Vivo no Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: CENTRAL DE CONVERSAS AO VIVO E SIMULADOR */}
      {activeTab === 'conversas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[660px]">
          {/* Col 1: Lista de Conversas (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl flex flex-col overflow-hidden">
            {/* Search and filter bar */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-850/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Leads & Conversas WhatsApp</span>
                </span>
                <button
                  onClick={() => setNewChatModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-all shadow cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Lead</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Buscar por cliente, telefone ou pedra..."
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-2xl pl-10 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={() => setFilterStatus('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'todos'
                      ? 'bg-zinc-700 text-white shadow'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todos ({conversas.length})
                </button>
                <button
                  onClick={() => setFilterStatus('novos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'novos'
                      ? 'bg-zinc-700 text-white shadow'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Atendendo ({conversas.filter((c) => c.statusLead !== 'cadastrado_kanban').length})
                </button>
                <button
                  onClick={() => setFilterStatus('kanban')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'kanban'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  No Kanban ({totalConvertidos})
                </button>
              </div>
            </div>

            {/* Conversation list items */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 max-h-[580px]">
              {filteredConversas.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 text-xs space-y-2">
                  <p>Nenhuma conversa encontrada.</p>
                  <button
                    onClick={() => setNewChatModal(true)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-xl text-xs font-bold"
                  >
                    + Iniciar novo atendimento
                  </button>
                </div>
              ) : (
                filteredConversas.map((c) => {
                  const isSelected = selectedConversa?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConversaId(c.id)}
                      className={`p-4 transition-all cursor-pointer flex items-start gap-3.5 relative ${
                        isSelected
                          ? 'bg-amber-400/10 border-l-4 border-amber-400 shadow-inner'
                          : 'hover:bg-zinc-850/60'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                        {c.clienteNome.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-zinc-100 truncate">{c.clienteNome}</h4>
                          <span className="text-[10px] text-zinc-400 font-mono">{c.horario}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">{c.clienteTelefone}</p>
                        <p className="text-xs text-zinc-300 truncate mt-1 leading-snug">{c.ultimaMensagem}</p>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {c.statusLead === 'cadastrado_kanban' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>No Kanban</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              <span>Super RobÃ´</span>
                            </span>
                          )}

                          {c.temperatura === 'quente' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              <span>Lead Quente</span>
                            </span>
                          )}

                          {c.dadosExtraidos?.material && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 truncate max-w-[120px]">
                              {c.dadosExtraidos.material}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Col 2: Chat ao Vivo & Simulador WhatsApp (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl flex flex-col overflow-hidden">
            {selectedConversa ? (
              <>
                {/* Chat Top Header */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-850/90 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-zinc-950 font-black flex items-center justify-center text-xs shadow-md">
                      {selectedConversa.clienteNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-zinc-100">{selectedConversa.clienteNome}</h3>
                        <span className="text-xs text-zinc-400 font-mono">({selectedConversa.clienteTelefone})</span>
                        {selectedConversa.origem && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
                            {selectedConversa.origem}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online no WhatsApp â€¢ IA Gemini 3.7 Monitorando</span>
                      </p>
                    </div>
                  </div>

                  {/* Top Action Buttons (PDF, Follow-up, Kanban) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => generatePdfProposal(selectedConversa.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 border border-amber-400/30 rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
                      title="Gerar e Enviar Proposta Comercial em PDF com Chave PIX"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Gerar Proposta PDF</span>
                    </button>

                    <button
                      onClick={() => triggerFollowUp(selectedConversa.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
                      title="Disparar mensagem de recuperaÃ§Ã£o de vendas de 24h"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Follow-up 24h</span>
                    </button>

                    {selectedConversa.statusLead !== 'cadastrado_kanban' ? (
                      <button
                        onClick={() => convertLeadToAtendimento(selectedConversa.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Kanban className="w-3.5 h-3.5 stroke-[2.5px]" />
                        <span>Cadastrar no Kanban</span>
                      </button>
                    ) : (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>No CRM Kanban</span>
                      </span>
                    )}

                    <button
                      onClick={() => deleteConversa(selectedConversa.id)}
                      className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      title="Excluir conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lead Summary Bar (Data extracted by AI) */}
                {selectedConversa.dadosExtraidos && (
                  <div className="px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-zinc-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dados Identificados pelo RobÃ´:</span>
                      </span>
                      {selectedConversa.dadosExtraidos.servico && (
                        <span className="bg-zinc-850 px-2.5 py-0.5 rounded-lg border border-zinc-700 text-zinc-200 font-medium">
                          ðŸ› ï¸ {selectedConversa.dadosExtraidos.servico}
                        </span>
                      )}
                      {selectedConversa.dadosExtraidos.material && (
                        <span className="bg-zinc-850 px-2.5 py-0.5 rounded-lg border border-zinc-700 text-amber-300 font-bold">
                          ðŸ’Ž {selectedConversa.dadosExtraidos.material}
                        </span>
                      )}
                      {selectedConversa.dadosExtraidos.medidas && (
                        <span className="bg-zinc-850 px-2.5 py-0.5 rounded-lg border border-zinc-700 text-zinc-200">
                          ðŸ“ {selectedConversa.dadosExtraidos.medidas}
                        </span>
                      )}
                      {selectedConversa.dadosExtraidos.valorEstimado && (
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black px-2.5 py-0.5 rounded-lg">
                          ðŸ’° ~R$ {selectedConversa.dadosExtraidos.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Messages Body (WhatsApp Web Dark Style) */}
                <div
                  className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-[#0b141a]"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                >
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-3.5 py-1 rounded-full shadow">
                      ðŸ”’ Mensagens protegidas e sincronizadas em tempo real com o nÃºmero da marmoraria
                    </span>
                  </div>

                  {selectedConversa.mensagens.map((msg) => {
                    const isClient = msg.remetente === 'cliente';
                    const isBot = msg.remetente === 'bot';
                    const isSpeaking = speakingMsgId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-start' : 'items-end'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-lg relative group ${
                            isClient
                              ? 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/80'
                              : isBot
                              ? 'bg-[#005c4b] text-zinc-100 rounded-tr-none border border-[#007560]'
                              : 'bg-blue-600 text-white rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                isClient ? 'text-amber-400' : isBot ? 'text-emerald-300' : 'text-blue-200'
                              }`}
                            >
                              {isClient ? selectedConversa.clienteNome : isBot ? `ðŸ¤– ${botConfig.nomeRobo}` : 'ðŸ‘¤ Vendedor Humano'}
                            </span>

                            {/* Voice Button to speak message */}
                            <button
                              onClick={() => speakText(msg.texto, msg.id)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isSpeaking
                                  ? 'bg-amber-400 text-zinc-950 animate-pulse'
                                  : 'text-zinc-300 hover:text-white hover:bg-black/20'
                              }`}
                              title={isSpeaking ? 'Parar Ãudio' : 'Ouvir mensagem por voz'}
                            >
                              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Image Attachment Rendering */}
                          {msg.anexo?.type === 'image' && msg.anexo.previewUrl && (
                            <div className="mb-2.5 rounded-xl overflow-hidden border border-zinc-700 bg-black">
                              <img
                                src={msg.anexo.previewUrl}
                                alt={msg.anexo.nome || 'Foto enviada'}
                                className="w-full max-h-64 object-cover hover:scale-105 transition-transform duration-300"
                              />
                              <div className="p-2 bg-zinc-900/90 text-[11px] text-zinc-300 flex items-center justify-between">
                                <span className="font-mono flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{msg.anexo.nome || 'Foto do Projeto'}</span>
                                </span>
                                <span className="text-zinc-500">{msg.anexo.tamanho}</span>
                              </div>
                            </div>
                          )}

                          {/* PDF Proposal Attachment Rendering */}
                          {msg.anexo?.type === 'orcamento_pdf' && (
                            <div className="mb-2.5 p-3 rounded-xl bg-zinc-900/90 border border-amber-400/40 space-y-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-amber-400 text-zinc-950 font-black">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-black text-amber-400 truncate">{msg.anexo.nome}</h5>
                                  <p className="text-[10px] text-zinc-400">{msg.anexo.tamanho} â€¢ Proposta Formal Timbrada</p>
                                </div>
                              </div>

                              {msg.anexo.dadosOrcamento && (
                                <div className="p-2 bg-zinc-950/80 rounded-lg text-[11px] text-zinc-300 space-y-1">
                                  <div className="flex justify-between font-bold">
                                    <span>{msg.anexo.dadosOrcamento.servico}</span>
                                    <span className="text-emerald-400">
                                      R$ {msg.anexo.dadosOrcamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="text-zinc-400 text-[10px]">
                                    Pedra: {msg.anexo.dadosOrcamento.material} â€¢ Medidas: {msg.anexo.dadosOrcamento.medidas}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Text Content */}
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text font-sans">
                            {msg.texto}
                          </p>

                          <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                            <span>{msg.horario}</span>
                            {!isClient && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/90 px-4 py-2 rounded-full w-fit border border-zinc-800 shadow-md animate-pulse">
                      <Bot className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>{botConfig.nomeRobo} estÃ¡ gerando a resposta...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Simulator Shortcuts (Send Sample Photos / Quick Quotes) */}
                <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simular Envio RÃ¡pido:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSendSampleImage('planta')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>ðŸ“· Planta Baixa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSampleImage('bancada')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>ðŸ“· Foto de Cozinha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSampleImage('lavatorio')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>ðŸ“· LavatÃ³rio Banheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatInput('Quanto fica uma bancada em Granito SÃ£o Gabriel de 2,40m x 0,60m com cooktop?')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer"
                  >
                    ðŸ’¬ CotaÃ§Ã£o Cozinha 2.40m
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatInput('Gostaria de agendar a visita tÃ©cnica de mediÃ§Ã£o gratuita na minha casa.')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer"
                  >
                    ðŸ“… Agendar MediÃ§Ã£o
                  </button>
                </div>

                {/* Chat Send Box */}
                <div className="p-3.5 bg-zinc-850 border-t border-zinc-800 space-y-2.5">
                  {/* Mode switcher: Test as client vs answer as human operator */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-semibold">Simular envio como:</span>
                      <button
                        type="button"
                        onClick={() => setSendAsMode('cliente')}
                        className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          sendAsMode === 'cliente'
                            ? 'bg-amber-400 text-zinc-950 shadow-md'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        ðŸ“± Cliente WhatsApp (Testa IA)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendAsMode('atendente')}
                        className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                          sendAsMode === 'atendente'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        ðŸ‘¤ Atendente Humano
                      </button>
                    </div>

                    <span className="text-[11px] text-zinc-400 hidden sm:inline font-mono">
                      Pressione Enter para enviar
                    </span>
                  </div>

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        sendAsMode === 'cliente'
                          ? 'Digite como se fosse o cliente (ex: "Gostaria de saber o preÃ§o para bancada de cozinha em Dekton")...'
                          : 'Digite como atendente humano para responder diretamente...'
                      }
                      className="flex-1 bg-zinc-900 border border-zinc-750 rounded-2xl px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 shadow-inner"
                    />

                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="inline-flex items-center justify-center p-3 sm:px-5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Enviar</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-zinc-500 space-y-4">
                <div className="p-4 rounded-3xl bg-zinc-850 border border-zinc-800 text-zinc-600">
                  <MessageSquare className="w-12 h-12" />
                </div>
                <p className="text-sm font-semibold">Nenhuma conversa selecionada</p>
                <button
                  onClick={() => setNewChatModal(true)}
                  className="px-5 py-2.5 bg-amber-400 text-zinc-950 font-black rounded-2xl text-xs shadow-md hover:bg-amber-300"
                >
                  + Iniciar Nova Conversa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TABELA DE PEDRAS & BASE DE CONHECIMENTO DA IA */}
      {activeTab === 'tabela' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/30 mb-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Base de Conhecimento TÃ©cnico-Comercial</span>
              </div>
              <h2 className="text-xl font-black text-amber-400">CatÃ¡logo e Tabela de PreÃ§os por mÂ²</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                Esta tabela alimenta diretamente as respostas da InteligÃªncia Artificial do RobÃ´. Quando o cliente pergunta o preÃ§o no WhatsApp, a IA consulta estes valores e calcula o orÃ§amento automaticamente.
              </p>
            </div>

            <button
              onClick={() => setStoneModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              <span>Adicionar Nova Pedra ao CatÃ¡logo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {botConfig.tabelaPedras.map((pedra) => (
              <div
                key={pedra.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-5 shadow-lg space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl border border-zinc-700 shadow-inner shrink-0"
                      style={{ backgroundColor: pedra.corHex }}
                    />
                    <div>
                      <h3 className="text-sm font-black text-zinc-100">{pedra.nome}</h3>
                      <span className="text-[11px] font-bold text-amber-400">{pedra.categoria}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">PreÃ§o Base</span>
                    <span className="text-base font-black text-emerald-400">
                      R$ {pedra.precoM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-xs text-zinc-400 font-normal">/mÂ²</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">
                  {pedra.descricao}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-zinc-800/80">
                  <div className="p-2 bg-zinc-850 rounded-xl">
                    <span className="text-zinc-400 text-[10px] block font-semibold">IndicaÃ§Ã£o Ideal:</span>
                    <span className="text-zinc-200 font-bold truncate block">{pedra.indicacao}</span>
                  </div>
                  <div className="p-2 bg-zinc-850 rounded-xl">
                    <span className="text-zinc-400 text-[10px] block font-semibold">NÃ­vel Porosidade:</span>
                    <span className="text-zinc-200 font-bold block">{pedra.porosidade}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-zinc-400">PreÃ§o:</label>
                    <input
                      type="number"
                      value={pedra.precoM2}
                      onChange={(e) => updateTabelaPedra(pedra.id, { precoM2: Number(e.target.value) })}
                      className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-black text-emerald-400 text-right focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => deleteTabelaPedra(pedra.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Excluir pedra do catÃ¡logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: SUPER PODERES & HABILIDADES DO ROBÃ” */}
      {activeTab === 'skills' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>InteligÃªncia Artificial Comercial Multimodal</span>
            </div>
            <h2 className="text-xl font-black text-amber-400">Habilidades e Super Poderes do RobÃ´</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Ative ou desative capacidades avanÃ§adas para o assistente de WhatsApp da marmoraria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {botConfig.skills.map((skill) => (
              <div
                key={skill.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                  skill.ativo
                    ? 'bg-zinc-900 border-amber-400/40 shadow-amber-400/5'
                    : 'bg-zinc-900/60 border-zinc-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-3 rounded-2xl border ${
                        skill.ativo
                          ? 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <button
                      onClick={() => toggleBotSkill(skill.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        skill.ativo ? 'bg-amber-400' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                          skill.ativo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <h3 className="text-sm font-black text-zinc-100">{skill.nome}</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{skill.descricao}</p>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-zinc-400">Status da Habilidade:</span>
                  <span className={`font-black ${skill.ativo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {skill.ativo ? 'HABILITADA' : 'DESATIVADA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DISPARO EM MASSA & CAMPANHAS */}
      {activeTab === 'campanhas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
                <Radio className="w-3.5 h-3.5" />
                <span>Super Broadcast WhatsApp</span>
              </div>
              <h2 className="text-xl font-black text-amber-400">Disparador de Campanhas & PromoÃ§Ãµes</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Envie mensagens automÃ¡ticas em massa personalizadas com o nome e o projeto de cada cliente.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Segmento de PÃºblico-Alvo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    'Arquitetos & Designers',
                    'Clientes em Reforma',
                    'Leads Frios (RecuperaÃ§Ã£o)',
                  ].map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setCampaignSegment(seg as any)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        campaignSegment === seg
                          ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md font-black'
                          : 'bg-zinc-850 text-zinc-300 border-zinc-750 hover:bg-zinc-800'
                      }`}
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Modelo da Mensagem (Suporta Tags DinÃ¢micas)
                </label>
                <textarea
                  rows={5}
                  value={campaignMsg}
                  onChange={(e) => setCampaignMsg(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3.5 text-zinc-100 focus:border-amber-400 focus:outline-none resize-none leading-relaxed text-xs sm:text-sm font-sans"
                />
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400 flex-wrap">
                  <span className="font-semibold text-zinc-300">VariÃ¡veis disponÃ­veis:</span>
                  <button
                    type="button"
                    onClick={() => setCampaignMsg((prev) => prev + ' {{nome}}')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 font-mono rounded border border-zinc-700"
                  >
                    {'{{nome}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignMsg((prev) => prev + ' {{servico}}')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 font-mono rounded border border-zinc-700"
                  >
                    {'{{servico}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignMsg((prev) => prev + ' {{material}}')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 font-mono rounded border border-zinc-700"
                  >
                    {'{{material}}'}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => dispararCampanha(campaignSegment, campaignMsg)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/25 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <SendHorizontal className="w-4 h-4 stroke-[2.5px]" />
                  <span>Disparar Campanha Agora ({conversas.length} Contatos Selecionados)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Campaign Live Preview Card */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block mb-1">
                VisualizaÃ§Ã£o no WhatsApp do Cliente
              </span>
              <p className="text-xs text-zinc-400">Veja exatamente como o cliente receberÃ¡ no celular:</p>
            </div>

            <div className="bg-[#0b141a] p-4 rounded-2xl border border-zinc-800 space-y-2 shadow-inner">
              <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed whitespace-pre-wrap shadow">
                <span className="text-[10px] font-black text-emerald-300 uppercase block mb-1">
                  ðŸ¤– {botConfig.nomeRobo}
                </span>
                {campaignMsg
                  .replace(/\{\{nome\}\}/g, selectedConversa?.clienteNome || 'Mariana Duarte')
                  .replace(/\{\{servico\}\}/g, selectedConversa?.dadosExtraidos?.servico || 'Bancada de Cozinha')
                  .replace(/\{\{material\}\}/g, selectedConversa?.dadosExtraidos?.material || 'Granito SÃ£o Gabriel')}
                <div className="text-right text-[10px] text-zinc-400 mt-1 flex items-center justify-end gap-1">
                  <span>14:30</span>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-850 rounded-2xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <span className="font-bold text-zinc-200 block">Dica Comercial:</span>
              <p>Campanhas com oferta de mediÃ§Ã£o tÃ©cnica gratuita ou brinde de cuba inox tÃªm 68% mais taxa de resposta!</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CALCULADORA DE ORÃ‡AMENTO RÃPIDO */}
      {activeTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
                <Calculator className="w-3.5 h-3.5" />
                <span>Simulador de PreÃ§o & FÃ³rmula de Marmoraria</span>
              </div>
              <h2 className="text-xl font-black text-amber-400">Calculadora de PrÃ©-OrÃ§amento</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure dimensÃµes e acabamentos para simular o orÃ§amento em tempo real.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Material / Pedra
                </label>
                <select
                  value={calcMaterial}
                  onChange={(e) => setCalcMaterial(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                >
                  {botConfig.tabelaPedras.map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome} â€” R$ {p.precoM2}/mÂ² ({p.categoria})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Comprimento (metros)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={calcComprimento}
                    onChange={(e) => setCalcComprimento(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Largura / Profundidade (metros)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={calcLargura}
                    onChange={(e) => setCalcLargura(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Acabamentos Adicionais */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Acabamentos e ServiÃ§os Especiais
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCalcMeiaEsquadria(!calcMeiaEsquadria)}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                      calcMeiaEsquadria
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                        : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                    }`}
                  >
                    <span>Meia-Esquadria 45Âº (InvisÃ­vel)</span>
                    <span className="text-[10px] font-mono">+R$ 120/m</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcSaia(!calcSaia)}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                      calcSaia
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                        : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                    }`}
                  >
                    <span>Saia Rebaixada (15cm)</span>
                    <span className="text-[10px] font-mono">+R$ 180</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcCubaEsculpida(!calcCubaEsculpida)}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                      calcCubaEsculpida
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                        : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                    }`}
                  >
                    <span>Cuba Esculpida em Rampa</span>
                    <span className="text-[10px] font-mono">+R$ 750</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcCooktop(!calcCooktop)}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                      calcCooktop
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                        : 'bg-zinc-850 border-zinc-750 text-zinc-400'
                    }`}
                  >
                    <span>Corte de Cooktop / Pia</span>
                    <span className="text-[10px] font-mono">+R$ 150</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Result Card */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                Detalhamento do OrÃ§amento
              </span>

              <div className="p-4 bg-zinc-850 rounded-2xl border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Ãrea Total:</span>
                  <span className="font-black text-zinc-100">{areaM2} mÂ²</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Chapa ({calcMaterial}):</span>
                  <span className="font-mono">R$ {valorBasePedra.toFixed(2)}</span>
                </div>
                {calcMeiaEsquadria && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Meia-Esquadria 45Âº:</span>
                    <span className="font-mono">+ R$ {valorMeiaEsquadria.toFixed(2)}</span>
                  </div>
                )}
                {calcSaia && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Saia 15cm:</span>
                    <span className="font-mono">+ R$ {valorSaia.toFixed(2)}</span>
                  </div>
                )}
                {calcCubaEsculpida && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Cuba Esculpida:</span>
                    <span className="font-mono">+ R$ {valorCuba.toFixed(2)}</span>
                  </div>
                )}
                {calcCooktop && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Corte de Cooktop:</span>
                    <span className="font-mono">+ R$ {valorCooktop.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-300">
                  <span>Frete & InstalaÃ§Ã£o:</span>
                  <span className="font-mono">+ R$ {valorFreteInstalacao.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-zinc-700/80 flex justify-between items-center">
                  <span className="text-sm font-black text-zinc-100">Total Estimado:</span>
                  <span className="text-xl font-black text-emerald-400">
                    R$ {valorTotalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-[11px] text-amber-300">
                ðŸ’³ CondiÃ§Ã£o sugerida pelo RobÃ´: 10x de R$ {(valorTotalCalculado / 10).toFixed(2)} sem juros ou 5% no PIX.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedConversa) {
                  const txt = `OlÃ¡, ${selectedConversa.clienteNome}! Fiz o cÃ¡lculo para ${calcComprimento}m x ${calcLargura}m em ${calcMaterial}: Total de R$ ${valorTotalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com acabamentos inclusos.`;
                  sendChatMessage(selectedConversa.id, txt, 'atendente');
                  setActiveTab('conversas');
                  addToast('CotaÃ§Ã£o Enviada', 'OrÃ§amento adicionado na conversa do WhatsApp.', 'success');
                }
              }}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Enviar este OrÃ§amento no Chat Atual</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: CONFIGURAÃ‡Ã•ES DO ROBÃ” */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* General Bot Configs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div>
              <h2 className="text-base font-black text-amber-400 flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span>Identidade & Mensagens AutomÃ¡ticas</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Personalize o nome do assistente, mensagem de boas-vindas e regras de horÃ¡rio.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Nome do Super RobÃ´
                </label>
                <input
                  type="text"
                  value={botConfig.nomeRobo}
                  onChange={(e) => updateBotConfig({ nomeRobo: e.target.value })}
                  placeholder="Ex: Super MarmoBot IA"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Tom de Voz da InteligÃªncia Artificial
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'amigavel', label: 'ðŸ˜Š AmigÃ¡vel & EmpÃ¡tico' },
                    { id: 'profissional', label: 'ðŸ‘” Comercial & Nobre' },
                    { id: 'direto', label: 'âš¡ RÃ¡pido & PrÃ¡tico' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateBotConfig({ tomDeVoz: t.id as any })}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        botConfig.tomDeVoz === t.id
                          ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md font-black'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-750 hover:bg-zinc-750'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Mensagem de SaudaÃ§Ã£o & Boas-Vindas
                </label>
                <textarea
                  rows={3}
                  value={botConfig.saudacao}
                  onChange={(e) => updateBotConfig({ saudacao: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    HorÃ¡rio InÃ­cio
                  </label>
                  <input
                    type="time"
                    value={botConfig.horarioInicio}
                    onChange={(e) => updateBotConfig({ horarioInicio: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    HorÃ¡rio Encerramento
                  </label>
                  <input
                    type="time"
                    value={botConfig.horarioFim}
                    onChange={(e) => updateBotConfig({ horarioFim: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Mensagem Fora do HorÃ¡rio Comercial
                </label>
                <textarea
                  rows={2}
                  value={botConfig.msgForaHorario}
                  onChange={(e) => updateBotConfig({ msgForaHorario: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* CRM & Commercial Rules */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <Kanban className="w-5 h-5" />
                  <span>AutomaÃ§Ã£o com o Quadro Kanban CRM</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Defina o comportamento do RobÃ´ ao capturar dados de novos clientes.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-zinc-850 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-zinc-100">Auto-Cadastro de Leads</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Criar automaticamente um cartÃ£o de "Novo Atendimento" no Kanban assim que o cliente solicitar orÃ§amento.
                    </p>
                  </div>
                  <button
                    onClick={() => updateBotConfig({ autoCadastroKanban: !botConfig.autoCadastroKanban })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                      botConfig.autoCadastroKanban ? 'bg-amber-400' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                        botConfig.autoCadastroKanban ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 bg-zinc-850 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-zinc-100">GeraÃ§Ã£o de Proposta PDF AutomÃ¡tica</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Anexar arquivo de proposta formal com descritivo e Chave PIX quando cliente pedir cotaÃ§Ã£o.
                    </p>
                  </div>
                  <button
                    onClick={() => updateBotConfig({ gerarPdfProposta: !botConfig.gerarPdfProposta })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                      botConfig.gerarPdfProposta ? 'bg-amber-400' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                        botConfig.gerarPdfProposta ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 bg-zinc-850 border border-zinc-800 rounded-2xl space-y-2">
                  <h4 className="font-black text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>ConexÃ£o de Webhook Externo (API WhatsApp)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    URL de Webhook pronta para receber mensagens de provedores como Evolution API, Z-API, Baileys ou Meta Cloud API:
                  </p>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[11px] text-amber-300 break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/bot/webhook` : 'https://seu-sistema.com/api/bot/webhook'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => addToast('ConfiguraÃ§Ãµes Salvas', 'ParÃ¢metros do Super RobÃ´ aplicados com sucesso!', 'success')}
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5px]" />
                <span>Salvar Todas as ConfiguraÃ§Ãµes do Super RobÃ´</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Nova Pedra ao CatÃ¡logo */}
      {stoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Adicionar Pedra ao CatÃ¡logo do RobÃ´</span>
              </h3>
              <button
                onClick={() => setStoneModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-bold p-1"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleAddStoneSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Nome do Material / Pedra
                </label>
                <input
                  type="text"
                  required
                  value={newStone.nome}
                  onChange={(e) => setNewStone({ ...newStone, nome: e.target.value })}
                  placeholder="Ex: Quartzo Branco Stellar"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newStone.categoria}
                    onChange={(e) => setNewStone({ ...newStone, categoria: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                  >
                    <option value="Granito">Granito</option>
                    <option value="MÃ¡rmore">MÃ¡rmore</option>
                    <option value="Quartzo">Quartzo</option>
                    <option value="Quartzito">Quartzito</option>
                    <option value="Dekton / Ultracompacto">Dekton / Ultracompacto</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    PreÃ§o por mÂ² (R$)
                  </label>
                  <input
                    type="number"
                    required
                    value={newStone.precoM2}
                    onChange={(e) => setNewStone({ ...newStone, precoM2: Number(e.target.value) })}
                    placeholder="950"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-emerald-400 focus:border-amber-400 focus:outline-none font-black text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    IndicaÃ§Ã£o Principal
                  </label>
                  <select
                    value={newStone.indicacao}
                    onChange={(e) => setNewStone({ ...newStone, indicacao: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Cozinhas e Ãreas Gourmet">Cozinhas e Ãreas Gourmet</option>
                    <option value="Banheiros e LavatÃ³rios">Banheiros e LavatÃ³rios</option>
                    <option value="Ãreas Nobres e Internas">Ãreas Nobres e Internas</option>
                    <option value="Universal">Universal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    NÃ­vel de Porosidade
                  </label>
                  <select
                    value={newStone.porosidade}
                    onChange={(e) => setNewStone({ ...newStone, porosidade: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Muito Baixa">Muito Baixa (Zero Manchas)</option>
                    <option value="Baixa">Baixa</option>
                    <option value="MÃ©dia">MÃ©dia (Requer Resina)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  DescriÃ§Ã£o TÃ©cnica & Comercial
                </label>
                <textarea
                  rows={3}
                  value={newStone.descricao}
                  onChange={(e) => setNewStone({ ...newStone, descricao: e.target.value })}
                  placeholder="Ex: Rocha de alta resistÃªncia a riscos e manchas, ideal para bancadas e ilhas."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStoneModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-750"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 text-zinc-950 font-black rounded-xl hover:bg-amber-300 shadow-md"
                >
                  Adicionar ao CatÃ¡logo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Iniciar Nova Conversa */}
      {newChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Iniciar Novo Atendimento WhatsApp</span>
              </h3>
              <button
                onClick={() => setNewChatModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-bold p-1"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Nome do Cliente / Arquiteto
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Fernanda Lima (Arquiteta)"
                  className="w-full bg-zinc-800 border border-zinc-750 rounded-xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  NÃºmero de WhatsApp
                </label>
                <input
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="Ex: (11) 98888-7777"
                  className="w-full bg-zinc-800 border border-zinc-750 rounded-xl p-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewChatModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-750"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 text-zinc-950 font-black rounded-xl hover:bg-amber-300 shadow-md"
                >
                  Criar Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
