// src/ia_engine/corretor.js

function corrigirRedacao(texto) {
    let nota = 0;
    let feedback = [];
    
    // --- 0. PREPARAÇÃO E LIMPEZA ---
    const textoLimpo = texto.trim();
    if (!textoLimpo) return { nota: 0, detalhes: "Texto vazio." };

    // Divide em parágrafos e frases
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const textoInteiroLower = textoLimpo.toLowerCase();
    
    // Tokenização simples (palavras)
    const palavras = textoInteiroLower.match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;

    // --- 1. FILTRO ANTI-SPAM E SEGURANÇA (MANTIDO E REFORÇADO) ---
    const palavrasUnicas = new Set(palavras);
    const taxaVariedade = palavrasUnicas.size / totalPalavras;
    
    // Filtro de sujeira (pontuação excessiva)
    const totalCaracteres = textoLimpo.length;
    const apenasLetras = textoLimpo.replace(/[^a-zA-ZÀ-ÿ]/g, "").length;
    const espacos = (textoLimpo.match(/\s/g) || []).length;
    const sujeira = totalCaracteres - apenasLetras - espacos;

    if (totalCaracteres > 0 && (sujeira / totalCaracteres) > 0.12) {
        return { nota: 0, detalhes: "🚨 NOTA ZERO: Excesso de pontuação ou símbolos aleatórios. Escreva um texto real." };
    }
    if (taxaVariedade < 0.35 && totalPalavras > 20) {
        return { nota: 0, detalhes: "🚨 NOTA ZERO: Vocabulário repetitivo (Spam detectado)." };
    }
    if (/([,;:'"\/\\|@#$%&*])\1/.test(textoLimpo)) {
        return { nota: 0, detalhes: "🚨 NOTA ZERO: Repetição de sinais de pontuação (ex: ,, ou ..)." };
    }

    // =================================================================
    // AVALIAÇÃO PROFISSIONAL POR COMPETÊNCIAS (ENEM)
    // =================================================================

    // --- COMPETÊNCIA 1: NORMA CULTA (200 PONTOS) ---
    // Foco: Erros comuns, frases longas, oralidade.
    let notaC1 = 200;
    const errosC1 = [];
    
    // 1.1 Vícios de linguagem e oralidade
    const oralidade = ['vc', 'pq', 'tb', 'tbm', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo assim', 'aí', 'então assim'];
    oralidade.forEach(termo => {
        if (new RegExp(`\\b${termo}\\b`, 'i').test(textoLimpo)) {
            notaC1 -= 20;
            errosC1.push(`Evite oralidade/abreviação: "${termo}".`);
        }
    });

    // 1.2 Erros Gramaticais Clássicos (Regex)
    if (/\bhouveram\b/i.test(textoLimpo)) {
        notaC1 -= 20; errosC1.push("Erro grave: 'Houveram' não existe no sentido de existir. Use 'Houve'.");
    }
    if (/\bfazem\s+\d+\s+anos\b/i.test(textoLimpo)) {
        notaC1 -= 20; errosC1.push("Erro de tempo: 'Fazem x anos' está errado. Use 'Faz x anos'.");
    }
    if (/\bmenas\b/i.test(textoLimpo)) {
        notaC1 -= 40; errosC1.push("Erro grave: 'Menas' não existe.");
    }
    if (/\bseje\b/i.test(textoLimpo) || /\besteje\b/i.test(textoLimpo)) {
        notaC1 -= 40; errosC1.push("Erro grave: 'Seje/Esteje' não existe. Use 'Seja/Esteja'.");
    }

    // 1.3 Frases muito longas (Prolixidade)
    // Quebra por ponto final e conta palavras
    const frases = textoLimpo.split(/[.!?]+/).filter(f => f.trim().length > 0);
    let frasesLongas = 0;
    frases.forEach(f => {
        const qtdPalavrasFrase = (f.match(/\b[\wÀ-ÿ]+\b/g) || []).length;
        if (qtdPalavrasFrase > 45) { // 45 palavras sem ponto é muito
            frasesLongas++;
        }
    });
    if (frasesLongas > 0) {
        notaC1 -= (20 * frasesLongas);
        errosC1.push(`Atenção: Você tem ${frasesLongas} frase(s) muito longa(s) (+45 palavras). Use mais pontos finais.`);
    }

    // 1.4 Letra minúscula no início
    let frasesMinusculas = 0;
    frases.forEach(f => {
        const primeira = f.trim().charAt(0);
        if (primeira.match(/[a-zà-ÿ]/) && primeira === primeira.toLowerCase()) frasesMinusculas++;
    });
    if (frasesMinusculas > 0) {
        notaC1 -= 20; errosC1.push("Use letra maiúscula no início das frases.");
    }

    if (notaC1 < 0) notaC1 = 0;
    nota += notaC1;
    feedback.push(errosC1.length > 0 ? `⚠️ C1 (Norma Culta): ${errosC1.join(" ")}` : "✅ C1: Ótimo domínio da norma culta.");


    // --- COMPETÊNCIA 2: ESTRUTURA E TEMA (200 PONTOS) ---
    // Foco: Tese explícita, estrutura 4 parágrafos, não tangenciar.
    let notaC2 = 200;
    const errosC2 = [];

    // 2.1 Estrutura de Parágrafos
    if (paragrafos.length < 3) {
        notaC2 = 40; errosC2.push("Texto embrionário. Faça no mínimo 3 parágrafos (ideal 4).");
    } else if (paragrafos.length === 3) {
        notaC2 = 140; errosC2.push("Estrutura aceitável, mas o ideal para nota máxima são 4 parágrafos (2 de desenvolvimento).");
    } else if (paragrafos.length > 5) {
        notaC2 = 160; errosC2.push("Muitos parágrafos curtos. Tente condensar as ideias.");
    }

    // 2.2 Tese Explícita na Introdução (Juízo de Valor)
    if (paragrafos.length > 0) {
        const intro = paragrafos[0].toLowerCase();
        // Palavras que indicam opinião/problematização
        const marcasDeTese = ['fundamental', 'prejudicial', 'grave', 'problema', 'desafio', 'necessário', 'impasse', 'infelizmente', 'entretanto', 'papel', 'importância'];
        const temTese = marcasDeTese.some(m => intro.includes(m));
        
        if (!temTese) {
            notaC2 -= 40;
            errosC2.push("Sua introdução parece muito descritiva. Use palavras de juízo de valor para deixar sua tese (opinião) clara.");
        }
    }

    if (notaC2 < 40) notaC2 = 40;
    nota += notaC2;
    feedback.push(errosC2.length > 0 ? `⚠️ C2 (Tema/Estrutura): ${errosC2.join(" ")}` : "✅ C2: Estrutura dissertativa-argumentativa completa.");


    // --- COMPETÊNCIA 3: ARGUMENTAÇÃO (200 PONTOS) ---
    // Foco: Repertório legitimado e autoria.
    let notaC3 = 80; // Começa baixo, ganha ponto por provar
    const repertorios = [];

    // 3.1 Busca por Autoridade/Dados
    if (/(segundo|de acordo|conforme|consoante)\s+[A-Z]/.test(textoLimpo)) {
        notaC3 += 60; repertorios.push("Citação direta");
    }
    if (/\d+%/.test(textoLimpo) || /\bdados\b/.test(textoLimpo) || /\bibge\b/i.test(textoLimpo)) {
        notaC3 += 40; repertorios.push("Dados estatísticos");
    }
    if (/\blei\b/i.test(textoLimpo) || /\bartigo\b/i.test(textoLimpo) || /\bconstituição\b/i.test(textoLimpo)) {
        notaC3 += 40; repertorios.push("Legislação");
    }
    if (/\bfilósofo\b/i.test(textoLimpo) || /\bsociólogo\b/i.test(textoLimpo) || /\bpensador\b/i.test(textoLimpo) || /\bobra\b/i.test(textoLimpo)) {
        notaC3 += 40; repertorios.push("Repertório cultural");
    }

    if (notaC3 > 200) notaC3 = 200;
    nota += notaC3;
    feedback.push(repertorios.length > 0 ? `🌟 C3 (Argumentação): Bom uso de repertório (${repertorios.join(", ")}).` : "⚠️ C3: Argumentação fraca. Cite dados, leis, pensadores ou fatos históricos para validar sua opinião.");


    // --- COMPETÊNCIA 4: COESÃO (200 PONTOS) ---
    // Foco: Conectivos inter e intra parágrafos.
    let notaC4 = 200;
    const errosC4 = [];
    const conectivos = ['portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'por outro lado', 'visto que', 'dessa forma', 'em suma', 'consequentemente', 'porém', 'pois', 'mas', 'embora', 'logo', 'assim', 'nesse sentido', 'diante disso', 'sob essa ótica'];

    // 4.1 Variedade
    const usados = new Set(conectivos.filter(c => textoInteiroLower.includes(c)));
    if (usados.size < 4) {
        notaC4 -= 80;
        errosC4.push(`Variedade baixa de conectivos (apenas ${usados.size} tipos encontrados). Use: Entretanto, Além disso, Portanto...`);
    }

    // 4.2 Coesão INTER-parágrafos (Obrigatório no ENEM)
    // Verifica se os parágrafos de desenvolvimento/conclusão COMEÇAM com conectivo
    if (paragrafos.length >= 3) {
        let conexoesInter = 0;
        // Pula o primeiro (intro), checa os outros
        for (let i = 1; i < paragrafos.length; i++) {
            const inicio = paragrafos[i].trim().toLowerCase().split(' ').slice(0, 3).join(' '); // Pega as 3 primeiras palavras
            const temConectivoInicio = conectivos.some(c => inicio.includes(c));
            if (temConectivoInicio) conexoesInter++;
        }

        if (conexoesInter === 0 && paragrafos.length > 1) {
            notaC4 -= 60;
            errosC4.push("Falta coesão entre parágrafos. Inicie os parágrafos de desenvolvimento e conclusão com conectivos (ex: 'Em primeiro lugar', 'Além disso', 'Portanto').");
        }
    }

    if (notaC4 < 40) notaC4 = 40;
    nota += notaC4;
    feedback.push(errosC4.length > 0 ? `⚠️ C4 (Coesão): ${errosC4.join(" ")}` : "✅ C4: Texto fluido e bem conectado.");


    // --- COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO (200 PONTOS) ---
    // Foco: Agente, Ação, Meio, Efeito.
    let notaC5 = 0;
    const detalhesC5 = [];

    if (paragrafos.length > 1) {
        const conclusao = paragrafos[paragrafos.length - 1].toLowerCase();
        
        // 5.1 Busca Elementos Específicos
        const temAgente = /governo|estado|ministério|escola|mídia|sociedade|família|ongs|poder público|indivíduo/.test(conclusao);
        const temAcao = /deve|precisa|necessita|cabe a|é necessário|promover|criar|fiscalizar|investir/.test(conclusao);
        const temMeio = /por meio de|através de|mediante|com o uso de|intermédio|via/.test(conclusao);
        const temFinalidade = /a fim de|com o intuito de|para que|visando|objetivando|com o fito de/.test(conclusao);

        let elementos = 0;
        if (temAgente) { elementos++; detalhesC5.push("Agente"); }
        if (temAcao) { elementos++; detalhesC5.push("Ação"); }
        if (temMeio) { elementos++; detalhesC5.push("Meio/Modo"); }
        if (temFinalidade) { elementos++; detalhesC5.push("Finalidade"); }

        // Cálculo da nota C5 (40 pontos por elemento + 40 base/detalhamento)
        notaC5 = elementos * 40;
        if (elementos === 4) notaC5 = 200; // Bônus por completude

        if (notaC5 < 40) notaC5 = 40; // Mínimo se tiver texto
        if (notaC5 === 200) {
            feedback.push("🌟 C5 (Proposta): Perfeita! Contém Agente, Ação, Meio e Finalidade.");
        } else {
            feedback.push(`⚠️ C5 (Proposta): Incompleta (${notaC5}/200). Encontrei: [${detalhesC5.join(", ")}]. Tente usar: "O GOVERNO deve CRIAR leias, POR MEIO DE decretos, A FIM DE melhorar..."`);
        }

    } else {
        feedback.push("❌ C5: Texto sem conclusão clara.");
    }
    nota += notaC5;

    // --- TRAVA FINAL ---
    if (nota > 1000) nota = 1000;
    if (totalPalavras < 40) nota = 0; 

    return {
        nota: nota,
        detalhes: feedback.join("\n\n")
    };
}

module.exports = { corrigirRedacao };
