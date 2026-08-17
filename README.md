# Sistema de Gestão e CRM para Marmoraria (MAR100)

Sistema moderno e completo para gestão de atendimentos, orçamentos, cálculo por m² e acabamentos, agendamento de visitas técnicas com sincronização de calendário e disparo de mensagens via WhatsApp.

---

## 🚀 Funcionalidades Principais

- **📊 Dashboard & Métricas**: Visão geral de novos atendimentos, visitas agendadas, projetos em produção, faturamento previsto e taxas de conversão.
- **📋 Quadro Kanban & Lista**: Fluxo de status visual (Novo Atendimento ➔ Visita Agendada ➔ Medição Realizada ➔ Orçamento Enviado ➔ Aprovado ➔ Em Produção ➔ Instalação Agendada ➔ Concluído).
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

- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Vite**
- **Lucide React** (Ícones)
- **iCalendar RFC 5545 (.ics helper)**

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

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` (ou a porta indicada no terminal) no seu navegador.

### 4. Gerar build para produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## ☁️ Como Publicar / Hospedar Gratuitamente

### Na Vercel:
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **"Add New Project"** e selecione o repositório `MAR100-`.
3. O Vite será detectado automaticamente. Clique em **Deploy**.

### No Netlify:
1. Execute `npm run build` na sua máquina.
2. Acesse [app.netlify.com/drop](https://app.netlify.com/drop) e arraste a pasta `dist`.
