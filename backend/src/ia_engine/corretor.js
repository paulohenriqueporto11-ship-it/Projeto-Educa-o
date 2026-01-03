// src/ia_engine/corretor.js

function corrigirRedacao(texto) {
    let nota = 0;
    let feedback = [];
    
    // --- 0. LIMPEZA E DADOS BÁSICOS ---
    const textoLimpo = texto.trim();
    if (!textoLimpo) return { nota: 0, detalhes: "Texto vazio." };

    // --- 1. FILTRO DE SPAM E PONTUAÇÃO (O "MATADOR DE LIXO") ---
    
    // A) Verifica excesso de caracteres não-alfabéticos (vírgulas, aspas, simbolos)
    const totalCaracteres = textoLimpo.length;
    // Conta apenas letras (A-Z, ç, acentos)
    const apenasLetras = textoLimpo.replace(/[^a-zA-ZÀ-ÿ]/g, "").length;
    // O resto é sujeira (pontuação, simbolos, numeros) - descontando espaços
    const espacos = (textoLimpo.match(/\s/g) || []).length;
    const sujeira = totalCaracteres - apenasLetras - espacos;

    // Se a sujeira for maior que 10% do texto (ex: "a,b,c,d,e" tem muita virgula pra pouca letra)
    if (totalCaracteres > 0 && (sujeira / totalCaracteres) > 0.10) {
        return { 
            nota: 0, 
            detalhes: "🚨 DETECÇÃO DE SPAM: Seu texto tem excesso de pontuação ou símbolos (vírgulas, aspas, etc). Escreva frases normais." 
        };
    }

    // B) Verifica repetição de sinais (ex: ",," ou "''" ou "??")
    // O regex procura qualquer sinal de pontuação repetido 2 vezes seguidas (exceto ponto final p/ reticencias)
    if (/([,;:'"\/\\|@#$%&*])\1/.test(textoLimpo)) {
        return { 
            nota: 0, 
            detalhes: "🚨 DETECÇÃO DE SPAM: Você repetiu sinais de pontuação (ex: ,, ou ''). Isso invalida a redação." 
        };
    }

    // C) Verifica palavras repetidas (o filtro antigo)
    const palavras = textoLimpo.toLowerCase().match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;
    const palavrasUnicas = new Set(palavras);
    
    if (totalPalavras > 10) {
        const taxaVariedade = palavrasUnicas.size / totalPalavras;
        if (taxaVariedade < 0.40) {
            return { nota: 0, detalhes: "🚨 DETECÇÃO DE SPAM: Repetição excessiva de palavras. Use vocabulário variado." };
        }
    }

    if (palavras.some(p => p.length > 25)) {
        return { nota: 0, detalhes: "🚨 TEXTO INVÁLIDO: Palavras gigantes sem sentido detectadas." };
    }

    // =================================================================
    // AQUI COMEÇA A AVALIAÇÃO REAL (Se passou pelo filtro acima)
    // =================================================================

    // Separa parágrafos
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);

    // --- COMPETÊNCIA 1: NORMA CULTA (200 PONTOS) ---
    let notaC1 = 200;
    const errosC1 = [];
    const termosProibidos = ['vc', 'pq', 'tb', 'tbm', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo assim'];
    
    termosProibidos.forEach(termo => {
        // Verifica a palavra exata para não pegar parte de outra (ex: 'pra' dentro de 'prato')
        const regexTermo = new RegExp(`\\b${termo}\\b`, 'i');
        if (regexTermo.test(textoLimpo)) {
            notaC1 -= 40;
            errosC1.push(`Evite usar "${termo}".`);
        }
    });

    // Penaliza letra minúscula no começo de frase
    const frases = textoLimpo.split(/[.!?]+/).filter(f => f.trim().length > 0);
    let frasesMinusculas = 0;
    frases.forEach(f => {
        const primeiraLetra = f.trim().charAt(0);
        if (primeiraLetra === primeiraLetra.toLowerCase() && primeiraLetra.match(/[a-zà-ÿ]/)) {
            frasesMinusculas++;
        }
    });
    if (frasesMinusculas > 0) {
        notaC1 -= (20 * frasesMinusculas);
        errosC1.push("Inicie frases com letra maiúscula.");
    }

    if (totalPalavras < 100) notaC1 -= 50; 
    if (notaC1 < 0) notaC1 = 0;
    nota += notaC1;
    
    if (errosC1.length > 0) feedback.push(`⚠️ Norma Culta: ${errosC1.join(" ")}`);
    else feedback.push("✅ Norma Culta: Bom uso da língua portuguesa.");


    // --- COMPETÊNCIA 2: ESTRUTURA E TEMA (200 PONTOS) ---
    let notaC2 = 0;
    if (paragrafos.length >= 4) {
        notaC2 = 200;
        feedback.push("✅ Estrutura: Ótima divisão (4+ parágrafos).");
    } else if (paragrafos.length === 3) {
        notaC2 = 140;
        feedback.push("⚠️ Estrutura: Bom, mas idealmente faça 4 parágrafos (1 Intro, 2 Desenv, 1 Concl).");
    } else {
        notaC2 = 40; // Penalidade maior agora
        feedback.push("❌ Estrutura: Texto mal dividido. Precisa ter parágrafos claros.");
    }
    nota += notaC2;


    // --- COMPETÊNCIA 3: ARGUMENTAÇÃO (200 PONTOS) ---
    let notaC3 = 40;
    const termosAutoridade = ['segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'constituição', 'dados', 'pesquisa', 'estudo', 'lei', 'artigo', '%'];
    const temArgumento = termosAutoridade.some(termo => textoLimpo.toLowerCase().includes(termo));
    
    if (temArgumento && totalPalavras > 100) {
        notaC3 = 200;
        feedback.push("🌟 Argumentação: Ótima citação de dados/fontes.");
    } else {
        notaC3 = 80;
        feedback.push("⚠️ Argumentação: Faltou repertório sociocultural (cite dados, leis ou autores).");
    }
    nota += notaC3;


    // --- COMPETÊNCIA 4: COESÃO (200 PONTOS) ---
    let notaC4 = 0;
    const conectivosLista = ['portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'por outro lado', 'visto que', 'dessa forma', 'em suma', 'consequentemente', 'porém', 'pois', 'mas', 'embora', 'logo', 'assim', 'nesse sentido'];
    
    let conectivosUsados = 0;
    // Verifica repetição de conectivos também
    const setConectivos = new Set();
    conectivosLista.forEach(c => {
        if (textoLimpo.toLowerCase().includes(c)) {
            conectivosUsados++;
            setConectivos.add(c);
        }
    });

    if (setConectivos.size >= 5) {
        notaC4 = 200;
        feedback.push("✅ Coesão: Excelente variedade de conectivos.");
    } else if (setConectivos.size >= 2) {
        notaC4 = 120;
        feedback.push("⚠️ Coesão: Use mais conectivos variados.");
    } else {
        notaC4 = 40;
        feedback.push("❌ Coesão: Texto desconexo. Use palavras de transição.");
    }
    nota += notaC4;


    // --- COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO (200 PONTOS) ---
    let notaC5 = 0;
    if (paragrafos.length > 0) {
        const ultimo = paragrafos[paragrafos.length - 1].toLowerCase();
        const agentes = ['governo', 'escola', 'mídia', 'sociedade', 'família', 'estado', 'ministério'];
        const acoes = ['deve', 'precisa', 'necessário', 'criar', 'promover', 'investir', 'conscientizar'];
        
        const temAgente = agentes.some(a => ultimo.includes(a));
        const temAcao = acoes.some(a => ultimo.includes(a));

        if (temAgente && temAcao && totalPalavras > 100) {
            notaC5 = 200;
            feedback.push("🌟 Conclusão: Proposta completa.");
        } else if (temAgente || temAcao) {
            notaC5 = 100;
            feedback.push("⚠️ Conclusão: Proposta parcial. Cite QUEM fará e O QUE será feito.");
        } else {
            notaC5 = 40;
            feedback.push("❌ Conclusão: Faltou proposta de intervenção clara no final.");
        }
    }
    nota += notaC5;

    // Ajustes Finais
    if (nota > 1000) nota = 1000;
    if (totalPalavras < 30) nota = 0; // Zera se for muito curto mesmo

    return { nota: nota, detalhes: feedback.join("\n\n") };
}

module.exports = { corrigirRedacao };
