// src/ia_engine/corretor.js

function corrigirRedacao(texto, tema) {
    // Objeto de Resposta Profissional
    let resultado = {
        notaFinal: 0,
        competencias: {
            c1: { nome: "Norma Culta", nota: 200, erros: [] },
            c2: { nome: "Tema e Estrutura", nota: 200, erros: [] },
            c3: { nome: "Argumentação", nota: 200, erros: [] },
            c4: { nome: "Coesão", nota: 200, erros: [] },
            c5: { nome: "Proposta de Intervenção", nota: 200, erros: [] }
        },
        analiseGeral: []
    };

    const textoLimpo = texto.trim();
    const textoLower = textoLimpo.toLowerCase();
    
    // Tokenização básica
    const palavras = textoLower.match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);

    // --- 0. TRAVAS DE SEGURANÇA (Spam/Tamanho) ---
    if (totalPalavras < 40) {
        return zeraTudo(resultado, "Texto insuficiente para correção (mínimo 40 palavras).");
    }
    
    // Verificador de repetição insana (spam)
    const uniqueWords = new Set(palavras);
    if ((uniqueWords.size / totalPalavras) < 0.35) {
        return zeraTudo(resultado, "🚨 Texto anulado: Repetição excessiva de palavras (Spam).");
    }

    // --- COMPETÊNCIA 1: NORMA CULTA ---
    // Penaliza oralidade, erros comuns e frases longas demais
    const c1 = resultado.competencias.c1;
    
    const oralidade = ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo assim', 'aí'];
    oralidade.forEach(w => {
        if (palavras.includes(w)) { c1.nota -= 20; c1.erros.push(`Oralidade: "${w}"`); }
    });

    if (/\bhouveram\b/i.test(textoLower)) { c1.nota -= 40; c1.erros.push("Erro grave: 'Houveram'."); }
    if (/\bfazem\s+\d+\s+anos\b/i.test(textoLower)) { c1.nota -= 40; c1.erros.push("Erro grave: 'Fazem x anos'."); }

    // Frases muito longas (Prolixidade)
    const frases = textoLimpo.split(/[.!?]+/).filter(f => f.trim().length > 0);
    frases.forEach(f => {
        if (f.split(' ').length > 50) {
            c1.nota -= 20;
            c1.erros.push("Frase excessivamente longa (+50 palavras). Use mais pontos finais.");
        }
    });
    c1.nota = Math.max(0, c1.nota);


    // --- COMPETÊNCIA 2: TEMA E ESTRUTURA ---
    // Aderência ao tema + Estrutura dissertativa
    const c2 = resultado.competencias.c2;

    // 2.1 Aderência ao Tema (CRÍTICO)
    if (tema && tema !== "Livre") {
        // Extrai palavras-chave do tema (ex: "Caminhos para combater o racismo" -> racismo, combater)
        const palavrasTema = tema.toLowerCase().match(/\b[\wÀ-ÿ]{4,}\b/g) || [];
        const citacoesTema = palavrasTema.filter(pt => textoLower.includes(pt)).length;

        if (citacoesTema === 0) {
            c2.nota = 40; // Fuga do tema quase total
            c2.erros.push(`🚨 Tangenciamento: Você não citou as palavras-chave do tema: "${tema}".`);
        } else if (citacoesTema < palavrasTema.length) {
            c2.nota -= 40;
            c2.erros.push("Atenção: Você citou apenas parte do tema. Certifique-se de abordar o tema completo.");
        }
    }

    // 2.2 Estrutura
    if (paragrafos.length < 3) {
        c2.nota = 40; c2.erros.push("Estrutura embrionária (menos de 3 parágrafos).");
    } else if (paragrafos.length > 5) {
        c2.nota -= 40; c2.erros.push("Muitos parágrafos curtos. Tente condensar.");
    }
    
    // Tese na introdução (procura juízo de valor)
    if (paragrafos.length > 0) {
        const intro = paragrafos[0].toLowerCase();
        const marcasTese = ['fundamental', 'prejudicial', 'grave', 'problema', 'desafio', 'necessário', 'impasse'];
        if (!marcasTese.some(m => intro.includes(m))) {
            c2.nota -= 40; c2.erros.push("Introdução muito descritiva. Deixe sua opinião (tese) clara.");
        }
    }
    c2.nota = Math.max(40, c2.nota);


    // --- COMPETÊNCIA 3: ARGUMENTAÇÃO E PROFUNDIDADE ---
    const c3 = resultado.competencias.c3;
    
    // 3.1 Profundidade (Causa e Consequência)
    const explicativos = ['porque', 'pois', 'visto que', 'uma vez que', 'dado que'];
    const conclusivos = ['consequentemente', 'resulta em', 'gera', 'ocasiona', 'acarretando'];
    
    const temExplicacao = explicativos.some(e => textoLower.includes(e));
    const temConsequencia = conclusivos.some(c => textoLower.includes(c));

    if (!temExplicacao) { c3.nota -= 40; c3.erros.push("Argumentação superficial: Use 'porque', 'pois' para explicar as causas."); }
    if (!temConsequencia) { c3.nota -= 40; c3.erros.push("Falta profundidade: Mostre as consequências (ex: 'isso gera...', 'resulta em...')."); }

    // 3.2 Repertório
    const repertorios = ['segundo', 'de acordo', 'ibge', 'oms', 'constituição', 'dados', 'lei', 'filósofo', 'sociólogo'];
    if (!repertorios.some(r => textoLower.includes(r))) {
        c3.nota -= 60; c3.erros.push("Faltou repertório sociocultural (Dados, Leis, Autores).");
    }
    
    // 3.3 Anti-Cliché
    const cliches = ['hoje em dia', 'nos dias de hoje', 'desde os primórdios', 'a cada dia que passa'];
    if (cliches.some(c => textoLower.includes(c))) {
        c3.nota -= 20; c3.erros.push("Evite clichês como 'Hoje em dia'. Seja mais específico.");
    }
    c3.nota = Math.max(40, c3.nota);


    // --- COMPETÊNCIA 4: COESÃO ---
    const c4 = resultado.competencias.c4;
    const conectivos = ['portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'por outro lado', 'visto que', 'dessa forma', 'em suma'];
    
    // Variedade
    const usados = new Set(conectivos.filter(c => textoLower.includes(c)));
    if (usados.size < 4) {
        c4.nota -= 80; c4.erros.push("Pouca variedade de conectivos. Use pelo menos 4 diferentes.");
    }

    // Coesão Interparágrafos (Parágrafo 2, 3 e 4 devem começar com conectivo)
    if (paragrafos.length >= 2) {
        let errosConexao = 0;
        for(let i=1; i < paragrafos.length; i++) {
            const inicio = paragrafos[i].substring(0, 20).toLowerCase();
            if (!conectivos.some(c => inicio.includes(c))) errosConexao++;
        }
        if (errosConexao > 0) {
            c4.nota -= 40; c4.erros.push("Inicie os parágrafos de desenvolvimento/conclusão com conectivos.");
        }
    }
    c4.nota = Math.max(40, c4.nota);


    // --- COMPETÊNCIA 5: PROPOSTA DE INTERVENÇÃO ---
    const c5 = resultado.competencias.c5;
    
    if (paragrafos.length > 1) {
        const fim = paragrafos[paragrafos.length - 1].toLowerCase();
        
        // Elementos Obrigatórios
        const temAgente = /governo|estado|ministério|escola|mídia|sociedade|família|ongs/.test(fim);
        const temAcao = /deve|precisa|necessita|cabe a|promover|criar|fiscalizar|investir/.test(fim);
        const temMeio = /por meio de|através de|mediante|intermédio/.test(fim);
        const temFinalidade = /a fim de|com o intuito de|para que|visando|com o fito de/.test(fim);

        if (!temAgente) c5.erros.push("Faltou AGENTE (quem faz).");
        if (!temAcao) c5.erros.push("Faltou AÇÃO (o que fazer).");
        if (!temMeio) c5.erros.push("Faltou MEIO (por meio de que).");
        if (!temFinalidade) c5.erros.push("Faltou FINALIDADE (para que).");

        let notaCalc = 0;
        if (temAgente) notaCalc += 40;
        if (temAcao) notaCalc += 40;
        if (temMeio) notaCalc += 40;
        if (temFinalidade) notaCalc += 40;
        
        // Detalhamento/Qualidade (Penaliza propostas vagas)
        if (fim.includes("conscientizar") || fim.includes("palestra")) {
            c5.erros.push("⚠️ Proposta fraca: 'Conscientizar' ou 'Palestras' são considerados senso comum. Proponha algo concreto.");
        } else {
            notaCalc += 40; // Bônus por não usar clichê de intervenção
        }

        c5.nota = notaCalc;
    } else {
        c5.nota = 0; c5.erros.push("Sem parágrafo de conclusão.");
    }


    // --- CÁLCULO FINAL ---
    resultado.notaFinal = c1.nota + c2.nota + c3.nota + c4.nota + c5.nota;
    return resultado;
}

function zeraTudo(res, motivo) {
    res.notaFinal = 0;
    res.analiseGeral.push(motivo);
    Object.keys(res.competencias).forEach(k => res.competencias[k].nota = 0);
    return res;
}

module.exports = { corrigirRedacao };
