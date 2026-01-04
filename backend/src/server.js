const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importa as Rotas Modulares
const redacaoRoutes = require('./routes/redacaoRoutes');
const cronogramaRoutes = require('./routes/cronogramaRoutes');

const app = express();
const port = process.env.PORT || 3000;

// --- SEGURANÇA (Rate Limiter Global) ---
// É melhor definir aqui e usar globalmente ou passar como middleware
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const WINDOW_MS = 60 * 1000; 
    const MAX_REQUESTS = 30; // Ajustado para uso global

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

setInterval(() => requestCounts.clear(), 10 * 60 * 1000);

// --- MIDDLEWARES GLOBAIS ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter); // Aplica o limitador em TODAS as rotas abaixo

// --- DEFINIÇÃO DE ROTAS ---
app.get('/', (req, res) => res.send('API Estuda.IA Online 🚀'));

// Aqui a mágica acontece: O server "monta" os prefixos
app.use('/api', redacaoRoutes); // As rotas de redação ficarão em /api/enviar-redacao
app.use('/api/cronograma', cronogramaRoutes); // As rotas ficarão em /api/cronograma/dados, etc.

// Tratamento de erro
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(port, () => {
    console.log(`Servidor limpo rodando na porta ${port}`);
});
