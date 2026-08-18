import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '../utils/formatters';
import { DEFAULT_EMPRESA_CONFIG } from '../data/initialData';

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

export const ConfiguracoesView: React.FC = () => {
  const { atendimentos, empresa, updateEmpresa, resetToDemoData, clearAllData, exportData, importData, addToast } = useApp();

  const [formData, setFormData] = useState({ ...empresa });
  const [logoPreview, setLogoPreview] = useState(empresa.logo || '');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<'atendimentos' | 'completo'>('atendimentos');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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
      // Caso específico/demonstração para 34.567.890/0001-23 solicitado
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
        addToast(
          'CNPJ Encontrado!',
          'Informações da Marmoraria Imperial preenchidas com sucesso.',
          'success'
        );
        return;
      }

      // Consulta pública via BrasilAPI para CNPJs reais
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

        const enderecoCompleto = [logradouro, numero, complemento, bairro, cidadeUf, cep]
          .filter(Boolean)
          .join(' ')
          .trim();

        const sloganAtividade = data.cnae_fiscal_descricao
          ? `Especialistas em ${data.cnae_fiscal_descricao}`
          : formData.slogan;

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

        addToast(
          'CNPJ Localizado!',
          `Dados da empresa "${nomeEmpresa}" carregados automaticamente.`,
          'success'
        );
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

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Configurações & Personalização</span>
          </div>
          <h1 className="text-xl font-black text-amber-400">Perfil da Empresa & Sistema</h1>
          <p className="text-xs text-zinc-400">
            Personalize a identidade visual, dados comerciais que constam nos orçamentos em PDF e faça backup do sistema.
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Commercial Details & Terms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Empresa */}
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
                <p className="text-[10px] text-zinc-400 mt-1">
                  Ex: digite <strong className="text-amber-400 cursor-pointer" onClick={() => handleCnpjInputChange('34.567.890/0001-23')}>34.567.890/0001-23</strong> para preenchimento instantâneo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.tel}
                  onChange={(e) => handleInputChange('tel', maskPhone(e.target.value))}
                  placeholder="(11) 99999-0000"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">E-mail Comercial</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@marmoraria.com.br"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Chave PIX para Recebimentos</label>
                <input
                  type="text"
                  value={formData.pixKey || ''}
                  onChange={(e) => handleInputChange('pixKey', e.target.value)}
                  placeholder="CNPJ, E-mail ou Telefone"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Slogan / Frase de Apresentação</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => handleInputChange('slogan', e.target.value)}
                  placeholder="Ex: Excelência e Precisão em Mármores, Granitos e Quartzos"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Endereço Comercial da Fábrica / Showroom</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Rua, número, bairro — Cidade/UF"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Termos do Orçamento em PDF */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>2. Termos Comerciais & Garantia no PDF</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Condições Gerais Impressas no Orçamento
              </label>
              <textarea
                rows={4}
                value={formData.termosPadrao}
                onChange={(e) => handleInputChange('termosPadrao', e.target.value)}
                placeholder="Termos de garantia, prazo de execução, formas de pagamento..."
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Logo, Theme Color, Live Preview & Data Backup */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Logotipo da Empresa</span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-amber-400 rounded-2xl p-4 bg-zinc-850 hover:bg-zinc-800 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] text-center"
            >
              {logoPreview ? (
                <div className="space-y-2">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="max-h-20 max-w-full object-contain mx-auto rounded-lg shadow-sm"
                  />
                  <p className="text-[11px] text-amber-400 font-bold">Clique para trocar a imagem</p>
                </div>
              ) : (
                <div className="space-y-1 text-zinc-400">
                  <Upload className="w-6 h-6 mx-auto text-zinc-500" />
                  <p className="text-xs font-bold text-zinc-200">Clique para enviar logotipo</p>
                  <p className="text-[10px] text-zinc-500">PNG, JPG ou SVG (máx 2.5 MB)</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
            />

            {logoPreview && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="w-full text-xs font-bold text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl border border-zinc-800 transition-colors cursor-pointer"
              >
                🗑️ Remover Logotipo
              </button>
            )}
          </div>

          {/* Theme Color Palette */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Cor Destaque do Sistema</span>
            </h2>

            <div className="grid grid-cols-5 gap-2">
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
      </form>

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
