// src/server.js
const express = require('express');
const cors = require('cors');
const { enviarRedacao } = require('./controllers/redacaoController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ==================================================================
// 🛡️ SISTEMA DE SEGURANÇA (RATE LIMITER MANUAL)
// ==================================================================
// Isso impede que um aluno trave o servidor mandando mil redações
const requestCounts = new Map();

const rateLimiter = (req, res, next) => {
    // Pega o IP do aluno (funciona mesmo no Render/Proxies)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Configuração: Máximo 10 tentativas a cada 1 minuto por aluno
    const WINDOW_MS = 60 * 1000; // 1 minuto
    const MAX_REQUESTS = 10;

    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }

    const timestamps = requestCounts.get(ip);
    
    // Remove registros antigos (mais velhos que 1 minuto)
    const timestampsRecentes = timestamps.filter(time => now - time < WINDOW_MS);
    
    if (timestampsRecentes.length >= MAX_REQUESTS) {
        // SE O ALUNO EXAGERAR: O servidor rejeita e protege a memória
        return res.status(429).json({ 
            erro: "✋ Calma! Você enviou muitas requisições. Espere 1 minuto." 
        });
    }

    // Se estiver tudo ok, adiciona o timestamp atual e libera
    timestampsRecentes.push(now);
    requestCounts.set(ip, timestampsRecentes);
    
    next(); // Passa para a correção
};

// Limpeza automática da memória do Rate Limiter a cada 10 mins
setInterval(() => {
    requestCounts.clear();
}, 10 * 60 * 1000);

// ==================================================================
// 🚀 CONFIGURAÇÕES DO SERVIDOR
// ==================================================================

app.use(cors()); // Libera acesso do Frontend
app.use(express.json({ limit: '1mb' })); // Protege contra textos gigantescos (>1MB)

// Rota de Teste (Ping)
app.get('/', (req, res) => {
    res.send('🛡️ API Redação 7.0 (Protected) - Online');
});

// Rota Principal (Com o porteiro de segurança ativado)
app.post('/api/enviar-redacao', rateLimiter, enviarRedacao);

// Tratamento de Erro Global (Pra não crashar nunca)
app.use((err, req, res, next) => {
    console.error("Erro não tratado capturado:", err);
    res.status(500).json({ erro: "Erro interno no servidor, mas não caí!" });
});

app.listen(port, () => {
    console.log(`✅ Servidor Blindado rodando na porta ${port}`);
});
