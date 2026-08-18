# Sistema de Gestão e CRM para Marmoraria (MAR100)

Sistema moderno e completo para gestão de atendimentos, orçamentos, cálculo por m² e acabamentos, agendamento de visitas técnicas com sincronização de calendário, disparo de mensagens via WhatsApp e integração com banco de dados **Supabase (PostgreSQL)** em tempo real.

---

## 🚀 Funcionalidades Principais

- **📊 Dashboard & Métricas**: Visão geral de novos atendimentos, visitas agendadas, projetos em produção, faturamento previsto e taxas de conversão.
- **📋 Quadro Kanban & Lista**: Fluxo de status visual (Novo Atendimento ➔ Visita Agendada ➔ Medição Realizada ➔ Orçamento Enviado ➔ Aprovado ➔ Em Produção ➔ Instalação Agendada ➔ Concluído).
- **🗄️ Banco de Dados Supabase (PostgreSQL)**:
  - Sincronização em tempo real (Realtime Channel).
  - Tabela `atendimentos` e `empresa_config` com Row Level Security (RLS).
  - Script SQL pronto para execução (`supabase_schema.sql`).
  - Painel de configuração no próprio sistema para conectar qualquer projeto Supabase.
- **📐 Calculadora de Orçamentos por Item**: Cálculo dinâmico por dimensões (Largura × Altura em metros), cálculo de m², acabamentos (meia-esquadria, bisotê, boleado), cuba, serviços adicionais e descontos.
- **📅 Sincronização de Calendário Multi-Canal**:
  - Integração direta com **Google Agenda** (1 clique para abrir e salvar).
  - Download de arquivo **`.ics`** para calendários de computador (Microsoft Outlook, Calendário do Windows, Apple Calendar).
  - Envio de lembrete com link do Google Agenda diretamente no **WhatsApp do cliente**.
- **💬 Central de Disparo WhatsApp**: Modelos automáticos personalizados para orçamento, visita de medição, status de produção e instalação.
- **📄 Geração & Impressão de PDF de Orçamento**: Layout profissional pronto para impressão ou salvamento em PDF.
- **⚙️ Configurações da Empresa**: Personalização de nome da marmoraria, CNPJ, dados de contato, WhatsApp e termos de garantia.

---

## 🛠️ Tecnologias Utilizadas

- **React 18 / 19**
- **TypeScript**
- **Tailwind CSS**
- **Vite**
- **Supabase JS Client (`@supabase/supabase-js`)**
- **Lucide React** (Ícones)
- **iCalendar RFC 5545 (.ics helper)**

---

## 🗄️ Como Configurar o Banco de Dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No menu lateral, acesse **SQL Editor**.
3. Abra o arquivo `supabase_schema.sql` deste repositório, copie todo o conteúdo e clique em **RUN** no Supabase.
4. No Supabase, vá em **Project Settings > API** e copie:
   - **Project URL**
   - **anon public API key**
5. No sistema, abra a aba **Ajustes**, cole as chaves no card **Banco de Dados Supabase** e clique em **Testar e Conectar**.
6. Pronto! Seus dados e atendimentos estarão 100% sincronizados em tempo real.

---

## 💻 Como Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/levisite-cloud/MAR100-.git
cd MAR100-
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente (Opcional)
Crie um arquivo `.env` baseado no `.env.example`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### 5. Gerar build para produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## ☁️ Como Publicar / Hospedar Gratuitamente

### Na Vercel:
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **"Add New Project"** e selecione o repositório `MAR100-`.
3. Adicione as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas configurações de Environment Variables se desejar.
4. Clique em **Deploy**.
