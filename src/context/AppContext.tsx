import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Atendimento,
  BotAcaoLog,
  BotConfig,
  BotConnectionStatus,
  ConversaWhatsApp,
  EmpresaConfig,
  StatusAtendimento,
  ToastMessage,
  ViewType,
} from '../types';
import {
  DEFAULT_BOT_CONFIG,
  DEFAULT_EMPRESA_CONFIG,
  INITIAL_ATENDIMENTOS,
  INITIAL_CONVERSAS,
} from '../data/initialData';
import confetti from 'canvas-confetti';

interface AppContextType {
  atendimentos: Atendimento[];
  empresa: EmpresaConfig;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  selectedAtendimentoId: number | null;
  setSelectedAtendimentoId: (id: number | null) => void;
  whatsAppModalData: {
    atendimento: Atendimento;
    type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral';
  } | null;
  setWhatsAppModalData: (
    data: {
      atendimento: Atendimento;
      type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral';
    } | null
  ) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  toasts: ToastMessage[];
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  addAtendimento: (data: Omit<Atendimento, 'id' | 'criadoEm'>) => number;
  updateAtendimento: (id: number, updates: Partial<Atendimento>) => void;
  updateAtendimentoStatus: (id: number, status: StatusAtendimento) => void;
  deleteAtendimento: (id: number) => void;
  updateEmpresa: (updates: Partial<EmpresaConfig>) => void;
  resetToDemoData: () => void;
  clearAllData: (resetEmpresa?: boolean) => void;
  importData: (jsonStr: string) => boolean;
  exportData: () => string;

  // Estado e Métodos do Bot WhatsApp
  botStatus: BotConnectionStatus;
  botConfig: BotConfig;
  conversas: ConversaWhatsApp[];
  selectedConversaId: string | null;
  setSelectedConversaId: (id: string | null) => void;
  botLogs: BotAcaoLog[];
  addBotLog: (log: Omit<BotAcaoLog, 'id' | 'timestamp'>) => void;
  updateBotConfig: (updates: Partial<BotConfig>) => void;
  connectBot: (instant?: boolean) => void;
  disconnectBot: () => void;
  simulateIncomingLeadAuto: () => Promise<void>;
  sendChatMessage: (
    conversaId: string,
    texto: string,
    remetente?: 'bot' | 'cliente' | 'atendente',
    anexo?: any
  ) => Promise<void>;
  sendImageAttachment: (conversaId: string, imageFileUrl: string, nomeArquivo?: string) => Promise<void>;
  generatePdfProposal: (conversaId: string) => void;
  triggerFollowUp: (conversaId: string) => void;
  convertLeadToAtendimento: (conversaId: string) => number;
  createNewConversa: (nome: string, telefone: string) => string;
  deleteConversa: (conversaId: string) => void;
  updateTabelaPedra: (pedraId: string, updates: Partial<any>) => void;
  addTabelaPedra: (pedra: any) => void;
  deleteTabelaPedra: (pedraId: string) => void;
  toggleBotSkill: (skillId: string) => void;
  dispararCampanha: (segmento: string, mensagem: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_ATENDIMENTOS_KEY = 'marmoraria_atendimentos_v2';
const STORAGE_EMPRESA_KEY = 'marmoraria_empresa_v2';
const STORAGE_BOT_CONFIG_KEY = 'marmoraria_bot_config_v1';
const STORAGE_BOT_CONVERSAS_KEY = 'marmoraria_bot_conversas_v1';
const STORAGE_BOT_STATUS_KEY = 'marmoraria_bot_status_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Carregamento inicial do LocalStorage
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ATENDIMENTOS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_ATENDIMENTOS;
    } catch {
      return INITIAL_ATENDIMENTOS;
    }
  });

  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EMPRESA_KEY);
      if (saved) {
        return { ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(saved) };
      }
      return DEFAULT_EMPRESA_CONFIG;
    } catch {
      return DEFAULT_EMPRESA_CONFIG;
    }
  });

  // Estado do Bot WhatsApp
  const [botConfig, setBotConfig] = useState<BotConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOT_CONFIG_KEY);
      if (saved) {
        return { ...DEFAULT_BOT_CONFIG, ...JSON.parse(saved) };
      }
      return DEFAULT_BOT_CONFIG;
    } catch {
      return DEFAULT_BOT_CONFIG;
    }
  });

  const [botStatus, setBotStatus] = useState<BotConnectionStatus>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOT_STATUS_KEY) as BotConnectionStatus;
      return saved || 'connected';
    } catch {
      return 'connected';
    }
  });

  const [conversas, setConversas] = useState<ConversaWhatsApp[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BOT_CONVERSAS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_CONVERSAS;
    } catch {
      return INITIAL_CONVERSAS;
    }
  });

  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(() => {
    return INITIAL_CONVERSAS[0]?.id || null;
  });

  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<number | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    atendimento: Atendimento;
    type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral';
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 2. Sincronização do Armazenamento Persistente
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(atendimentos));
    } catch (e) {
      console.warn('Erro ao persistir atendimentos:', e);
    }
  }, [atendimentos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(empresa));
    } catch (e) {
      console.warn('Erro ao persistir configuraÃ§Ãµes da empresa:', e);
    }
  }, [empresa]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOT_CONFIG_KEY, JSON.stringify(botConfig));
    } catch (e) {
      console.warn('Erro ao persistir botConfig:', e);
    }
  }, [botConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOT_CONVERSAS_KEY, JSON.stringify(conversas));
    } catch (e) {
      console.warn('Erro ao persistir conversas:', e);
    }
  }, [conversas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOT_STATUS_KEY, botStatus);
    } catch (e) {
      console.warn('Erro ao persistir botStatus:', e);
    }
  }, [botStatus]);

  // Auxiliares de Toast
  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 4);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Operações CRUD para Atendimentos
  const addAtendimento = (data: Omit<Atendimento, 'id' | 'criadoEm'>): number => {
    const nextId = atendimentos.length > 0 ? Math.max(...atendimentos.map((a) => a.id)) + 1 : 1;
    const newAtendimento: Atendimento = {
      ...data,
      id: nextId,
      criadoEm: new Date().toISOString(),
    };

    setAtendimentos((prev) => [newAtendimento, ...prev]);

    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // confetti sem bloqueio
    }

    addToast('Atendimento Registrado', `Novo pedido #${nextId} cadastrado com sucesso!`, 'success');
    return nextId;
  };

  const updateAtendimento = (id: number, updates: Partial<Atendimento>) => {
    setAtendimentos((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = {
            ...a,
            ...updates,
            atualizadoEm: new Date().toISOString(),
          };
          return updated;
        }
        return a;
      })
    );
    addToast('Atendimento Atualizado', 'As alteraÃ§Ãµes foram salvas com sucesso.', 'success');
  };

  const updateAtendimentoStatus = (id: number, newStatus: StatusAtendimento) => {
    setAtendimentos((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: newStatus,
            atualizadoEm: new Date().toISOString(),
          };
        }
        return a;
      })
    );

    if (newStatus === 'ConcluÃ­do' || newStatus === 'Aprovado') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // ignorar
      }
    }

    addToast(`Status: ${newStatus}`, `Atendimento #${id} atualizado.`, 'success');
  };

  const deleteAtendimento = (id: number) => {
    const target = atendimentos.find((a) => a.id === id);
    setAtendimentos((prev) => prev.filter((a) => a.id !== id));
    if (selectedAtendimentoId === id) {
      setSelectedAtendimentoId(null);
    }
    addToast('Atendimento ExcluÃ­do', `Registro de ${target?.nome || '#' + id} removido.`, 'warning');
  };

  const updateEmpresa = (updates: Partial<EmpresaConfig>) => {
    setEmpresa((prev) => ({ ...prev, ...updates }));
    addToast('ConfiguraÃ§Ãµes Salvas', 'Dados da empresa e layout atualizados!', 'success');
  };

  const resetToDemoData = () => {
    setAtendimentos(INITIAL_ATENDIMENTOS);
    setEmpresa(DEFAULT_EMPRESA_CONFIG);
    setConversas(INITIAL_CONVERSAS);
    setBotConfig(DEFAULT_BOT_CONFIG);
    setBotStatus('connected');
    addToast('Dados Restaurados', 'Dados de demonstraÃ§Ã£o recarregados.', 'info');
  };

  const clearAllData = (resetEmpresa = false) => {
    setAtendimentos([]);
    setSelectedAtendimentoId(null);
    setWhatsAppModalData(null);
    if (resetEmpresa) {
      setEmpresa(DEFAULT_EMPRESA_CONFIG);
      localStorage.removeItem(STORAGE_EMPRESA_KEY);
    }
    localStorage.removeItem(STORAGE_ATENDIMENTOS_KEY);
    addToast(
      'Base de Dados Zerada',
      resetEmpresa
        ? 'Todos os atendimentos foram excluÃ­dos e as configuraÃ§Ãµes foram redefinidas.'
        : 'Todos os atendimentos e orÃ§amentos foram removidos com sucesso.',
      'info'
    );
  };

  const exportData = (): string => {
    return JSON.stringify({ atendimentos, empresa, botConfig, conversas, exportDate: new Date().toISOString() }, null, 2);
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.atendimentos && Array.isArray(parsed.atendimentos)) {
        setAtendimentos(parsed.atendimentos);
      }
      if (parsed.empresa && typeof parsed.empresa === 'object') {
        setEmpresa((prev) => ({ ...prev, ...parsed.empresa }));
      }
      if (parsed.botConfig && typeof parsed.botConfig === 'object') {
        setBotConfig((prev) => ({ ...prev, ...parsed.botConfig }));
      }
      if (parsed.conversas && Array.isArray(parsed.conversas)) {
        setConversas(parsed.conversas);
      }
      addToast('ImportaÃ§Ã£o ConcluÃ­da', 'Dados restaurados com sucesso a partir do arquivo.', 'success');
      return true;
    } catch {
      addToast('Erro na ImportaÃ§Ã£o', 'Arquivo JSON invÃ¡lido ou corrompido.', 'error');
      return false;
    }
  };

  const [botLogs, setBotLogs] = useState<BotAcaoLog[]>([
    {
      id: 'log-1',
      timestamp: '14:50:02',
      clienteNome: 'Mariana Duarte',
      tipo: 'conexao_qr',
      descricao: 'SessÃ£o WhatsApp Multi-Device ativa com nÃºmero comercial (11) 98765-4321.',
      status: 'concluido',
    },
    {
      id: 'log-2',
      timestamp: '14:51:15',
      clienteNome: 'Mariana Duarte',
      tipo: 'calculo_ia',
      descricao: 'IA calculou bancada 2,40m x 0,60m em Quartzo Calacatta: R$ 3.850,00.',
      status: 'concluido',
    },
    {
      id: 'log-3',
      timestamp: '14:51:18',
      clienteNome: 'Mariana Duarte',
      tipo: 'geracao_pdf',
      descricao: 'Proposta Comercial PDF gerada com Chave PIX e enviada no WhatsApp.',
      status: 'concluido',
    },
  ]);

  const addBotLog = (log: Omit<BotAcaoLog, 'id' | 'timestamp'>) => {
    const newLog: BotAcaoLog = {
      ...log,
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setBotLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  // Operações do Bot
  const updateBotConfig = (updates: Partial<BotConfig>) => {
    setBotConfig((prev) => ({ ...prev, ...updates }));
    addToast('RobÃ´ Atualizado', 'ConfiguraÃ§Ãµes do WhatsApp Bot salvas!', 'success');
  };

  const connectBot = (instant: boolean = false) => {
    if (instant) {
      setBotStatus('connected');
      setBotConfig((prev) => ({
        ...prev,
        ativo: true,
        conectadoEm: new Date().toISOString(),
        bateria: 98,
      }));
      addBotLog({
        clienteNome: 'Sistema',
        tipo: 'conexao_qr',
        descricao: 'QR Code validado! RobÃ´ WhatsApp conectado e em modo autÃ´nomo 24h.',
        status: 'concluido',
      });
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      addToast('WhatsApp Conectado!', 'RobÃ´ pronto para responder clientes 24h.', 'success');
      return;
    }

    setBotStatus('pairing');
    addBotLog({
      clienteNome: 'Sistema',
      tipo: 'conexao_qr',
      descricao: 'Gerando QR Code dinÃ¢mico para pareamento com o celular...',
      status: 'executando',
    });
    addToast('Gerando QR Code', 'Aponte a cÃ¢mera do WhatsApp para conectar...', 'info');

    setTimeout(() => {
      setBotStatus('connected');
      setBotConfig((prev) => ({
        ...prev,
        ativo: true,
        conectadoEm: new Date().toISOString(),
        bateria: 98,
      }));
      addBotLog({
        clienteNome: 'Sistema',
        tipo: 'conexao_qr',
        descricao: 'QR Code lido com sucesso! RobÃ´ ativo e respondendo em tempo real.',
        status: 'concluido',
      });
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
      addToast('WhatsApp Conectado!', 'RobÃ´ pronto para responder clientes 24h.', 'success');
    }, 2200);
  };

  const disconnectBot = () => {
    setBotStatus('disconnected');
    addBotLog({
      clienteNome: 'Sistema',
      tipo: 'conexao_qr',
      descricao: 'SessÃ£o WhatsApp desconectada pelo operador.',
      status: 'concluido',
    });
    addToast('WhatsApp Desconectado', 'A sessÃ£o com o celular foi encerrada.', 'warning');
  };

  // Autonomous Lead Simulator (Simula o robÃ´ agindo sozinho via WhatsApp)
  const simulateIncomingLeadAuto = async () => {
    const leadsExemplos = [
      {
        nome: 'Dra. Vanessa Martins',
        tel: '(11) 98877-2211',
        origem: 'WhatsApp OrgÃ¢nico' as const,
        msg: 'OlÃ¡, boa tarde! Gostaria de um orÃ§amento para ilha e bancada de cozinha em Granito Preto SÃ£o Gabriel de 3,20m x 0,90m com cooktop e cuba inox.',
      },
      {
        nome: 'Arq. Lucas Albuquerque',
        tel: '(11) 97766-3322',
        origem: 'IndicaÃ§Ã£o Arquiteto' as const,
        msg: 'Boa tarde! Preciso cotar lavatÃ³rio de suÃ­te master com cuba esculpida em MÃ¡rmore Branco ParanÃ¡ de 1,60m x 0,55m. VocÃªs fazem mediÃ§Ã£o no local?',
      },
      {
        nome: 'Eng. Roberto Construtora',
        tel: '(11) 96655-4433',
        origem: 'Google' as const,
        msg: 'OlÃ¡! Temos um projeto para 4 bancadas em Quartzo Branco Stellar. Qual o valor aproximado do mÂ² com instalaÃ§Ã£o inclusa?',
      },
      {
        nome: 'Juliana Costa (Reforma)',
        tel: '(11) 95544-3322',
        origem: 'Instagram Ads' as const,
        msg: 'OlÃ¡! Estou reformando meu apartamento e quero trocar a pia da cozinha por Dekton ou Quartzito. VocÃªs tÃªm mostruÃ¡rio e parcelam no cartÃ£o?',
      },
    ];

    const aleatorio = leadsExemplos[Math.floor(Math.random() * leadsExemplos.length)];
    const newId = createNewConversa(aleatorio.nome, aleatorio.tel);

    addBotLog({
      clienteNome: aleatorio.nome,
      tipo: 'leitura_msg',
      descricao: `ðŸ“© Nova mensagem de ${aleatorio.nome}: "${aleatorio.msg.slice(0, 50)}..."`,
      status: 'concluido',
    });

    addToast('Novo Lead no WhatsApp', `${aleatorio.nome} enviou uma mensagem pedindo orÃ§amento!`, 'info');

    // Simular cliente enviando mensagem e bot respondendo
    setTimeout(async () => {
      await sendChatMessage(newId, aleatorio.msg, 'cliente');
    }, 600);
  };

  const createNewConversa = (nome: string, telefone: string): string => {
    const newId = 'conv-' + Date.now();
    const nova: ConversaWhatsApp = {
      id: newId,
      clienteNome: nome || 'Cliente WhatsApp',
      clienteTelefone: telefone || '(11) 9' + Math.floor(10000000 + Math.random() * 90000000),
      ultimaMensagem: 'InÃ­cio do atendimento virtual',
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      mensagensNaoLidas: 0,
      statusLead: 'novo',
      mensagens: [
        {
          id: 'm-init',
          remetente: 'bot',
          texto: botConfig.saudacao || 'OlÃ¡! Como posso te ajudar hoje?',
          horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          statusEnvio: 'entregue',
        },
      ],
    };

    setConversas((prev) => [nova, ...prev]);
    setSelectedConversaId(newId);
    return newId;
  };

  const deleteConversa = (conversaId: string) => {
    setConversas((prev) => prev.filter((c) => c.id !== conversaId));
    if (selectedConversaId === conversaId) {
      setSelectedConversaId(conversas.find((c) => c.id !== conversaId)?.id || null);
    }
    addToast('Conversa ExcluÃ­da', 'HistÃ³rico removido.', 'info');
  };

  const sendChatMessage = async (
    conversaId: string,
    texto: string,
    remetente: 'bot' | 'cliente' | 'atendente' = 'atendente',
    anexo?: any
  ) => {
    if (!texto.trim() && !anexo) return;

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msgId = 'msg-' + Date.now();

    const novaMsg = {
      id: msgId,
      remetente,
      texto,
      horario: horaAtual,
      statusEnvio: 'enviado' as const,
      anexo,
    };

    // 1. Adicionar mensagem do usuário/operador
    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: anexo?.type === 'image' ? 'ðŸ“· [Foto enviada]' : anexo?.type === 'orcamento_pdf' ? 'ðŸ“„ [Proposta Comercial PDF]' : texto,
            horario: horaAtual,
            mensagens: [...c.mensagens, novaMsg],
          };
        }
        return c;
      })
    );

    // 2. Se a mensagem veio do cliente e o Bot está ativo, disparar resposta da IA / Bot!
    if (remetente === 'cliente' && botConfig.ativo && botStatus === 'connected') {
      const conv = conversas.find((c) => c.id === conversaId);
      const historicoMsgs = conv ? [...conv.mensagens, novaMsg] : [novaMsg];

      try {
        // Chamar API do servidor backend
        const response = await fetch('/api/bot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: texto,
            clienteNome: conv?.clienteNome || 'Cliente',
            clienteTelefone: conv?.clienteTelefone || '',
            historico: historicoMsgs.slice(-6),
            empresa,
            botConfig,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const respostaBot = data.resposta || 'Entendido! JÃ¡ anotei suas informaÃ§Ãµes.';
          const leadExtraido = data.leadExtraido;

          setTimeout(() => {
            const botMsg = {
              id: 'bot-' + Date.now(),
              remetente: 'bot' as const,
              texto: respostaBot,
              horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              statusEnvio: 'entregue' as const,
            };

            setConversas((prev) =>
              prev.map((c) => {
                if (c.id === conversaId) {
                  return {
                    ...c,
                    ultimaMensagem: respostaBot,
                    horario: botMsg.horario,
                    dadosExtraidos: leadExtraido ? { ...c.dadosExtraidos, ...leadExtraido } : c.dadosExtraidos,
                    statusLead: leadExtraido ? 'em_atendimento' : c.statusLead,
                    temperatura: leadExtraido?.temperatura || c.temperatura || 'quente',
                    mensagens: [...c.mensagens, botMsg],
                  };
                }
                return c;
              })
            );

            // Incrementar contador do bot
            setBotConfig((prev) => ({ ...prev, totalAtendimentosBot: prev.totalAtendimentosBot + 1 }));
          }, 800);
        } else {
          throw new Error('Fallback to local engine');
        }
      } catch {
        // Motor heurístico inteligente local para fallback instantâneo
        setTimeout(() => {
          let respostaBot = '';
          const lower = texto.toLowerCase();

          if (lower.includes('preÃ§o') || lower.includes('quanto') || lower.includes('orÃ§amento') || lower.includes('valor')) {
            respostaBot = `Perfeito! Na ${empresa.nome || 'nossa marmoraria'}, os valores variam conforme o material e metragem:\n\nâ€¢ Granito SÃ£o Gabriel: ~R$ 850/mÂ²\nâ€¢ Granito Preto Absoluto: ~R$ 1.250/mÂ²\nâ€¢ Quartzo Calacatta Gold: ~R$ 2.400/mÂ²\nâ€¢ MÃ¡rmore Travertino: ~R$ 980/mÂ²\nâ€¢ Quartzito Mont Blanc: ~R$ 2.800/mÂ²\n\nQual a medida aproximada (comprimento x largura) do seu espaÃ§o?`;
          } else if (lower.includes('bancada') || lower.includes('cozinha') || lower.includes('ilha')) {
            respostaBot = `Ã“tima escolha! Para bancadas e ilhas de cozinha, os materiais mais resistentes a manchas e calor sÃ£o os Granitos Pretos, Quartzos e Ultracompactos (Dekton). VocÃª jÃ¡ tem o desenho ou as medidas em mÃ£os?`;
          } else if (lower.includes('banheiro') || lower.includes('lavatÃ³rio') || lower.includes('cuba esculpida')) {
            respostaBot = `Trabalhamos com lindos lavatÃ³rios com cuba esculpida em rampa ou fundo reto em MÃ¡rmore Travertino, Quartzo e Branco ParanÃ¡. Qual o acabamento desejado?`;
          } else if (lower.includes('visita') || lower.includes('mediÃ§Ã£o') || lower.includes('medir') || lower.includes('agendar')) {
            respostaBot = `Com certeza! Realizamos a visita tÃ©cnica de mediÃ§Ã£o no seu endereÃ§o sem compromisso. Qual o seu bairro e o melhor dia/horÃ¡rio para a equipe ir atÃ© vocÃª?`;
          } else if (lower.includes('humano') || lower.includes('atendente') || lower.includes('vendedor') || lower.includes('falar')) {
            respostaBot = `Com certeza! JÃ¡ notifiquei nossa equipe de vendas. Em instantes um especialista continuarÃ¡ o atendimento por aqui.`;
          } else {
            respostaBot = `Entendi! Temos estoque de chapas nobres prontas para corte. Se desejar, me envie a foto do seu ambiente ou as medidas que jÃ¡ calculo uma prÃ©via de orÃ§amento para vocÃª! ðŸ˜Š`;
          }

          const botMsg = {
            id: 'bot-' + Date.now(),
            remetente: 'bot' as const,
            texto: respostaBot,
            horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            statusEnvio: 'entregue' as const,
          };

          setConversas((prev) =>
            prev.map((c) => {
              if (c.id === conversaId) {
                return {
                  ...c,
                  ultimaMensagem: respostaBot,
                  horario: botMsg.horario,
                  mensagens: [...c.mensagens, botMsg],
                };
              }
              return c;
            })
          );
        }, 700);
      }
    }
  };

  const sendImageAttachment = async (conversaId: string, imageFileUrl: string, nomeArquivo: string = 'foto_projeto.jpg') => {
    const conv = conversas.find((c) => c.id === conversaId);
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const clienteMsg = {
      id: 'img-' + Date.now(),
      remetente: 'cliente' as const,
      texto: 'Enviei uma foto do meu ambiente / planta para anÃ¡lise.',
      horario: horaAtual,
      statusEnvio: 'lido' as const,
      anexo: {
        type: 'image' as const,
        nome: nomeArquivo,
        tamanho: '1.2 MB',
        previewUrl: imageFileUrl,
      },
    };

    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: 'ðŸ“· [Foto enviada pelo cliente]',
            horario: horaAtual,
            mensagens: [...c.mensagens, clienteMsg],
          };
        }
        return c;
      })
    );

    // Chamar endpoint de Visão
    try {
      const res = await fetch('/api/bot/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageFileUrl,
          clienteNome: conv?.clienteNome || 'Cliente',
        }),
      });

      const data = await res.json();
      const respostaAnalise = data.analise || 'ðŸ” Analisei sua imagem! Identifiquei um espaÃ§o de bancada com medidas aproximadas de 2.20m x 0.60m. Qual acabamento vocÃª prefere?';
      const dados = data.dadosExtraidos;

      setTimeout(() => {
        const botMsg = {
          id: 'bot-vision-' + Date.now(),
          remetente: 'bot' as const,
          texto: respostaAnalise,
          horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          statusEnvio: 'lido' as const,
        };

        setConversas((prev) =>
          prev.map((c) => {
            if (c.id === conversaId) {
              return {
                ...c,
                ultimaMensagem: respostaAnalise,
                horario: botMsg.horario,
                dadosExtraidos: dados ? { ...c.dadosExtraidos, ...dados } : c.dadosExtraidos,
                mensagens: [...c.mensagens, botMsg],
              };
            }
            return c;
          })
        );
      }, 1000);
    } catch {
      // Fallback (resposta alternativa)
      setTimeout(() => {
        const botMsg = {
          id: 'bot-vision-fb-' + Date.now(),
          remetente: 'bot' as const,
          texto: 'ðŸ” Foto recebida com sucesso! Identifiquei o espaÃ§o de bancada. Recomendo Granito SÃ£o Gabriel ou Quartzo Calacatta para esse ambiente. Gostaria de agendar a mediÃ§Ã£o tÃ©cnica gratuita?',
          horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          statusEnvio: 'lido' as const,
        };

        setConversas((prev) =>
          prev.map((c) => {
            if (c.id === conversaId) {
              return {
                ...c,
                ultimaMensagem: botMsg.texto,
                horario: botMsg.horario,
                mensagens: [...c.mensagens, botMsg],
              };
            }
            return c;
          })
        );
      }, 800);
    }
  };

  const generatePdfProposal = (conversaId: string) => {
    const conv = conversas.find((c) => c.id === conversaId);
    if (!conv) return;

    const material = conv.dadosExtraidos?.material || 'Granito SÃ£o Gabriel';
    const servico = conv.dadosExtraidos?.servico || 'Bancada de Cozinha';
    const medidas = conv.dadosExtraidos?.medidas || '2.20m x 0.60m';
    const valor = conv.dadosExtraidos?.valorEstimado || 2450;
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const textoProposta = `ðŸ“„ *PROPOSTA COMERCIAL TIMBRADA GERADA!* ðŸ’Ž\n\nOlÃ¡, ${conv.clienteNome}! Segue sua proposta formal da *${empresa.nome}*:\n\nâ€¢ *Projeto:* ${servico}\nâ€¢ *Material Nobre:* ${material}\nâ€¢ *DimensÃµes:* ${medidas}\nâ€¢ *Valor Total:* R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nâ€¢ *CondiÃ§Ãµes:* 10x sem juros no cartÃ£o ou 5% no PIX\nâ€¢ *Prazo de InstalaÃ§Ã£o:* 7 a 10 dias Ãºteis\nâ€¢ *Garantia:* 5 Anos de Acabamento e Assentamento\n\nChave PIX da Empresa: ${empresa.pix || empresa.cnpj || 'marmoraria@pix.com.br'}`;

    const botMsg = {
      id: 'prop-pdf-' + Date.now(),
      remetente: 'bot' as const,
      texto: textoProposta,
      horario: horaAtual,
      statusEnvio: 'lido' as const,
      anexo: {
        type: 'orcamento_pdf' as const,
        nome: `Proposta_${conv.clienteNome.replace(/\s+/g, '_')}.pdf`,
        tamanho: '320 KB',
        dadosOrcamento: {
          material,
          servico,
          medidas,
          valor,
          condicoes: '10x sem juros no cartÃ£o de crÃ©dito ou 5% de desconto no PIX Ã  vista.',
        },
      },
    };

    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: 'ðŸ“„ [Proposta Comercial PDF Enviada]',
            horario: horaAtual,
            mensagens: [...c.mensagens, botMsg],
          };
        }
        return c;
      })
    );

    addToast('Proposta Enviada!', `Proposta comercial com PDF e PIX enviada para ${conv.clienteNome}!`, 'success');
  };

  const triggerFollowUp = (conversaId: string) => {
    const conv = conversas.find((c) => c.id === conversaId);
    if (!conv) return;

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const followUpMsg = `OlÃ¡, ${conv.clienteNome}! Tudo bem? ðŸ˜Š\n\nPassando para saber se vocÃª conseguiu analisar a nossa cotaÃ§Ã£o para o seu projeto de *${conv.dadosExtraidos?.servico || 'Marmoraria'}* em *${conv.dadosExtraidos?.material || 'Pedra Nobre'}*.\n\nConsegui liberar com a gerÃªncia um bÃ´nus especial de *Cuba Inox Inclusa ou Frete GrÃ¡tis* se fecharmos a mediÃ§Ã£o nesta semana! Podemos confirmar?`;

    const botMsg = {
      id: 'followup-' + Date.now(),
      remetente: 'bot' as const,
      texto: followUpMsg,
      horario: horaAtual,
      statusEnvio: 'entregue' as const,
    };

    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: followUpMsg,
            horario: horaAtual,
            mensagens: [...c.mensagens, botMsg],
          };
        }
        return c;
      })
    );

    addToast('Follow-up Disparado!', `Mensagem de recuperaÃ§Ã£o de venda enviada para ${conv.clienteNome}!`, 'info');
  };

  const updateTabelaPedra = (pedraId: string, updates: Partial<any>) => {
    setBotConfig((prev) => ({
      ...prev,
      tabelaPedras: prev.tabelaPedras.map((p) => (p.id === pedraId ? { ...p, ...updates } : p)),
    }));
    addToast('Tabela de Pedras Atualizada', 'PreÃ§os e dados sincronizados com a IA do robÃ´.', 'success');
  };

  const addTabelaPedra = (pedra: any) => {
    const novaPedra = {
      ...pedra,
      id: 'pedra-' + Date.now(),
    };
    setBotConfig((prev) => ({
      ...prev,
      tabelaPedras: [novaPedra, ...prev.tabelaPedras],
    }));
    addToast('Pedra Adicionada', `${pedra.nome} agora faz parte do catÃ¡logo da IA.`, 'success');
  };

  const deleteTabelaPedra = (pedraId: string) => {
    setBotConfig((prev) => ({
      ...prev,
      tabelaPedras: prev.tabelaPedras.filter((p) => p.id !== pedraId),
    }));
    addToast('Pedra Removida', 'Item removido do catÃ¡logo de preÃ§os.', 'info');
  };

  const toggleBotSkill = (skillId: string) => {
    setBotConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === skillId ? { ...s, ativo: !s.ativo } : s)),
    }));
    addToast('Habilidade Atualizada', 'ConfiguraÃ§Ã£o do Super RobÃ´ modificada com sucesso.', 'info');
  };

  const dispararCampanha = (segmento: string, templateMsg: string): number => {
    let count = 0;
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setConversas((prev) =>
      prev.map((c) => {
        count++;
        const textoPersonalizado = templateMsg
          .replace(/\{\{nome\}\}/g, c.clienteNome)
          .replace(/\{\{servico\}\}/g, c.dadosExtraidos?.servico || 'Bancada')
          .replace(/\{\{material\}\}/g, c.dadosExtraidos?.material || 'Granito SÃ£o Gabriel');

        const broadcastMsg = {
          id: 'bcast-' + Date.now() + '-' + c.id,
          remetente: 'bot' as const,
          texto: textoPersonalizado,
          horario: horaAtual,
          statusEnvio: 'entregue' as const,
        };

        return {
          ...c,
          ultimaMensagem: textoPersonalizado,
          horario: horaAtual,
          mensagens: [...c.mensagens, broadcastMsg],
        };
      })
    );

    addToast('Campanha Disparada!', `Mensagem enviada com sucesso para ${count} contatos (${segmento}).`, 'success');
    return count;
  };

  const convertLeadToAtendimento = (conversaId: string): number => {
    const conv = conversas.find((c) => c.id === conversaId);
    if (!conv) return 0;

    const servico = conv.dadosExtraidos?.servico || 'Bancada de Cozinha';
    const material = conv.dadosExtraidos?.material || 'Granito SÃ£o Gabriel';
    const orcamentoEstimado = conv.dadosExtraidos?.valorEstimado ? conv.dadosExtraidos.valorEstimado.toFixed(2).replace('.', ',') : '2.500,00';
    const endereco = conv.dadosExtraidos?.endereco || 'EndereÃ§o a confirmar via WhatsApp';

    const newId = addAtendimento({
      nome: conv.clienteNome,
      telefone: conv.clienteTelefone,
      endereco,
      cep: '',
      logradouro: endereco,
      numero: 'S/N',
      bairro: 'A confirmar',
      cidade: 'SÃ£o Paulo',
      estado: 'SP',
      servico,
      material,
      status: 'Novo Atendimento',
      prioridade: 'Alta',
      dataPrevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      responsavel: 'RobÃ´ WhatsApp (Auto-Lead)',
      orcamento: orcamentoEstimado,
      itensOrcamento: [
        {
          id: 'lead-item-1',
          descricao: `${servico} em ${material} (Captado via WhatsApp)`,
          quantidade: 1,
          unidade: 'un',
          valorUnit: conv.dadosExtraidos?.valorEstimado || 2500,
        },
      ],
      obs: `Atendimento gerado automaticamente pelo MarmoBot WhatsApp.\nÃšltima mensagem do cliente: "${conv.ultimaMensagem}"`,
    });

    // Marcar conversa como convertida
    setConversas((prev) =>
      prev.map((c) => (c.id === conversaId ? { ...c, statusLead: 'cadastrado_kanban' } : c))
    );

    setActiveView('kanban');
    addToast('Lead Convertido!', `${conv.clienteNome} foi cadastrado no Quadro Kanban como Novo Atendimento!`, 'success');
    return newId;
  };

  return (
    <AppContext.Provider
      value={{
        atendimentos,
        empresa,
        activeView,
        setActiveView,
        selectedAtendimentoId,
        setSelectedAtendimentoId,
        whatsAppModalData,
        setWhatsAppModalData,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        toasts,
        addToast,
        removeToast,
        addAtendimento,
        updateAtendimento,
        updateAtendimentoStatus,
        deleteAtendimento,
        updateEmpresa,
        resetToDemoData,
        clearAllData,
        importData,
        exportData,

        // Bot
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
