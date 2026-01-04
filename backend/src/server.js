const express = require('express');
const cors = require('cors');
require('dotenv').config();

// IMPORTANTE: Adicionei o .js no final para garantir que o Linux encontre
const redacaoRoutes = require('./routes/redacaoRoutes.js');
const cronogramaRoutes = require('./routes/cronogramaRoutes.js');

const app = express();
const port = process.env.PORT || 3000;

// --- SEGURANÇA (Rate Limiter Global) ---
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const WINDOW_MS = 60 * 1000; 
    const MAX_REQUESTS = 30; 

    const now = Date.now();
    if (!requestCounts.has(ip)) requestCounts.set(ip, []);
    
    const timestamps = requestCounts.get(ip).filter(time => now - time < WINDOW_MS);
    
    if (timestamps.length >= MAX_REQUESTS) {
        return res.status(429).json({ erro: "Muitas requisições. Aguarde." });
    }

    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    next();
};

// Limpa memória do Rate Limiter a cada 10 min
setInterval(() => requestCounts.clear(), 10 * 60 * 1000);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter); 

// --- ROTAS ---
app.get('/', (req, res) => res.send('API Estuda.IA Online 🚀'));

// Rotas de Redação (Prefixo /api)
// Ex: POST /api/enviar-redacao
app.use('/api', redacaoRoutes); 

// Rotas de Cronograma (Prefixo /api/cronograma)
// Ex: GET /api/cronograma/dados
app.use('/api/cronograma', cronogramaRoutes); 

// Tratamento de erro 404 (Rota não encontrada)
app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
});

// Tratamento de erro Global (500)
app.use((err, req, res, next) => {
    console.error("ERRO NO SERVIDOR:", err);
    res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
