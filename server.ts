import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
  }
} else {
  console.warn('GEMINI_API_KEY is not configured or has default value.');
}

// 1. API: Suggest Wiring Connection
app.post('/api/ai/suggest-wiring', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: 'Serviço de IA temporariamente indisponível. Por favor, adicione a sua chave de API nos Segredos (Secrets).'
    });
  }

  const { devices } = req.body;
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return res.status(400).json({ error: 'Nenhum dispositivo fornecido para sugestão.' });
  }

  const devicesList = devices.map(d => `${d.name} (tipo: ${d.type})`).join(', ');

  const prompt = `Você é um engenheiro eletrotécnico especialista em prototipagem rápida com Arduino, ESP32 e a placa de ensaio MB-102 (protoboard).
Dado o seguinte conjunto de dispositivos que o usuário deseja conectar na protoboard:
[${devicesList}]

Crie um plano de cabeamento passo a passo em PORTUGUÊS para conectar esses componentes de forma segura e limpa, evitando cruzamento excessivo de cabos e curto-circuitos.

Assuma que temos um barramento de alimentação (+ de cor vermelha, - de cor azul) no topo e na base.
Recomende conexões exatas, por exemplo:
- "Conecte o pino VCC do sensor DHT22 na coluna 5, linha A (que está conectada ao barramento positivo de 5V)"
- "Conecte o pino DATA do sensor DHT22 na coluna 6, linha A, e puxe um cabo para a porta D2 do Arduino Uno"

Você deve retornar a resposta estruturada em formato JSON contendo:
1. "overview": Uma breve introdução do circuito e plano geral em português.
2. "steps": Uma lista de passos instrucionais claros de cabeamento. Cada passo deve incluir:
   - "instruction": A instrução textual amigável em português (ex: "Conecte o GND do DHT22 ao barramento negativo")
   - "source": O identificador do furo de origem (ex: "e-5" ou "top-outer-5" ou "digital-2" se for um pino do microcontrolador)
   - "dest": O identificador do furo de destino (ex: "top-outer-10" ou "e-10")
   - "color": Uma cor de fio recomendada em formato hex (ex: vermelho para alimentação "#EF4444", preto/azul para GND "#1A1A1A", amarelo/verde para sinal)
   - "importance": "high" ou "medium" ou "low"

Dicas de coordenadas do MB-102:
- Furos superiores de energia: "top-inner-X" para positivo, "top-outer-X" para GND, onde X está entre 1 e 63 (segundo as regras de agrupamento).
- Furos inferiores de energia: "bottom-inner-X" para positivo, "bottom-outer-X" para GND, onde X está entre 1 e 63.
- Furos de terminal: "a-X" a "e-X" para a metade superior da placa, e "f-X" a "j-X" para a metade inferior da placa (onde X é de 1 a 63).

Por favor, faça conexões válidas e evite curtos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING },
                  source: { type: Type.STRING },
                  dest: { type: Type.STRING },
                  color: { type: Type.STRING },
                  importance: { type: Type.STRING }
                },
                required: ['instruction', 'source', 'dest', 'color']
              }
            }
          },
          required: ['overview', 'steps']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    res.json(data);
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestão de fiação: ' + error.message });
  }
});

// 2. API: Assistant Chat
app.post('/api/ai/chat', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: 'Serviço de IA indisponível. Verifique sua chave API.'
    });
  }

  const { message, history } = req.body;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: `Você é o "Mestre do MB-102", um assistente de IA extremamente prestativo, didático e bem-humorado integrado ao software "Organizador de Protoboard MB-102".
Seu objetivo é ajudar entusiastas, estudantes e engenheiros a montarem seus circuitos físicos na protoboard sem causar curto-circuitos ou queimar sensores.
Responda sempre em PORTUGUÊS de forma direta, clara e focada em hardware (Arduino, ESP32, sensores de temperatura, umidade, microfones, LEDs, resistores).
Dê dicas de boas práticas (ex: sempre desligar a fonte antes de alterar fios, colocar resistor de pull-up/pull-down quando necessário, usar fios de cores padronizadas).`,
      }
    });

    // Reconstruct history if provided
    if (history && Array.isArray(history)) {
      // Set history if needed, or simply send the context
    }

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Erro no chat do assistente: ' + error.message });
  }
});

// Serve assets based on environment
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
