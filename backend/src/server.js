const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Tenta importar a IA. Se der erro, avisa, mas não derruba o server
let corrigirRedacao;
try {
    // Tenta achar na mesma pasta ou na pasta ia_engine
    corrigirRedacao = require('./ia_engine/corretor').corrigirRedacao;
} catch (e) {
    try {
        corrigirRedacao = require('../ia_engine/corretor').corrigirRedacao;
    } catch (e2) {
        console.error("ERRO CRÍTICO: Não achei o arquivo corretor.js");
    }
}

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- SEGURANÇA (Rate Limiter Simplificado) ---
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    if (!requestCounts.has(ip)) requestCounts.set(ip, []);
    const timestamps = requestCounts.get(ip).filter(time => now - time < 60000);
    if (timestamps.length >= 40) return res.status(429).json({ erro: "Muitas requisições." });
    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    next();
};
setInterval(() => requestCounts.clear(), 10 * 60 * 1000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimiter);

// --- LOGICA INTERNA (CONTROLLERS EMBUTIDOS) ---

// Helper
const getUserId = (req) => req.headers['x-user-id'];

// 1. Lógica do Cronograma
const cronograma = {
    getDados: async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(400).json({ erro: "ID necessário" });

            const [profile, config, history] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('user_config').select('*').eq('user_id', userId).single(),
                supabase.from('study_history').select('*').eq('user_id', userId).limit(500)
            ]);

            const historyMap = {};
            if (history.data) {
                history.data.forEach(h => {
                    if (!historyMap[h.completed_at]) historyMap[h.completed_at] = [];
                    historyMap[h.completed_at].push(h.mission_id);
                });
            }

            res.json({
                user: profile.data || { xp: 0, streak: 0, level: 1 },
                config: config.data || { subjects: ['red'], intensity: 'medio' },
                history: historyMap
            });
        } catch (e) { res.status(500).json({ erro: "Erro ao buscar dados" }); }
    },

    concluir: async (req, res) => {
        try {
            const userId = getUserId(req);
            const { missionId, xpEarned, date } = req.body;
            
            await supabase.from('study_history').insert({ user_id: userId, mission_id: missionId, xp_earned: xpEarned, completed_at: date });
            
            // Atualiza perfil (lógica simplificada de streak)
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            const currentXp = (profile?.xp || 0) + xpEarned;
            await supabase.from('profiles').upsert({ id: userId, xp: currentXp, last_login: new Date().toISOString() });

            res.json({ sucesso: true, newXp: currentXp });
        } catch (e) { res.status(500).json({ erro: "Erro ao salvar" }); }
    },

    salvarConfig: async (req, res) => {
        try {
            const userId = getUserId(req);
            const { subjects, intensity } = req.body;
            await supabase.from('user_config').upsert({ user_id: userId, subjects, intensity });
            res.json({ sucesso: true });
        } catch (e) { res.status(500).json({ erro: "Erro ao configurar" }); }
    }
};

// 2. Lógica de Redação
const redacao = {
    enviar: async (req, res) => {
        const { texto, tema, userId } = req.body;
        if (!texto) return res.status(400).json({ erro: 'Texto obrigatório' });

        try {
            if (!corrigirRedacao) throw new Error("IA Engine não carregada");
            
            const resultadoIA = corrigirRedacao(texto, tema || "Livre");
            
            // Salva
            await supabase.from('redacoes').insert([{ 
                texto_redacao: texto, tema, nota_geral: resultadoIA.notaFinal, 
                detalhes_json: resultadoIA, user_id: userId || 'anonimo' 
            }]);

            res.json({ sucesso: true, resultado: resultadoIA });
        } catch (err) {
            console.error(err);
            res.status(500).json({ erro: 'Erro interno' });
        }
    },
    
    stats: async (req, res) => {
        const userId = req.headers['x-user-id'] || req.query.userId;
        if (!userId) return res.json({ total: 0, media: 0 });
        const { data } = await supabase.from('redacoes').select('nota_geral').eq('user_id', userId);
        const total = data?.length || 0;
        const soma = data?.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0) || 0;
        res.json({ total, media: total ? Math.round(soma/total) : 0 });
    }
};

// --- DEFINIÇÃO DAS ROTAS (Tudo Aqui Mesmo) ---

app.get('/', (req, res) => res.send('API Monolítica Rodando 🚀'));

// Rotas Redação
app.post('/api/enviar-redacao', redacao.enviar);
app.get('/api/estatisticas', redacao.stats);

// Rotas Cronograma
app.get('/api/cronograma/dados', cronograma.getDados);
app.post('/api/cronograma/concluir', cronograma.concluir);
app.post('/api/cronograma/config', cronograma.salvarConfig);
app.post('/api/cronograma/bonus', (req, res) => res.json({ msg: "Bônus ok" }));

// Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ erro: "Erro no servidor" });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
