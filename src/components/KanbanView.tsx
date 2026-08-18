import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  STATUS_LIST,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  formatDate,
  formatMoeda,
  getNextStep,
  parseMoedaToNumber,
} from '../utils/formatters';
import { Atendimento, StatusAtendimento } from '../types';
import {
  Calendar,
  MessageSquare,
  Printer,
  ChevronRight,
  Search,
  Plus,
} from 'lucide-react';
import { printOrcamentoPDF } from '../utils/pdfGenerator';

export const KanbanView: React.FC = () => {
  const {
    atendimentos,
    updateAtendimentoStatus,
    setSelectedAtendimentoId,
    setWhatsAppModalData,
    setActiveView,
    empresa,
    addToast,
  } = useApp();

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<StatusAtendimento | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Filtrar atendimentos
  const filteredAtendimentos = atendimentos.filter((a) => {
    const q = localSearch.toLowerCase();
    const matchesSearch =
      !q ||
      a.nome.toLowerCase().includes(q) ||
      a.telefone.toLowerCase().includes(q) ||
      a.servico.toLowerCase().includes(q) ||
      a.material.toLowerCase().includes(q) ||
      (a.responsavel && a.responsavel.toLowerCase().includes(q));

    const matchesPriority = !priorityFilter || a.prioridade === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Manipuladores de Arrastar
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: StatusAtendimento) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: StatusAtendimento) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedId) return;

    const item = atendimentos.find((a) => a.id === draggedId);
    if (item && item.status !== targetStatus) {
      updateAtendimentoStatus(draggedId, targetStatus);
    }
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleAdvanceCard = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    const next = getNextStep(atendimento.status);
    if (next) {
      updateAtendimentoStatus(atendimento.id, next);
      addToast(`AvanÃ§ado para ${next}`, `${atendimento.nome}`, 'info');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    let type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral' = 'geral';
    if (atendimento.status === 'Visita Agendada') type = 'visita';
    else if (atendimento.status === 'OrÃ§amento Enviado') type = 'orcamento';
    else if (atendimento.status === 'Em ProduÃ§Ã£o') type = 'producao';
    else if (atendimento.status === 'InstalaÃ§Ã£o Agendada') type = 'instalacao';
    setWhatsAppModalData({ atendimento, type });
  };

  const handlePrint = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    const success = printOrcamentoPDF(atendimento, empresa);
    if (!success) {
      addToast('Aviso', 'Permita pop-ups no navegador para gerar o PDF.', 'warning');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col min-h-[calc(100vh-10rem)] md:h-[calc(100vh-7.5rem)] pb-4">
      {/* Kanban Header & Filter Bar */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-amber-400 flex items-center gap-2">
            <span>ðŸ“Œ Quadro de Pedidos por Etapa</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Arraste os cartÃµes entre as colunas ou clique em <strong className="text-amber-400">"AvanÃ§ar"</strong> para atualizar o fluxo do pedido.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente, pedra, serviÃ§o..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-amber-400 font-bold p-1 cursor-pointer"
              >
                âœ•
              </button>
            )}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="">Todas as Prioridades</option>
            <option value="Baixa">ðŸŸ¢ Baixa</option>
            <option value="Normal">ðŸ”µ Normal</option>
            <option value="Alta">ðŸŸ¡ Alta</option>
            <option value="Urgente">ðŸ”´ Urgente</option>
          </select>

          <button
            onClick={() => setActiveView('novo')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-zinc-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-xs font-black rounded-xl shadow-md shadow-amber-400/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5px]" />
            <span>+ Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth">
        <div className="flex gap-3.5 h-full min-w-max items-stretch px-0.5">
          {STATUS_LIST.map((status) => {
            const columnCards = filteredAtendimentos.filter((a) => a.status === status);
            const cfg = STATUS_CONFIG[status];
            const isOver = dragOverColumn === status;
            const totalColuna = columnCards.reduce((acc, a) => acc + parseMoedaToNumber(a.orcamento), 0);

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={`w-[85vw] sm:w-72 md:w-80 lg:w-[300px] xl:w-[320px] 2xl:w-[340px] flex flex-col rounded-2xl border bg-zinc-900/90 transition-all duration-150 shrink-0 ${
                  isOver
                    ? 'border-amber-400 bg-zinc-900 ring-2 ring-amber-400/30'
                    : 'border-zinc-800/90'
                }`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-zinc-800 bg-zinc-850 rounded-t-2xl flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                    <span className="font-extrabold text-xs text-zinc-200 truncate" title={status}>
                      {status}
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-zinc-800 text-amber-300 border border-zinc-700">
                    {columnCards.length}
                  </span>
                </div>

                {/* Sub-header sum */}
                {totalColuna > 0 && (
                  <div className="px-3 py-1.5 bg-zinc-800/40 border-b border-zinc-800 text-[10px] font-semibold text-zinc-400 flex justify-between">
                    <span>Total da etapa:</span>
                    <span className="font-black text-amber-400">R$ {formatMoeda(totalColuna)}</span>
                  </div>
                )}

                {/* Column Card List */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto min-h-[140px]">
                  {columnCards.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-medium select-none p-3 text-center">
                      <span>Nenhum pedido nesta etapa</span>
                    </div>
                  ) : (
                    columnCards.map((a) => {
                      const prioridadeCfg = PRIORIDADE_CONFIG[a.prioridade || 'Normal'];
                      const isDragging = draggedId === a.id;
                      const next = getNextStep(a.status);

                      return (
                        <div
                          key={a.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, a.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedAtendimentoId(a.id)}
                          className={`bg-zinc-850 rounded-xl p-3.5 border border-zinc-800 shadow-sm hover:border-amber-400/50 hover:shadow-lg cursor-grab active:cursor-grabbing transition-all select-none group relative ${
                            isDragging ? 'opacity-30 scale-95' : 'hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Card Top Row: ID & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[10px] font-bold text-zinc-500">
                              #{String(a.id).padStart(4, '0')}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prioridadeCfg.bg} ${prioridadeCfg.text}`}
                            >
                              {a.prioridade || 'Normal'}
                            </span>
                          </div>

                          {/* Customer Name */}
                          <h4 className="font-black text-xs text-amber-400 group-hover:text-amber-300 transition-colors leading-snug truncate">
                            {a.nome}
                          </h4>

                          {/* Service & Material */}
                          <div className="mt-1 space-y-0.5">
                            <div className="text-[11px] font-medium text-zinc-300 truncate">
                              ðŸ› ï¸ {a.servico}
                            </div>
                            <div className="text-[11px] font-bold text-amber-300 truncate">
                              ðŸ’Ž {a.material}
                            </div>
                          </div>

                          {/* Budget & Due Date */}
                          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                            <div className="font-black text-amber-400">
                              {a.orcamento ? (
                                `R$ ${formatMoeda(a.orcamento)}`
                              ) : (
                                <span className="text-zinc-500 font-normal italic">A orÃ§ar</span>
                              )}
                            </div>
                            <div className="text-zinc-400 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>{formatDate(a.dataPrevista)}</span>
                            </div>
                          </div>

                          {/* Quick Action Footer on Card */}
                          <div
                            className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleWhatsApp(e, a)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-bold text-[10px] transition-colors cursor-pointer"
                                title="Enviar WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                              <button
                                onClick={(e) => handlePrint(e, a)}
                                className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                                title="Imprimir PDF"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            </div>

                            {next && (
                              <button
                                onClick={(e) => handleAdvanceCard(e, a)}
                                className="inline-flex items-center gap-1 text-[10px] font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-0.5 rounded transition-all cursor-pointer"
                                title={`Mover para ${next}`}
                              >
                                <span>AvanÃ§ar</span>
                                <ChevronRight className="w-3 h-3 stroke-[2.5px]" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
