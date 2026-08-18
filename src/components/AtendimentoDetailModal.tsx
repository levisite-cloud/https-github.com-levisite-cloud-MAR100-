import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Printer,
  MessageSquare,
  Save,
  Trash2,
  Plus,
  Trash,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Download,
  Laptop,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  formatMoeda,
  getNextStep,
  parseMoedaToNumber,
  STATUS_CONFIG,
  STATUS_LIST,
  PRIORIDADE_CONFIG,
} from '../utils/formatters';
import { ItemOrcamento, PrioridadeAtendimento, StatusAtendimento } from '../types';
import { printOrcamentoPDF } from '../utils/pdfGenerator';
import { generateGoogleCalendarUrl, downloadIcsCalendarFile } from '../utils/calendarHelpers';

export const AtendimentoDetailModal: React.FC = () => {
  const {
    selectedAtendimentoId,
    setSelectedAtendimentoId,
    atendimentos,
    updateAtendimento,
    deleteAtendimento,
    empresa,
    addToast,
  } = useApp();

  const atendimento = atendimentos.find((a) => a.id === selectedAtendimentoId);

  // Estado do Formulário dentro do Modal
  const [status, setStatus] = useState<StatusAtendimento>('Novo Atendimento');
  const [prioridade, setPrioridade] = useState<PrioridadeAtendimento>('Normal');
  const [responsavel, setResponsavel] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [horaPrevista, setHoraPrevista] = useState('09:00');
  const [validadeOrcamento, setValidadeOrcamento] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [obs, setObs] = useState('');
  const [acabamento, setAcabamento] = useState('');
  const [desconto, setDesconto] = useState<number>(0);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  useEffect(() => {
    if (atendimento) {
      setStatus(atendimento.status);
      setPrioridade(atendimento.prioridade || 'Normal');
      setResponsavel(atendimento.responsavel || '');
      setDataPrevista(atendimento.dataPrevista || '');
      setHoraPrevista(atendimento.horaPrevista || '09:00');
      setValidadeOrcamento(
        atendimento.validadeOrcamento ||
          new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      );
      setCondicoesPagamento(atendimento.condicoesPagamento || '50% entrada + saldo na entrega/instalação');
      setObs(atendimento.obs || '');
      setAcabamento(atendimento.acabamento || '');
      setDesconto(atendimento.desconto || 0);
      setItens(atendimento.itensOrcamento ? [...atendimento.itensOrcamento] : []);
    }
  }, [atendimento]);

  if (!selectedAtendimentoId || !atendimento) return null;

  // Calcular totais
  const subtotalItens = itens.reduce((acc, it) => acc + (it.quantidade || 0) * (it.valorUnit || 0), 0);
  const totalFinal = Math.max(0, subtotalItens - (desconto || 0));

  const handleAddItem = () => {
    const newItem: ItemOrcamento = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 4),
      descricao: '',
      quantidade: 1,
      unidade: 'un',
      valorUnit: 0,
    };
    setItens((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof ItemOrcamento, val: any) => {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: val };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
  };

  const getCurrentAtendimentoSnapshot = () => ({
    ...atendimento,
    status,
    prioridade,
    responsavel,
    dataPrevista,
    horaPrevista,
    validadeOrcamento,
    condicoesPagamento,
    obs,
    acabamento,
    desconto,
    itensOrcamento: itens,
    orcamento: formatMoeda(totalFinal),
  });

  const handleSave = () => {
    const orcamentoFormatado = formatMoeda(totalFinal);
    updateAtendimento(atendimento.id, {
      status,
      prioridade,
      responsavel,
      dataPrevista,
      horaPrevista,
      validadeOrcamento,
      condicoesPagamento,
      obs,
      acabamento,
      desconto,
      itensOrcamento: itens,
      orcamento: orcamentoFormatado,
    });
    setSelectedAtendimentoId(null);
  };

  const handleOpenGoogleCalendar = () => {
    const current = getCurrentAtendimentoSnapshot();
    const isInstalacao = status === 'Instalação Agendada';
    const calUrl = generateGoogleCalendarUrl(current, empresa, isInstalacao ? 'instalacao' : 'visita');
    window.open(calUrl, '_blank');
    addToast(
      'Google Agenda Aberto',
      `Agendamento para ${atendimento.nome} aberto no seu Google Agenda.`,
      'success'
    );
  };

  const handleDownloadIcs = () => {
    const current = getCurrentAtendimentoSnapshot();
    const isInstalacao = status === 'Instalação Agendada';
    downloadIcsCalendarFile(current, empresa, isInstalacao ? 'instalacao' : 'visita');
    addToast(
      'Arquivo .ICS Baixado',
      'Abra o arquivo para salvar na agenda do seu computador (Outlook / Windows / Mac).',
      'success'
    );
  };

  const handleAdvanceStep = () => {
    const next = getNextStep(status);
    if (next) {
      setStatus(next);
      if (next === 'Visita Agendada' || next === 'Instalação Agendada') {
        addToast(
          `Avançado para ${next}`,
          'Você pode sincronizar a agenda no Google, no seu PC e enviar o WhatsApp ao cliente.',
          'info'
        );
      } else {
        addToast(`Avançado para ${next}`, 'Lembre-se de salvar as alterações.', 'info');
      }
    }
  };

  const handlePrintPDF = () => {
    const currentAtendimento = getCurrentAtendimentoSnapshot();
    const success = printOrcamentoPDF(currentAtendimento, empresa);
    if (!success) {
      addToast('Aviso', 'Permita pop-ups no navegador para visualizar a impressão do PDF.', 'warning');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o atendimento de ${atendimento.nome}?`)) {
      deleteAtendimento(atendimento.id);
    }
  };

  const nextStep = getNextStep(status);
  const statusCfg = STATUS_CONFIG[status];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    atendimento.endereco
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-[96vw] md:max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950">
              #{String(atendimento.id).padStart(4, '0')}
            </span>
            <div>
              <h2 className="text-base font-black text-amber-400 leading-tight flex items-center gap-2">
                {atendimento.nome}
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>Criado em {formatDateTime(atendimento.criadoEm)}</span>
                <span>•</span>
                <span className="font-semibold text-zinc-200">{atendimento.servico}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedAtendimentoId(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          {/* Banner de Progressão de Status */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-850 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Etapa do Atendimento
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${statusCfg.badgeBg}`}>
                  <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                  {status}
                </span>
                <span className="text-xs text-zinc-400 hidden md:inline">{statusCfg.description}</span>
              </div>
            </div>

            {nextStep && (
              <button
                onClick={handleAdvanceStep}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-black shadow-md shadow-amber-400/20 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <span>Avançar para: <strong>{nextStep}</strong></span>
                <ArrowRight className="w-4 h-4 text-zinc-950 stroke-[2.5px]" />
              </button>
            )}
          </div>

          {/* Quick Client Details & Project Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer block */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-850/80 space-y-2.5 text-xs">
              <div className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5" />
                <span>Dados do Cliente & Contato</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-zinc-200">{atendimento.telefone}</span>
                
              </div>
              {atendimento.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-300">{atendimento.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2 pt-1 border-t border-zinc-800">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-zinc-300 leading-snug">{atendimento.endereco}</p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold mt-1"
                  >
                    <span>Ver no Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Project Specs */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-850/80 space-y-2.5 text-xs">
              <div className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Especificação da Obra</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Tipo de Serviço:</span>
                <span className="font-bold text-zinc-100">{atendimento.servico}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Material Escolhido:</span>
                <span className="font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {atendimento.material}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Acabamento de Borda:</span>
                <input
                  type="text"
                  value={acabamento}
                  onChange={(e) => setAcabamento(e.target.value)}
                  placeholder="Ex: Meia-esquadria 4cm"
                  className="text-right text-xs font-medium text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 w-48 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Management Fields (Status, Priority, Responsible, Due Date, Time) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Status Atual
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusAtendimento)}
                className="w-full text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeAtendimento)}
                className="w-full text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-xl p-2.5 focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="Baixa">🟢 Baixa</option>
                <option value="Normal">🔵 Normal</option>
                <option value="Alta">🟡 Alta</option>
                <option value="Urgente">🔴 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Responsável / Equipe
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Ex: Carlos Técnico"
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Data da Visita / Prazo
              </label>
              <input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Horário da Visita
              </label>
              <input
                type="time"
                value={horaPrevista}
                onChange={(e) => setHoraPrevista(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 focus:border-amber-400 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* ═════════ AGENDAMENTO DE VISITA & CALENDÁRIO (GOOGLE + PC) ═════════ */}
          <div className="p-4 rounded-xl border border-amber-400/30 bg-gradient-to-r from-zinc-850 to-zinc-900 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    Sincronização de Visita & Calendário
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {dataPrevista ? (
                      <>
                        Agendado para: <strong className="text-zinc-200">{formatDate(dataPrevista)}</strong> às{' '}
                        <strong className="text-zinc-200">{horaPrevista || '09:00'}</strong> ({atendimento.endereco})
                      </>
                    ) : (
                      'Defina a data e horário acima para sincronizar com os calendários.'
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Multi-Canal Ativo
              </span>
            </div>

            {/* Action Buttons for Calendar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/40 text-blue-300 hover:text-blue-200 border border-blue-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm group"
                title="Abre o Google Calendar no navegador com o agendamento pronto para salvar"
              >
                <ExternalLink className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>1. Google Agenda</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm group"
                title="Baixa arquivo .ICS para salvar no Outlook, Windows Calendar ou Apple Calendar"
              >
                <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>2. Salvar no Computador (.ics)</span>
              </button>
            </div>
          </div>

          {/* ═════════ ITEM-BY-ITEM BUDGET CALCULATOR ═════════ */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-850 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                  <span>📋 Itens do Orçamento & Cálculo de Preço</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Adicione bancadas, recortes, cubas, acabamentos e serviços para cálculo automático.
                </p>
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

            {/* Table */}
            <div className="overflow-x-auto border border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3">Descrição da Peça / Serviço</th>
                    <th className="py-2 px-3 w-20">Qtd</th>
                    <th className="py-2 px-3 w-20">Unidade</th>
                    <th className="py-2 px-3 w-28 text-right">Vlr. Unit (R$)</th>
                    <th className="py-2 px-3 w-28 text-right">Subtotal</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-zinc-500 text-xs">
                        Nenhum item adicionado ao orçamento ainda. Clique em "+ Adicionar Item".
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
                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-400 rounded-lg px-2 py-1 font-medium text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-center font-bold text-zinc-100 focus:border-amber-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.unidade || 'un'}
                            onChange={(e) => handleUpdateItem(item.id, 'unidade', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-1.5 py-1 text-xs text-zinc-200 focus:border-amber-400 focus:outline-none cursor-pointer"
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
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-right font-medium text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-400">
                          R$ {formatMoeda((item.quantidade || 0) * (item.valorUnit || 0))}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Discount row */}
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
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-right font-bold text-emerald-400 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl">
                <div className="text-xs text-zinc-400">
                  Subtotal: <span className="font-semibold text-zinc-200">R$ {formatMoeda(subtotalItens)}</span>
                </div>
                <div className="text-sm font-bold text-zinc-300">
                  Total Geral: <span className="text-base text-amber-400 font-black">R$ {formatMoeda(totalFinal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Conditions and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Condições de Pagamento & Validade
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={condicoesPagamento}
                  onChange={(e) => setCondicoesPagamento(e.target.value)}
                  placeholder="Ex: 50% entrada + 3x no cartão"
                  className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 shrink-0">Validade do Orçamento:</span>
                  <input
                    type="date"
                    value={validadeOrcamento}
                    onChange={(e) => setValidadeOrcamento(e.target.value)}
                    className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 focus:border-amber-400 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Observações Técnicas & Detalhes da Obra
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Detalhes de acesso, gabaritos, especificações de cuba..."
                rows={3}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-zinc-850 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            

            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-zinc-400" />
              <span>📄 Gerar PDF / Imprimir</span>
            </button>

            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-950 rounded-xl text-xs font-black shadow-md shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5px]" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
