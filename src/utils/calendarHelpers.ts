import { Atendimento, EmpresaConfig } from '../types';
import { formatDate } from './formatters';

export interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Parses date string (YYYY-MM-DD) and optional time string (HH:mm) into Date object.
 */
export function parseDateTime(dateStr: string, timeStr?: string): { start: Date; end: Date } {
  const now = new Date();
  let startYear = now.getFullYear();
  let startMonth = now.getMonth();
  let startDay = now.getDate();

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      startYear = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10) - 1;
      startDay = parseInt(parts[2], 10);
    }
  }

  let startHours = 9;
  let startMinutes = 0;

  if (timeStr) {
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      startHours = parseInt(timeParts[0], 10) || 9;
      startMinutes = parseInt(timeParts[1], 10) || 0;
    }
  }

  const start = new Date(startYear, startMonth, startDay, startHours, startMinutes, 0);
  // Default duration is 1 hour
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return { start, end };
}

/**
 * Format Date to UTC Google Calendar format: YYYYMMDDTHHmmSSZ
 */
export function formatToGoogleCalendarDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates a direct Google Calendar appointment URL
 */
export function generateGoogleCalendarUrl(
  atendimento: Atendimento,
  empresa: EmpresaConfig,
  customType: 'visita' | 'instalacao' = 'visita'
): string {
  const isInstalacao = customType === 'instalacao' || atendimento.status === 'Instalação Agendada';
  const eventName = isInstalacao
    ? `🚚 Instalação de Marmoraria - ${atendimento.nome} (#${String(atendimento.id).padStart(4, '0')})`
    : `📐 Visita Técnica / Medição - ${atendimento.nome} (#${String(atendimento.id).padStart(4, '0')})`;

  const dateToUse = isInstalacao && atendimento.dataInstalacao
    ? atendimento.dataInstalacao
    : atendimento.dataPrevista;

  const { start, end } = parseDateTime(dateToUse, atendimento.horaPrevista);

  const startStr = formatToGoogleCalendarDate(start);
  const endStr = formatToGoogleCalendarDate(end);

  const details = [
    isInstalacao ? '🚚 INSTALAÇÃO DE MARMORARIA' : '📐 VISITA TÉCNICA / MEDIÇÃO',
    '═════════════════════════════════',
    `👤 Cliente: ${atendimento.nome}`,
    `📞 WhatsApp / Tel: ${atendimento.telefone}`,
    atendimento.email ? `✉️ E-mail: ${atendimento.email}` : '',
    `🛠️ Serviço: ${atendimento.servico}`,
    `🪨 Material / Pedra: ${atendimento.material}`,
    atendimento.acabamento ? `✨ Acabamento: ${atendimento.acabamento}` : '',
    `📍 Endereço: ${atendimento.endereco}`,
    `👷 Responsável Técnico: ${atendimento.responsavel || 'Equipe da Marmoraria'}`,
    atendimento.obs ? `📝 Observações: ${atendimento.obs}` : '',
    '',
    `🏢 Empresa: ${empresa.nome || 'Marmoraria'}`,
    empresa.whatsapp ? `📱 WhatsApp Empresa: ${empresa.whatsapp}` : '',
    '═════════════════════════════════',
    'Agendado via Sistema de Gestão de Marmoraria',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventName,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: atendimento.endereco || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers download of an .ics (iCalendar) file for local computer calendar (Outlook, Apple Calendar, Windows Calendar).
 */
export function downloadIcsCalendarFile(
  atendimento: Atendimento,
  empresa: EmpresaConfig,
  customType: 'visita' | 'instalacao' = 'visita'
): void {
  const isInstalacao = customType === 'instalacao' || atendimento.status === 'Instalação Agendada';
  const summary = isInstalacao
    ? `Instalacao Marmoraria - ${atendimento.nome} (#${String(atendimento.id).padStart(4, '0')})`
    : `Visita Tecnica Medicao - ${atendimento.nome} (#${String(atendimento.id).padStart(4, '0')})`;

  const dateToUse = isInstalacao && atendimento.dataInstalacao
    ? atendimento.dataInstalacao
    : atendimento.dataPrevista;

  const { start, end } = parseDateTime(dateToUse, atendimento.horaPrevista);

  const formatIcsDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const nowStr = formatIcsDate(new Date());
  const startStr = formatIcsDate(start);
  const endStr = formatIcsDate(end);
  const uid = `visita-${atendimento.id}-${Date.now()}@marmoraria.app`;

  const description = [
    isInstalacao ? 'INSTALACAO DE MARMORARIA' : 'VISITA TECNICA / MEDICAO',
    `Cliente: ${atendimento.nome}`,
    `Telefone: ${atendimento.telefone}`,
    `Servico: ${atendimento.servico}`,
    `Material: ${atendimento.material}`,
    `Endereco: ${atendimento.endereco}`,
    `Responsavel: ${atendimento.responsavel || 'Equipe da Marmoraria'}`,
    atendimento.obs ? `Observacoes: ${atendimento.obs}` : '',
    `Empresa: ${empresa.nome || 'Marmoraria'}`,
  ]
    .filter(Boolean)
    .join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marmoraria Gestao//Agendamento de Visita//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${atendimento.endereco || ''}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Visita Tecnica Marmoraria',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `agendamento-${isInstalacao ? 'instalacao' : 'visita'}-cliente-${atendimento.id}.ics`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
