import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  MessageCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  Power,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';

export const WhatsAppModal: React.FC = () => {
  const {
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    botStatus,
    botLoading,
    connectBot,
    disconnectBot,
  } = useApp();

  const [showLogs, setShowLogs] = useState(false);

  if (!isWhatsAppModalOpen) return null;

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Recente';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-lg md:max-w-xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-100">WhatsApp Web</h2>
                {botStatus.isReady ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Conectado
                  </span>
                ) : botStatus.hasQr ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Aguardando QR Code
                  </span>
                ) : botStatus.isConnecting ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    Iniciando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    Desconectado
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Envio automático de orçamentos e agendamentos em PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-zinc-200">
          {/* CASO 1: AGUARDANDO LEITURA DO QR CODE */}
          {botStatus.hasQr && botStatus.qrCode && !botStatus.isReady && (
            <div className="space-y-4 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 font-medium">
                📷 <strong>QR Code Gerado!</strong> Aponte a câmera do seu celular no WhatsApp para conectar.
              </div>

              {/* QR Code Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-2xl max-w-xs mx-auto border-4 border-zinc-700">
                <img
                  src={botStatus.qrCode}
                  alt="WhatsApp QR Code"
                  className="w-60 h-60 sm:w-64 sm:h-64 object-contain"
                />
                <span className="text-[11px] font-bold text-zinc-700 mt-2 flex items-center gap-1.5 animate-pulse">
                  <Smartphone className="w-3.5 h-3.5" />
                  Aguardando leitura do QR Code...
                </span>
              </div>

              {/* Passo a passo */}
              <div className="bg-zinc-850 border border-zinc-800 rounded-xl p-3.5 text-left text-xs space-y-1.5 text-zinc-300">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px] mb-1">
                  Como conectar pelo celular:
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Abra o WhatsApp no seu smartphone.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Toque em <strong>Mais opções</strong> (3 pontinhos) ou <strong>Configurações</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Selecione <strong>Aparelhos conectados</strong> {'>'} <strong>Conectar um aparelho</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                  <span>Aponte a câmera para a tela para ler o QR Code acima.</span>
                </div>
              </div>

              {/* Botões de Ação no QR */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => connectBot()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${botLoading ? 'animate-spin' : ''}`} />
                  <span>Gerar Novo QR Code</span>
                </button>

                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => disconnectBot(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* CASO 2: CONECTADO COM SUCESSO */}
          {botStatus.isReady && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-300">WhatsApp Conectado e Operacional</h3>
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    O robô está pronto para disparar orçamentos e agendamentos em PDF para seus clientes.
                  </p>
                </div>
              </div>

              {/* Card do Usuário */}
              <div className="p-4 bg-zinc-850 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {botStatus.profilePic ? (
                    <img
                      src={botStatus.profilePic}
                      alt="WhatsApp Profile"
                      className="w-12 h-12 rounded-xl border border-emerald-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-lg">
                      📱
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-zinc-100">
                      {botStatus.name || 'Dispositivo WhatsApp'}
                    </div>
                    <div className="text-xs font-mono font-semibold text-emerald-400">
                      +{botStatus.number || 'Não informado'}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Conectado em: {formatTime(botStatus.lastConnectionTime)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Sessão Ativa
                  </span>
                </div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-850 border border-zinc-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Mensagens</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {botStatus.messagesProcessed || 0}
                  </div>
                </div>
                <div className="bg-zinc-850 border border-zinc-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Erros</div>
                  <div className="text-lg font-black text-zinc-300 mt-0.5">
                    {botStatus.errorCount || 0}
                  </div>
                </div>
                <div className="bg-zinc-850 border border-zinc-800 p-3 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Tempo Ativo</div>
                  <div className="text-xs font-bold text-amber-300 mt-1.5">
                    {formatUptime(botStatus.uptime)}
                  </div>
                </div>
              </div>

              {/* Ações de Desconexão */}
              <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => disconnectBot(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Pausa o robô mantendo a sessão salva"
                >
                  <Power className="w-3.5 h-3.5 text-amber-400" />
                  <span>{botLoading ? 'Processando...' : 'Desconectar (Manter Sessão)'}</span>
                </button>

                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => disconnectBot(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Desconecta totalmente e apaga a sessão para ler outro QR Code"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{botLoading ? 'Processando...' : 'Deslogar (Trocar de WhatsApp)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CASO 3: INICIALIZANDO (SEM QR CODE AINDA) */}
          {botStatus.isConnecting && !botStatus.hasQr && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Iniciando cliente WhatsApp...</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Aguarde alguns instantes enquanto o navegador inicia e o QR Code é gerado.
                </p>
              </div>
              <button
                type="button"
                disabled={botLoading}
                onClick={() => disconnectBot(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar Inicialização</span>
              </button>
            </div>
          )}

          {/* CASO 4: DESCONECTADO */}
          {!botStatus.isReady && !botStatus.isConnecting && !botStatus.hasQr && (
            <div className="space-y-4 text-center py-3">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
                <QrCode className="w-8 h-8 text-amber-400" />
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-black text-zinc-100">
                  Conecte seu WhatsApp com QR Code
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Clique no botão abaixo para gerar o QR Code. Ao escanear, o sistema poderá enviar
                  orçamentos e confirmações de agendamento em PDF diretamente para os clientes.
                </p>
              </div>

              {botStatus.lastError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-left flex items-start gap-2 max-w-md mx-auto">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-mono text-[11px] leading-snug">{botStatus.lastError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => connectBot()}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {botLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-5 h-5" />
                  )}
                  <span>{botLoading ? 'Gerando QR Code...' : 'Conectar WhatsApp (Gerar QR Code)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Seção de Logs Expansível */}
          <div className="pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Logs do Robô WhatsApp ({botStatus.logs.length})
              </span>
              {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showLogs && (
              <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl max-h-40 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1">
                {botStatus.logs.length === 0 ? (
                  <p className="text-zinc-600 italic">Nenhum log registrado ainda.</p>
                ) : (
                  botStatus.logs.slice(-20).map((log, index) => (
                    <div key={index} className="leading-snug break-all text-zinc-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 bg-zinc-850 border-t border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
