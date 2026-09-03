import { getSupabaseClient } from './supabase';

export async function sendBotMessageAndLog(
  token: string,
  atendimentoId: number,
  telefone: string,
  tipo: string,
  statusAnterior: string | null,
  statusNovo: string | null,
  mensagem: string
) {
  try {
    const response = await fetch('/api/bot/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': token,
      },
      body: JSON.stringify({ number: telefone, message: mensagem }),
    });
    
    const data = await response.json();
    const isSuccess = data.success === true;

    // Log no Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('whatsapp_logs').insert({
        atendimento_id: atendimentoId,
        telefone,
        tipo,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        mensagem,
        resultado: isSuccess ? 'sucesso' : 'erro',
        erro_detalhe: isSuccess ? null : data.error || 'Erro desconhecido',
        tentativas: 1
      });
    }

    return { success: isSuccess, error: data.error };
  } catch (err: any) {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('whatsapp_logs').insert({
        atendimento_id: atendimentoId,
        telefone,
        tipo,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        mensagem,
        resultado: 'erro',
        erro_detalhe: String(err.message),
        tentativas: 1
      });
    }
    return { success: false, error: err.message };
  }
}
