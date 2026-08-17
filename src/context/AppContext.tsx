import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Atendimento, EmpresaConfig, StatusAtendimento, ToastMessage, ViewType } from '../types';
import { DEFAULT_EMPRESA_CONFIG, INITIAL_ATENDIMENTOS } from '../data/initialData';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_ATENDIMENTOS_KEY = 'marmoraria_atendimentos_v2';
const STORAGE_EMPRESA_KEY = 'marmoraria_empresa_v2';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initial Load from LocalStorage
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ATENDIMENTOS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      // Also check legacy storage key if present
      const legacy = localStorage.getItem('marmoraria_atendimentos');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      const legacy = localStorage.getItem('marmoraria_empresa');
      if (legacy) {
        return { ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(legacy) };
      }
      return DEFAULT_EMPRESA_CONFIG;
    } catch {
      return DEFAULT_EMPRESA_CONFIG;
    }
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

  // Apply primary color to CSS variables whenever company color changes
  useEffect(() => {
    const color = empresa.cor || '#0052cc';
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--primary-hover', adjustColorBrightness(color, -20));
    document.documentElement.style.setProperty('--primary-light', hexToRgba(color, 0.08));
    document.documentElement.style.setProperty('--primary-ring', hexToRgba(color, 0.25));
  }, [empresa.cor]);

  // Persist Atendimentos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ATENDIMENTOS_KEY, JSON.stringify(atendimentos));
    } catch (e) {
      console.error('Failed to persist atendimentos', e);
    }
  }, [atendimentos]);

  // Persist Empresa
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EMPRESA_KEY, JSON.stringify(empresa));
    } catch (e) {
      console.error('Failed to persist empresa', e);
    }
  }, [empresa]);

  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAtendimento = (data: Omit<Atendimento, 'id' | 'criadoEm'>): number => {
    const newId = atendimentos.length > 0 ? Math.max(...atendimentos.map((a) => a.id)) + 1 : 1;
    const newAtendimento: Atendimento = {
      ...data,
      id: newId,
      criadoEm: new Date().toISOString(),
    };
    setAtendimentos((prev) => [newAtendimento, ...prev]);
    addToast('Atendimento Cadastrado!', `Cliente ${data.nome} adicionado com sucesso.`, 'success');
    return newId;
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
    return JSON.stringify({ atendimentos, empresa, exportDate: new Date().toISOString() }, null, 2);
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
      addToast('Importação Concluída', 'Dados restaurados com sucesso a partir do arquivo.', 'success');
      return true;
    } catch {
      addToast('Erro na Importação', 'Arquivo JSON inválido ou corrompido.', 'error');
      return false;
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0, 82, 204, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustColorBrightness(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  let num = parseInt(clean, 16);
  let r = (num >> 16) + percent;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00ff) + percent;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  let g = (num & 0x0000ff) + percent;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}
