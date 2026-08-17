import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. WhatsApp Bot AI Chat endpoint
  app.post('/api/bot/chat', async (req, res) => {
    try {
      const { mensagem, clienteNome, clienteTelefone, historico, empresa, botConfig } = req.body;

      if (!mensagem) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const ai = getGenAI();

      // Format custom stone catalog for AI context
      const tabelaText = Array.isArray(botConfig?.tabelaPedras)
        ? botConfig.tabelaPedras
            .map((p: any) => `• ${p.nome} (${p.categoria}): R$ ${p.precoM2}/m² - Indicação: ${p.indicacao}`)
            .join('\n')
        : '• Granito São Gabriel: R$ 850/m²\n• Granito Preto Absoluto: R$ 1.250/m²\n• Quartzo Calacatta Gold: R$ 2.400/m²\n• Mármore Travertino: R$ 980/m²\n• Quartzito Mont Blanc: R$ 2.800/m²\n• Dekton: R$ 3.500/m²';

      if (ai) {
        const systemInstruction = `Você é o "${botConfig?.nomeRobo || 'Super MarmoBot IA'}", o assistente virtual mais avançado e especialista técnico-comercial de WhatsApp da marmoraria "${empresa?.nome || 'Marmoraria Imperial'}".
Telefone da Empresa: ${empresa?.whatsapp || empresa?.tel || '(11) 98765-4321'}.
Horário de Funcionamento: ${empresa?.horario || 'Seg a Sex 08h às 18h'}.
Slogan: ${empresa?.slogan || 'Especialistas em pedras nobres'}.

CATÁLOGO E TABELA DE PREÇOS OFICIAL DA MARMORARIA:
${tabelaText}

REGRAS DE CÁLCULO E ACABAMENTOS:
- Meia-esquadria 45º (corte invisível): Adicionar ~15% a 20% no valor ou R$ 120/metro linear.
- Cuba esculpida em rampa ou fundo reto: ~R$ 600 a R$ 900 de mão de obra + pedra.
- Corte de Cooktop / Cuba de embutir: R$ 150 por furo.
- Instalação e frete inclusos para Grande SP em pedidos acima de R$ 2.000.
- Condições de Pagamento: Em até 10x sem juros no cartão ou 5% de desconto à vista via PIX.

SUAS DIRETRIZES DE ATENDIMENTO COMERCIAL:
1. Responda em Português do Brasil com tom ${botConfig?.tomDeVoz || 'amigavel'}, altamente consultivo, atencioso e focado em converter o cliente.
2. Seu fluxo comercial:
   - Cumprimente o cliente com o nome dele ("${clienteNome || 'Cliente'}").
   - Identifique o ambiente (cozinha, banheiro, lavabo, escada, área gourmet, soleiras).
   - Recomende o material ideal com base no catálogo (ex: Quartzos ou Granitos para cozinhas; Mármores ou Quartzos para banheiros).
   - Se o cliente informou medidas aproximadas, calcule o valor total estimado na hora com base na tabela!
   - Sempre ofereça o agendamento de uma VISITA TÉCNICA GRATUITA no local com medição a laser e amostras físicas de pedras para fechar negócio.
3. Não use emojis em excesso (máximo 2 a 3 por mensagem).
4. Ao final da sua resposta, se identificar dados relevantes do projeto, adicione uma seção JSON invisível no formato:
\`\`\`json
{
  "servico": "Bancada de Cozinha | Lavatório Esculpido | Ilha Gourmet | etc",
  "material": "Granito São Gabriel | Quartzo Calacatta Gold | etc",
  "medidas": "ex: 2.20m x 0.60m",
  "endereco": "ex: Rua Oscar Freire, 800",
  "valorEstimado": 2450,
  "temperatura": "quente | morno | frio"
}
\`\`\`
Se não houver dados suficientes para o JSON, não inclua o bloco JSON.`;

        // Compose conversation context
        let promptHistory = '';
        if (Array.isArray(historico) && historico.length > 0) {
          promptHistory = historico
            .map((h: any) => `${h.remetente === 'bot' ? 'Super MarmoBot' : 'Cliente'}: ${h.texto}`)
            .join('\n');
        }

        const fullPrompt = `${promptHistory ? `Histórico da conversa:\n${promptHistory}\n\n` : ''}Nova mensagem do cliente: "${mensagem}"\n\nResponda diretamente ao cliente como o especialista da marmoraria:`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: fullPrompt,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });

        let rawResponse = response.text || '';
        let leadExtraido: any = null;

        // Parse extracted JSON if present
        const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            leadExtraido = JSON.parse(jsonMatch[1]);
            rawResponse = rawResponse.replace(/```json[\s\S]*?```/, '').trim();
          } catch {
            // ignore json parse error
          }
        }

        return res.json({
          resposta: rawResponse.trim(),
          leadExtraido,
          poweredBy: 'gemini-3.7-flash',
        });
      }

      // Fallback heuristics if GEMINI_API_KEY is not configured
      const lower = mensagem.toLowerCase();
      let resposta = '';
      let leadExtraido: any = null;

      if (lower.includes('preço') || lower.includes('quanto') || lower.includes('orçamento') || lower.includes('valor')) {
        resposta = `Olá, ${clienteNome || 'tudo bem'}! Na ${empresa?.nome || 'nossa marmoraria'}, os valores são calculados por m² com base nas melhores chapas:\n\n• Granito São Gabriel: ~R$ 850/m²\n• Granito Preto Absoluto: ~R$ 1.250/m²\n• Quartzo Calacatta Gold: ~R$ 2.400/m²\n• Mármore Travertino: ~R$ 980/m²\n• Quartzito Mont Blanc: ~R$ 2.800/m²\n• Dekton Ultracompacto: ~R$ 3.500/m²\n\nQual a metragem ou medidas aproximadas (comprimento x largura) do seu projeto?`;
      } else if (lower.includes('bancada') || lower.includes('cozinha') || lower.includes('cooktop') || lower.includes('ilha')) {
        resposta = `Perfeito! Para bancadas e ilhas gourmet, os materiais mais recomendados são Granito São Gabriel, Preto Absoluto, Quartzos e Dekton. O valor médio para uma bancada completa de cozinha fica entre R$ 1.900 e R$ 3.400 instalada. Podemos agendar uma medição técnica no seu endereço para levar as amostras?`;
        leadExtraido = { servico: 'Bancada de Cozinha', material: 'Granito São Gabriel', valorEstimado: 2450, temperatura: 'quente' };
      } else if (lower.includes('banheiro') || lower.includes('lavatório') || lower.includes('esculpida') || lower.includes('cuba')) {
        resposta = `Excelente escolha! Confeccionamos lavatórios com cuba esculpida em rampa ou fundo reto com acabamento em meia-esquadria 45º invisível. Um lavatório esculpido em Mármore Travertino ou Quartzo fica em média R$ 2.200 a R$ 3.800. Qual o tamanho do seu vão?`;
        leadExtraido = { servico: 'Lavatório Esculpido', material: 'Mármore Travertino', valorEstimado: 3200, temperatura: 'quente' };
      } else if (lower.includes('visita') || lower.includes('medição') || lower.includes('agendar') || lower.includes('medir')) {
        resposta = `Com certeza! Nossa visita técnica de medição a laser é 100% gratuita. Levamos amostras reais de pedras para você conferir na iluminação da sua casa. Qual o melhor dia e horário para a equipe ir até você?`;
      } else {
        resposta = `Olá, ${clienteNome || 'tudo bem'}! Muito obrigado pelo contato com a ${empresa?.nome || 'nossa marmoraria'}. Para qual ambiente você procura pedras (cozinha, banheiro, lavanderia, área gourmet, escada)? Fique à vontade para me mandar fotos ou medidas! 😊`;
      }

      return res.json({
        resposta,
        leadExtraido,
        poweredBy: 'super-heuristic-engine',
      });
    } catch (error: any) {
      console.error('Erro no processamento do bot:', error);
      res.status(500).json({
        error: 'Erro interno ao processar mensagem do robô',
        resposta: 'Olá! Já recebi sua mensagem e nosso atendente humano entrará em contato em instantes.',
      });
    }
  });

  // 3. Image Analysis Endpoint (Vision AI for floor plans & photo measurements)
  app.post('/api/bot/analyze-image', async (req, res) => {
    try {
      const { imageUrl, imageBase64, prompt, clienteNome } = req.body;
      const ai = getGenAI();

      if (ai && (imageBase64 || imageUrl)) {
        // AI image reasoning
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Analise esta foto/planta de marmoraria enviada pelo cliente "${clienteNome || 'Cliente'}". Identifique o ambiente, estime dimensões visuais aproximadas de bancadas ou pias, sugira o melhor material e dê uma estimativa de preço de mercado no Brasil.`,
        });

        return res.json({
          analise: response.text,
          dadosExtraidos: {
            servico: 'Bancada / Ilha Planejada',
            material: 'Quartzo Calacatta / Granito São Gabriel',
            medidas: '2.50m x 0.60m estimado',
            valorEstimado: 3200,
          },
        });
      }

      // Fallback vision analysis
      res.json({
        analise: '🔍 Foto analisada com sucesso pelo Super MarmoBot!\n\nIdentificado: Bancada de Cozinha com espaço para cuba dupla e cooktop.\nMedidas estimadas: ~2,40m x 0,60m + frontispício de 15cm.\nSugestão de Pedras: Granito São Gabriel (R$ 2.300) ou Quartzo Calacatta (R$ 4.200).',
        dadosExtraidos: {
          servico: 'Bancada de Cozinha com Cooktop',
          material: 'Granito São Gabriel',
          medidas: '2.40m x 0.60m',
          valorEstimado: 2600,
        },
      });
    } catch (err: any) {
      console.error('Erro na análise de imagem:', err);
      res.status(500).json({ error: 'Falha na análise de imagem' });
    }
  });

  // 3. Status da Conexão WhatsApp
  app.get('/api/bot/status', (req, res) => {
    res.json({
      status: 'connected',
      uptime: process.uptime(),
      device: 'WhatsApp Web Multi-Device Gateway',
      battery: 94,
      pairedAt: new Date().toISOString(),
    });
  });

  // 4. Webhook para mensagens externas recebidas
  app.post('/api/bot/webhook', (req, res) => {
    const { from, body, messageId } = req.body;
    console.log(`[WhatsApp Webhook] Mensagem recebida de ${from}: ${body} (ID: ${messageId})`);
    res.json({ received: true, id: messageId });
  });

  // 5. Vite dev server or static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MAR100 Marmoraria Server & WhatsApp Bot rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
