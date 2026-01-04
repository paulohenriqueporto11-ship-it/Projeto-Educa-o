const { createClient } = require('@supabase/supabase-js');
const { corrigirRedacao } = require('../ia_engine/corretor');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. Enviar Redação (Agora salva quem enviou)
async function enviarRedacao(req, res) {
    const { texto, tema, userId } = req.body;

    if (!texto) return res.status(400).json({ erro: 'Texto obrigatório' });

    try {
        // Chama a IA (V9.0)
        const resultadoIA = corrigirRedacao(texto, tema || "Livre");

        // Salva no Supabase com o user_id
        const { data, error } = await supabase
            .from('redacoes')
            .insert([{ 
                texto_redacao: texto, 
                tema: tema,
                nota_geral: resultadoIA.notaFinal, 
                detalhes_json: resultadoIA,
                user_id: userId || 'anonimo' 
            }]);

        if (error) throw error;

        res.json({ sucesso: true, resultado: resultadoIA });

    } catch (err) {
        console.error("Erro ao salvar:", err);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
}

// 2. Obter Estatísticas (Novo!)
async function obterEstatisticas(req, res) {
    const { userId } = req.query;

    if (!userId) return res.json({ total: 0, media: 0 });

    try {
        // Busca notas desse usuário
        const { data, error } = await supabase
            .from('redacoes')
            .select('nota_geral')
            .eq('user_id', userId);

        if (error) throw error;

        const total = data.length;
        // Calcula média
        const soma = data.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
        const media = total > 0 ? Math.round(soma / total) : 0;

        res.json({ total, media });

    } catch (err) {
        console.error("Erro ao buscar stats:", err);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
    }
}

module.exports = { enviarRedacao, obterEstatisticas };
