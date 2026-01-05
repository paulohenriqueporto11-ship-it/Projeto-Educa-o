const { createClient } = require('@supabase/supabase-js');
// Importa sua engine artesanal
const { corrigirRedacao } = require('../ia_engine/corretor'); 
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. Enviar Redação
async function enviarRedacao(req, res) {
    const { texto, tema, userId } = req.body;

    // Validação básica do texto
    if (!texto || texto.length < 50) {
        return res.status(400).json({ erro: 'Texto muito curto. Escreva pelo menos 50 caracteres.' });
    }

    try {
        console.log(`📝 Iniciando correção (Engine Artesanal) | User: ${userId}`);

        // --- CHAMADA DA SUA ENGINE ---
        // Como sua engine é síncrona (não usa API externa), o await é opcional mas seguro.
        const resultadoIA = await corrigirRedacao(texto, tema || "Livre");

        // --- VALIDAÇÃO DO RETORNO ---
        // Se a sua engine retornou erro ou nota inválida
        if (!resultadoIA || typeof resultadoIA.notaFinal === 'undefined') {
            console.error("Erro na Engine:", resultadoIA);
            // Retorna o erro específico que a engine gerou (ex: "Texto muito curto")
            return res.status(400).json({ erro: resultadoIA.erro || "Falha na correção." });
        }

        // --- SALVA NO SUPABASE ---
        const { data, error } = await supabase
            .from('redacoes')
            .insert([{ 
                texto_redacao: texto, 
                tema: tema,
                nota_geral: resultadoIA.notaFinal, 
                detalhes_json: resultadoIA, // Salva o feedback completo das competências
                user_id: userId || 'anonimo' 
            }]);

        if (error) {
            console.error("Erro Supabase:", error);
            throw new Error("Erro ao salvar no banco de dados.");
        }

        console.log("✅ Sucesso! Nota:", resultadoIA.notaFinal);
        res.json({ sucesso: true, resultado: resultadoIA });

    } catch (err) {
        console.error("❌ Erro fatal:", err.message);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
}

// 2. Obter Estatísticas (Dashboard)
async function obterEstatisticas(req, res) {
    const { userId } = req.query;

    if (!userId) return res.json({ total: 0, media: 0 });

    try {
        const { data, error } = await supabase
            .from('redacoes')
            .select('nota_geral')
            .eq('user_id', userId);

        if (error) throw error;

        const total = data.length;
        const soma = data.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
        const media = total > 0 ? Math.round(soma / total) : 0;

        res.json({ total, media });

    } catch (err) {
        console.error("Erro stats:", err);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
    }
}

module.exports = { enviarRedacao, obterEstatisticas };
