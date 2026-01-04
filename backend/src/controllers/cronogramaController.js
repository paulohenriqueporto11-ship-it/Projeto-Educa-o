const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializa Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper para pegar o ID do usuário (vindo do header da requisição)
const getUserId = (req) => {
    // O frontend deve enviar o header 'x-user-id'
    return req.headers['x-user-id']; 
};

const cronogramaController = {

    // 1. PEGAR DADOS (Carrega XP, Streak, Histórico e Configs de uma vez)
    getDadosUsuario: async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(400).json({ erro: "ID do usuário não fornecido." });

            // Busca paralela para ser rápido (3 queries ao mesmo tempo)
            const [profile, config, history] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('user_config').select('*').eq('user_id', userId).single(),
                supabase.from('study_history').select('*').eq('user_id', userId).limit(500) // Pega histórico recente
            ]);

            // Formata o histórico para o formato que o Heatmap do frontend entende
            // De: [{completed_at: '2023-01-01', mission_id: 'x'}, ...]
            // Para: {'2023-01-01': ['x', 'y'], ...}
            const historyMap = {};
            if (history.data) {
                history.data.forEach(h => {
                    if (!historyMap[h.completed_at]) historyMap[h.completed_at] = [];
                    historyMap[h.completed_at].push(h.mission_id);
                });
            }

            // Retorna tudo limpo para o frontend
            res.json({
                user: profile.data || { xp: 0, streak: 0, level: 1 }, // Fallback se for user novo
                config: config.data || { subjects: ['red'], intensity: 'medio' },
                history: historyMap
            });

        } catch (error) {
            console.error("Erro ao buscar dados do cronograma:", error);
            res.status(500).json({ erro: "Falha ao carregar dados." });
        }
    },

    // 2. CONCLUIR MISSÃO (Salva histórico e aumenta XP/Streak)
    concluirMissao: async (req, res) => {
        try {
            const userId = getUserId(req);
            const { missionId, xpEarned, date } = req.body; // date = 'YYYY-MM-DD'

            if (!userId || !missionId) return res.status(400).json({ erro: "Dados inválidos." });

            // A. Salva no Histórico de Estudos (Tabela study_history)
            const { error: histError } = await supabase.from('study_history').insert({
                user_id: userId,
                mission_id: missionId,
                xp_earned: xpEarned || 0,
                completed_at: date
            });

            if (histError) throw histError;

            // B. Atualiza Perfil (XP e Streak) na tabela profiles
            // Primeiro, pegamos o perfil atual
            const { data: profile } = await supabase.from('profiles').select('xp, streak, last_login').eq('id', userId).single();
            
            // Se o perfil não existir (erro raro), cria um padrão
            let currentXp = profile ? profile.xp : 0;
            let currentStreak = profile ? profile.streak : 0;
            let lastLogin = profile ? profile.last_login : null;

            // Lógica de Streak (Ofensiva)
            const hoje = new Date().toISOString().split('T')[0];
            
            if (lastLogin !== hoje) {
                // Se não logou hoje ainda, verificamos se logou ontem
                const ontem = new Date();
                ontem.setDate(ontem.getDate() - 1);
                const ontemStr = ontem.toISOString().split('T')[0];

                if (lastLogin === ontemStr) {
                    currentStreak++; // Manteve a ofensiva
                } else {
                    currentStreak = 1; // Quebrou a ofensiva (ou é o primeiro dia)
                }
            }

            // Atualiza no banco
            await supabase.from('profiles').upsert({
                id: userId,
                xp: currentXp + (xpEarned || 0),
                streak: currentStreak,
                last_login: hoje
            });

            res.json({ 
                sucesso: true, 
                novoXp: currentXp + xpEarned,
                novoStreak: currentStreak 
            });

        } catch (error) {
            console.error("Erro ao salvar missão:", error);
            res.status(500).json({ erro: "Erro ao salvar progresso." });
        }
    },

    // 3. SALVAR CONFIGURAÇÃO (Intensidade e Matérias)
    salvarConfig: async (req, res) => {
        try {
            const userId = getUserId(req);
            const { subjects, intensity } = req.body;

            const { error } = await supabase.from('user_config').upsert({
                user_id: userId,
                subjects: subjects,
                intensity: intensity
            });

            if (error) throw error;
            res.json({ sucesso: true });

        } catch (error) {
            console.error("Erro ao salvar config:", error);
            res.status(500).json({ erro: "Erro ao salvar configurações." });
        }
    },

    // 4. REGISTRAR BÔNUS (Opcional - usa mesma lógica de concluir, mas pode ter flag especial)
    registrarBonus: async (req, res) => {
        // Por enquanto, apenas repassa para concluirMissao, mas no futuro pode dar badges
        return cronogramaController.concluirMissao(req, res);
    }
};

module.exports = cronogramaController;
