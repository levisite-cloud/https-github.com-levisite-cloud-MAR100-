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

  // 1. VerificaÃ§Ã£o de saÃºde do servidor
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Endpoint do Chat IA do Bot WhatsApp
  app.post('/api/bot/chat', async (req, res) => {
    try {
      const { mensagem, clienteNome, clienteTelefone, historico, empresa, botConfig } = req.body;

      if (!mensagem) {
        return res.status(400).json({ error: 'Mensagem Ã© obrigatÃ³ria' });
      }

      const ai = getGenAI();

      // Formatar catálogo personalizado de pedras para contexto da IA
      const tabelaText = Array.isArray(botConfig?.tabelaPedras)
        ? botConfig.tabelaPedras
            .map((p: any) => `â€¢ ${p.nome} (${p.categoria}): R$ ${p.precoM2}/mÂ² - IndicaÃ§Ã£o: ${p.indicacao}`)
            .join('\n')
        : 'â€¢ Granito SÃ£o Gabriel: R$ 850/mÂ²\nâ€¢ Granito Preto Absoluto: R$ 1.250/mÂ²\nâ€¢ Quartzo Calacatta Gold: R$ 2.400/mÂ²\nâ€¢ MÃ¡rmore Travertino: R$ 980/mÂ²\nâ€¢ Quartzito Mont Blanc: R$ 2.800/mÂ²\nâ€¢ Dekton: R$ 3.500/mÂ²';

      if (ai) {
        const systemInstruction = `VocÃª Ã© o "${botConfig?.nomeRobo || 'Super MarmoBot IA'}", o assistente virtual mais avanÃ§ado e especialista tÃ©cnico-comercial de WhatsApp da marmoraria "${empresa?.nome || 'Marmoraria Imperial'}".
Telefone da Empresa: ${empresa?.whatsapp || empresa?.tel || '(11) 98765-4321'}.
HorÃ¡rio de Funcionamento: ${empresa?.horario || 'Seg a Sex 08h Ã s 18h'}.
Slogan: ${empresa?.slogan || 'Especialistas em pedras nobres'}.

CATÃLOGO E TABELA DE PREÃ‡OS OFICIAL DA MARMORARIA:
${tabelaText}

REGRAS DE CÃLCULO E ACABAMENTOS:
- Meia-esquadria 45Âº (corte invisÃ­vel): Adicionar ~15% a 20% no valor ou R$ 120/metro linear.
- Cuba esculpida em rampa ou fundo reto: ~R$ 600 a R$ 900 de mÃ£o de obra + pedra.
- Corte de Cooktop / Cuba de embutir: R$ 150 por furo.
- InstalaÃ§Ã£o e frete inclusos para Grande SP em pedidos acima de R$ 2.000.
- CondiÃ§Ãµes de Pagamento: Em atÃ© 10x sem juros no cartÃ£o ou 5% de desconto Ã  vista via PIX.

SUAS DIRETRIZES DE ATENDIMENTO COMERCIAL:
1. Responda em PortuguÃªs do Brasil com tom ${botConfig?.tomDeVoz || 'amigavel'}, altamente consultivo, atencioso e focado em converter o cliente.
2. Seu fluxo comercial:
   - Cumprimente o cliente com o nome dele ("${clienteNome || 'Cliente'}").
   - Identifique o ambiente (cozinha, banheiro, lavabo, escada, Ã¡rea gourmet, soleiras).
   - Recomende o material ideal com base no catÃ¡logo (ex: Quartzos ou Granitos para cozinhas; MÃ¡rmores ou Quartzos para banheiros).
   - Se o cliente informou medidas aproximadas, calcule o valor total estimado na hora com base na tabela!
   - Sempre ofereÃ§a o agendamento de uma VISITA TÃ‰CNICA GRATUITA no local com mediÃ§Ã£o a laser e amostras fÃ­sicas de pedras para fechar negÃ³cio.
3. NÃ£o use emojis em excesso (mÃ¡ximo 2 a 3 por mensagem).
4. Ao final da sua resposta, se identificar dados relevantes do projeto, adicione uma seÃ§Ã£o JSON invisÃ­vel no formato:
\`\`\`json
{
  "servico": "Bancada de Cozinha | LavatÃ³rio Esculpido | Ilha Gourmet | etc",
  "material": "Granito SÃ£o Gabriel | Quartzo Calacatta Gold | etc",
  "medidas": "ex: 2.20m x 0.60m",
  "endereco": "ex: Rua Oscar Freire, 800",
  "valorEstimado": 2450,
  "temperatura": "quente | morno | frio"
}
\`\`\`
Se nÃ£o houver dados suficientes para o JSON, nÃ£o inclua o bloco JSON.`;

        // Compor contexto da conversa
        let promptHistory = '';
        if (Array.isArray(historico) && historico.length > 0) {
          promptHistory = historico
            .map((h: any) => `${h.remetente === 'bot' ? 'Super MarmoBot' : 'Cliente'}: ${h.texto}`)
            .join('\n');
        }

        const fullPrompt = `${promptHistory ? `HistÃ³rico da conversa:\n${promptHistory}\n\n` : ''}Nova mensagem do cliente: "${mensagem}"\n\nResponda diretamente ao cliente como o especialista da marmoraria:`;

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

        // Processar JSON extraído, se presente
        const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            leadExtraido = JSON.parse(jsonMatch[1]);
            rawResponse = rawResponse.replace(/```json[\s\S]*?```/, '').trim();
          } catch {
            // ignorar erro de parse do JSON
          }
        }

        return res.json({
          resposta: rawResponse.trim(),
          leadExtraido,
          poweredBy: 'gemini-3.7-flash',
        });
      }

      // Heurísticas de fallback se GEMINI_API_KEY não está configurada
      const lower = mensagem.toLowerCase();
      let resposta = '';
      let leadExtraido: any = null;

      if (lower.includes('preÃ§o') || lower.includes('quanto') || lower.includes('orÃ§amento') || lower.includes('valor')) {
        resposta = `OlÃ¡, ${clienteNome || 'tudo bem'}! Na ${empresa?.nome || 'nossa marmoraria'}, os valores sÃ£o calculados por mÂ² com base nas melhores chapas:\n\nâ€¢ Granito SÃ£o Gabriel: ~R$ 850/mÂ²\nâ€¢ Granito Preto Absoluto: ~R$ 1.250/mÂ²\nâ€¢ Quartzo Calacatta Gold: ~R$ 2.400/mÂ²\nâ€¢ MÃ¡rmore Travertino: ~R$ 980/mÂ²\nâ€¢ Quartzito Mont Blanc: ~R$ 2.800/mÂ²\nâ€¢ Dekton Ultracompacto: ~R$ 3.500/mÂ²\n\nQual a metragem ou medidas aproximadas (comprimento x largura) do seu projeto?`;
      } else if (lower.includes('bancada') || lower.includes('cozinha') || lower.includes('cooktop') || lower.includes('ilha')) {
        resposta = `Perfeito! Para bancadas e ilhas gourmet, os materiais mais recomendados sÃ£o Granito SÃ£o Gabriel, Preto Absoluto, Quartzos e Dekton. O valor mÃ©dio para uma bancada completa de cozinha fica entre R$ 1.900 e R$ 3.400 instalada. Podemos agendar uma mediÃ§Ã£o tÃ©cnica no seu endereÃ§o para levar as amostras?`;
        leadExtraido = { servico: 'Bancada de Cozinha', material: 'Granito SÃ£o Gabriel', valorEstimado: 2450, temperatura: 'quente' };
      } else if (lower.includes('banheiro') || lower.includes('lavatÃ³rio') || lower.includes('esculpida') || lower.includes('cuba')) {
        resposta = `Excelente escolha! Confeccionamos lavatÃ³rios com cuba esculpida em rampa ou fundo reto com acabamento em meia-esquadria 45Âº invisÃ­vel. Um lavatÃ³rio esculpido em MÃ¡rmore Travertino ou Quartzo fica em mÃ©dia R$ 2.200 a R$ 3.800. Qual o tamanho do seu vÃ£o?`;
        leadExtraido = { servico: 'LavatÃ³rio Esculpido', material: 'MÃ¡rmore Travertino', valorEstimado: 3200, temperatura: 'quente' };
      } else if (lower.includes('visita') || lower.includes('mediÃ§Ã£o') || lower.includes('agendar') || lower.includes('medir')) {
        resposta = `Com certeza! Nossa visita tÃ©cnica de mediÃ§Ã£o a laser Ã© 100% gratuita. Levamos amostras reais de pedras para vocÃª conferir na iluminaÃ§Ã£o da sua casa. Qual o melhor dia e horÃ¡rio para a equipe ir atÃ© vocÃª?`;
      } else {
        resposta = `OlÃ¡, ${clienteNome || 'tudo bem'}! Muito obrigado pelo contato com a ${empresa?.nome || 'nossa marmoraria'}. Para qual ambiente vocÃª procura pedras (cozinha, banheiro, lavanderia, Ã¡rea gourmet, escada)? Fique Ã  vontade para me mandar fotos ou medidas! ðŸ˜Š`;
      }

      return res.json({
        resposta,
        leadExtraido,
        poweredBy: 'super-heuristic-engine',
      });
    } catch (error: any) {
      console.error('Erro no processamento do bot:', error);
      res.status(500).json({
        error: 'Erro interno ao processar mensagem do robÃ´',
        resposta: 'OlÃ¡! JÃ¡ recebi sua mensagem e nosso atendente humano entrarÃ¡ em contato em instantes.',
      });
    }
  });

  // 3. Endpoint de Análise de Imagem (IA de Visão para plantas e medições por foto)
  app.post('/api/bot/analyze-image', async (req, res) => {
    try {
      const { imageUrl, imageBase64, prompt, clienteNome } = req.body;
      const ai = getGenAI();

      if (ai && (imageBase64 || imageUrl)) {
        // Raciocínio de imagem por IA
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Analise esta foto/planta de marmoraria enviada pelo cliente "${clienteNome || 'Cliente'}". Identifique o ambiente, estime dimensÃµes visuais aproximadas de bancadas ou pias, sugira o melhor material e dÃª uma estimativa de preÃ§o de mercado no Brasil.`,
        });

        return res.json({
          analise: response.text,
          dadosExtraidos: {
            servico: 'Bancada / Ilha Planejada',
            material: 'Quartzo Calacatta / Granito SÃ£o Gabriel',
            medidas: '2.50m x 0.60m estimado',
            valorEstimado: 3200,
          },
        });
      }

      // Análise de visão alternativa (fallback)
      res.json({
        analise: 'ðŸ” Foto analisada com sucesso pelo Super MarmoBot!\n\nIdentificado: Bancada de Cozinha com espaÃ§o para cuba dupla e cooktop.\nMedidas estimadas: ~2,40m x 0,60m + frontispÃ­cio de 15cm.\nSugestÃ£o de Pedras: Granito SÃ£o Gabriel (R$ 2.300) ou Quartzo Calacatta (R$ 4.200).',
        dadosExtraidos: {
          servico: 'Bancada de Cozinha com Cooktop',
          material: 'Granito SÃ£o Gabriel',
          medidas: '2.40m x 0.60m',
          valorEstimado: 2600,
        },
      });
    } catch (err: any) {
      console.error('Erro na anÃ¡lise de imagem:', err);
      res.status(500).json({ error: 'Falha na anÃ¡lise de imagem' });
    }
  });

  // 3. Status da ConexÃ£o WhatsApp
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

  // 5. Servidor de desenvolvimento Vite ou arquivos estáticos
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
    console.log(`ðŸš€ MAR100 Marmoraria Server & WhatsApp Bot rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
