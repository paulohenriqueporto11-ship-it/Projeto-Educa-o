// src/ia_engine/corretor.js

function corrigirRedacao(texto) {
    let nota = 0;
    let feedback = [];
    
    // --- 0. PREPARAÇÃO E LIMPEZA ---
    const textoLimpo = texto.trim();
    if (!textoLimpo) return { nota: 0, detalhes: "Texto vazio." };

    // Quebra em parágrafos (considerando quebra de linha dupla ou simples)
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const palavras = textoLimpo.toLowerCase().match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;

    // --- 1. FILTRO ANTI-SPAM (SEGURANÇA) ---
    const palavrasUnicas = new Set(palavras);
    const taxaVariedade = palavrasUnicas.size / totalPalavras;
    
    if (taxaVariedade < 0.35 && totalPalavras > 20) {
        return { nota: 0, detalhes: "🚨 DETECÇÃO DE SPAM: Repetição excessiva de palavras. Nota zerada." };
    }
    if (palavras.some(p => p.length > 25)) {
        return { nota: 0, detalhes: "🚨 DETECÇÃO DE SPAM: Palavras sem sentido detectadas." };
    }

    // =================================================================
    // AVALIAÇÃO POR COMPETÊNCIAS (BASEADO NAS REGRAS QUE VOCÊ MANDOU)
    // =================================================================

    // --- COMPETÊNCIA 1: NORMA CULTA (200 PONTOS) ---
    // Penaliza gírias, abreviações e palavras muito simples
    let notaC1 = 200;
    const errosC1 = [];
    const termosProibidos = ['vc', 'pq', 'tb', 'tbm', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo assim'];
    
    termosProibidos.forEach(termo => {
        if (palavras.includes(termo)) {
            notaC1 -= 40;
            errosC1.push(`Evite usar "${termo}".`);
        }
    });

    if (totalPalavras < 100) notaC1 -= 50; // Texto muito curto perde na norma culta por falta de amostra
    if (notaC1 < 0) notaC1 = 0;
    nota += notaC1;
    if (errosC1.length > 0) feedback.push(`⚠️ Norma Culta: ${errosC1.join(" ")}`);
    else feedback.push("✅ Norma Culta: Bom vocabulário e ausência de gírias.");


    // --- COMPETÊNCIA 2: ESTRUTURA E TEMA (200 PONTOS) ---
    // Verifica parágrafos (Mínimo 3: Intro, Desenv, Conclusão)
    let notaC2 = 0;
    
    if (paragrafos.length >= 4) {
        notaC2 = 200; // Estrutura ideal (1 Intro, 2 Desenv, 1 Concl)
        feedback.push("✅ Estrutura: Ótima divisão de parágrafos (Introdução, Desenvolvimento e Conclusão).");
    } else if (paragrafos.length === 3) {
        notaC2 = 140;
        feedback.push("⚠️ Estrutura: Bom, mas tente fazer 4 parágrafos (2 de desenvolvimento).");
    } else {
        notaC2 = 60;
        feedback.push("❌ Estrutura: Seu texto precisa ser dividido em parágrafos claros.");
    }
    nota += notaC2;


    // --- COMPETÊNCIA 3: ARGUMENTAÇÃO E DADOS (200 PONTOS) ---
    // Procura por "Autoridade": citações, dados, órgãos oficiais
    let notaC3 = 40; // Começa baixo
    const termosAutoridade = [
        'segundo', 'de acordo com', 'conforme', 'ibge', 'oms', 'constituição', 
        'dados', 'pesquisa', 'estudo', 'filósofo', 'sociólogo', 'lei', 'artigo', '%'
    ];

    const temArgumentoForte = termosAutoridade.some(termo => textoLimpo.toLowerCase().includes(termo));
    
    if (temArgumentoForte) {
        notaC3 = 200;
        feedback.push("🌟 Argumentação: Excelente! Você citou dados ou fontes externas (Repertório Sociocultural).");
    } else {
        notaC3 = 100;
        feedback.push("⚠️ Argumentação: Faltou citar dados, leis ou autores para embasar sua opinião (ex: 'Segundo o IBGE...').");
    }
    nota += notaC3;


    // --- COMPETÊNCIA 4: COESÃO E CONECTIVOS (200 PONTOS) ---
    // Verifica a lista de conectivos que você mandou
    let notaC4 = 0;
    const conectivosLista = [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'por outro lado',
        'visto que', 'dessa forma', 'em suma', 'primeiramente', 'consequentemente', 
        'porém', 'pois', 'mas', 'embora', 'logo', 'assim'
    ];
    
    // Conta quantos conectivos DIFERENTES foram usados
    let conectivosUsados = conectivosLista.filter(c => textoLimpo.toLowerCase().includes(c));
    let qtdConectivos = conectivosUsados.length;

    if (qtdConectivos >= 6) {
        notaC4 = 200;
        feedback.push("✅ Coesão: Ótimo uso de variados conectivos.");
    } else if (qtdConectivos >= 3) {
        notaC4 = 120;
        feedback.push("⚠️ Coesão: Use mais conectivos para ligar as ideias (ex: Entretanto, Além disso).");
    } else {
        notaC4 = 60;
        feedback.push("❌ Coesão: Texto muito fragmentado. Use conectivos.");
    }
    nota += notaC4;


    // --- COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO (200 PONTOS) ---
    // Analisa APENAS O ÚLTIMO PARÁGRAFO procurando agentes e ações
    let notaC5 = 40;
    
    if (paragrafos.length > 1) {
        const ultimoParagrafo = paragrafos[paragrafos.length - 1].toLowerCase();
        
        // Agentes de solução
        const agentes = ['governo', 'escola', 'mídia', 'sociedade', 'família', 'ministério', 'ongs', 'estado', 'poder público'];
        // Ações de solução
        const acoes = ['deve', 'precisa', 'necessário', 'criar', 'promover', 'investir', 'campanhas', 'conscientizar', 'fiscalizar'];

        const temAgente = agentes.some(ag => ultimoParagrafo.includes(ag));
        const temAcao = acoes.some(ac => ultimoParagrafo.includes(ac));

        if (temAgente && temAcao) {
            notaC5 = 200;
            feedback.push("🌟 Conclusão: Ótima proposta de intervenção com agente e ação.");
        } else if (temAgente || temAcao) {
            notaC5 = 120;
            feedback.push("⚠️ Conclusão: Proposta incompleta. Cite QUEM vai fazer e O QUE deve ser feito.");
        } else {
            feedback.push("❌ Conclusão: Faltou uma proposta de solução clara no final.");
        }
    } else {
        feedback.push("❌ Conclusão: Texto sem parágrafo final claro.");
    }
    nota += notaC5;

    // --- TRAVA FINAL ---
    if (nota > 1000) nota = 1000;
    if (totalPalavras < 40) nota = 0; // Texto muito curto zera tudo

    return {
        nota: nota,
        detalhes: feedback.join("\n\n")
    };
}

module.exports = { corrigirRedacao };
