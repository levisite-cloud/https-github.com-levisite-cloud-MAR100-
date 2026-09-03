import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Atendimento, EmpresaConfig } from '../types';

const STORAGE_SUPABASE_URL_KEY = 'marmoraria_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'marmoraria_supabase_anon_key';

// Default project credentials configured by user
const DEFAULT_SUPABASE_URL = 'https://bxtghkxoobjhenapbmse.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_8f5E5FprlK2rjTYEDCktpg_T67mntBa';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || envUrl || DEFAULT_SUPABASE_URL;
  const storedKey = localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) || envKey || DEFAULT_SUPABASE_KEY;

  return {
    url: storedUrl.trim(),
    anonKey: storedKey.trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  if (cachedClient && currentUrl === url && currentKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentUrl = url;
    currentKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
  cachedClient = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
  localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
  cachedClient = null;
}

export async function testSupabaseConnection(urlInput?: string, keyInput?: string): Promise<{ success: boolean; message: string; count?: number }> {
  let client: SupabaseClient | null = null;
  if (urlInput && keyInput) {
    try {
      client = createClient(urlInput.trim(), keyInput.trim());
    } catch (e: any) {
      return { success: false, message: `URL ou chave inválida: ${e.message}` };
    }
  } else {
    client = getSupabaseClient();
  }

  if (!client) {
    return { success: false, message: 'Supabase não configurado. Forneça o Project URL e a Anon Key.' };
  }

  try {
    const { error, count } = await client
      .from('atendimentos')
      .select('id', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('relation "public.atendimentos" does not exist') || error.code === '42P01') {
        return {
          success: false,
          message: 'Conectado ao Supabase, mas a tabela "atendimentos" ainda não foi criada. Execute o script SQL no SQL Editor do Supabase!',
        };
      }
      return { success: false, message: `Erro ao consultar Supabase: ${error.message}` };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabelas acessíveis.',
      count: count ?? 0,
    };
  } catch (err: any) {
    return { success: false, message: `Falha de rede ou configuração: ${err.message}` };
  }
}

// Convert application Atendimento to Supabase row (snake_case)
export function mapAtendimentoToSupabaseRow(a: Atendimento): any {
  return {
    id: a.id,
    numero_pedido: a.numeroPedido,
    nome: a.nome,
    telefone: a.telefone,
    email: a.email || '',
    cpf_cnpj: a.cpfCnpj || '',
    cep: a.cep || '',
    logradouro: a.logradouro || '',
    numero: a.numero || '',
    complemento: a.complemento || '',
    bairro: a.bairro || '',
    cidade: a.cidade || '',
    estado: a.estado || '',
    endereco: a.endereco || '',
    servico: a.servico,
    material: a.material,
    acabamento: a.acabamento || '',
    status: a.status,
    prioridade: a.prioridade || 'Normal',
    data_prevista: a.dataPrevista || '',
    hora_prevista: a.horaPrevista || '',
    data_medicao: a.dataMedicao || '',
    data_instalacao: a.dataInstalacao || '',
    responsavel: a.responsavel || '',
    orcamento: a.orcamento || 'R$ 0,00',
    desconto: a.desconto || 0,
    validade_orcamento: a.validadeOrcamento || '15 dias',
    condicoes_pagamento: a.condicoesPagamento || 'À vista ou 10x no cartão',
    itens_orcamento: a.itensOrcamento || [],
    obs: a.obs || '',
    criado_em: a.criadoEm || new Date().toISOString(),
    atualizado_em: a.atualizadoEm || new Date().toISOString(),
  };
}

// Convert Supabase row to application Atendimento (camelCase)
export function mapSupabaseRowToAtendimento(row: any): Atendimento {
  return {
    id: Number(row.id),
    numeroPedido: row.numero_pedido ? Number(row.numero_pedido) : undefined,
    nome: row.nome || '',
    telefone: row.telefone || '',
    email: row.email || '',
    cpfCnpj: row.cpf_cnpj || '',
    cep: row.cep || '',
    logradouro: row.logradouro || '',
    numero: row.numero || '',
    complemento: row.complemento || '',
    bairro: row.bairro || '',
    cidade: row.cidade || '',
    estado: row.estado || '',
    endereco: row.endereco || '',
    servico: row.servico || '',
    material: row.material || '',
    acabamento: row.acabamento || '',
    status: row.status || 'Novo Atendimento',
    prioridade: row.prioridade || 'Normal',
    dataPrevista: row.data_prevista || '',
    horaPrevista: row.hora_prevista || '',
    dataMedicao: row.data_medicao || '',
    dataInstalacao: row.data_instalacao || '',
    responsavel: row.responsavel || '',
    orcamento: row.orcamento || 'R$ 0,00',
    desconto: row.desconto || 0,
    validadeOrcamento: row.validade_orcamento || '15 dias',
    condicoesPagamento: row.condicoes_pagamento || '',
    itensOrcamento: Array.isArray(row.itens_orcamento) ? row.itens_orcamento : [],
    obs: row.obs || '',
    criadoEm: row.criado_em || new Date().toISOString(),
    atualizadoEm: row.atualizado_em || new Date().toISOString(),
  };
}

// Convert EmpresaConfig to Supabase row
export function mapEmpresaToSupabaseRow(e: EmpresaConfig): any {
  return {
    id: 'default',
    nome: e.nome,
    cnpj: e.cnpj || '',
    tel: e.tel || '',
    whatsapp: e.whatsapp || '',
    email: e.email || '',
    slogan: e.slogan || '',
    endereco: e.endereco || '',
    horario: e.horario || '',
    site: e.site || '',
    instagram: e.instagram || '',
    pix_key: e.pixKey || '',
    obs: e.obs || '',
    logo: e.logo || '',
    cor: e.cor || '#eab308',
    termos_padrao: e.termosPadrao || '',
    notif_status: e.notifStatus ?? true,
    notif_orcamento: e.notifOrcamento ?? true,
    notif_agendamento: e.notifAgendamento ?? true,
    notif_lembrete: e.notifLembrete ?? true,
    notif_alteracao: e.notifAlteracao ?? true,
    notif_finalizacao: e.notifFinalizacao ?? true,
    atualizado_em: new Date().toISOString(),
  };
}

// Convert Supabase row to EmpresaConfig
export function mapSupabaseRowToEmpresa(row: any): EmpresaConfig {
  return {
    nome: row.nome || 'Marmoraria Imperial Arte em Pedras',
    cnpj: row.cnpj || '',
    tel: row.tel || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    slogan: row.slogan || '',
    endereco: row.endereco || '',
    horario: row.horario || '',
    site: row.site || '',
    instagram: row.instagram || '',
    pixKey: row.pix_key || '',
    obs: row.obs || '',
    logo: row.logo || '',
    cor: row.cor || '#eab308',
    termosPadrao: row.termos_padrao || '',
    notifStatus: row.notif_status ?? true,
    notifOrcamento: row.notif_orcamento ?? true,
    notifAgendamento: row.notif_agendamento ?? true,
    notifLembrete: row.notif_lembrete ?? true,
    notifAlteracao: row.notif_alteracao ?? true,
    notifFinalizacao: row.notif_finalizacao ?? true,
  };
}
