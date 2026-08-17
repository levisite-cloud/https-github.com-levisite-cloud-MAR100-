import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Send,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Calendar,
  Download,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { formatDate, generateWhatsAppLink } from '../utils/formatters';
import { generateGoogleCalendarUrl, downloadIcsCalendarFile } from '../utils/calendarHelpers';

export const WhatsAppModal: React.FC = () => {
  const { whatsAppModalData, setWhatsAppModalData, empresa, addToast } = useApp();
  const [selectedType, setSelectedType] = useState<
    'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral'
  >('orcamento');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (whatsAppModalData) {
      setSelectedType(whatsAppModalData.type || 'orcamento');
    }
  }, [whatsAppModalData]);

  if (!whatsAppModalData) return null;

  const { atendimento } = whatsAppModalData;

  // Generate Google Calendar Link for visit or installation
  const googleCalendarUrl =
    selectedType === 'visita' || selectedType === 'instalacao'
      ? generateGoogleCalendarUrl(atendimento, empresa, selectedType)
      : undefined;

  const link = generateWhatsAppLink(
    atendimento.telefone,
    atendimento.nome,
    empresa.nome || 'Marmoraria',
    selectedType,
    {
      servico: atendimento.servico,
      material: atendimento.material,
      valor: atendimento.orcamento,
      data:
        selectedType === 'instalacao' && atendimento.dataInstalacao
          ? atendimento.dataInstalacao
          : atendimento.dataPrevista,
      hora: atendimento.horaPrevista,
      endereco: atendimento.endereco,
      responsavel: atendimento.responsavel,
      obs: atendimento.obs,
      googleCalendarUrl,
    }
  );

  // Extract raw text to copy
  const urlObj = new URL(link);
  const rawText = urlObj.searchParams.get('text') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    addToast('Mensagem Copiada', 'Texto copiado para a área de transferência.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    window.open(link, '_blank');
    setWhatsAppModalData(null);
  };

  const handleOpenGoogleCalendar = () => {
    if (googleCalendarUrl) {
      window.open(googleCalendarUrl, '_blank');
      addToast('Google Agenda Aberto', 'Agendamento aberto no seu Google Agenda.', 'success');
    }
  };

  const handleDownloadIcs = () => {
    downloadIcsCalendarFile(
      atendimento,
      empresa,
      selectedType === 'instalacao' ? 'instalacao' : 'visita'
    );
    addToast('Arquivo .ICS Baixado', 'Abra o arquivo para salvar na agenda do seu computador.', 'success');
  };

  const templates = [
    { id: 'orcamento', label: '💰 Envio de Orçamento' },
    { id: 'visita', label: '📐 Medição / Visita Técnica' },
    { id: 'producao', label: '🏭 Entrada em Produção' },
    { id: 'instalacao', label: '🚚 Agendamento de Instalação' },
    { id: 'geral', label: '💬 Contato Geral' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-850 border-b border-zinc-800 text-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-amber-400 text-base leading-none">Mensagem WhatsApp</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Cliente: <span className="font-semibold text-zinc-100">{atendimento.nome}</span> ({atendimento.telefone})
              </p>
            </div>
          </div>
          <button
            onClick={() => setWhatsAppModalData(null)}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Template pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Selecione o Modelo de Mensagem
            </label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedType(tpl.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedType === tpl.id
                      ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750 border border-zinc-700'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Calendar Dispatch Box for Visit/Installation */}
          {(selectedType === 'visita' || selectedType === 'instalacao') && (
            <div className="p-3.5 bg-zinc-850/90 border border-amber-400/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Sincronização de Calendário & Agenda
                  </span>
                </div>
                <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded font-mono font-semibold">
                  Google + PC + WhatsApp
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                O link para o cliente adicionar o agendamento ao <strong>Google Agenda</strong> já foi gerado e incluído na mensagem abaixo. Você também pode salvar na sua agenda agora:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenGoogleCalendar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Adicionar ao meu Google Agenda</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Salvar no Computador (.ics)</span>
                </button>
              </div>
            </div>
          )}

          {/* Preview box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Pré-visualização da Mensagem para o WhatsApp do Cliente
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs leading-relaxed text-zinc-200 font-sans whitespace-pre-wrap selection:bg-amber-400 selection:text-zinc-950 max-h-48 overflow-y-auto">
              {rawText}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-zinc-850 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Abre o WhatsApp Web ou App Desktop com a mensagem preenchida
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setWhatsAppModalData(null)}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
