const { createClient } = require('@supabase/supabase-js');
// Certifique-se que o caminho da engine está correto
const { corrigirRedacao } = require('../ia_engine/corretor'); 
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. Enviar Redação (Correção e Salvamento)
async function enviarRedacao(req, res) {
    const { texto, tema, userId } = req.body;

    // Validação básica
    if (!texto || texto.length < 50) {
        return res.status(400).json({ erro: 'Texto muito curto ou vazio.' });
    }

    try {
        console.log(`📝 Iniciando correção para User: ${userId} | Tema: ${tema}`);

        // --- CORREÇÃO CRÍTICA AQUI (Adicionei o AWAIT) ---
        // Sem o await, o código não esperava a IA terminar e quebrava.
        const resultadoIA = await corrigirRedacao(texto, tema || "Livre");

        // Verifica se a IA devolveu algo válido
        if (!resultadoIA || !resultadoIA.notaFinal) {
            throw new Error("A IA não retornou uma nota válida.");
        }

        // Salva no Supabase
        const { data, error } = await supabase
            .from('redacoes')
            .insert([{ 
                texto_redacao: texto, 
                tema: tema,
                nota_geral: resultadoIA.notaFinal, 
                detalhes_json: resultadoIA, // Salva o feedback completo
                user_id: userId || 'anonimo' 
            }]);

        if (error) {
            console.error("Erro Supabase:", error);
            throw new Error("Erro ao salvar no banco de dados.");
        }

        console.log("✅ Redação salva com sucesso! Nota:", resultadoIA.notaFinal);
        res.json({ sucesso: true, resultado: resultadoIA });

    } catch (err) {
        console.error("❌ Erro fatal no controller:", err.message);
        res.status(500).json({ erro: 'Erro interno ao corrigir redação.' });
    }
}

// 2. Obter Estatísticas (Para o Dashboard)
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
        // Calcula média simples
        const soma = data.reduce((acc, curr) => acc + (curr.nota_geral || 0), 0);
        const media = total > 0 ? Math.round(soma / total) : 0;

        res.json({ total, media });

    } catch (err) {
        console.error("Erro stats:", err);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
    }
}

module.exports = { enviarRedacao, obterEstatisticas };
