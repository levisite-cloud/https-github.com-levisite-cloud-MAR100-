import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  MapPin,
  Phone,
  User,
  Calendar,
  Layers,
  Save,
  RotateCcw,
  Plus,
  Trash,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  fetchCepAddress,
  formatMoeda,
  maskCep,
  maskCpfCnpj,
  maskPhone,
  STATUS_LIST,
} from '../utils/formatters';
import { ItemOrcamento, PrioridadeAtendimento, StatusAtendimento, TipoMaterial, TipoServico } from '../types';

const SERVICOS_LIST: TipoServico[] = [
  'Bancada de Cozinha',
  'Bancada de Banheiro',
  'Ilha Gourmet',
  'Lavatório Esculpido',
  'Piso de Mármore',
  'Piso de Granito',
  'Soleira',
  'Peitoril',
  'Escada',
  'Revestimento de Parede',
  'Tampo de Mesa',
  'Churrasqueira',
  'Outros',
];

const MATERIAIS_LIST: TipoMaterial[] = [
  'Granito São Gabriel',
  'Granito Preto Absoluto',
  'Granito Branco Siena',
  'Granito Ocre Itabira',
  'Mármore Travertino Nacional',
  'Mármore Travertino Romano',
  'Mármore Branco Paraná',
  'Mármore Nero Marquina',
  'Mármore Carrara',
  'Quartzo Branco Stellar',
  'Quartzo Calacatta',
  'Quartzo Preto Stellar',
  'Super Nano Glass',
  'Dekton / Ultracompacto',
  'Prime / Marmoglass',
  'Outro Material',
];

const PRESETS = [
  {
    label: '🍳 Bancada Cozinha (2.40x0.60m)',
    servico: 'Bancada de Cozinha' as TipoServico,
    material: 'Granito São Gabriel' as TipoMaterial,
    itens: [
      { id: '1', descricao: 'Bancada Cozinha 2.40m x 0.60m c/ rodopia', quantidade: 1, unidade: 'un' as const, valorUnit: 2400 },
      { id: '2', descricao: 'Recorte e colagem de cuba inox de embutir', quantidade: 1, unidade: 'un' as const, valorUnit: 350 },
      { id: '3', descricao: 'Frontão h=10cm (4.00 metros lineares)', quantidade: 4, unidade: 'm' as const, valorUnit: 110 },
    ],
  },
  {
    label: '🛁 Lavatório Cuba Esculpida',
    servico: 'Lavatório Esculpido' as TipoServico,
    material: 'Mármore Travertino Nacional' as TipoMaterial,
    itens: [
      { id: '1', descricao: 'Lavatório 1.20m x 0.50m c/ Cuba Esculpida em Rampa', quantidade: 1, unidade: 'un' as const, valorUnit: 3800 },
      { id: '2', descricao: 'Frontão alto h=20cm e saia 15cm', quantidade: 2.4, unidade: 'm' as const, valorUnit: 220 },
    ],
  },
  {
    label: '✨ Ilha Gourmet Quartzo',
    servico: 'Ilha Gourmet' as TipoServico,
    material: 'Quartzo Calacatta' as TipoMaterial,
    itens: [
      { id: '1', descricao: 'Bancada Ilha Gourmet 2.60m x 1.00m cascata lateral 45°', quantidade: 1, unidade: 'un' as const, valorUnit: 9200 },
      { id: '2', descricao: 'Recorte de Cooktop e Tomadas de embutir', quantidade: 2, unidade: 'un' as const, valorUnit: 350 },
    ],
  },
  {
    label: '🚪 Kit 8 Soleiras & Peitoris',
    servico: 'Soleira' as TipoServico,
    material: 'Granito Branco Siena' as TipoMaterial,
    itens: [
      { id: '1', descricao: 'Soleiras padrão 0.80m x 0.15m polidas 4 lados', quantidade: 6, unidade: 'pç' as const, valorUnit: 95 },
      { id: '2', descricao: 'Peitoril de janela 1.20m x 0.20m com pingadeira', quantidade: 2, unidade: 'pç' as const, valorUnit: 160 },
    ],
  },
];

export const NovoAtendimentoView: React.FC = () => {
  const { addAtendimento, setActiveView, setSelectedAtendimentoId, empresa, addToast } = useApp();

  // Form State
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Project Specs
  const [servico, setServico] = useState<string>('Bancada de Cozinha');
  const [material, setMaterial] = useState<string>('Granito São Gabriel');
  const [acabamento, setAcabamento] = useState('Meia-esquadria 45°');
  const [statusInicial, setStatusInicial] = useState<StatusAtendimento>('Novo Atendimento');
  const [prioridade, setPrioridade] = useState<PrioridadeAtendimento>('Normal');
  const [dataPrevista, setDataPrevista] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [horaPrevista, setHoraPrevista] = useState('09:00');
  const [responsavel, setResponsavel] = useState('Atendimento Comercial');
  const [obs, setObs] = useState('');

  // Budget Items
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [desconto, setDesconto] = useState<number>(0);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  const handleCpfCnpjChange = async (val: string) => {
    const masked = maskCpfCnpj(val);
    setCpfCnpj(masked);

    const clean = masked.replace(/\D/g, '');
    if (clean.length === 14) {
      setIsSearchingCnpj(true);
      try {
        if (clean === '34567890000123') {
          if (!nome) setNome('Marmoraria Imperial Arte em Pedras');
          if (!telefone) setTelefone('(11) 98765-4321');
          if (!email) setEmail('contato@marmorariaimperial.com.br');
          if (!logradouro) setLogradouro('Av. das Nações Unidas');
          if (!numero) setNumero('12901');
          if (!bairro) setBairro('Brooklin Paulista');
          if (!cidade) setCidade('São Paulo');
          if (!estado) setEstado('SP');
          if (!cep) setCep('04578-000');
          setCepStatus('success');
          addToast('CNPJ Reconhecido', 'Dados cadastrais da empresa preenchidos.', 'success');
          return;
        }

        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nome_fantasia || data.razao_social) {
            setNome(data.nome_fantasia || data.razao_social);
          }
          if (data.ddd_telefone_1 && !telefone) {
            setTelefone(maskPhone(data.ddd_telefone_1));
          }
          if (data.email && !email) {
            setEmail(data.email.toLowerCase());
          }
          if (data.logradouro) setLogradouro(data.logradouro);
          if (data.numero) setNumero(data.numero);
          if (data.bairro) setBairro(data.bairro);
          if (data.municipio) setCidade(data.municipio);
          if (data.uf) setEstado(data.uf);
          if (data.cep) {
            setCep(maskCep(data.cep));
            setCepStatus('success');
          }
          addToast('CNPJ Localizado', 'Dados do cliente corporativo preenchidos.', 'success');
        }
      } catch (err) {
        console.warn('Erro ao buscar CNPJ do cliente:', err);
      } finally {
        setIsSearchingCnpj(false);
      }
    }
  };

  // Address CEP auto-fill
  const handleCepChange = async (val: string) => {
    const masked = maskCep(val);
    setCep(masked);

    const raw = masked.replace(/\D/g, '');
    if (raw.length === 8) {
      setCepStatus('loading');
      const addr = await fetchCepAddress(raw);
      if (addr) {
        setLogradouro(addr.logradouro);
        setBairro(addr.bairro);
        setCidade(addr.cidade);
        setEstado(addr.estado);
        setCepStatus('success');
      } else {
        setCepStatus('error');
      }
    } else {
      setCepStatus('idle');
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setServico(preset.servico);
    setMaterial(preset.material);
    setItens(
      preset.itens.map((it) => ({
        ...it,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 4),
      }))
    );
  };

  const handleAddItem = () => {
    setItens((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 4),
        descricao: '',
        quantidade: 1,
        unidade: 'un',
        valorUnit: 0,
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof ItemOrcamento, val: any) => {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  };

  const handleRemoveItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
  };

  const subtotal = itens.reduce((acc, it) => acc + (it.quantidade || 0) * (it.valorUnit || 0), 0);
  const total = Math.max(0, subtotal - desconto);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (!telefone.trim()) {
      alert('Por favor, informe o telefone do cliente.');
      return;
    }

    // Compose formatted address
    const partes: string[] = [];
    if (logradouro) partes.push(numero ? `${logradouro}, ${numero}` : logradouro);
    if (complemento) partes.push(complemento);
    if (bairro) partes.push(bairro);
    if (cidade) partes.push(estado ? `${cidade}/${estado}` : cidade);
    if (cep) partes.push(`CEP ${cep}`);
    const enderecoFormatado = partes.length > 0 ? partes.join(' — ') : 'Endereço não informado';

    const newId = addAtendimento({
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || undefined,
      cpfCnpj: cpfCnpj.trim() || undefined,
      cep: cep.trim(),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      endereco: enderecoFormatado,
      servico,
      material,
      acabamento: acabamento.trim(),
      status: statusInicial,
      prioridade,
      dataPrevista,
      horaPrevista,
      responsavel: responsavel.trim(),
      orcamento: total > 0 ? formatMoeda(total) : '',
      desconto,
      validadeOrcamento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      condicoesPagamento: '50% de entrada + saldo na entrega/instalação',
      itensOrcamento: itens,
      obs: obs.trim() || undefined,
    });

    // Open the created item in details or redirect to kanban
    setSelectedAtendimentoId(newId);
    setActiveView('kanban');
  };

  const handleReset = () => {
    setNome('');
    setTelefone('');
    setEmail('');
    setCpfCnpj('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setItens([]);
    setObs('');
    setDesconto(0);
    setCepStatus('idle');
  };

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Novo Registro Comercial</span>
          </div>
          <h1 className="text-xl font-black text-amber-400">Cadastrar Novo Atendimento</h1>
          <p className="text-xs text-zinc-400">
            Preencha os dados do cliente, endereço da obra, especificações da pedra e monte o orçamento.
          </p>
        </div>

        <button
          onClick={() => setActiveView('kanban')}
          className="text-xs font-bold text-zinc-300 hover:text-amber-400 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
        >
          ← Voltar ao Kanban
        </button>
      </div>

      {/* Quick Presets */}
      <div className="bg-zinc-850 rounded-2xl p-4 border border-zinc-800 shadow-sm">
        <div className="text-xs font-bold text-zinc-300 mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Modelos Rápidos de Orçamento (Clique para preencher):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-xs font-bold px-3 py-1.5 bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-200 rounded-xl border border-zinc-700 shadow-sm transition-all cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Dados do Cliente */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
          <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <User className="w-4 h-4 text-amber-400" />
            <span>1. Dados do Cliente</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Nome Completo do Cliente *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Dra. Mariana Costa"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(11) 99999-0000"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                E-mail (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">
                  CPF ou CNPJ (Opcional)
                </label>
                {isSearchingCnpj && (
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                  </span>
                )}
              </div>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => handleCpfCnpjChange(e.target.value)}
                placeholder="000.000.000-00 ou CNPJ"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Endereço da Obra com Busca de CEP */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>2. Endereço do Local da Obra</span>
            </h2>
            <span className="text-[11px] text-zinc-400">Busca automática via ViaCEP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CEP with interactive status */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  maxLength={9}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className={`w-full text-xs bg-zinc-800 border rounded-xl p-2.5 pr-10 text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors ${
                    cepStatus === 'success'
                      ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                      : cepStatus === 'error'
                      ? 'border-rose-500 bg-rose-950/20'
                      : 'border-zinc-700 focus:border-amber-400'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {cepStatus === 'loading' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                  {cepStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {cepStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                </div>
              </div>
              {cepStatus === 'success' && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">Endereço localizado! ✅</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1">Logradouro (Rua / Avenida) *</label>
              <input
                type="text"
                required
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Ex: Rua Bela Cintra"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Número *</label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 1450"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Complemento</label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Apto 52, Bloco B"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-300 mb-1">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="w-16">
                <label className="block text-xs font-bold text-zinc-300 mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="UF"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-center uppercase focus:border-amber-400 focus:outline-none font-bold text-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Especificação do Serviço e Pedras */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
          <h2 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>3. Especificações Técnicas & Pedras</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tipo de Serviço *</label>
              <select
                value={servico}
                onChange={(e) => setServico(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
              >
                {SERVICOS_LIST.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Material / Pedra Nobre *</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-bold text-amber-300 cursor-pointer"
              >
                {MATERIAIS_LIST.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Acabamento de Borda</label>
              <input
                type="text"
                value={acabamento}
                onChange={(e) => setAcabamento(e.target.value)}
                placeholder="Ex: Meia-esquadria 45°, 4cm"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Status Inicial</label>
              <select
                value={statusInicial}
                onChange={(e) => setStatusInicial(e.target.value as StatusAtendimento)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeAtendimento)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="Baixa">🟢 Baixa</option>
                <option value="Normal">🔵 Normal</option>
                <option value="Alta">🟡 Alta</option>
                <option value="Urgente">🔴 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Data Prevista / Visita *</label>
              <input
                type="date"
                required
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Horário Previsto</label>
              <input
                type="time"
                value={horaPrevista}
                onChange={(e) => setHoraPrevista(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none font-semibold cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Responsável Inicial</label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Ex: Felipe Vendas"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Discriminação dos Itens do Orçamento */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>4. Itens & Cálculo do Orçamento</span>
              </h2>
              <p className="text-xs text-zinc-400">Discrimine as peças para gerar a proposta comercial e o PDF.</p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              <span>+ Adicionar Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-850 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Descrição da Peça / Serviço</th>
                  <th className="py-2.5 px-3 w-20">Qtd</th>
                  <th className="py-2.5 px-3 w-20">Unidade</th>
                  <th className="py-2.5 px-3 w-28 text-right">Vlr. Unit (R$)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      Nenhum item adicionado. Clique em "+ Adicionar Item" ou use um dos Modelos Rápidos no topo.
                    </td>
                  </tr>
                ) : (
                  itens.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-zinc-800/50">
                      <td className="py-2 px-3 text-zinc-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => handleUpdateItem(item.id, 'descricao', e.target.value)}
                          placeholder="Ex: Bancada de Cozinha 2.40m x 0.60m"
                          className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 font-medium text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-center font-bold text-zinc-100 focus:border-amber-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.unidade || 'un'}
                          onChange={(e) => handleUpdateItem(item.id, 'unidade', e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-1.5 py-1.5 text-xs text-zinc-200 focus:border-amber-400 focus:outline-none cursor-pointer"
                        >
                          <option value="un">un</option>
                          <option value="m²">m²</option>
                          <option value="m">m (linear)</option>
                          <option value="pç">peça</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valorUnit || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'valorUnit', parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-right font-medium text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-black text-amber-400">
                        R$ {formatMoeda((item.quantidade || 0) * (item.valorUnit || 0))}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Total display */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-300 font-medium">Desconto Especial (R$):</span>
              <input
                type="number"
                min="0"
                step="10"
                value={desconto || ''}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-right font-bold text-emerald-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4 bg-zinc-850 border border-zinc-800 px-5 py-2.5 rounded-xl">
              <div className="text-xs text-zinc-400">
                Subtotal: <span className="font-semibold text-zinc-200">R$ {formatMoeda(subtotal)}</span>
              </div>
              <div className="text-sm font-bold text-zinc-300">
                Total do Orçamento: <span className="text-lg text-amber-400 font-black">R$ {formatMoeda(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Observações e Botões Finais */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-lg space-y-4">
          <label className="block text-xs font-bold text-zinc-300 mb-1">
            Observações Gerais & Detalhes da Obra
          </label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Informações adicionais sobre o serviço, acesso ao local da obra, prazos combinados..."
            rows={3}
            className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Limpar Formulário</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-950 text-xs font-black rounded-xl shadow-md shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5px]" />
              <span>💾 Salvar Atendimento</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
