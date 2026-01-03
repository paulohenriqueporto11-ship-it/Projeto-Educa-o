// src/ia_engine/corretor.js

// =================================================================
// 🛠️ FUNÇÕES AUXILIARES (HELPER FUNCTIONS)
// =================================================================

/**
 * Aplica penalidade a uma competência de forma segura (sem negativar)
 */
function penalizar(competenciaObj, pontos, mensagem) {
    competenciaObj.nota -= pontos;
    if (competenciaObj.nota < 0) competenciaObj.nota = 0; // Trava no zero
    // Evita mensagens duplicadas
    if (!competenciaObj.erros.includes(mensagem)) {
        competenciaObj.erros.push(mensagem);
    }
}

/**
 * Bonifica uma competência (sem passar de 200)
 */
function bonificar(competenciaObj, pontos, mensagem) {
    competenciaObj.nota += pontos;
    if (competenciaObj.nota > 200) competenciaObj.nota = 200;
    // Adiciona feedback positivo se não existir
    const msgPositiva = `✅ ${mensagem}`;
    if (!competenciaObj.erros.includes(msgPositiva)) {
        // Removemos erro se tiver virado acerto, opcional
        competenciaObj.erros = competenciaObj.erros.filter(e => !e.includes("Faltou")); 
        // Adicionamos como item de destaque no final, ou tratamos no front
    }
}

/**
 * Remove acentos e deixa minúsculo para comparações
 */
function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Conta quantas palavras de uma lista aparecem no texto
 */
function checarPresenca(textoAlvo, listaPalavras) {
    const textoNorm = normalizar(textoAlvo);
    return listaPalavras.filter(palavra => textoNorm.includes(normalizar(palavra))).length;
}

// =================================================================
// 🧠 LÓGICA PRINCIPAL
// =================================================================

function corrigirRedacao(texto, tema) {
    // Estrutura de Resposta
    let resultado = {
        notaFinal: 0,
        competencias: {
            c1: { nome: "Norma Culta", nota: 200, erros: [] },
            c2: { nome: "Tema e Estrutura", nota: 200, erros: [] },
            c3: { nome: "Argumentação", nota: 200, erros: [] },
            c4: { nome: "Coesão", nota: 200, erros: [] },
            c5: { nome: "Proposta de Intervenção", nota: 0, erros: [] } // C5 começa zerada e ganha pontos
        },
        analiseGeral: []
    };

    // --- 0. PREPARAÇÃO E LIMPEZA ---
    const textoLimpo = texto.trim();
    if (!textoLimpo || textoLimpo.split(/\s+/).length < 40) {
        resultado.analiseGeral.push("🚨 Texto muito curto (mínimo 40 palavras). Nota zerada.");
        return resultado;
    }

    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const textoLower = textoLimpo.toLowerCase();
    const palavras = textoLower.match(/\b[\wÀ-ÿ]+\b/g) || [];
    const totalPalavras = palavras.length;

    // --- 1. SEGURANÇA (ANTI-SPAM) ---
    const palavrasUnicas = new Set(palavras);
    if ((palavrasUnicas.size / totalPalavras) < 0.35) {
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Repetição excessiva de palavras.");
        return resultado;
    }
    // Verifica excesso de pontuação/sujeira
    const apenasLetras = textoLimpo.replace(/[^a-zA-ZÀ-ÿ]/g, "").length;
    if (apenasLetras < textoLimpo.length * 0.8) {
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Excesso de caracteres não textuais.");
        return resultado;
    }

    // =================================================================
    // ANÁLISE POR COMPETÊNCIAS
    // =================================================================

    const { c1, c2, c3, c4, c5 } = resultado.competencias;

    // --- C1: NORMA CULTA ---
    // Lista expandida de oralidade e vícios
    const oralidade = ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo assim', 'aí', 'então assim', 'daí'];
    oralidade.forEach(termo => {
        if (new RegExp(`\\b${termo}\\b`, 'i').test(textoLimpo)) {
            penalizar(c1, 20, `Evite marca de oralidade: "${termo}".`);
        }
    });

    // Erros Gramaticais (Regex)
    if (/\bhouveram\b/i.test(textoLower)) penalizar(c1, 30, "Gramática: 'Houveram' não existe (verbo haver impessoal).");
    if (/\bfazem\s+\d+\s+anos\b/i.test(textoLower)) penalizar(c1, 30, "Gramática: Use 'Faz x anos'.");
    if (/\bà\s+(partir|todos|medida|mim|ti|nós)\b/i.test(textoLower)) penalizar(c1, 40, "Gramática: Erro grave de crase (antes de verbo ou palavra masculina/pronome).");
    if (/\bvai\s+estar\s+\w+ndo\b/i.test(textoLower)) penalizar(c1, 20, "Estilo: Evite gerundismo ('vai estar fazendo').");
    if (/\beu\s+acho\b/i.test(textoLower)) penalizar(c1, 20, "Estilo: Evite 'Eu acho', prefira 'Nota-se' ou 'É evidente'.");

    // Frases Longas (Prolixidade)
    const frases = textoLimpo.split(/[.!?]+/).filter(f => f.trim().length > 0);
    let frasesMuitoLongas = 0;
    frases.forEach(f => {
        if (f.split(/\s+/).length > 55) frasesMuitoLongas++;
    });
    if (frasesMuitoLongas > 0) {
        penalizar(c1, 20 * frasesMuitoLongas, `Atenção: Você tem ${frasesMuitoLongas} frase(s) muito longas (+55 palavras). Pontue mais.`);
    }


    // --- C2: TEMA E ESTRUTURA ---
    
    // 2.1 Aderência ao Tema (Ignorando stopwords)
    if (tema && tema !== "Livre") {
        const stopWords = ['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'os', 'as', 'um', 'uma'];
        const palavrasTema = normalizar(tema).split(/\s+/).filter(p => p.length > 3 && !stopWords.includes(p));
        
        let citacoes = 0;
        palavrasTema.forEach(pt => {
            if (textoLower.includes(pt)) citacoes++;
        });

        if (citacoes === 0) {
            c2.nota = 40; // Fuga parcial grave
            penalizar(c2, 0, `🚨 Tangenciamento: Nenhuma palavra-chave do tema "${tema}" foi encontrada.`);
        } else if (citacoes < palavrasTema.length / 2) {
            penalizar(c2, 60, "Tangenciamento: Você citou poucas palavras do tema. Foque mais no assunto proposto.");
        }
    }

    // 2.2 Estrutura Dissertativa
    if (paragrafos.length < 3) penalizar(c2, 120, "Estrutura incompleta (mínimo 3 parágrafos).");
    else if (paragrafos.length === 3) penalizar(c2, 40, "Tente fazer 4 parágrafos (1 Intro, 2 Desenv, 1 Concl) para nota máxima.");
    
    // 2.3 Tese na Introdução (Verbos de Opinião)
    if (paragrafos.length > 0) {
        const intro = paragrafos[0].toLowerCase();
        const marcasTese = ['fundamental', 'imprescindível', 'urgente', 'notório', 'inaceitável', 'grave', 'deve-se', 'precisa-se', 'defende-se'];
        if (!marcasTese.some(m => intro.includes(m))) {
            penalizar(c2, 40, "Introdução muito expositiva. Use adjetivos ou verbos que mostrem sua opinião (juízo de valor).");
        }
    }


    // --- C3: ARGUMENTAÇÃO ---
    
    // 3.1 Profundidade (Sintaxe Causal)
    const causais = ['visto que', 'uma vez que', 'pois', 'porquanto', 'dado que', 'haja vista'];
    const consecutivas = ['consequentemente', 'logo', 'por conseguinte', 'acarreta', 'resulta em'];
    
    if (checarPresenca(textoLower, causais) < 1) penalizar(c3, 40, "Argumentação superficial: Use conectivos explicativos ('visto que', 'pois') para justificar suas ideias.");
    if (checarPresenca(textoLower, consecutivas) < 1) penalizar(c3, 40, "Falta aprofundamento: Mostre as consequências dos problemas ('isso acarreta...', 'resulta em...').");

    // 3.2 Repertório Sociocultural (Lista Expandida)
    const repertorios = [
        'segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 
        'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário',
        'dados', 'estatística', 'pesquisa', 'estudo', 'universidade', 'ciência'
    ];
    if (checarPresenca(textoLower, repertorios) === 0) {
        penalizar(c3, 80, "Faltou Repertório Sociocultural Legitimado (Dados, Citações, Leis, Obras).");
    }

    // 3.3 Clichês
    const cliches = ['hoje em dia', 'nos dias de hoje', 'desde os primórdios', 'a cada dia que passa', 'com certeza'];
    if (checarPresenca(textoLower, cliches) > 0) {
        penalizar(c3, 20, "Evite frases clichês/senso comum (ex: 'Hoje em dia'). Seja mais específico.");
    }


    // --- C4: COESÃO ---
    const conectivosLista = [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'por outro lado', 'visto que', 
        'dessa forma', 'em suma', 'consequentemente', 'nesse sentido', 'sob esse viés', 'diante disso',
        'outrossim', 'adicionando', 'em contrapartida'
    ];
    
    // 4.1 Variedade
    const usadosC4 = conectivosLista.filter(c => textoLower.includes(c));
    const qtdUsados = usadosC4.length;
    
    if (qtdUsados < 2) penalizar(c4, 140, "Texto desconexo. Use conectivos para ligar as frases.");
    else if (qtdUsados < 4) penalizar(c4, 80, "Baixa variedade de conectivos. Tente variar mais.");
    else if (qtdUsados > 6) bonificar(c4, 0, "Boa variedade de conectivos.");

    // 4.2 Coesão Interparágrafos (Verifica INÍCIO dos parágrafos de desenv/concl)
    if (paragrafos.length > 2) {
        let conexoesInter = 0;
        // Começa do índice 1 (segundo parágrafo)
        for (let i = 1; i < paragrafos.length; i++) {
            // Pega as primeiras 5 palavras do parágrafo
            const inicioParagrafo = normalizar(paragrafos[i]).split(/\s+/).slice(0, 6).join(" ");
            
            // Verifica se algum conectivo está nesse início
            const tem = conectivosLista.some(c => inicioParagrafo.includes(normalizar(c)));
            if (tem) conexoesInter++;
        }

        if (conexoesInter === 0) {
            penalizar(c4, 60, "Coesão fraca entre parágrafos. Inicie o desenvolvimento e conclusão com conectivos (ex: 'Em primeiro lugar', 'Além disso').");
        }
    }


    // --- C5: PROPOSTA DE INTERVENÇÃO (CÁLCULO SOMATIVO) ---
    // Diferente das outras, C5 começa com 0 e ganha pontos
    
    if (paragrafos.length > 1) {
        const conclusao = paragrafos[paragrafos.length - 1].toLowerCase();
        
        // Elementos (40 pontos cada)
        const agentes = ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo'];
        const acoes = ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar'];
        const meios = ['por meio de', 'através de', 'mediante', 'intermédio', 'uso de'];
        const finalidades = ['a fim de', 'com o intuito de', 'para que', 'visando', 'com o fito de', 'objetivando'];

        let elementosEncontrados = 0;
        let msgsC5 = [];

        if (agentes.some(a => conclusao.includes(a))) { elementosEncontrados++; } else msgsC5.push("Faltou AGENTE.");
        if (acoes.some(a => conclusao.includes(a))) { elementosEncontrados++; } else msgsC5.push("Faltou AÇÃO.");
        if (meios.some(m => conclusao.includes(m))) { elementosEncontrados++; } else msgsC5.push("Faltou MEIO/MODO.");
        if (finalidades.some(f => conclusao.includes(f))) { elementosEncontrados++; } else msgsC5.push("Faltou FINALIDADE.");

        // Detalhamento Simples (Se tiver texto suficiente entre os elementos)
        if (conclusao.length > 150 && elementosEncontrados >= 3) {
            elementosEncontrados++; // Ponto extra de detalhamento/completude
        } else if (elementosEncontrados >= 3) {
            msgsC5.push("Faltou DETALHAMENTO da proposta.");
        }

        // Penalidade por intervenção genérica (nula)
        if (conclusao.includes("conscientizar") || conclusao.includes("palestra")) {
            c5.nota = Math.min(c5.nota, 80); // Teto de nota
            penalizar(c5, 0, "⚠️ Intervenção fraca: 'Conscientizar' ou 'Palestras' são considerados senso comum. Proponha ações concretas.");
        }

        // Cálculo Final C5
        c5.nota = elementosEncontrados * 40;
        if (c5.nota > 200) c5.nota = 200;
        
        // Adiciona os erros acumulados
        msgsC5.forEach(m => c5.erros.push(m));

    } else {
        c5.nota = 0;
        c5.erros.push("Texto sem parágrafo de conclusão.");
    }

    // --- CÁLCULO FINAL ---
    resultado.notaFinal = c1.nota + c2.nota + c3.nota + c4.nota + c5.nota;
    return resultado;
}

module.exports = { corrigirRedacao };
