import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Atendimento,
  EmpresaConfig,
  StatusAtendimento,
  ToastMessage,
  ViewType,
} from '../types';
import {
  DEFAULT_EMPRESA_CONFIG,
  INITIAL_ATENDIMENTOS,
} from '../data/initialData';
import confetti from 'canvas-confetti';
// Firebase imports removed - using Supabase exclusively
import {
  getSupabaseClient,
  isSupabaseConfigured,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  mapAtendimentoToSupabaseRow,
  mapSupabaseRowToAtendimento,
  mapEmpresaToSupabaseRow,
  mapSupabaseRowToEmpresa,
} from '../lib/supabase';

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
  cloudSynced: boolean;
  activeDbProvider: 'supabase' | 'firebase';
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseActive: boolean;
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  addAtendimento: (data: Omit<Atendimento, 'id' | 'criadoEm'>) => Promise<number>;
  updateAtendimento: (id: number, updates: Partial<Atendimento>) => Promise<void>;
  updateAtendimentoStatus: (id: number, status: StatusAtendimento) => Promise<void>;
  deleteAtendimento: (id: number) => Promise<void>;
  updateEmpresa: (updates: Partial<EmpresaConfig>) => Promise<void>;
  resetToDemoData: () => Promise<void>;
  clearAllData: (resetEmpresa?: boolean) => Promise<void>;
  importData: (jsonStr: string) => Promise<boolean>;
  exportData: () => string;
  saveSupabaseCredentials: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  disconnectSupabase: () => void;
  syncAllToSupabase: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_ATENDIMENTOS_KEY = 'marmoraria_atendimentos_v2';
const STORAGE_EMPRESA_KEY = 'marmoraria_empresa_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Local state cache
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

  const [cloudSynced, setCloudSynced] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<number | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    atendimento: Atendimento;
    type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral';
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Supabase states
  const [supabaseConfig, setSupabaseConfigState] = useState(() => getStoredSupabaseConfig());
  const isSupabaseActive = isSupabaseConfigured();
  const activeDbProvider: 'supabase' | 'firebase' = isSupabaseActive ? 'supabase' : 'firebase';

  // Toast Helpers
  const addToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 4);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Load and listen from Supabase (if active)
  useEffect(() => {
    if (!isSupabaseActive) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isMounted = true;

    // Initial Fetch from Supabase
    const fetchSupabaseData = async () => {
      try {
        // Fetch Atendimentos
        const { data: atdData, error: atdError } = await supabase
          .from('atendimentos')
          .select('*')
          .order('id', { ascending: false });

        if (!atdError && atdData) {
          if (atdData.length > 0) {
            const mapped = atdData.map(mapSupabaseRowToAtendimento);
            if (isMounted) {
              setAtendimentos(mapped);
              localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(mapped));
              setCloudSynced(true);
            }
          } else {
            // Table is empty, seed current local items to Supabase
            const currentItems = atendimentos.length > 0 ? atendimentos : INITIAL_ATENDIMENTOS;
            const rowsToInsert = currentItems.map(mapAtendimentoToSupabaseRow);
            await supabase.from('atendimentos').upsert(rowsToInsert);
            setCloudSynced(true);
          }
        }

        // Fetch Empresa
        const { data: empData, error: empError } = await supabase
          .from('empresa_config')
          .select('*')
          .eq('id', 'default')
          .single();

        if (!empError && empData) {
          const mappedEmpresa = mapSupabaseRowToEmpresa(empData);
          if (isMounted) {
            setEmpresa(mappedEmpresa);
            localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(mappedEmpresa));
          }
        } else {
          // Seed empresa in Supabase
          await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(empresa));
        }
      } catch (err) {
        console.warn('Aviso ao consultar Supabase:', err);
      }
    };

    fetchSupabaseData();

    // Setup Realtime Channel
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapSupabaseRowToAtendimento(payload.new);
            setAtendimentos((prev) => {
              if (prev.some((a) => a.id === newItem.id)) return prev;
              const next = [newItem, ...prev];
              localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(next));
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = mapSupabaseRowToAtendimento(payload.new);
            setAtendimentos((prev) => {
              const next = prev.map((a) => (a.id === updatedItem.id ? updatedItem : a));
              localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(next));
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = Number(payload.old.id);
            setAtendimentos((prev) => {
              const next = prev.filter((a) => a.id !== deletedId);
              localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(next));
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'empresa_config' },
        (payload) => {
          if (payload.new) {
            const updatedEmpresa = mapSupabaseRowToEmpresa(payload.new);
            setEmpresa(updatedEmpresa);
            localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(updatedEmpresa));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isSupabaseActive, supabaseConfig]);

  // Firebase removed - Supabase is the primary database
  useEffect(() => {
    // No-op: Firebase/Firestore dependencies have been removed.
    // All data sync goes through Supabase (above effect).
    return undefined;
  }, [isSupabaseActive]);

  // CRUD Operations for Atendimentos
  const addAtendimento = async (data: Omit<Atendimento, 'id' | 'criadoEm'>): Promise<number> => {
    const nextId = Date.now();
    const newAtendimento: Atendimento = {
      ...data,
      id: nextId,
      criadoEm: new Date().toISOString(),
    };

    // Optimistic UI update
    setAtendimentos((prev) => {
      const next = [newAtendimento, ...prev];
      localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(next));
      return next;
    });

    // Dual-write to active database and cloud backup
    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const row = mapAtendimentoToSupabaseRow(newAtendimento);
          await supabase.from('atendimentos').upsert(row);
        } catch (e) {
          console.warn('Aviso ao sincronizar no Supabase:', e);
        }
      }
    }

    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // non-blocking
    }

    addToast(
      'Atendimento Registrado',
      `Novo pedido #${nextId} cadastrado e salvo no banco de dados com sucesso!`,
      'success'
    );
    return nextId;
  };

  const sendWhatsAppStatusUpdate = async (atendimento: Atendimento, novoStatus: string) => {
    if (!atendimento.telefone) return;
    const mensagem = `Olá ${atendimento.nome}! O status da sua solicitação #${atendimento.id} foi atualizado para: *${novoStatus}*.\n\nQualquer dúvida, estamos à disposição.`;
    try {
      await fetch('/api/bot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: atendimento.telefone, message: mensagem })
      });
    } catch (e) {
      console.error('Erro ao enviar mensagem via bot:', e);
    }
  };

  const updateAtendimento = async (id: number, updates: Partial<Atendimento>) => {
    const oldItem = atendimentos.find((a) => a.id === id);
    const hasStatusChanged = oldItem && updates.status && oldItem.status !== updates.status;

    const updatedList = atendimentos.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          ...updates,
          atualizadoEm: new Date().toISOString(),
        };
      }
      return a;
    });

    setAtendimentos(updatedList);
    localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(updatedList));

    const updatedItem = updatedList.find((a) => a.id === id);

    if (hasStatusChanged && updatedItem) {
      sendWhatsAppStatusUpdate(updatedItem, updatedItem.status);
    }

    if (isSupabaseActive && updatedItem) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const row = mapAtendimentoToSupabaseRow(updatedItem);
          await supabase.from('atendimentos').upsert(row);
        } catch (e) {
          console.warn('Aviso ao atualizar no Supabase:', e);
        }
      }
    }

    addToast('Atendimento Atualizado', 'As alterações foram salvas e sincronizadas.', 'success');
  };

  const updateAtendimentoStatus = async (id: number, newStatus: StatusAtendimento) => {
    const oldItem = atendimentos.find((a) => a.id === id);
    const hasStatusChanged = oldItem && oldItem.status !== newStatus;

    const updatedList = atendimentos.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          status: newStatus,
          atualizadoEm: new Date().toISOString(),
        };
      }
      return a;
    });

    setAtendimentos(updatedList);
    localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(updatedList));

    const updatedItem = updatedList.find((a) => a.id === id);
    if (hasStatusChanged && updatedItem) {
      sendWhatsAppStatusUpdate(updatedItem, newStatus);
    }

    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase
            .from('atendimentos')
            .update({ status: newStatus, atualizado_em: new Date().toISOString() })
            .eq('id', id);
        } catch (e) {
          console.warn('Aviso ao atualizar status no Supabase:', e);
        }
      }
    }

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

  const deleteAtendimento = async (id: number) => {
    const target = atendimentos.find((a) => a.id === id);
    const updatedList = atendimentos.filter((a) => a.id !== id);
    setAtendimentos(updatedList);
    localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(updatedList));

    if (selectedAtendimentoId === id) {
      setSelectedAtendimentoId(null);
    }

    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('atendimentos').delete().eq('id', id);
        } catch (e) {
          console.warn('Aviso ao excluir no Supabase:', e);
        }
      }
    }

    addToast('Atendimento Excluído', `Registro de ${target?.nome || '#' + id} removido.`, 'warning');
  };

  const updateEmpresa = async (updates: Partial<EmpresaConfig>) => {
    const updated = { ...empresa, ...updates };
    setEmpresa(updated);
    localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(updated));

    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(updated));
        } catch (e) {
          console.warn('Aviso ao atualizar empresa no Supabase:', e);
        }
      }
    }

    addToast('Configurações Salvas', 'Dados da empresa e layout salvos no banco!', 'success');
  };

  const resetToDemoData = async () => {
    setAtendimentos(INITIAL_ATENDIMENTOS);
    setEmpresa(DEFAULT_EMPRESA_CONFIG);
    localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(INITIAL_ATENDIMENTOS));
    localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(DEFAULT_EMPRESA_CONFIG));

    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('atendimentos').delete().neq('id', 0);
          await supabase.from('atendimentos').insert(INITIAL_ATENDIMENTOS.map(mapAtendimentoToSupabaseRow));
          await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(DEFAULT_EMPRESA_CONFIG));
        } catch (e) {
          console.error('Erro ao redefinir no Supabase:', e);
        }
      }
    }

    addToast('Dados Restaurados', 'Dados de demonstração recarregados e sincronizados.', 'info');
  };

  const clearAllData = async (resetEmpresa = false) => {
    setAtendimentos([]);
    setSelectedAtendimentoId(null);
    setWhatsAppModalData(null);
    localStorage.removeItem(STORAGE_ATENDIMENTOS_KEY);

    if (resetEmpresa) {
      setEmpresa(DEFAULT_EMPRESA_CONFIG);
      localStorage.removeItem(STORAGE_EMPRESA_KEY);
    }

    if (isSupabaseActive) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('atendimentos').delete().neq('id', 0);
          if (resetEmpresa) {
            await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(DEFAULT_EMPRESA_CONFIG));
          }
        } catch (e) {
          console.error('Erro ao limpar Supabase:', e);
        }
      }
    }

    addToast(
      'Base de Dados Zerada',
      resetEmpresa
        ? 'Todos os atendimentos foram excluídos e as configurações foram redefinidas.'
        : 'Todos os atendimentos e orçamentos foram removidos com sucesso.',
      'info'
    );
  };

  const exportData = (): string => {
    return JSON.stringify(
      {
        atendimentos,
        empresa,
        dbProvider: activeDbProvider,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  };

  const importData = async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.atendimentos && Array.isArray(parsed.atendimentos)) {
        setAtendimentos(parsed.atendimentos);
        localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(parsed.atendimentos));

        if (isSupabaseActive) {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.from('atendimentos').delete().neq('id', 0);
            await supabase.from('atendimentos').insert(parsed.atendimentos.map(mapAtendimentoToSupabaseRow));
          }
        }
      }
      if (parsed.empresa && typeof parsed.empresa === 'object') {
        const newEmpresa = { ...DEFAULT_EMPRESA_CONFIG, ...parsed.empresa };
        setEmpresa(newEmpresa);
        localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(newEmpresa));

        if (isSupabaseActive) {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(newEmpresa));
          }
        }
      }
      addToast('Importação Concluída', 'Dados restaurados e sincronizados com sucesso.', 'success');
      return true;
    } catch {
      addToast('Erro na Importação', 'Arquivo JSON inválido ou corrompido.', 'error');
      return false;
    }
  };

  // Supabase management helpers
  const saveSupabaseCredentials = async (url: string, key: string) => {
    const testResult = await testSupabaseConnection(url, key);
    if (!testResult.success) {
      return testResult;
    }

    saveSupabaseConfig(url, key);
    setSupabaseConfigState({ url, anonKey: key });

    // Sync initial state
    try {
      const supabase = getSupabaseClient();
      if (supabase && atendimentos.length > 0) {
        await supabase.from('atendimentos').upsert(atendimentos.map(mapAtendimentoToSupabaseRow));
        await supabase.from('empresa_config').upsert(mapEmpresaToSupabaseRow(empresa));
      }
    } catch (e) {
      console.warn('Erro ao enviar dados iniciais ao Supabase:', e);
    }

    addToast('Supabase Conectado', 'Banco de dados PostgreSQL Supabase sincronizado com sucesso!', 'success');
    return { success: true, message: 'Conectado com sucesso ao Supabase!' };
  };

  const disconnectSupabase = () => {
    clearSupabaseConfig();
    setSupabaseConfigState({ url: '', anonKey: '' });
    addToast('Supabase Desconectado', 'O sistema retornou para o modo de nuvem padrão.', 'info');
  };

  const syncAllToSupabase = async () => {
    if (!isSupabaseActive) {
      return { success: false, message: 'Supabase não está configurado.' };
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Cliente Supabase não disponível.' };
    }

    try {
      if (atendimentos.length > 0) {
        const rows = atendimentos.map(mapAtendimentoToSupabaseRow);
        const { error: atdError } = await supabase.from('atendimentos').upsert(rows);
        if (atdError) throw atdError;
      }
      const { error: empError } = await supabase
        .from('empresa_config')
        .upsert(mapEmpresaToSupabaseRow(empresa));
      if (empError) throw empError;

      addToast('Sincronização Completa', 'Todos os dados foram enviados para o Supabase.', 'success');
      return { success: true, message: 'Todos os dados foram sincronizados com o Supabase!' };
    } catch (err: any) {
      addToast('Erro de Sincronização', err.message, 'error');
      return { success: false, message: err.message };
    }
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
        cloudSynced,
        activeDbProvider,
        supabaseUrl: supabaseConfig.url,
        supabaseAnonKey: supabaseConfig.anonKey,
        isSupabaseActive,
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
        saveSupabaseCredentials,
        disconnectSupabase,
        syncAllToSupabase,
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
