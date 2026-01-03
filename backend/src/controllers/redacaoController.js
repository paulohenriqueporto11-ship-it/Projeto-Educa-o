// src/controllers/redacaoController.js
const { createClient } = require('@supabase/supabase-js');
const { corrigirRedacao } = require('../ia_engine/corretor');
require('dotenv').config();

// Configuração do Supabase (Variáveis de Ambiente no Render)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function enviarRedacao(req, res) {
    const { texto } = req.body;

    if (!texto) {
        return res.status(400).json({ erro: 'Texto é obrigatório' });
    }

    try {
        // 1. Passa pela "IA"
        const resultadoIA = corrigirRedacao(texto);

        // 2. Salva no Banco de Dados
        const { data, error } = await supabase
            .from('redacoes')
            .insert([
                { 
                    texto_redacao: texto, 
                    nota: resultadoIA.nota, 
                    feedback: resultadoIA.detalhes 
                }
            ])
            .select();

        if (error) throw error;

        // 3. Devolve a resposta para o site
        res.json({
            sucesso: true,
            nota: resultadoIA.nota,
            feedback: resultadoIA.detalhes,
            id_banco: data[0].id
        });

    } catch (err) {
        console.error("Erro:", err);
        res.status(500).json({ erro: 'Erro ao processar redação' });
    }
}

module.exports = { enviarRedacao };
