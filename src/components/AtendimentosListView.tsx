import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  MessageSquare,
  Printer,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  formatMoeda,
  parseMoedaToNumber,
  STATUS_CONFIG,
  STATUS_LIST,
  PRIORIDADE_CONFIG,
} from '../utils/formatters';
import { printOrcamentoPDF } from '../utils/pdfGenerator';
import { Atendimento, StatusAtendimento } from '../types';

export const AtendimentosListView: React.FC = () => {
  const {
    atendimentos,
    setSelectedAtendimentoId,
    deleteAtendimento,
    setActiveView,
    empresa,
    addToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc' | 'nome-asc'>('data-desc');

  // Filtrar e Ordenar
  const filtered = atendimentos.filter((a) => {
    const q = searchTerm.toLowerCase();
    const matchText =
      !q ||
      a.nome.toLowerCase().includes(q) ||
      a.telefone.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      a.servico.toLowerCase().includes(q) ||
      a.material.toLowerCase().includes(q) ||
      a.endereco.toLowerCase().includes(q) ||
      (a.obs && a.obs.toLowerCase().includes(q)) ||
      (a.responsavel && a.responsavel.toLowerCase().includes(q));

    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchPriority = !priorityFilter || a.prioridade === priorityFilter;

    return matchText && matchStatus && matchPriority;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'data-desc') {
      return new Date(b.criadoEm || b.dataPrevista).getTime() - new Date(a.criadoEm || a.dataPrevista).getTime();
    }
    if (sortBy === 'data-asc') {
      return new Date(a.dataPrevista).getTime() - new Date(b.dataPrevista).getTime();
    }
    if (sortBy === 'valor-desc') {
      return parseMoedaToNumber(b.orcamento) - parseMoedaToNumber(a.orcamento);
    }
    if (sortBy === 'valor-asc') {
      return parseMoedaToNumber(a.orcamento) - parseMoedaToNumber(b.orcamento);
    }
    if (sortBy === 'nome-asc') {
      return a.nome.localeCompare(b.nome);
    }
    return 0;
  });

  const totalValorFiltrado = filtered.reduce((acc, a) => acc + parseMoedaToNumber(a.orcamento), 0);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      addToast('Aviso', 'Nenhum dado para exportar.', 'warning');
      return;
    }

    const headers = ['ID', 'Cliente', 'Telefone', 'Email', 'Endereço', 'Serviço', 'Material', 'Status', 'Prioridade', 'Data Prevista', 'Valor Orçamento (R$)', 'Responsável'];
    const rows = filtered.map((a) => [
      a.id,
      `"${a.nome}"`,
      `"${a.telefone}"`,
      `"${a.email || ''}"`,
      `"${a.endereco.replace(/"/g, '""')}"`,
      `"${a.servico}"`,
      `"${a.material}"`,
      `"${a.status}"`,
      `"${a.prioridade || 'Normal'}"`,
      `"${a.dataPrevista}"`,
      `"${a.orcamento || ''}"`,
      `"${a.responsavel || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atendimentos_marmoraria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Planilha CSV Exportada', `${filtered.length} clientes exportados com sucesso.`, 'success');
  };

  const handlePrint = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    const success = printOrcamentoPDF(atendimento, empresa);
    if (!success) {
      addToast('Aviso', 'Permita pop-ups no navegador para visualizar o PDF.', 'warning');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    let type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral' = 'geral';
    if (atendimento.status === 'Visita Agendada') type = 'visita';
    else if (atendimento.status === 'Orçamento Enviado') type = 'orcamento';
    else if (atendimento.status === 'Em Produção') type = 'producao';
    else if (atendimento.status === 'Instalação Agendada') type = 'instalacao';
    setWhatsAppModalData({ atendimento, type });
  };

  const handleDelete = (e: React.MouseEvent, atendimento: Atendimento) => {
    e.stopPropagation();
    if (window.confirm(`Deseja excluir o atendimento de ${atendimento.nome}?`)) {
      deleteAtendimento(atendimento.id);
      addToast('Excluído', 'Atendimento removido.', 'info');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Barra Superior com Título & Ações Principais */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
              <span>📋 Lista de Clientes & Atendimentos</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Consulte históricos completos, filtre por status e exporte relatórios em CSV.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => setActiveView('novo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-black shadow-md shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
              <span>+ Cadastrar Pedido</span>
            </button>
          </div>
        </div>

        {/* Status Pills rápidos para filtro de 1 clique */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === ''
                ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750'
            }`}
          >
            Todos ({atendimentos.length})
          </button>
          {STATUS_LIST.map((st) => {
            const count = atendimentos.filter((a) => a.status === st).length;
            const isSelected = statusFilter === st;
            const cfg = STATUS_CONFIG[st];
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(isSelected ? '' : st)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${cfg.badgeBg} ring-2 ring-amber-400/30 border-amber-400 font-black`
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span>{st}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-zinc-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Linha de Busca & Ordenação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
          {/* Campo de Busca com Botão Limpar */}
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente, telefone, pedra, serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:bg-zinc-800 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-amber-400 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Prioridade */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="">Todas as Prioridades</option>
              <option value="Baixa">🟢 Prioridade Baixa</option>
              <option value="Normal">🔵 Prioridade Normal</option>
              <option value="Alta">🟡 Prioridade Alta</option>
              <option value="Urgente">🔴 Prioridade Urgente</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="data-desc">Data de Criação (Mais Recentes)</option>
              <option value="data-asc">Prazo de Entrega (Mais Próximo)</option>
              <option value="valor-desc">Maior Valor de Orçamento</option>
              <option value="valor-asc">Menor Valor de Orçamento</option>
              <option value="nome-asc">Nome do Cliente (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Resumo Dinâmico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 pt-1 gap-1">
          <div>
            Exibindo <strong className="text-zinc-200">{sorted.length}</strong> de {atendimentos.length} atendimentos
          </div>
          <div className="font-semibold text-zinc-300">
            Total dos orçamentos filtrados: <strong className="text-amber-400 font-black">R$ {formatMoeda(totalValorFiltrado)}</strong>
          </div>
        </div>
      </div>

      {/* Tabela no Desktop & Cartões no Mobile */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-850 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <th className="py-3.5 px-4"># ID</th>
                <th className="py-3.5 px-4">Cliente & Contato</th>
                <th className="py-3.5 px-4">Endereço da Obra</th>
                <th className="py-3.5 px-4">Serviço / Pedra</th>
                <th className="py-3.5 px-4">Etapa & Prioridade</th>
                <th className="py-3.5 px-4">Prazo</th>
                <th className="py-3.5 px-4 text-right">Valor Orçado</th>
                <th className="py-3.5 px-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Nenhum atendimento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sorted.map((a) => {
                  const statusCfg = STATUS_CONFIG[a.status];
                  const prioridadeCfg = PRIORIDADE_CONFIG[a.prioridade || 'Normal'];

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAtendimentoId(a.id)}
                      className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-500">
                        #{String(a.id).padStart(4, '0')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-amber-400">{a.nome}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{a.telefone}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-zinc-300 truncate" title={a.endereco}>
                          {a.endereco}
                        </div>
                        {a.bairro && a.cidade && (
                          <div className="text-[10px] text-zinc-500">{a.bairro} — {a.cidade}/{a.estado}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-200">{a.servico}</div>
                        <div className="text-[11px] font-bold text-amber-300">{a.material}</div>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.badgeBg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {a.status}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${prioridadeCfg.bg} ${prioridadeCfg.text}`}>
                            {a.prioridade || 'Normal'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-medium whitespace-nowrap">
                        {formatDate(a.dataPrevista)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-amber-400 whitespace-nowrap">
                        {a.orcamento ? (
                          `R$ ${formatMoeda(a.orcamento)}`
                        ) : (
                          <span className="text-zinc-500 font-normal italic">A orçar</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          
                          <button
                            onClick={(e) => handlePrint(e, a)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                            title="Gerar Orçamento PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedAtendimentoId(a.id)}
                            className="px-2.5 py-1 text-[11px] font-black bg-amber-400 text-zinc-950 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                          >
                            Ver
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, a)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Mobile & Tablet Card List */}
        <div className="lg:hidden divide-y divide-zinc-800">
          {sorted.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Nenhum atendimento encontrado com os filtros selecionados.
            </div>
          ) : (
            sorted.map((a) => {
              const statusCfg = STATUS_CONFIG[a.status];
              const prioridadeCfg = PRIORIDADE_CONFIG[a.prioridade || 'Normal'];

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAtendimentoId(a.id)}
                  className="p-4 space-y-2.5 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-500">#{String(a.id).padStart(4, '0')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prioridadeCfg.bg} ${prioridadeCfg.text}`}>
                        {a.prioridade || 'Normal'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {a.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-amber-400">{a.nome}</h3>
                    <p className="text-xs text-zinc-400">{a.servico} • <strong className="text-amber-300">{a.material}</strong></p>
                    {a.endereco && (
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                        <span className="truncate">{a.endereco}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
                    <span className="text-zinc-400">📅 {formatDate(a.dataPrevista)}</span>
                    <span className="font-black text-amber-400 text-sm">
                      {a.orcamento ? `R$ ${formatMoeda(a.orcamento)}` : 'A orçar'}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    
                    <button
                      onClick={(e) => handlePrint(e, a)}
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-amber-400 border border-zinc-700 hover:bg-zinc-700 cursor-pointer"
                      title="PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedAtendimentoId(a.id)}
                      className="px-3 py-2 text-xs font-black bg-amber-400 text-zinc-950 rounded-xl hover:bg-amber-300 cursor-pointer"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, a)}
                      className="p-2 rounded-xl bg-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-700 cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
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

