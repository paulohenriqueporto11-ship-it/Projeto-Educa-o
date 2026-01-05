// src/controllers/simuladoController.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Conecta no banco usando as chaves seguras do servidor
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. BUSCAR PROGRESSO (Quais IDs esse usuário já fez?)
async function buscarProgresso(req, res) {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ erro: 'ID do usuário obrigatório' });

    try {
        const { data, error } = await supabase
            .from('questoes_feitas')
            .select('question_id')
            .eq('user_id', userId);

        if (error) throw error;

        // Retorna apenas uma lista simples de IDs: ['MAT-GEO-001', 'NAT-BIO-002']
        const idsFeitos = data.map(item => item.question_id);
        
        res.json({ ids: idsFeitos });

    } catch (err) {
        console.error("Erro ao buscar progresso:", err);
        res.status(500).json({ erro: 'Erro interno' });
    }
}

// 2. SALVAR QUESTÕES FEITAS
async function salvarProgresso(req, res) {
    const { userId, questionIds } = req.body;

    if (!userId || !questionIds || questionIds.length === 0) {
        return res.status(400).json({ erro: 'Dados inválidos' });
    }

    try {
        // Prepara os dados para inserir em lote
        const rows = questionIds.map(qId => ({
            user_id: userId,
            question_id: qId
        }));

        const { error } = await supabase
            .from('questoes_feitas')
            .insert(rows);

        if (error) throw error;

        res.json({ sucesso: true, msg: 'Progresso salvo!' });

    } catch (err) {
        console.error("Erro ao salvar progresso:", err);
        res.status(500).json({ erro: 'Erro ao salvar' });
    }
}

module.exports = { buscarProgresso, salvarProgresso };
