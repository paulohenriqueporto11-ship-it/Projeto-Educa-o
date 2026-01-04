const express = require('express');
const cors = require('cors');
// Importa as duas funções do controller
const { enviarRedacao, obterEstatisticas } = require('./controllers/redacaoController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- SEGURANÇA (Rate Limiter) ---
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const WINDOW_MS = 60 * 1000; 
    const MAX_REQUESTS = 15; // Aumentei um pouco para testes

    const now = Date.now();
    if (!requestCounts.has(ip)) requestCounts.set(ip, []);
    
    const timestamps = requestCounts.get(ip).filter(time => now - time < WINDOW_MS);
    
    if (timestamps.length >= MAX_REQUESTS) {
        return res.status(429).json({ erro: "Muitas requisições. Aguarde 1 minuto." });
    }

    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    next();
};

// Limpeza de memória
setInterval(() => requestCounts.clear(), 10 * 60 * 1000);

// --- CONFIGURAÇÃO DO SERVIDOR ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rotas
app.get('/', (req, res) => res.send('API Redação Online 🚀'));
app.post('/api/enviar-redacao', rateLimiter, enviarRedacao);
app.get('/api/estatisticas', obterEstatisticas); // NOVA ROTA

// Tratamento de erro
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
