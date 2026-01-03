// src/ia_engine/corretor.js

function corrigirRedacao(texto) {
    let nota = 0;
    let feedback = [];
    
    // Limpeza básica
    const textoLimpo = texto.trim();
    if (!textoLimpo) return { nota: 0, detalhes: "Texto vazio." };

    // Divide em palavras (ignorando pontuação para contagem)
    const palavras = textoLimpo.toLowerCase().match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;

    // --- 1. FILTRO ANTI-SPAM (O MATADOR DE "AAAA AAAA") ---
    
    // Conta palavras únicas (Vocabulário)
    const palavrasUnicas = new Set(palavras);
    const taxaVariedade = palavrasUnicas.size / totalPalavras; // Ex: 0.1 significa que 90% do texto é repetido

    // Se a variedade for muito baixa (ex: o cara digitou "aaaa aaaa" 100 vezes), zera a nota.
    if (taxaVariedade < 0.35 && totalPalavras > 10) {
        return {
            nota: 0,
            detalhes: "🚨 DETECÇÃO DE SPAM: Você repetiu muitas palavras iguais. Use um vocabulário mais rico e escreva frases reais."
        };
    }

    // Verifica palavras muito longas sem sentido (ex: "ksjdhfksjdhfksjdhf")
    const temPalavraGigante = palavras.some(p => p.length > 25);
    if (temPalavraGigante) {
        return {
            nota: 0,
            detalhes: "🚨 TEXTO INVÁLIDO: Palavras sem sentido detectadas."
        };
    }

    // --- 2. AVALIAÇÃO DE ESTRUTURA ---

    // Checa tamanho mínimo (Competência 1)
    if (totalPalavras < 50) {
        nota += 100; // Pontuação de pena
        feedback.push(`⚠️ Texto muito curto (${totalPalavras} palavras). Mínimo recomendado: 50.`);
    } else if (totalPalavras > 600) {
        nota += 100;
        feedback.push("⚠️ Texto muito longo. Tente ser mais conciso.");
    } else {
        nota += 200; // Tamanho ideal
        feedback.push("✅ Tamanho do texto adequado.");
    }

    // Checa pontuação (Competência 2)
    const frases = textoLimpo.split(/[.!?]+/).filter(f => f.trim().length > 0);
    if (frases.length < 3 && totalPalavras > 50) {
        feedback.push("⚠️ Pouca pontuação. Divida seu texto em mais frases e parágrafos.");
    } else {
        nota += 200; // Boa estrutura de frases
        feedback.push("✅ Boa divisão de frases.");
    }

    // --- 3. COESÃO E CONECTIVOS (Competência 3) ---
    
    const listaConectivos = [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 
        'por isso', 'assim', 'dessa forma', 'conclusão', 'embora', 
        'enquanto', 'segundo', 'visto que', 'pois', 'mas', 'porém',
        'primeiramente', 'em suma', 'consequentemente'
    ];

    let conectivosUsados = 0;
    listaConectivos.forEach(conectivo => {
        if (textoLimpo.toLowerCase().includes(conectivo)) {
            conectivosUsados++;
        }
    });

    if (conectivosUsados >= 5) {
        nota += 300; // Excelente uso
        feedback.push("🌟 Ótimo uso de conectivos (coesão).");
    } else if (conectivosUsados >= 2) {
        nota += 150; // Médio
        feedback.push("⚠️ Tente variar mais os conectivos (Ex: Portanto, Todavia, Além disso).");
    } else {
        feedback.push("❌ Quase nenhum conectivo encontrado. Use palavras de ligação.");
    }

    // --- 4. ANÁLISE DE TEMA (Simulação Básica) ---
    // Verifica se tem palavras um pouco mais complexas (mais de 7 letras)
    const palavrasComplexas = palavras.filter(p => p.length > 7).length;
    if (palavrasComplexas > totalPalavras * 0.15) {
        nota += 300; // Vocabulário rico
        feedback.push("✅ Bom nível de vocabulário.");
    } else {
        nota += 100;
        feedback.push("⚠️ Vocabulário muito simples.");
    }

    // Trava a nota máxima em 1000
    if (nota > 1000) nota = 1000;

    return {
        nota: nota,
        detalhes: feedback.join("\n")
    };
}

module.exports = { corrigirRedacao };
