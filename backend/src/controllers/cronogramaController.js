const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializa o cliente Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper para pegar o ID do usuário vindo do Header (enviado pelo frontend)
const getUserId = (req) => {
    return req.headers['x-user-id']; 
};

const cronogramaController = {

    // =========================================================================
    // 1. GET /dados - Carrega TUDO (Perfil, Config, Histórico) ao abrir a página
    // =========================================================================
    getDadosUsuario: async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(400).json({ erro: "ID do usuário não fornecido." });

            // 1. Lazy Registration: Se o usuário não existir no 'profiles', cria agora
            const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', userId).single();
            
            if (!profileCheck) {
                // Cria perfil zerado se for novo
                await supabase.from('profiles').insert({ 
                    id: userId, 
                    xp: 0, 
                    streak: 0,
                    last_login: new Date().toISOString().split('T')[0]
                });
            }

            // 2. Busca paralela nas 3 tabelas (Performance)
            const [profileRes, configRes, historyRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('user_config').select('*').eq('user_id', userId).single(),
                // Pega os últimos 500 registros de histórico para montar o heatmap
                supabase.from('study_history').select('*').eq('user_id', userId).limit(500)
            ]);

            // 3. Processa o Histórico para o Frontend
            // O frontend espera saber quais missões foram feitas HOJE (para marcar o checkbox)
            const completedToday = [];
            const today = new Date().toISOString().split('T')[0];

            if (historyRes.data) {
                historyRes.data.forEach(h => {
                    // Se a data da conclusão for hoje, adiciona na lista de 'feitos'
                    if (h.completed_at === today) {
                        // Converte para Inteiro porque o frontend usa índices 0, 1, 2...
                        completedToday.push(parseInt(h.mission_id)); 
                    }
                });
            }

            // 4. Monta a resposta final
            res.json({
                stats: { 
                    total_xp: profileRes.data?.xp || 0, 
                    streak: profileRes.data?.streak || 0 
                },
                config: { 
                    // Se não tiver config, usa padrão
                    track: configRes.data?.track || 'med', 
                    goal_minutes: configRes.data?.goal_minutes || 120,
                    custom_subjects: configRes.data?.custom_subjects || []
                },
                history: historyRes.data || [], // Manda raw para o frontend montar o heatmap
                completedToday: completedToday
            });

        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            res.status(500).json({ erro: "Erro interno ao carregar dashboard." });
        }
    },

    // =========================================================================
    // 2. POST /config - Salva as preferências (Meta, Trilha, Matérias)
    // =========================================================================
    salvarConfig: async (req, res) => {
        try {
            const userId = getUserId(req);
            // O frontend envia: track, goalMinutes, customSubjects
            const { track, goalMinutes, customSubjects } = req.body;

            // UPSERT na tabela user_config
            // Mapeamos os nomes do JS (camelCase) para o Banco (snake_case)
            const { error } = await supabase.from('user_config').upsert({
                user_id: userId,
                track: track,
                goal_minutes: goalMinutes,
                custom_subjects: customSubjects, // O Supabase trata JSONB automaticamente
                updated_at: new Date()
            });

            if (error) throw error;

            res.json({ sucesso: true });

        } catch (error) {
            console.error("Erro ao salvar config:", error);
            res.status(500).json({ erro: "Erro ao salvar configurações." });
        }
    },

    // =========================================================================
    // 3. POST /concluir - Marca missão como feita, calcula XP e Streak
    // =========================================================================
    concluirMissao: async (req, res) => {
        try {
            const userId = getUserId(req);
            // O frontend envia: missionId (indice), xpEarned, date (hoje)
            const { missionId, xpEarned, date } = req.body;

            // A. Salva no Histórico
            const { error: histError } = await supabase.from('study_history').insert({
                user_id: userId,
                mission_id: missionId.toString(), // Salva como string para garantir
                xp_earned: xpEarned,
                completed_at: date
            });

            if (histError) throw histError;

            // B. Calcula Streak e XP
            // Primeiro busca o perfil atual
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            
            let currentXp = profile ? profile.xp : 0;
            let currentStreak = profile ? profile.streak : 0;
            let lastLogin = profile ? profile.last_login : null;

            // Lógica de Ofensiva (Streak)
            const hoje = new Date().toISOString().split('T')[0];
            
            // Só calcula streak se a última atividade NÃO for hoje (pra não contar 2x no mesmo dia)
            if (lastLogin !== hoje) {
                const ontem = new Date();
                ontem.setDate(ontem.getDate() - 1);
                const ontemStr = ontem.toISOString().split('T')[0];

                if (lastLogin === ontemStr) {
                    currentStreak++; // Logou ontem, aumenta streak
                } else {
                    currentStreak = 1; // Não logou ontem, reseta para 1
                }
            } else {
                // Se já logou hoje, streak se mantém, não aumenta nem reseta
                if (currentStreak === 0) currentStreak = 1;
            }

            // Atualiza Perfil
            await supabase.from('profiles').upsert({
                id: userId,
                xp: currentXp + xpEarned,
                streak: currentStreak,
                last_login: hoje
            });

            res.json({ sucesso: true, novoXp: currentXp + xpEarned });

        } catch (error) {
            console.error("Erro ao concluir missão:", error);
            res.status(500).json({ erro: "Erro ao salvar progresso." });
        }
    },

    // =========================================================================
    // 4. POST /bonus - (Opcional, usa lógica similar ao concluir)
    // =========================================================================
    registrarBonus: async (req, res) => {
        // Por enquanto, reaproveita a lógica de concluir missão
        return cronogramaController.concluirMissao(req, res);
    }
};

module.exports = cronogramaController;
