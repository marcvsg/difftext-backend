const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
// Square Cloud define PORT automaticamente, mas usamos 80 como fallback
const PORT = process.env.PORT || 80;
const HOST = '0.0.0.0'; // Sempre escuta em todas as interfaces

// Middleware
app.use(cors({
  origin: [
    'https://difftxt.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '50mb' })); // Aumenta o limite para permitir textos grandes
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Rota para melhorar texto com Gemini
app.post('/api/improve-text', async (req, res) => {
  try {
    const { text, prompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key do Gemini não configurada' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

    const systemPrompt = `Você é um editor profissional de textos em Português. 
    E a sua tarefa é rever o texto fornecido corrigindo acentuação, pontuação e gramática. 
    Mantenha o tom original do texto. Retorne APENAS o texto corrigido.`;

    const userQuery = `Reveja o texto:\n\n${text}\n\nInstruções extra: ${prompt || 'Nenhuma'}`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    });

    const response = await result.response;
    const improvedText = response.text();

    res.json({ improvedText });

  } catch (error) {
    console.error('Erro ao processar texto:', error);
    res.status(500).json({ error: 'Erro ao processar o texto' });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DiffText Backend API',
    timestamp: new Date().toISOString() 
  });
});

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Escuta em 0.0.0.0 para permitir acesso externo (necessário para Square Cloud)
app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`Porta definida: ${PORT} (via ${process.env.PORT ? 'PORT env' : 'padrão'})`);
});
