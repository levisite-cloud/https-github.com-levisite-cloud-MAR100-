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
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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

  // 3. Fallback: Firebase Firestore Sync (when Supabase is not active)
  useEffect(() => {
    if (isSupabaseActive) return;

    let unsubscribeAtendimentos: (() => void) | undefined;
    let unsubscribeEmpresa: (() => void) | undefined;

    try {
      const atendimentosColRef = collection(db, 'atendimentos');
      const empresaDocRef = doc(db, 'empresa', 'default');

      // Listen for atendimentos
      unsubscribeAtendimentos = onSnapshot(
        atendimentosColRef,
        async (snapshot) => {
          if (!snapshot.empty) {
            const list: Atendimento[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Atendimento);
            });
            list.sort((a, b) => b.id - a.id);
            setAtendimentos(list);
            localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(list));
            setCloudSynced(true);
          } else {
            // First time cloud initialization: seed default atendimentos
            try {
              const saved = localStorage.getItem(STORAGE_ATENDIMENTOS_KEY);
              const initialToSeed = saved ? JSON.parse(saved) : INITIAL_ATENDIMENTOS;
              if (initialToSeed && initialToSeed.length > 0) {
                const batch = writeBatch(db);
                initialToSeed.forEach((item: Atendimento) => {
                  batch.set(doc(db, 'atendimentos', String(item.id)), item);
                });
                await batch.commit();
              }
            } catch (err) {
              console.warn('Erro ao inicializar semente no Firestore:', err);
            }
            setCloudSynced(true);
          }
        },
        (error) => {
          console.warn('Aviso de conexão Firestore (atendimentos):', error);
        }
      );

      // Listen for empresa config
      unsubscribeEmpresa = onSnapshot(
        empresaDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const remoteEmpresa = docSnap.data() as EmpresaConfig;
            setEmpresa({ ...DEFAULT_EMPRESA_CONFIG, ...remoteEmpresa });
            localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(remoteEmpresa));
          } else {
            try {
              const savedEmpresa = localStorage.getItem(STORAGE_EMPRESA_KEY);
              const toSeed = savedEmpresa ? JSON.parse(savedEmpresa) : DEFAULT_EMPRESA_CONFIG;
              await setDoc(empresaDocRef, toSeed);
            } catch (err) {
              console.warn('Erro ao inicializar empresa no Firestore:', err);
            }
          }
        },
        (error) => {
          console.warn('Aviso de conexão Firestore (empresa):', error);
        }
      );
    } catch (e) {
      console.warn('Erro ao configurar observadores do Firestore:', e);
    }

    return () => {
      if (unsubscribeAtendimentos) unsubscribeAtendimentos();
      if (unsubscribeEmpresa) unsubscribeEmpresa();
    };
  }, [isSupabaseActive]);

  // CRUD Operations for Atendimentos
  const addAtendimento = async (data: Omit<Atendimento, 'id' | 'criadoEm'>): Promise<number> => {
    const nextId = atendimentos.length > 0 ? Math.max(...atendimentos.map((a) => a.id)) + 1 : 1;
    const newAtendimento: Atendimento = {
      ...data,
      id: nextId,
      criadoEm: new Date().toISOString(),
    };

    // Optimistic UI update
    setAtendimentos((prev) => [newAtendimento, ...prev]);
    localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify([newAtendimento, ...atendimentos]));

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
    
    // Always persist to cloud database (Firestore) as backup
    try {
      await setDoc(doc(db, 'atendimentos', String(nextId)), newAtendimento);
    } catch (e) {
      console.warn('Aviso ao salvar no Firestore:', e);
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

  const updateAtendimento = async (id: number, updates: Partial<Atendimento>) => {
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

    // Always update Firestore backup
    try {
      const docRef = doc(db, 'atendimentos', String(id));
      await updateDoc(docRef, {
        ...updates,
        atualizadoEm: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Aviso ao atualizar no Firestore:', e);
    }

    addToast('Atendimento Atualizado', 'As alterações foram salvas e sincronizadas.', 'success');
  };

  const updateAtendimentoStatus = async (id: number, newStatus: StatusAtendimento) => {
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

    try {
      const docRef = doc(db, 'atendimentos', String(id));
      await updateDoc(docRef, {
        status: newStatus,
        atualizadoEm: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Aviso ao atualizar status no Firestore:', e);
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

    try {
      await deleteDoc(doc(db, 'atendimentos', String(id)));
    } catch (e) {
      console.warn('Aviso ao excluir no Firestore:', e);
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

    try {
      await setDoc(doc(db, 'empresa', 'default'), updated);
    } catch (e) {
      console.warn('Aviso ao salvar empresa no Firestore:', e);
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
    } else {
      try {
        const snapshot = await getDocs(collection(db, 'atendimentos'));
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        INITIAL_ATENDIMENTOS.forEach((item) => {
          batch.set(doc(db, 'atendimentos', String(item.id)), item);
        });
        batch.set(doc(db, 'empresa', 'default'), DEFAULT_EMPRESA_CONFIG);
        await batch.commit();
      } catch (e) {
        console.error('Erro ao redefinir dados no Firestore:', e);
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
    } else {
      try {
        const snapshot = await getDocs(collection(db, 'atendimentos'));
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        if (resetEmpresa) {
          batch.set(doc(db, 'empresa', 'default'), DEFAULT_EMPRESA_CONFIG);
        }
        await batch.commit();
      } catch (e) {
        console.error('Erro ao limpar Firestore:', e);
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
        } else {
          try {
            const snapshot = await getDocs(collection(db, 'atendimentos'));
            const batch = writeBatch(db);
            snapshot.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            parsed.atendimentos.forEach((item: Atendimento) => {
              batch.set(doc(db, 'atendimentos', String(item.id)), item);
            });
            await batch.commit();
          } catch (err) {
            console.warn('Erro ao sincronizar importação no Firestore:', err);
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
        } else {
          try {
            await setDoc(doc(db, 'empresa', 'default'), newEmpresa);
          } catch (err) {
            console.warn('Erro ao atualizar empresa importada no Firestore:', err);
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
