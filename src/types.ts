export type StatusAtendimento =
  | 'Novo Atendimento'
  | 'Visita Agendada'
  | 'Medição Realizada'
  | 'Orçamento Enviado'
  | 'Aprovado'
  | 'Em Produção'
  | 'Instalação Agendada'
  | 'Concluído';

export type PrioridadeAtendimento = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';

export type TipoServico =
  | 'Bancada de Cozinha'
  | 'Bancada de Banheiro'
  | 'Ilha Gourmet'
  | 'Lavatório Esculpido'
  | 'Piso de Mármore'
  | 'Piso de Granito'
  | 'Soleira'
  | 'Peitoril'
  | 'Escada'
  | 'Revestimento de Parede'
  | 'Tampo de Mesa'
  | 'Churrasqueira'
  | 'Outros';

export type TipoMaterial =
  | 'Granito São Gabriel'
  | 'Granito Preto Absoluto'
  | 'Granito Branco Siena'
  | 'Granito Ocre Itabira'
  | 'Mármore Travertino Nacional'
  | 'Mármore Travertino Romano'
  | 'Mármore Branco Paraná'
  | 'Mármore Nero Marquina'
  | 'Mármore Carrara'
  | 'Quartzo Branco Stellar'
  | 'Quartzo Calacatta'
  | 'Quartzo Preto Stellar'
  | 'Super Nano Glass'
  | 'Dekton / Ultracompacto'
  | 'Prime / Marmoglass'
  | 'Outro Material';

export interface ItemOrcamento {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: 'un' | 'm²' | 'm' | 'pç';
  valorUnit: number;
}

export interface Atendimento {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  cpfCnpj?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  endereco: string;
  servico: string;
  material: string;
  acabamento?: string;
  status: StatusAtendimento;
  prioridade: PrioridadeAtendimento;
  dataPrevista: string;
  horaPrevista?: string;
  dataMedicao?: string;
  dataInstalacao?: string;
  responsavel: string;
  orcamento: string;
  desconto?: number;
  validadeOrcamento?: string;
  condicoesPagamento?: string;
  itensOrcamento: ItemOrcamento[];
  obs?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface EmpresaConfig {
  nome: string;
  cnpj: string;
  tel: string;
  whatsapp: string;
  email: string;
  slogan: string;
  endereco: string;
  horario: string;
  site: string;
  instagram: string;
  pixKey: string;
  obs: string;
  logo: string;
  cor: string;
  termosPadrao: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type ViewType = 'dashboard' | 'kanban' | 'atendimentos' | 'novo' | 'config';

