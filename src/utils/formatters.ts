import { StatusAtendimento, PrioridadeAtendimento } from '../types';

export const STATUS_LIST: StatusAtendimento[] = [
  'Novo Atendimento',
  'Visita Agendada',
  'Medição Realizada',
  'Orçamento Enviado',
  'Aprovado',
  'Em Produção',
  'Instalação Agendada',
  'Concluído',
];

export const STATUS_CONFIG: Record<
  StatusAtendimento,
  {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    dot: string;
    icon: string;
    description: string;
  }
> = {
  'Novo Atendimento': {
    bg: 'bg-sky-950/40',
    text: 'text-sky-400',
    border: 'border-sky-800/60',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
    icon: 'Sparkles',
    description: 'Primeiro contato do cliente registrado.',
  },
  'Visita Agendada': {
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-400',
    border: 'border-indigo-800/60',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
    icon: 'CalendarCheck',
    description: 'Data marcada para visita técnica no local.',
  },
  'Medição Realizada': {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: 'Ruler',
    description: 'Medidas e gabaritos técnicos conferidos.',
  },
  'Orçamento Enviado': {
    bg: 'bg-pink-950/40',
    text: 'text-pink-400',
    border: 'border-pink-800/60',
    badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    dot: 'bg-pink-400',
    icon: 'FileText',
    description: 'Proposta comercial enviada ao cliente.',
  },
  'Aprovado': {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: 'CheckCircle2',
    description: 'Cliente aprovou e confirmou o pedido.',
  },
  'Em Produção': {
    bg: 'bg-purple-950/40',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    icon: 'Hammer',
    description: 'Corte, acabamento e polimento na fábrica.',
  },
  'Instalação Agendada': {
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    border: 'border-orange-800/60',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
    icon: 'Truck',
    description: 'Transporte e montagem na obra agendados.',
  },
  'Concluído': {
    bg: 'bg-green-950/40',
    text: 'text-green-400',
    border: 'border-green-800/60',
    badgeBg: 'bg-green-500/15 text-green-300 border-green-500/30',
    dot: 'bg-green-400',
    icon: 'Award',
    description: 'Serviço instalado, limpo e entregue com sucesso.',
  },
};

export const PRIORIDADE_CONFIG: Record<
  PrioridadeAtendimento,
  { label: string; bg: string; text: string; dot: string }
> = {
  Baixa: { label: 'Baixa', bg: 'bg-zinc-800 border border-zinc-700', text: 'text-zinc-400', dot: 'bg-zinc-500' },
  Normal: { label: 'Normal', bg: 'bg-sky-950/50 border border-sky-800/50', text: 'text-sky-300', dot: 'bg-sky-400' },
  Alta: { label: 'Alta', bg: 'bg-amber-950/50 border border-amber-800/50', text: 'text-amber-300', dot: 'bg-amber-400' },
  Urgente: { label: 'Urgente', bg: 'bg-red-950/50 border border-red-800/50', text: 'text-red-300', dot: 'bg-red-400 animate-pulse' },
};

export function formatMoeda(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0,00';
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    // If it's already in pt-BR formatted string like "1.500,00", normalize:
    const clean = String(val).replace(/\./g, '').replace(',', '.');
    num = parseFloat(clean) || 0;
  }
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoedaToNumber(val: string | number | undefined | null): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(clean) || 0;
}

export function formatDate(d: string | undefined | null): string {
  if (!d) return '—';
  try {
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return iso;
    return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return iso;
  }
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  // CNPJ
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export async function fetchCepAddress(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
} | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    };
  } catch {
    return null;
  }
}

export function getNextStep(status: StatusAtendimento): StatusAtendimento | null {
  const idx = STATUS_LIST.indexOf(status);
  if (idx >= 0 && idx < STATUS_LIST.length - 1) {
    return STATUS_LIST[idx + 1];
  }
  return null;
}

export function generateWhatsAppLink(
  phone: string,
  clientName: string,
  companyName: string,
  type: 'orcamento' | 'visita' | 'producao' | 'instalacao' | 'geral',
  customData?: {
    servico?: string;
    material?: string;
    valor?: string;
    data?: string;
    hora?: string;
    endereco?: string;
    responsavel?: string;
    googleCalendarUrl?: string;
    obs?: string;
  }
): string {
  const digits = phone.replace(/\D/g, '');
  const cleanPhone = digits.startsWith('55') ? digits : `55${digits}`;

  let message = '';
  const first = clientName.split(' ')[0] || 'Cliente';

  switch (type) {
    case 'orcamento':
      message = `Olá, *${first}*! Tudo bem? Aqui é da *${companyName}*.\n\nElaboramos o orçamento para o seu projeto de *${customData?.servico || 'Marmoraria'}* em *${customData?.material || 'Pedra Nobre'}*.\n\n💰 *Valor total:* R$ ${customData?.valor || 'Consulte'}\n\nPodemos tirar alguma dúvida ou agendar uma data para início? Ficamos à sua inteira disposição! 😊`;
      break;

    case 'visita': {
      const dataFormatada = customData?.data ? formatDate(customData.data) : 'a combinar';
      const horaFormatada = customData?.hora ? `${customData.hora}` : 'Horário comercial';
      message = [
        `Olá, *${first}*! Tudo bem? Aqui é da equipe da *${companyName}*! 📐✨`,
        '',
        `Confirmamos o agendamento da sua *Visita Técnica / Medição*:`,
        `📅 *Data:* ${dataFormatada}`,
        `⏰ *Horário:* ${horaFormatada}`,
        customData?.endereco ? `📍 *Endereço:* ${customData.endereco}` : '',
        customData?.servico ? `🛠️ *Serviço:* ${customData.servico} (${customData.material || 'Mármore/Granito'})` : '',
        customData?.responsavel ? `👷 *Técnico Responsável:* ${customData.responsavel}` : '',
        customData?.obs ? `📝 *Observações:* ${customData.obs}` : '',
        '',
        customData?.googleCalendarUrl
          ? `📅 *Adicionar ao seu Google Agenda:* \n${customData.googleCalendarUrl}\n`
          : '',
        `Por favor, nos confirme o recebimento. Se precisar reagendar, basta nos responder por aqui! Obrigado.`,
      ]
        .filter((line) => line !== '')
        .join('\n');
      break;
    }

    case 'producao':
      message = `Olá, *${first}*! Boas notícias da *${companyName}*! 🎉\n\nSeu pedido de *${customData?.servico || 'marmoraria'}* em *${customData?.material || 'pedra'}* acabou de entrar na nossa linha de produção e corte.\n\nEstamos cuidando de cada detalhe do acabamento para você!`;
      break;

    case 'instalacao': {
      const dataFormatada = customData?.data ? formatDate(customData.data) : 'a combinar';
      const horaFormatada = customData?.hora ? `${customData.hora}` : 'Horário a combinar';
      message = [
        `Olá, *${first}*! Aqui é da equipe de montagem da *${companyName}*! 🚚✨`,
        '',
        `As peças do seu projeto de *${customData?.servico || 'marmoraria'}* em *${customData?.material || 'pedra'}* estão prontas!`,
        '',
        `📅 *Data prevista para Instalação:* ${dataFormatada}`,
        `⏰ *Horário:* ${horaFormatada}`,
        customData?.endereco ? `📍 *Endereço:* ${customData.endereco}` : '',
        customData?.responsavel ? `👷 *Equipe Responsável:* ${customData.responsavel}` : '',
        '',
        customData?.googleCalendarUrl
          ? `📅 *Salvar na sua Agenda Google:* \n${customData.googleCalendarUrl}\n`
          : '',
        `Podemos confirmar este agendamento? Ficamos no aguardo!`,
      ]
        .filter((line) => line !== '')
        .join('\n');
      break;
    }

    case 'geral':
    default:
      message = `Olá, *${first}*! Tudo bem? Aqui é da *${companyName}*. Entramos em contato a respeito do seu atendimento de *${customData?.servico || 'marmoraria'}*. Como podemos te ajudar hoje?`;
      break;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
