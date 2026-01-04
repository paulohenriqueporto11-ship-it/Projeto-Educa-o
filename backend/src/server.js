const express = require('express');
const cors = require('cors');
// Importa Controllers existentes
const { enviarRedacao, obterEstatisticas } = require('./controllers/redacaoController');
// NOVO: Importa Controller do Cronograma (vamos criar no passo 2)
const cronogramaController = require('./controllers/cronogramaController');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- SEGURANÇA (Rate Limiter) ---
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const WINDOW_MS = 60 * 1000; 
    const MAX_REQUESTS = 20; // Aumentei um pouco para comportar as requests do cronograma

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

// --- ROTAS ---

// Rota de Teste
app.get('/', (req, res) => res.send('API Estuda.IA Online 🚀'));

// 1. Rotas de Redação (Já existiam)
app.post('/api/enviar-redacao', rateLimiter, enviarRedacao);
app.get('/api/estatisticas', obterEstatisticas);

// 2. NOVAS ROTAS DE CRONOGRAMA
// Pega todos os dados do usuário (XP, Streak, Histórico) ao abrir o site
app.get('/api/cronograma/dados', rateLimiter, cronogramaController.getDadosUsuario);

// Salva quando o aluno completa uma missão
app.post('/api/cronograma/concluir', rateLimiter, cronogramaController.concluirMissao);

// Salva as configurações (Matérias, Intensidade)
app.post('/api/cronograma/config', rateLimiter, cronogramaController.salvarConfig);

// (Opcional) Registra missão bônus
app.post('/api/cronograma/bonus', rateLimiter, cronogramaController.registrarBonus);


// Tratamento de erro global
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
