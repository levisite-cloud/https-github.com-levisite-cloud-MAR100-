import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Atendimento,
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

  // Bot WhatsApp State & Methods
  botStatus: BotConnectionStatus;
  botConfig: BotConfig;
  conversas: ConversaWhatsApp[];
  selectedConversaId: string | null;
  setSelectedConversaId: (id: string | null) => void;
  updateBotConfig: (updates: Partial<BotConfig>) => void;
  connectBot: () => void;
  disconnectBot: () => void;
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
  // 1. Initial Load from LocalStorage
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

  // Bot WhatsApp State
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

  // 2. Persistent Storage Sync
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
      console.warn('Erro ao persistir configurações da empresa:', e);
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

  // Toast Helpers
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

  // CRUD Operations for Atendimentos
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
      // confetti non-blocking
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
    addToast('Atendimento Atualizado', 'As alterações foram salvas com sucesso.', 'success');
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

    if (newStatus === 'Concluído' || newStatus === 'Aprovado') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // ignore
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
    addToast('Atendimento Excluído', `Registro de ${target?.nome || '#' + id} removido.`, 'warning');
  };

  const updateEmpresa = (updates: Partial<EmpresaConfig>) => {
    setEmpresa((prev) => ({ ...prev, ...updates }));
    addToast('Configurações Salvas', 'Dados da empresa e layout atualizados!', 'success');
  };

  const resetToDemoData = () => {
    setAtendimentos(INITIAL_ATENDIMENTOS);
    setEmpresa(DEFAULT_EMPRESA_CONFIG);
    setConversas(INITIAL_CONVERSAS);
    setBotConfig(DEFAULT_BOT_CONFIG);
    setBotStatus('connected');
    addToast('Dados Restaurados', 'Dados de demonstração recarregados.', 'info');
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
        ? 'Todos os atendimentos foram excluídos e as configurações foram redefinidas.'
        : 'Todos os atendimentos e orçamentos foram removidos com sucesso.',
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
      addToast('Importação Concluída', 'Dados restaurados com sucesso a partir do arquivo.', 'success');
      return true;
    } catch {
      addToast('Erro na Importação', 'Arquivo JSON inválido ou corrompido.', 'error');
      return false;
    }
  };

  // Bot Operations
  const updateBotConfig = (updates: Partial<BotConfig>) => {
    setBotConfig((prev) => ({ ...prev, ...updates }));
    addToast('Robô Atualizado', 'Configurações do WhatsApp Bot salvas!', 'success');
  };

  const connectBot = () => {
    setBotStatus('pairing');
    addToast('Gerando QR Code', 'Aponte a câmera do WhatsApp para conectar...', 'info');

    setTimeout(() => {
      setBotStatus('connected');
      setBotConfig((prev) => ({
        ...prev,
        conectadoEm: new Date().toISOString(),
        bateria: 95,
      }));
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
      addToast('WhatsApp Conectado!', 'Robô pronto para responder clientes 24h.', 'success');
    }, 2800);
  };

  const disconnectBot = () => {
    setBotStatus('disconnected');
    addToast('WhatsApp Desconectado', 'A sessão com o celular foi encerrada.', 'warning');
  };

  const createNewConversa = (nome: string, telefone: string): string => {
    const newId = 'conv-' + Date.now();
    const nova: ConversaWhatsApp = {
      id: newId,
      clienteNome: nome || 'Cliente WhatsApp',
      clienteTelefone: telefone || '(11) 9' + Math.floor(10000000 + Math.random() * 90000000),
      ultimaMensagem: 'Início do atendimento virtual',
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      mensagensNaoLidas: 0,
      statusLead: 'novo',
      mensagens: [
        {
          id: 'm-init',
          remetente: 'bot',
          texto: botConfig.saudacao || 'Olá! Como posso te ajudar hoje?',
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
    addToast('Conversa Excluída', 'Histórico removido.', 'info');
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

    // 1. Add user/operator message
    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: anexo?.type === 'image' ? '📷 [Foto enviada]' : anexo?.type === 'orcamento_pdf' ? '📄 [Proposta Comercial PDF]' : texto,
            horario: horaAtual,
            mensagens: [...c.mensagens, novaMsg],
          };
        }
        return c;
      })
    );

    // 2. If message came from client and Bot is active, trigger AI / Bot response!
    if (remetente === 'cliente' && botConfig.ativo && botStatus === 'connected') {
      const conv = conversas.find((c) => c.id === conversaId);
      const historicoMsgs = conv ? [...conv.mensagens, novaMsg] : [novaMsg];

      try {
        // Call backend server API
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
          const respostaBot = data.resposta || 'Entendido! Já anotei suas informações.';
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

            // Increment bot counter
            setBotConfig((prev) => ({ ...prev, totalAtendimentosBot: prev.totalAtendimentosBot + 1 }));
          }, 800);
        } else {
          throw new Error('Fallback to local engine');
        }
      } catch {
        // Local intelligent heuristic engine for instant fallback
        setTimeout(() => {
          let respostaBot = '';
          const lower = texto.toLowerCase();

          if (lower.includes('preço') || lower.includes('quanto') || lower.includes('orçamento') || lower.includes('valor')) {
            respostaBot = `Perfeito! Na ${empresa.nome || 'nossa marmoraria'}, os valores variam conforme o material e metragem:\n\n• Granito São Gabriel: ~R$ 850/m²\n• Granito Preto Absoluto: ~R$ 1.250/m²\n• Quartzo Calacatta Gold: ~R$ 2.400/m²\n• Mármore Travertino: ~R$ 980/m²\n• Quartzito Mont Blanc: ~R$ 2.800/m²\n\nQual a medida aproximada (comprimento x largura) do seu espaço?`;
          } else if (lower.includes('bancada') || lower.includes('cozinha') || lower.includes('ilha')) {
            respostaBot = `Ótima escolha! Para bancadas e ilhas de cozinha, os materiais mais resistentes a manchas e calor são os Granitos Pretos, Quartzos e Ultracompactos (Dekton). Você já tem o desenho ou as medidas em mãos?`;
          } else if (lower.includes('banheiro') || lower.includes('lavatório') || lower.includes('cuba esculpida')) {
            respostaBot = `Trabalhamos com lindos lavatórios com cuba esculpida em rampa ou fundo reto em Mármore Travertino, Quartzo e Branco Paraná. Qual o acabamento desejado?`;
          } else if (lower.includes('visita') || lower.includes('medição') || lower.includes('medir') || lower.includes('agendar')) {
            respostaBot = `Com certeza! Realizamos a visita técnica de medição no seu endereço sem compromisso. Qual o seu bairro e o melhor dia/horário para a equipe ir até você?`;
          } else if (lower.includes('humano') || lower.includes('atendente') || lower.includes('vendedor') || lower.includes('falar')) {
            respostaBot = `Com certeza! Já notifiquei nossa equipe de vendas. Em instantes um especialista continuará o atendimento por aqui.`;
          } else {
            respostaBot = `Entendi! Temos estoque de chapas nobres prontas para corte. Se desejar, me envie a foto do seu ambiente ou as medidas que já calculo uma prévia de orçamento para você! 😊`;
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
      texto: 'Enviei uma foto do meu ambiente / planta para análise.',
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
            ultimaMensagem: '📷 [Foto enviada pelo cliente]',
            horario: horaAtual,
            mensagens: [...c.mensagens, clienteMsg],
          };
        }
        return c;
      })
    );

    // Call Vision endpoint
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
      const respostaAnalise = data.analise || '🔍 Analisei sua imagem! Identifiquei um espaço de bancada com medidas aproximadas de 2.20m x 0.60m. Qual acabamento você prefere?';
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
      // Fallback
      setTimeout(() => {
        const botMsg = {
          id: 'bot-vision-fb-' + Date.now(),
          remetente: 'bot' as const,
          texto: '🔍 Foto recebida com sucesso! Identifiquei o espaço de bancada. Recomendo Granito São Gabriel ou Quartzo Calacatta para esse ambiente. Gostaria de agendar a medição técnica gratuita?',
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

    const material = conv.dadosExtraidos?.material || 'Granito São Gabriel';
    const servico = conv.dadosExtraidos?.servico || 'Bancada de Cozinha';
    const medidas = conv.dadosExtraidos?.medidas || '2.20m x 0.60m';
    const valor = conv.dadosExtraidos?.valorEstimado || 2450;
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const textoProposta = `📄 *PROPOSTA COMERCIAL TIMBRADA GERADA!* 💎\n\nOlá, ${conv.clienteNome}! Segue sua proposta formal da *${empresa.nome}*:\n\n• *Projeto:* ${servico}\n• *Material Nobre:* ${material}\n• *Dimensões:* ${medidas}\n• *Valor Total:* R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• *Condições:* 10x sem juros no cartão ou 5% no PIX\n• *Prazo de Instalação:* 7 a 10 dias úteis\n• *Garantia:* 5 Anos de Acabamento e Assentamento\n\nChave PIX da Empresa: ${empresa.pix || empresa.cnpj || 'marmoraria@pix.com.br'}`;

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
          condicoes: '10x sem juros no cartão de crédito ou 5% de desconto no PIX à vista.',
        },
      },
    };

    setConversas((prev) =>
      prev.map((c) => {
        if (c.id === conversaId) {
          return {
            ...c,
            ultimaMensagem: '📄 [Proposta Comercial PDF Enviada]',
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
    const followUpMsg = `Olá, ${conv.clienteNome}! Tudo bem? 😊\n\nPassando para saber se você conseguiu analisar a nossa cotação para o seu projeto de *${conv.dadosExtraidos?.servico || 'Marmoraria'}* em *${conv.dadosExtraidos?.material || 'Pedra Nobre'}*.\n\nConsegui liberar com a gerência um bônus especial de *Cuba Inox Inclusa ou Frete Grátis* se fecharmos a medição nesta semana! Podemos confirmar?`;

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

    addToast('Follow-up Disparado!', `Mensagem de recuperação de venda enviada para ${conv.clienteNome}!`, 'info');
  };

  const updateTabelaPedra = (pedraId: string, updates: Partial<any>) => {
    setBotConfig((prev) => ({
      ...prev,
      tabelaPedras: prev.tabelaPedras.map((p) => (p.id === pedraId ? { ...p, ...updates } : p)),
    }));
    addToast('Tabela de Pedras Atualizada', 'Preços e dados sincronizados com a IA do robô.', 'success');
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
    addToast('Pedra Adicionada', `${pedra.nome} agora faz parte do catálogo da IA.`, 'success');
  };

  const deleteTabelaPedra = (pedraId: string) => {
    setBotConfig((prev) => ({
      ...prev,
      tabelaPedras: prev.tabelaPedras.filter((p) => p.id !== pedraId),
    }));
    addToast('Pedra Removida', 'Item removido do catálogo de preços.', 'info');
  };

  const toggleBotSkill = (skillId: string) => {
    setBotConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === skillId ? { ...s, ativo: !s.ativo } : s)),
    }));
    addToast('Habilidade Atualizada', 'Configuração do Super Robô modificada com sucesso.', 'info');
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
          .replace(/\{\{material\}\}/g, c.dadosExtraidos?.material || 'Granito São Gabriel');

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
    const material = conv.dadosExtraidos?.material || 'Granito São Gabriel';
    const orcamentoEstimado = conv.dadosExtraidos?.valorEstimado ? conv.dadosExtraidos.valorEstimado.toFixed(2).replace('.', ',') : '2.500,00';
    const endereco = conv.dadosExtraidos?.endereco || 'Endereço a confirmar via WhatsApp';

    const newId = addAtendimento({
      nome: conv.clienteNome,
      telefone: conv.clienteTelefone,
      endereco,
      cep: '',
      logradouro: endereco,
      numero: 'S/N',
      bairro: 'A confirmar',
      cidade: 'São Paulo',
      estado: 'SP',
      servico,
      material,
      status: 'Novo Atendimento',
      prioridade: 'Alta',
      dataPrevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      responsavel: 'Robô WhatsApp (Auto-Lead)',
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
      obs: `Atendimento gerado automaticamente pelo MarmoBot WhatsApp.\nÚltima mensagem do cliente: "${conv.ultimaMensagem}"`,
    });

    // Mark conversation as converted
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
        updateBotConfig,
        connectBot,
        disconnectBot,
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
