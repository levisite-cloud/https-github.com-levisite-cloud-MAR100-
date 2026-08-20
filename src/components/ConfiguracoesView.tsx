import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Palette,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  FileText,
  Sparkles,
  RefreshCw,
  QrCode,
  Search,
  Loader2,
  AlertTriangle,
  Database,
  ShieldAlert,
  X,
  Copy,
  ExternalLink,
  Check,
  Server,
  Cloud,
  Layers,
  Code2,
  GitBranch,
  MessageCircle,
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '../utils/formatters';
import { DEFAULT_EMPRESA_CONFIG } from '../data/initialData';
import { testSupabaseConnection } from '../lib/supabase';

const CORES_PRESET = [
  { label: 'Azul Real', hex: '#0052cc' },
  { label: 'Azul Marinho', hex: '#0f172a' },
  { label: 'Grafite / Ardósia', hex: '#334155' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Vinho Nobre', hex: '#9f1239' },
  { label: 'Dourado / Âmbar', hex: '#d97706' },
  { label: 'Terracota', hex: '#c2410c' },
  { label: 'Púrpura Imperial', hex: '#7e22ce' },
  { label: 'Índigo Profundo', hex: '#4338ca' },
  { label: 'Teal Moderno', hex: '#0f766e' },
];

const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- SISTEMA DE GESTÃO DE MARMORARIA (MAR100) - SCHEMA DO SUPABASE (POSTGRESQL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id BIGINT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT DEFAULT '',
    cpf_cnpj TEXT DEFAULT '',
    cep TEXT DEFAULT '',
    logradouro TEXT DEFAULT '',
    numero TEXT DEFAULT '',
    complemento TEXT DEFAULT '',
    bairro TEXT DEFAULT '',
    cidade TEXT DEFAULT '',
    estado TEXT DEFAULT '',
    endereco TEXT DEFAULT '',
    servico TEXT NOT NULL,
    material TEXT NOT NULL,
    acabamento TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Novo Atendimento',
    prioridade TEXT DEFAULT 'Normal',
    data_prevista TEXT DEFAULT '',
    hora_prevista TEXT DEFAULT '',
    data_medicao TEXT DEFAULT '',
    data_instalacao TEXT DEFAULT '',
    responsavel TEXT DEFAULT '',
    orcamento TEXT DEFAULT 'R$ 0,00',
    desconto NUMERIC DEFAULT 0,
    validade_orcamento TEXT DEFAULT '15 dias',
    condicoes_pagamento TEXT DEFAULT 'À vista ou 10x no cartão',
    itens_orcamento JSONB DEFAULT '[]'::jsonb,
    obs TEXT DEFAULT '',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.empresa_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    nome TEXT NOT NULL DEFAULT 'Marmoraria Imperial Arte em Pedras',
    cnpj TEXT DEFAULT '',
    tel TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    email TEXT DEFAULT '',
    slogan TEXT DEFAULT 'Excelência e sofisticação em granitos, mármores e quartzos nobres.',
    endereco TEXT DEFAULT '',
    horario TEXT DEFAULT 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 12:00',
    site TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    pix_key TEXT DEFAULT '',
    obs TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    cor TEXT DEFAULT '#eab308',
    termos_padrao TEXT DEFAULT '',
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Atendimentos" ON public.atendimentos;
CREATE POLICY "Acesso Atendimentos" ON public.atendimentos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Empresa" ON public.empresa_config;
CREATE POLICY "Acesso Empresa" ON public.empresa_config FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresa_config;`;

export const ConfiguracoesView: React.FC = () => {
  const {
    atendimentos,
    empresa,
    updateEmpresa,
    resetToDemoData,
    clearAllData,
    exportData,
    importData,
    addToast,
    isSupabaseActive,
    activeDbProvider,
    supabaseUrl: currentSupabaseUrl,
    supabaseAnonKey: currentSupabaseKey,
    saveSupabaseCredentials,
    disconnectSupabase,
    syncAllToSupabase,
  } = useApp();

  const [formData, setFormData] = useState({ ...empresa });
  const [logoPreview, setLogoPreview] = useState(empresa.logo || '');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<'atendimentos' | 'completo'>('atendimentos');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Supabase states
  const [inputUrl, setInputUrl] = useState(currentSupabaseUrl || '');
  const [inputKey, setInputKey] = useState(currentSupabaseKey || '');
  const [isConnectingSupabase, setIsConnectingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  // WhatsApp Bot states - complete monitoring
  const [botStatus, setBotStatus] = useState<{
    isReady: boolean;
    isConnecting: boolean;
    hasQr: boolean;
    qrCode: string | null;
    number: string | null;
    name: string | null;
    lastConnectionTime: string | null;
    lastDisconnectionTime: string | null;
    lastError: string | null;
    messagesProcessed: number;
    errorCount: number;
    reconnectAttempts: number;
    uptime: number;
    logs: string[];
  }>({
    isReady: false, isConnecting: false, hasQr: false, qrCode: null,
    number: null, name: null, lastConnectionTime: null, lastDisconnectionTime: null,
    lastError: null, messagesProcessed: 0, errorCount: 0, reconnectAttempts: 0,
    uptime: 0, logs: [],
  });
  const [botLoading, setBotLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncActive, setSyncActive] = useState(true);
  const [isLocalEnv, setIsLocalEnv] = useState(() => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  });
  const [customBotUrl, setCustomBotUrl] = useState(() => {
    return localStorage.getItem('marmoraria_bot_url') || '';
  });
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatTimeAgo = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return 'Agora';
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return new Date(iso).toLocaleString('pt-BR');
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('pt-BR');
  };

  const getBotUrl = () => {
    if (isLocalEnv) return 'http://localhost:3001';
    return customBotUrl || '';
  };
  const BOT_URL = getBotUrl();
  const hasBotUrl = Boolean(BOT_URL);

  const saveCustomBotUrl = (url: string) => {
    setCustomBotUrl(url);
    localStorage.setItem('marmoraria_bot_url', url);
  };

  const fetchBotStatus = useCallback(async () => {
    if (!hasBotUrl) {
      setBotStatus((prev) => ({
        ...prev,
        isReady: false,
        isConnecting: false,
        hasQr: false,
        qrCode: null,
        lastError: null,
      }));
      return;
    }
    try {
      const res = await fetch(`${BOT_URL}/api/bot/status`);
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        setLastSyncTime(new Date().toISOString());
      }
    } catch {
      setBotStatus((prev) => ({
        ...prev,
        isReady: false,
        isConnecting: false,
        hasQr: false,
        qrCode: null,
        lastError: 'Bot process not running on port 3001',
      }));
      setLastSyncTime(new Date().toISOString());
    }
  }, [hasBotUrl, BOT_URL]);

  useEffect(() => {
    fetchBotStatus();
    botIntervalRef.current = setInterval(fetchBotStatus, 5000);
    return () => { if (botIntervalRef.current) clearInterval(botIntervalRef.current); };
  }, [fetchBotStatus]);

  const handleDisconnectBot = async () => {
    setBotLoading(true);
    try {
      await fetch(`${BOT_URL}/api/bot/disconnect`, { method: 'POST' });
      setTimeout(fetchBotStatus, 2000);
      addToast('WhatsApp Desconectado', 'O bot foi desconectado do WhatsApp.', 'info');
    } catch {
      addToast('Erro', 'Não foi possível desconectar o bot. Verifique se o processo está rodando.', 'error');
    } finally {
      setBotLoading(false);
    }
  };

  const handleReconnectBot = async () => {
    setBotLoading(true);
    try {
      await fetch(`${BOT_URL}/api/bot/reconnect`, { method: 'POST' });
      addToast('Reconectando', 'Tentativa de reconexão iniciada...', 'info');
      setTimeout(fetchBotStatus, 3000);
    } catch {
      addToast('Erro', 'Não foi possível reconectar o bot.', 'error');
    } finally {
      setBotLoading(false);
    }
  };

  const handleExecuteReset = () => {
    if (!confirmCheckbox) {
      addToast('Confirmação Necessária', 'Marque a caixa confirmando que deseja zerar a base de dados.', 'warning');
      return;
    }

    const isFullReset = resetScope === 'completo';
    clearAllData(isFullReset);

    if (isFullReset) {
      setFormData(DEFAULT_EMPRESA_CONFIG);
      setLogoPreview('');
    }

    setShowResetModal(false);
    setConfirmCheckbox(false);
  };

  const handleInputChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const lookupCnpj = async (rawCnpj: string) => {
    const cleanCnpj = rawCnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      addToast('Aviso', 'Digite um CNPJ válido com 14 dígitos.', 'warning');
      return;
    }

    setIsSearchingCnpj(true);
    try {
      if (cleanCnpj === '34567890000123') {
        await new Promise((resolve) => setTimeout(resolve, 350));
        setFormData((prev) => ({
          ...prev,
          cnpj: '34.567.890/0001-23',
          nome: 'Marmoraria Imperial Arte em Pedras Nobres LTDA',
          tel: '(11) 98765-4321',
          email: 'contato@marmorariaimperial.com.br',
          pixKey: '34.567.890/0001-23',
          slogan: 'Excelência e Precisão em Mármores, Granitos e Quartzos Nobres',
          endereco: 'Av. das Nações Unidas, 12901 - Brooklin Paulista, São Paulo - SP, 04578-000',
        }));
        addToast('CNPJ Encontrado!', 'Informações da Marmoraria Imperial preenchidas com sucesso.', 'success');
        return;
      }

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        const nomeEmpresa = data.nome_fantasia || data.razao_social || formData.nome;
        const telefone = data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : formData.tel;
        const emailEmpresa = data.email ? data.email.toLowerCase() : formData.email;

        const logradouro = data.descricao_tipo_de_logradouro
          ? `${data.descricao_tipo_de_logradouro} ${data.logradouro}`
          : data.logradouro;
        const numero = data.numero ? `nº ${data.numero}` : '';
        const complemento = data.complemento ? `- ${data.complemento}` : '';
        const bairro = data.bairro ? `- ${data.bairro}` : '';
        const cidadeUf = data.municipio ? `${data.municipio}/${data.uf}` : '';
        const cep = data.cep ? `CEP: ${data.cep}` : '';

        const enderecoCompleto = [logradouro, numero, complemento, bairro, cidadeUf, cep].filter(Boolean).join(' ').trim();
        const sloganAtividade = data.cnae_fiscal_descricao ? `Especialistas em ${data.cnae_fiscal_descricao}` : formData.slogan;

        setFormData((prev) => ({
          ...prev,
          cnpj: maskCpfCnpj(cleanCnpj),
          nome: nomeEmpresa,
          tel: telefone,
          email: emailEmpresa,
          pixKey: prev.pixKey || maskCpfCnpj(cleanCnpj),
          endereco: enderecoCompleto || prev.endereco,
          slogan: sloganAtividade || prev.slogan,
        }));

        addToast('CNPJ Localizado!', `Dados da empresa "${nomeEmpresa}" carregados automaticamente.`, 'success');
      } else {
        addToast('CNPJ não encontrado', 'Não foi possível consultar os dados na Receita Federal.', 'warning');
      }
    } catch (error) {
      console.warn('Erro ao consultar CNPJ:', error);
      addToast('Erro na Consulta', 'Falha ao buscar dados do CNPJ.', 'error');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleCnpjInputChange = (val: string) => {
    const masked = maskCpfCnpj(val);
    handleInputChange('cnpj', masked);
    const clean = masked.replace(/\D/g, '');
    if (clean.length === 14) {
      lookupCnpj(clean);
    }
  };

  const handleColorSelect = (hex: string) => {
    setFormData((prev) => ({ ...prev, cor: hex }));
  };

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      addToast('Erro no Envio', 'A imagem deve ter no máximo 2.5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      setFormData((prev) => ({ ...prev, logo: base64 }));
      addToast('Logo Carregada', 'Clique em Salvar Configurações para aplicar.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    addToast('Logo Removida', 'Logotipo retirado com sucesso.', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      addToast('Aviso', 'O nome da empresa é obrigatório.', 'warning');
      return;
    }
    updateEmpresa(formData);
  };

  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_marmoraria_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Backup Exportado', 'Arquivo JSON de backup salvo com sucesso.', 'success');
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const ok = importData(content);
      if (ok) {
        setFormData({ ...empresa });
        setLogoPreview(empresa.logo || '');
      }
    };
    reader.readAsText(file);
  };

  // Supabase Actions
  const handleConnectSupabase = async () => {
    if (!inputUrl.trim() || !inputKey.trim()) {
      addToast('Campos Obrigatórios', 'Preencha o Project URL e a Anon Key do Supabase.', 'warning');
      return;
    }

    setIsConnectingSupabase(true);
    try {
      const result = await saveSupabaseCredentials(inputUrl.trim(), inputKey.trim());
      if (!result.success) {
        addToast('Falha na Conexão', result.message, 'error');
      }
    } catch (e: any) {
      addToast('Erro', e.message || 'Falha ao conectar com o Supabase.', 'error');
    } finally {
      setIsConnectingSupabase(false);
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await syncAllToSupabase();
      if (!res.success) {
        addToast('Aviso', res.message, 'error');
      }
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    addToast('SQL Copiado!', 'Script SQL pronto para ser executado no Supabase SQL Editor.', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Configurações & Personalização</span>
          </div>
          <h1 className="text-xl font-black text-amber-400">Perfil da Empresa & Banco de Dados</h1>
          <p className="text-xs text-zinc-400">
            Personalize a identidade visual, dados comerciais dos orçamentos e gerencie a conexão com o banco de dados em nuvem.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-950 text-xs font-black rounded-xl shadow-md shadow-amber-400/20 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4 stroke-[2.5px]" />
          <span>Salvar Configurações</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Commercial Details & Supabase Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* ========================================================================= */}
          {/* PAINEL DE BANCO DE DADOS SUPABASE / POSTGRESQL */}
          {/* ========================================================================= */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-emerald-500/30 shadow-xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                    <span>Banco de Dados Supabase (PostgreSQL)</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isSupabaseActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {isSupabaseActive ? 'Supabase Conectado' : 'Nuvem Padrão Ativa'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Conecte seu próprio projeto Supabase para sincronização direta com seu repositório GitHub.
                  </p>
                </div>
              </div>

              {isSupabaseActive && (
                <button
                  type="button"
                  onClick={disconnectSupabase}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-rose-400 text-xs font-bold rounded-lg border border-zinc-700 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Desconectar Supabase</span>
                </button>
              )}
            </div>

            {/* Inputs de Conexão */}
            <div className="space-y-3 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Project URL (Supabase API)
                  </label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full text-xs font-mono bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Anon / Public Key
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs font-mono bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botões de Ação Supabase */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isConnectingSupabase}
                  onClick={handleConnectSupabase}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {isConnectingSupabase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testando Conexão...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSupabaseActive ? 'Atualizar Conexão Supabase' : 'Testar e Conectar Supabase'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedSql ? 'Script SQL Copiado!' : 'Copiar Script SQL do Supabase'}</span>
                </button>

                {isSupabaseActive && (
                  <button
                    type="button"
                    disabled={isSyncingSupabase}
                    onClick={handleSyncSupabase}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>Sincronizar Todos os Pedidos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSqlCode(!showSqlCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer ml-auto"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showSqlCode ? 'Ocultar SQL' : 'Visualizar SQL'}</span>
                </button>
              </div>

              {/* Bloco de Código SQL Expansível */}
              {showSqlCode && (
                <div className="mt-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-56">
                  <pre>{SUPABASE_SQL_SCRIPT}</pre>
                </div>
              )}

              {/* Guia Rápido Passo a Passo */}
              <div className="bg-zinc-850/80 rounded-xl p-3.5 border border-zinc-800 space-y-2 text-xs text-zinc-400">
                <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Como configurar seu Supabase com o sistema:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400 leading-relaxed">
                  <li>Crie um projeto grátis no painel oficial do <strong className="text-zinc-200">supabase.com</strong>.</li>
                  <li>Clique em <strong className="text-zinc-200">SQL Editor</strong>, clique no botão <em>"Copiar Script SQL"</em> acima, cole e clique em <strong className="text-emerald-400">RUN</strong>.</li>
                  <li>No menu <strong className="text-zinc-200">Project Settings &gt; API</strong>, copie a <strong className="text-zinc-200">Project URL</strong> e a <strong className="text-zinc-200">anon public key</strong>.</li>
                  <li>Cole nos campos acima e clique em <strong className="text-emerald-400">Testar e Conectar</strong>. Seus clientes e pedidos ficarão salvos e sincronizados automaticamente!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAINEL WHATSAPP BOT - MONITORAMENTO COMPLETO */}
          {/* ========================================================================= */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-green-500/30 shadow-xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                    <span>WhatsApp Bot</span>
                    {!hasBotUrl && !isLocalEnv ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-zinc-500/10 text-zinc-400 border-zinc-500/30">
                        ⚪ Sem URL
                      </span>
                    ) : botStatus.isReady ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-green-500/10 text-green-400 border-green-500/30">
                        🟢 Conectado
                      </span>
                    ) : botStatus.isConnecting ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                        🟡 Conectando
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-zinc-500/10 text-zinc-400 border-zinc-500/30">
                        ⚪ Off
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    {!hasBotUrl && !isLocalEnv
                      ? 'Configure a URL do túnel para monitorar remotamente.'
                      : botStatus.isReady
                      ? `Conectado como ${botStatus.name || botStatus.number || 'WhatsApp'}`
                      : botStatus.isConnecting
                      ? 'Estabelecendo conexão com WhatsApp...'
                      : 'Execute INICIAR_BOT.bat ou npm run bot para iniciar.'}
                  </p>
                </div>
              </div>

              {(isLocalEnv || hasBotUrl) && (
                <div className="flex items-center gap-2">
                  {!isLocalEnv && hasBotUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        saveCustomBotUrl('');
                        setBotStatus({
                          isReady: false, isConnecting: false, hasQr: false, qrCode: null,
                          number: null, name: null, lastConnectionTime: null, lastDisconnectionTime: null,
                          lastError: null, messagesProcessed: 0, errorCount: 0, reconnectAttempts: 0,
                          uptime: 0, logs: [],
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-amber-400 text-xs font-bold rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remover URL</span>
                    </button>
                  )}
                  {!botStatus.isReady && !botStatus.isConnecting && (
                    <button
                      type="button"
                      disabled={botLoading}
                      onClick={handleReconnectBot}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${botLoading ? 'animate-spin' : ''}`} />
                      <span>Reconectar</span>
                    </button>
                  )}
                  {botStatus.isReady && (
                    <button
                      type="button"
                      disabled={botLoading}
                      onClick={handleDisconnectBot}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-rose-400 text-xs font-bold rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 relative z-10">
              {!isLocalEnv && !hasBotUrl ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400">
                    <Cloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-300">Configure a URL do Bot</p>
                    <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed mb-4">
                      Para monitorar o bot remotamente, insira a URL do túnel (ex: Cloudflare Tunnel, ngrok).
                    </p>
                    <div className="flex items-center gap-2 max-w-md mx-auto">
                      <input
                        type="text"
                        value={customBotUrl}
                        onChange={(e) => setCustomBotUrl(e.target.value)}
                        placeholder="https://seu-tunel.trycloudflare.com"
                        className="flex-1 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-green-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveCustomBotUrl(customBotUrl)}
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Conectar
                      </button>
                    </div>
                  </div>
                </div>
              ) : botStatus.isReady ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-400">WhatsApp Conectado!</p>
                      <p className="text-xs text-zinc-400">
                        <span className="font-mono text-zinc-300">{botStatus.number}</span>
                        {botStatus.name && <span className="ml-2">({botStatus.name})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Mensagens</p>
                      <p className="text-lg font-black text-green-400">{botStatus.messagesProcessed}</p>
                    </div>
                    <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Erros</p>
                      <p className="text-lg font-black text-zinc-300">{botStatus.errorCount}</p>
                    </div>
                    <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Uptime</p>
                      <p className="text-lg font-black text-amber-400">{formatUptime(botStatus.uptime)}</p>
                    </div>
                    <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Reconexões</p>
                      <p className="text-lg font-black text-zinc-300">{botStatus.reconnectAttempts}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Últimas Conexões</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-400">
                      <span>🕐 Conectado: <span className="text-zinc-300">{formatDateTime(botStatus.lastConnectionTime)}</span></span>
                      <span>🕐 Última sync: <span className="text-zinc-300">{formatTimeAgo(lastSyncTime)}</span></span>
                    </div>
                  </div>
                </div>
              ) : botStatus.hasQr && botStatus.qrCode ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xs text-zinc-400 text-center">
                    Escaneie o QR Code abaixo com seu WhatsApp:
                    <br />
                    <span className="text-zinc-500">(WhatsApp {'>'} Dispositivos conectados {'>'} Conectar dispositivo)</span>
                  </p>
                  <div className="bg-white p-4 rounded-2xl shadow-xl">
                    <img src={botStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                  </div>
                  <p className="text-[10px] text-zinc-500 animate-pulse">Aguardando leitura do QR Code...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-300">
                        {botStatus.isConnecting ? 'Conectando ao WhatsApp...' : 'Bot desconectado'}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {botStatus.isConnecting
                          ? 'Aguarde enquanto o bot tenta se reconectar.'
                          : 'Execute INICIAR_BOT.bat ou npm run bot para iniciar o bot.'}
                      </p>
                    </div>
                  </div>
                  {botStatus.lastError && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs">
                      <p className="font-bold text-amber-400 mb-1">Status:</p>
                      <p className="text-zinc-400 font-mono text-[11px]">{botStatus.lastError}</p>
                    </div>
                  )}
                  {botStatus.logs.length > 0 && (
                    <div className="bg-zinc-850 rounded-xl p-3 border border-zinc-800 max-h-32 overflow-y-auto">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Logs de Conexão</p>
                      {botStatus.logs.map((log, i) => (
                        <p key={i} className="text-[10px] text-zinc-500 font-mono">{log}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAINEL DE STATUS DO SISTEMA */}
          {/* ========================================================================= */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Status do Sistema</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                syncActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {syncActive ? '🟢 SYNC ATIVA' : '🔴 SYNC INATIVA'}
              </span>
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-zinc-300">WhatsApp</span>
                </div>
                <span className={`font-bold font-mono text-[11px] ${
                  botStatus.isReady ? 'text-green-400' : botStatus.isConnecting ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {botStatus.isReady ? '🟢 CONECTADO' : botStatus.isConnecting ? '🟡 CONECTANDO' : '🔴 DESCONECTADO'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-zinc-300">Bot</span>
                </div>
                <span className={`font-bold font-mono text-[11px] ${
                  botStatus.isReady ? 'text-green-400' : botStatus.isConnecting ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {botStatus.isReady ? '🟢 ONLINE' : botStatus.isConnecting ? '🟡 STARTING' : '🔴 OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-300">Backend</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-green-400">🟢 ONLINE</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-300">Banco de Dados</span>
                </div>
                <span className={`font-bold font-mono text-[11px] ${isSupabaseActive ? 'text-green-400' : 'text-amber-400'}`}>
                  {isSupabaseActive ? '🟢 SUPABASE' : '🟡 LOCAL'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-300">Sincronização</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-green-400">
                  {syncActive ? '🟢 ATIVA' : '🔴 INATIVA'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-850 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-zinc-300">Última Sincronização</span>
                </div>
                <span className="font-bold font-mono text-[11px] text-zinc-300">
                  {lastSyncTime ? formatDateTime(lastSyncTime) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>1. Dados Cadastrais da Marmoraria</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nome da Empresa / Marca *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Ex: Marmoraria Imperial Arte em Pedras"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-300">CNPJ</label>
                  <span className="text-[10px] text-amber-400/90 font-semibold">
                    {isSearchingCnpj ? 'Buscando dados...' : 'Preenchimento automático'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleCnpjInputChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 pr-10 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => lookupCnpj(formData.cnpj)}
                    disabled={isSearchingCnpj}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Consultar CNPJ na Receita"
                  >
                    {isSearchingCnpj ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Chave PIX Oficial (Impresso no PDF)</label>
                <input
                  type="text"
                  value={formData.pixKey || ''}
                  onChange={(e) => handleInputChange('pixKey', e.target.value)}
                  placeholder="Ex: CNPJ, Telefone, E-mail ou Chave Aleatória"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">WhatsApp Comercial (Disparos Automáticos)</label>
                <input
                  type="text"
                  value={formData.whatsapp || ''}
                  onChange={(e) => handleInputChange('whatsapp', maskPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Telefone Fixo / Comercial</label>
                <input
                  type="text"
                  value={formData.tel}
                  onChange={(e) => handleInputChange('tel', maskPhone(e.target.value))}
                  placeholder="(11) 3456-7890"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">E-mail de Contato Comercial</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@marmoraria.com.br"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Instagram (@perfil)</label>
                <input
                  type="text"
                  value={formData.instagram || ''}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="@marmorariaimperial"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Slogan / Especialidade da Empresa</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => handleInputChange('slogan', e.target.value)}
                  placeholder="Ex: Mármores nobres, granitos selecionados e acabamento de alto padrão."
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Endereço Completo & Cidade</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Av. dos Mármores, 1500 - Galpão 4, São Paulo - SP"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Horário de Atendimento da Loja / Fábrica</label>
                <input
                  type="text"
                  value={formData.horario}
                  onChange={(e) => handleInputChange('horario', e.target.value)}
                  placeholder="Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 12:00"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Termos e Condições Padrão */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>2. Termos de Garantia e Condições Comerciais (Impressos no PDF)</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Termos Comerciais Padrão para Propostas & Orçamentos
              </label>
              <textarea
                rows={5}
                value={formData.termosPadrao || ''}
                onChange={(e) => handleInputChange('termosPadrao', e.target.value)}
                placeholder="Insira as cláusulas de garantia, tolerância de medidas e prazos de instalação..."
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Visual Theme & Backup */}
        <div className="space-y-6">
          {/* Logo Upload Card */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Logotipo da Empresa</span>
            </h2>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-700 rounded-2xl bg-zinc-850/50 hover:bg-zinc-850 transition-colors">
              {logoPreview ? (
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-28 max-w-full object-contain rounded-lg p-1 bg-zinc-900 border border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 transition-colors cursor-pointer"
                    title="Remover logotipo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-2 py-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-zinc-300">Nenhum logotipo selecionado</div>
                  <div className="text-[11px] text-zinc-500">Formatos: PNG, JPG ou WEBP (Máx. 2.5MB)</div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-amber-400 text-xs font-bold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{logoPreview ? 'Trocar Logotipo' : 'Selecionar Imagem'}</span>
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Cor Primária do Sistema</span>
            </h2>

            <div className="grid grid-cols-5 gap-2.5">
              {CORES_PRESET.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleColorSelect(c.hex)}
                  className={`w-9 h-9 rounded-xl transition-transform flex items-center justify-center shadow-sm cursor-pointer ${
                    formData.cor === c.hex ? 'scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {formData.cor === c.hex && <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-300">Cor Personalizada:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
                />
                <span className="font-mono text-xs font-bold text-amber-400">{formData.cor}</span>
              </div>
            </div>
          </div>

          {/* Live Preview Header Card */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-lg space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Prévia do Cabeçalho</span>
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-850 flex items-center gap-3">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-8 h-8 object-contain rounded bg-zinc-800 p-0.5 border border-zinc-700" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-950 text-xs font-black"
                  style={{ backgroundColor: formData.cor || '#f59e0b' }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div
                  className="font-extrabold text-xs truncate"
                  style={{ color: formData.cor || '#f59e0b' }}
                >
                  {formData.nome || 'Nome da Marmoraria'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {formData.slogan || 'Slogan ou descrição'}
                </div>
              </div>
            </div>
          </div>

          {/* System Backup & Maintenance */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-3">
            <h2 className="text-sm font-black text-amber-400 border-b border-zinc-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Backup & Manutenção</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {atendimentos.length} {atendimentos.length === 1 ? 'registro' : 'registros'}
              </span>
            </h2>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full inline-flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Restaurar Backup (JSON)</span>
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Recarregar os dados de demonstração originais?')) {
                    resetToDemoData();
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 p-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar Dados de Exemplo</span>
              </button>

              {/* Opção para Zerar Base de Dados */}
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCheckbox(false);
                    setShowResetModal(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 p-2.5 bg-rose-950/40 hover:bg-rose-950/70 active:bg-rose-900 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl border border-rose-800/50 transition-all cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Zerar Toda a Base de Dados</span>
                </button>
                <p className="text-[10px] text-zinc-500 text-center mt-1.5">
                  Limpa clientes e orçamentos para iniciar do zero.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Zerar Base de Dados */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-rose-800/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-400">Zerar Base de Dados</h3>
                  <p className="text-xs text-zinc-400">
                    Atenção: Esta ação apagará os registros selecionados do sistema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Stats */}
            <div className="bg-zinc-850 border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Registros atualmente na base:</span>
              <span className="font-mono font-bold text-amber-400">
                {atendimentos.length} {atendimentos.length === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-300">Escolha o nível de limpeza:</label>

              <label
                onClick={() => setResetScope('atendimentos')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resetScope === 'atendimentos'
                    ? 'bg-amber-400/5 border-amber-400/50 text-zinc-100'
                    : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetScope"
                  checked={resetScope === 'atendimentos'}
                  onChange={() => setResetScope('atendimentos')}
                  className="mt-0.5 accent-amber-400"
                />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-zinc-200">
                    Zerar Apenas Atendimentos & Orçamentos <span className="text-[10px] text-amber-400 font-semibold">(Recomendado)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    Apaga todos os clientes, orçamentos e pedidos do Kanban. <strong>Mantém os dados cadastrais da marmoraria, logo e cores configuradas</strong>.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setResetScope('completo')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resetScope === 'completo'
                    ? 'bg-rose-500/10 border-rose-500/50 text-zinc-100'
                    : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetScope"
                  checked={resetScope === 'completo'}
                  onChange={() => setResetScope('completo')}
                  className="mt-0.5 accent-rose-500"
                />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-rose-300">
                    Reset Geral de Fábrica (Zerar Tudo)
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    Apaga todos os atendimentos e restaura todas as configurações da marmoraria e logotipo para o padrão inicial.
                  </div>
                </div>
              </label>
            </div>

            {/* Quick backup button before wipe */}
            <div className="bg-zinc-850/70 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-zinc-400 text-[11px]">Deseja fazer uma cópia antes?</span>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-amber-400 text-[11px] font-bold rounded-lg border border-zinc-700 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Backup de Segurança (JSON)</span>
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500 cursor-pointer accent-rose-500"
              />
              <span className="text-xs text-zinc-300 font-semibold">
                Estou ciente e confirmo que desejo zerar os dados permanentemente.
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!confirmCheckbox}
                onClick={handleExecuteReset}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Zerar Base de Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
