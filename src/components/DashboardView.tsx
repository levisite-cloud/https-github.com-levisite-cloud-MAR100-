import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  MessageSquare,
  Printer,
  Calendar,
  ArrowRight,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  formatDate,
  formatMoeda,
  parseMoedaToNumber,
  STATUS_CONFIG,
  STATUS_LIST,
  PRIORIDADE_CONFIG,
} from '../utils/formatters';
import { printOrcamentoPDF } from '../utils/pdfGenerator';
import { Atendimento, StatusAtendimento } from '../types';

export const DashboardView: React.FC = () => {
  const { atendimentos, setActiveView, setSelectedAtendimentoId, setWhatsAppModalData, empresa, addToast } = useApp();
  const [tableFilter, setTableFilter] = useState<'todos' | 'andamento' | 'producao' | 'concluidos'>('todos');

  const total = atendimentos.length;
  const concluidos = atendimentos.filter((a) => a.status === 'Concluído');
  const emAndamento = atendimentos.filter((a) => a.status !== 'Concluído');
  const orcamentosPendentes = atendimentos.filter((a) => a.status === 'Orçamento Enviado');
  const emProducao = atendimentos.filter((a) => a.status === 'Em Produção' || a.status === 'Instalação Agendada');

  const valorPipeline = emAndamento.reduce((acc, a) => acc + parseMoedaToNumber(a.orcamento), 0);
  const valorConcluido = concluidos.reduce((acc, a) => acc + parseMoedaToNumber(a.orcamento), 0);

  const proximosPrazos = [...emAndamento]
    .filter((a) => a.dataPrevista)
    .sort((a, b) => new Date(a.dataPrevista).getTime() - new Date(b.dataPrevista).getTime())
    .slice(0, 4);

  // Filter for table
  const filteredRecentes = atendimentos.filter((a) => {
    if (tableFilter === 'andamento') return a.status !== 'Concluído';
    if (tableFilter === 'producao') return a.status === 'Em Produção' || a.status === 'Instalação Agendada';
    if (tableFilter === 'concluidos') return a.status === 'Concluído';
    return true;
  }).slice(0, 6);

  const handlePrint = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    const success = printOrcamentoPDF(atendimento, empresa);
    if (!success) {
      addToast('Aviso', 'Permita pop-ups no navegador para gerar o PDF.', 'warning');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    setWhatsAppModalData({ atendimento, type: 'geral' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Banner Principal com Atalhos Rápidos */}
      <div className="bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Painel de Gestão da Marmoraria</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              {empresa.nome || 'Marmoraria Fácil'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              Gerencie atendimentos, prazos de corte, medição e orçamentos comerciais em tempo real.
            </p>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveView('kanban')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-amber-400 border border-zinc-700/80 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <span>📌 Quadro de Pedidos</span>
            </button>
            <button
              onClick={() => setActiveView('atendimentos')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-amber-400 border border-zinc-700/80 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <span>📋 Ver Clientes</span>
            </button>
            <button
              onClick={() => setActiveView('novo')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-zinc-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl text-xs font-black shadow-md shadow-amber-400/20 hover:shadow-amber-400/30 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
              <span>+ Cadastrar Pedido</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos em Andamento */}
        <div
          onClick={() => setActiveView('kanban')}
          className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-amber-400/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Em Andamento</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400">{emAndamento.length}</span>
              <span className="text-xs text-zinc-400">pedidos ativos</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-amber-400 font-bold group-hover:underline">
            <span>Ver no quadro</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Corte & Fábrica */}
        <div
          onClick={() => setActiveView('kanban')}
          className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-purple-500/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Corte & Produção</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-base">
                🛠️
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-400">{emProducao.length}</span>
              <span className="text-xs text-zinc-400">sendo fabricados</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
            {orcamentosPendentes.length} propostas enviadas
          </div>
        </div>

        {/* Valor Total dos Pedidos */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Valor em Pedidos</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-400 truncate">
                R$ {formatMoeda(valorPipeline)}
              </div>
              <span className="text-xs text-zinc-400">em negociação / fábrica</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
            Total de {emAndamento.length} projetos em andamento
          </div>
        </div>

        {/* Pedidos Concluídos */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Entregues com Sucesso</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-400 truncate">
                R$ {formatMoeda(valorConcluido)}
              </div>
              <span className="text-xs text-zinc-400">{concluidos.length} obras finalizadas</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-emerald-400 font-bold flex items-center justify-between">
            <span>{total} clientes cadastrados</span>
            <span>100% salvos</span>
          </div>
        </div>
      </div>

      {/* Grid: Etapas do Fluxo & Prazos Próximos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Etapas do Fluxo Operacional */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-amber-400">Etapas do Processo na Marmoraria</h2>
              <p className="text-xs text-zinc-400">Clique em qualquer etapa para visualizar no Quadro Kanban</p>
            </div>
            <button
              onClick={() => setActiveView('kanban')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir Quadro</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {STATUS_LIST.map((st) => {
              const count = atendimentos.filter((a) => a.status === st).length;
              const cfg = STATUS_CONFIG[st];
              return (
                <div
                  key={st}
                  onClick={() => setActiveView('kanban')}
                  className={`p-3.5 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:border-amber-400/60 transition-all flex flex-col justify-between group`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-black text-zinc-100 group-hover:text-amber-400 transition-colors">{count}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-200 mt-2 truncate">
                    {st}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prazos Próximos da Agenda */}
        <div className="bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Prazos Próximos</span>
              </h2>
              <span className="text-[11px] text-amber-300 font-bold bg-amber-400/15 border border-amber-400/20 px-2 py-0.5 rounded-full">Agenda</span>
            </div>

            <div className="space-y-2.5">
              {proximosPrazos.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma data pendente cadastrada.
                </div>
              ) : (
                proximosPrazos.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAtendimentoId(item.id)}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-amber-400/40 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-100 group-hover:text-amber-400 transition-colors truncate">{item.nome}</div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {item.servico} • <span className="font-semibold text-amber-300">{item.material}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-amber-400">
                        {formatDate(item.dataPrevista)}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Pedidos Recentes com Filtros Rápidos */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-850/60">
          <div>
            <h2 className="text-sm font-extrabold text-amber-400">Últimos Pedidos Registrados</h2>
            <p className="text-xs text-zinc-400">Acesso rápido aos clientes e serviços recentes</p>
          </div>

          {/* Abas de Filtro Rápido */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTableFilter('todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tableFilter === 'todos'
                  ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              Todos ({atendimentos.length})
            </button>
            <button
              onClick={() => setTableFilter('andamento')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tableFilter === 'andamento'
                  ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              Em Aberto ({emAndamento.length})
            </button>
            <button
              onClick={() => setTableFilter('producao')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tableFilter === 'producao'
                  ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              Na Fábrica ({emProducao.length})
            </button>
            <button
              onClick={() => setTableFilter('concluidos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tableFilter === 'concluidos'
                  ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              Entregues ({concluidos.length})
            </button>
          </div>
        </div>

        {/* Visualização em Cartões no Mobile & Tabela no Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-800/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Cliente / WhatsApp</th>
                <th className="py-3 px-4">Serviço & Pedra</th>
                <th className="py-3 px-4">Etapa Atual</th>
                <th className="py-3 px-4">Prazo</th>
                <th className="py-3 px-4 text-right">Valor Orçado</th>
                <th className="py-3 px-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredRecentes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Nenhum pedido encontrado nesta categoria.
                  </td>
                </tr>
              ) : (
                filteredRecentes.map((a) => {
                  const statusCfg = STATUS_CONFIG[a.status];
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAtendimentoId(a.id)}
                      className="hover:bg-zinc-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-zinc-500">
                        #{String(a.id).padStart(4, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-amber-400">{a.nome}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{a.telefone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-200">{a.servico}</div>
                        <div className="text-[11px] text-amber-300 font-bold">{a.material}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.badgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 font-medium">
                        {formatDate(a.dataPrevista)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-400">
                        {a.orcamento ? `R$ ${formatMoeda(a.orcamento)}` : <span className="text-zinc-500 font-normal italic">A orçar</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleWhatsApp(e, a)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={(e) => handlePrint(e, a)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                            title="Imprimir Orçamento PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedAtendimentoId(a.id)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 border border-amber-400/30 rounded-lg transition-colors cursor-pointer"
                          >
                            Abrir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile em Cartões Elegantes */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredRecentes.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Nenhum pedido encontrado nesta categoria.
            </div>
          ) : (
            filteredRecentes.map((a) => {
              const statusCfg = STATUS_CONFIG[a.status];
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAtendimentoId(a.id)}
                  className="p-4 space-y-2 hover:bg-zinc-800/60 active:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-500">#{String(a.id).padStart(4, '0')}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {a.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-amber-400">{a.nome}</h3>
                    <p className="text-xs text-zinc-400">{a.servico} • <strong className="text-amber-300">{a.material}</strong></p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                    <span className="text-zinc-400">📅 {formatDate(a.dataPrevista)}</span>
                    <span className="font-black text-amber-400">
                      {a.orcamento ? `R$ ${formatMoeda(a.orcamento)}` : 'A orçar'}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleWhatsApp(e, a)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={(e) => handlePrint(e, a)}
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-zinc-700 hover:bg-zinc-700 cursor-pointer"
                      title="PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedAtendimentoId(a.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-400 text-zinc-950 rounded-xl hover:bg-amber-300 cursor-pointer"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};


