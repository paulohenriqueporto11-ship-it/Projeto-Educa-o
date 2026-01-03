const { createClient } = require('@supabase/supabase-js');
const { corrigirRedacao } = require('../ia_engine/corretor');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function enviarRedacao(req, res) {
    // Agora recebe também o TEMA
    const { texto, tema } = req.body;

    if (!texto) return res.status(400).json({ erro: 'Texto obrigatório' });

    try {
        // Passa o tema para a IA validar aderência
        const resultadoIA = corrigirRedacao(texto, tema || "Livre");

        // Salva no Supabase com estrutura profissional
        const { data, error } = await supabase
            .from('redacoes')
            .insert([{ 
                texto_redacao: texto, 
                tema: tema,
                nota_geral: resultadoIA.notaFinal, 
                detalhes_json: resultadoIA // Salva o JSON completo das competências
            }]);

        if (error) throw error;

        res.json({ sucesso: true, resultado: resultadoIA });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
}

module.exports = { enviarRedacao };
