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

export type ViewType = 'dashboard' | 'kanban' | 'atendimentos' | 'novo' | 'config' | 'bot';

export type BotConnectionStatus = 'disconnected' | 'pairing' | 'connected';

export interface ChatAttachment {
  type: 'image' | 'audio' | 'document' | 'orcamento_pdf';
  url?: string;
  nome?: string;
  tamanho?: string;
  previewUrl?: string;
  dadosOrcamento?: {
    material: string;
    servico: string;
    medidas: string;
    valor: number;
    condicoes: string;
  };
}

export interface ChatMessage {
  id: string;
  remetente: 'bot' | 'cliente' | 'atendente';
  texto: string;
  horario: string;
  statusEnvio?: 'enviado' | 'entregue' | 'lido';
  anexo?: ChatAttachment;
  audioDuration?: number;
}

export interface ConversaWhatsApp {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  fotoUrl?: string;
  ultimaMensagem: string;
  horario: string;
  mensagensNaoLidas: number;
  statusLead: 'novo' | 'em_atendimento' | 'cadastrado_kanban' | 'finalizado';
  temperatura?: 'frio' | 'morno' | 'quente';
  origem?: 'WhatsApp Orgânico' | 'Instagram Ads' | 'Indicação Arquiteto' | 'Google';
  dadosExtraidos?: {
    servico?: string;
    material?: string;
    medidas?: string;
    endereco?: string;
    valorEstimado?: number;
    observacoes?: string;
  };
  mensagens: ChatMessage[];
}

export interface ItemTabelaPedra {
  id: string;
  nome: string;
  categoria: 'Granito' | 'Mármore' | 'Quartzo' | 'Quartzito' | 'Dekton / Ultracompacto' | 'Outros';
  precoM2: number;
  corHex: string;
  indicacao: 'Cozinhas e Áreas Gourmet' | 'Banheiros e Lavatórios' | 'Áreas Nobres e Internas' | 'Universal';
  porosidade: 'Muito Baixa' | 'Baixa' | 'Média';
  descricao: string;
}

export interface SuperBotSkill {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  icone: string;
}

export interface BotConfig {
  ativo: boolean;
  nomeRobo: string;
  saudacao: string;
  horarioInicio: string;
  horarioFim: string;
  msgForaHorario: string;
  autoCadastroKanban: boolean;
  tomDeVoz: 'amigavel' | 'profissional' | 'direto';
  telefoneConectado: string;
  bateria: number;
  conectadoEm?: string;
  totalAtendimentosBot: number;
  pedrasSugeridas: string[];
  autoFollowUp24h: boolean;
  gerarPdfProposta: boolean;
  vozAtiva: boolean;
  tabelaPedras: ItemTabelaPedra[];
  skills: SuperBotSkill[];
}
