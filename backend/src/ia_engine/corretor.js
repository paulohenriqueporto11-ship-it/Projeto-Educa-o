// src/ia_engine/corretor.js

function corrigirRedacao(texto) {
    let nota = 0;
    let feedback = [];

    // 1. Regra de Tamanho
    const palavras = texto.trim().split(/\s+/).length;
    if (palavras < 50) {
        feedback.push("🚨 Texto muito curto. Escreva pelo menos 50 palavras.");
        nota += 20;
    } else {
        feedback.push("✅ Tamanho adequado.");
        nota += 100;
    }

    // 2. Regra de Conectivos (Exemplo simples)
    const conectivos = ['portanto', 'entretanto', 'contudo', 'além disso', 'conclusão'];
    const temConectivo = conectivos.some(c => texto.toLowerCase().includes(c));

    if (temConectivo) {
        nota += 100; // Ganha ponto por usar conectivos
        feedback.push("✅ Bom uso de conectivos.");
    } else {
        feedback.push("⚠️ Tente usar mais conectivos (ex: Portanto, Contudo).");
    }

    // Nota final (apenas exemplo, máximo 1000)
    let notaFinal = Math.min(1000, nota * 5); 

    return {
        nota: notaFinal,
        detalhes: feedback.join(" ")
    };
}

module.exports = { corrigirRedacao };
