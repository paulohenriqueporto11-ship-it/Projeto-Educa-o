// src/ia_engine/corretor.js

// =================================================================
// ⚙️ CONFIGURAÇÕES (CONSTANTES GLOBAIS)
// =================================================================
const CONFIG = {
    PONTOS: {
        MAX: 200,
        MIN: 0,
        PENALIDADE: {
            LEVE: 20,
            MEDIA: 40,
            GRAVE: 60,
            FATAL: 120,
            REPETICAO: 20,
            FRASE_LONGA: 10
        },
        BONUS: {
            VOCABULARIO: 20,
            ELEMENTO_C5: 40
        }
    },
    LIMITES: {
        MIN_PALAVRAS: 50,
        MIN_VOCABULARIO_UNICO: 0.35,
        FRASE_LONGA_QTD: 60,
        MAX_REPETICAO_CONECTIVO: 4,
        MIN_PARAGRAFOS: 3,
        TAMANHO_DETALHAMENTO: 80
    }
};

// =================================================================
// 📚 LÉXICO & DADOS
// =================================================================
const LEXICO = {
    ORALIDADE: ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo', 'aí', 'então', 'daí', 'né', 'ta', 'tá', 'blz', 'so'],
    VOCABULARIO_RICO: ['imprescindível', 'intrínseco', 'corroborar', 'paradigma', 'utopia', 'efêmero', 'mitigar', 'exacerbar', 'viés', 'conjuntura', 'preponderante', 'inexorável', 'fomento', 'alicerce', 'consoante', 'premissa', 'análogo', 'dissonância', 'inerente', 'fundamental', 'crucial', 'consolidar', 'assegurar', 'democratização', 'segregação', 'articular'],
    MARCAS_OPINIAO: ['fundamental', 'imprescindível', 'urgente', 'notório', 'grave', 'deve-se', 'precisa-se', 'defende-se', 'acredita-se', 'observa-se', 'inaceitável', 'crucial', 'lastimável', 'preocupante', 'indispensável', 'necessário', 'evidente', 'inadmissível'],
    CLICHES: ['hoje em dia', 'nos dias de hoje', 'desde os primórdios', 'a cada dia que passa', 'com certeza', 'no mundo atual', 'atualmente', 'desde sempre'],
    
    CONECTIVOS_TRANSICAO: [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além', 'visto', 'dessa forma', 'em suma', 'consequentemente', 'nesse sentido', 'sob esse viés', 'diante disso', 'outrossim', 'adicionando', 'em contrapartida', 'assim', 'logo', 'primeiramente', 'ademais', 'por fim', 'em síntese', 'dessa maneira', 'outro fator', 'vale ressaltar', 'historicamente', 'consequentemente', 'no brasil', 'por outro lado'
    ],
    CONECTIVOS_CONCLUSAO_FORTE: ['portanto', 'em suma', 'concluindo', 'em síntese', 'dessa forma', 'assim', 'logo'],
    
    REPERTORIO: ['segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário', 'dados', 'estatística', 'pesquisa', 'estudo', 'universidade', 'ciência', 'história', 'guerra', 'revolução', 'cenário', 'panorama', 'literatura', 'notícia', 'reportagem'],
    
    C5_ELEMENTOS: [
        { chave: 'AGENTE', msg: 'Faltou AGENTE (Quem?)', termos: ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo', 'executivo', 'cabe ao', 'cabe à', 'indivíduo', 'cidadão', 'iniciativa', 'parcerias', 'instituições', 'entidades', 'gestores'] },
        { chave: 'ACAO', msg: 'Faltou AÇÃO (O quê?)', termos: ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar', 'realizar', 'garantir', 'desenvolver', 'elaborar', 'instituir', 'viabilizar', 'atuar', 'assegurar', 'fortalecimento', 'estimular', 'articulem', 'reduzir'] },
        { chave: 'MEIO', msg: 'Faltou MEIO/MODO (Como?)', termos: ['por meio', 'através', 'mediante', 'intermédio', 'uso de', 'via', 'auxílio', 'partir de', 'utilização de', 'aliada à', 'associação com', 'baseado em'] },
        { chave: 'FINALIDADE', msg: 'Faltou FINALIDADE (Para quê?)', termos: ['a fim', 'intuito', 'para que', 'visando', 'fito', 'objetivando', 'sentido de', 'mitigar', 'resolver', 'propósito', 'possibilita que', 'permitindo que', 'capaz de', 'garantindo que', 'contribuir para', 'ampliem', 'promovendo'] }
    ],
    C5_GENERICOS: ['conscientizar', 'palestra']
};

// =================================================================
// ⚡ CACHE DE PERFORMANCE
// =================================================================
const CACHE = {
    SETS: {
        ORALIDADE: new Set(LEXICO.ORALIDADE),
        VOCABULARIO_RICO: new Set(LEXICO.VOCABULARIO_RICO),
        MARCAS_OPINIAO: new Set(LEXICO.MARCAS_OPINIAO),
        CONECTIVOS: new Set(LEXICO.CONECTIVOS_TRANSICAO)
    },
    REGEX: {
        CLICHES: new RegExp(`\\b(${LEXICO.CLICHES.join('|')})\\b`, 'gi'),
        REPERTORIO: new RegExp(`\\b(${LEXICO.REPERTORIO.join('|')})\\b`, 'gi'),
        PONTUACAO_ESPACO_ANTES: /\s+[.,;]/,
        PONTUACAO_FALTA_ESPACO: /[.,;][a-zA-Z]/,
        PONTO_SOLTO: /[a-z] \.[A-Z]/,
        CONCORDANCIA: /\b(os|as|uns|umas)\s+(problema|pessoa|criança|vez|cidadão|país|lei|questão)\b/i,
        HOUVERAM: /\bhouveram\b/i,
        FAZEM_TEMPO: /\bfazem\s+\d+\s+anos\b/i,
        CRASE_ERRO: /\bà\s+(partir|todos|medida|mim|ti|nós|ele|ela)\b/i,
        MIM_CONJUGA: /\b(mim|ti)\s+(fazer|ser|ir|ter|falar)\b/i,
        INICIO_OBLIQUO: /^\s*(me|te|se|nos|lhe)\s+[a-z]/im,
        FRASES_SPLIT: /[.!?]+/
    }
};

// =================================================================
// 🛠️ HELPERS
// =================================================================

function normalizar(txt) {
    return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\r/g, "").trim();
}

function clamp(val) {
    return Math.max(CONFIG.PONTOS.MIN, Math.min(CONFIG.PONTOS.MAX, val));
}

function penalizar(comp, pontos, tipo, descricao, exemplo, acao) {
    comp.nota = clamp(comp.nota - pontos);
    if (!comp.erros.some(e => e.descricao === descricao)) {
        comp.erros.push({ tipo, descricao, exemplo, acao });
    }
}

function bonificar(comp, pontos) {
    comp.nota = clamp(comp.nota + pontos);
}

function tokenizar(texto) {
    return normalizar(texto).match(/\b[\wÀ-ÿ]+\b/g) || [];
}

function contemPalavra(tokens, setAlvo) {
    return tokens.some(t => setAlvo.has(t));
}

function detectarRepeticaoFrases(frases) {
    const setFrases = new Set();
    return frases.some(f => {
        if (f.length < 20) return false;
        const fNorm = normalizar(f).replace(/\s+/g, ' ');
        if (setFrases.has(fNorm)) return true;
        setFrases.add(fNorm);
        return false;
    });
}

// ⚠️ NOVA FUNÇÃO: Zera tudo se der ruim
function zerarNotas(resultado) {
    resultado.notaFinal = 0;
    Object.keys(resultado.competencias).forEach(k => {
        resultado.competencias[k].nota = 0;
        resultado.competencias[k].erros = []; // Limpa erros anteriores
    });
}

// =================================================================
// 🧠 MÓDULOS DE COMPETÊNCIA
// =================================================================

function analisarC1(texto, textoLower, tokens, frases, resC1) {
    const oralidadesEncontradas = tokens.filter(t => CACHE.SETS.ORALIDADE.has(t));
    if (oralidadesEncontradas.length > 0) {
        const exemplo = [...new Set(oralidadesEncontradas)].slice(0, 3).join(', ');
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Oralidade", "Termos informais.", `Ex: ${exemplo}`, "Substitua por linguagem formal.");
    }

    const check = (regex, pontos, tipo, desc, ex, acao) => {
        if (regex.test(texto)) penalizar(resC1, pontos, tipo, desc, ex, acao);
    };

    check(CACHE.REGEX.PONTUACAO_ESPACO_ANTES, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Espaço antes de sinal.", "Ex: 'Olá ,'", "Remova o espaço.");
    check(CACHE.REGEX.PONTUACAO_FALTA_ESPACO, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Falta espaço após sinal.", "Ex: 'Olá,mundo'", "Adicione espaço.");
    check(CACHE.REGEX.CONCORDANCIA, CONFIG.PONTOS.PENALIDADE.MEDIA, "Concordância", "Erro plural/singular.", "Ex: 'Os problema'", "Ajuste o número.");
    check(CACHE.REGEX.HOUVERAM, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "Uso de 'Houveram'.", "'Houveram fatos'", "Use 'Houve'.");
    check(CACHE.REGEX.FAZEM_TEMPO, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "Uso de 'Fazem' (tempo).", "'Fazem anos'", "Use 'Faz anos'.");
    check(CACHE.REGEX.CRASE_ERRO, CONFIG.PONTOS.PENALIDADE.MEDIA, "Crase", "Crase indevida.", "Antes de masculino/verbo.", "Remova a crase.");
    check(CACHE.REGEX.MIM_CONJUGA, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "'Mim' conjuga verbo.", "'Para mim ir'", "Use 'Para eu ir'.");

    let frasesLongas = 0;
    frases.forEach(f => {
        if ((f.match(/\s/g) || []).length > CONFIG.LIMITES.FRASE_LONGA_QTD) frasesLongas++;
    });
    if (frasesLongas > 3) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.FRASE_LONGA * (frasesLongas - 3), "Fluidez", "Períodos muito longos.", `${frasesLongas} frases extensas.`, "Use mais pontos finais.");
    }

    const ricasCount = tokens.reduce((acc, t) => acc + (CACHE.SETS.VOCABULARIO_RICO.has(t) ? 1 : 0), 0);
    if (ricasCount >= 3 && resC1.nota < CONFIG.PONTOS.MAX) {
        bonificar(resC1, CONFIG.PONTOS.BONUS.VOCABULARIO);
    }
}

function analisarC2(textoLower, tema, paragrafos, totalPalavras, resC2) {
    if (tema && tema !== "Livre") {
        const stopWords = new Set(['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'um', 'uma', 'os', 'as', 'no', 'na']);
        const tokensTema = tokenizar(tema).filter(t => t.length > 3 && !stopWords.has(t));
        const citacoes = tokensTema.reduce((acc, t) => acc + (textoLower.includes(t) ? 1 : 0), 0);

        if (citacoes === 0) {
            resC2.nota = 40;
            penalizar(resC2, 0, "Tema", "Fuga do tema.", `Tema: ${tema}`, "Cite as palavras-chave do tema.");
        } else if (citacoes < tokensTema.length / 2) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.GRAVE, "Tema", "Tangenciamento.", "Tema incompleto.", "Use todos os termos do tema.");
        }
    }

    const numParagrafos = paragrafos.length;
    if (numParagrafos === 1 && totalPalavras > 100) {
        penalizar(resC2, CONFIG.PONTOS.PENALIDADE.GRAVE, "Estrutura Visual", "Texto em Monobloco.", "Apenas 1 parágrafo.", "Divida em parágrafos.");
    } else {
        if (numParagrafos < CONFIG.LIMITES.MIN_PARAGRAFOS) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.FATAL, "Estrutura", "Texto insuficiente.", "Menos de 3 parágrafos.", "Siga a estrutura dissertativa.");
        } 
        const maxParagrafos = totalPalavras > 400 ? 10 : 6;
        if (numParagrafos > maxParagrafos) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.LEVE, "Estrutura", "Fragmentação.", "Muitos parágrafos curtos.", "Tente agrupar ideias.");
        }
        const textoIntro = paragrafos.slice(0, 2).join(" ");
        const tokensIntro = tokenizar(textoIntro);
        if (!contemPalavra(tokensIntro, CACHE.SETS.MARCAS_OPINIAO)) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.MEDIA, "Tese", "Sem marca de opinião.", "Intro expositiva.", "Use 'é fundamental', 'é grave'.");
        }
    }
}

function analisarC3(textoLower, resC3) {
    const explicativos = ['porque', 'pois', 'visto', 'dado', 'haja', 'virtude', 'medida'];
    const conclusivos = ['consequentemente', 'logo', 'acarreta', 'gera', 'ocasiona', 'leva', 'promove', 'implica'];
    const temExpl = explicativos.some(t => textoLower.includes(t));
    const temConc = conclusivos.some(t => textoLower.includes(t));

    if (!temExpl) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Argumentação", "Falta justificativa.", "Sem 'pois', 'visto que'.", "Explique o porquê.");
    if (!temConc) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Aprofundamento", "Falta consequência.", "Sem 'isso gera'.", "Mostre o impacto.");

    if (!CACHE.REGEX.REPERTORIO.test(textoLower)) {
        penalizar(resC3, CONFIG.PONTOS.PENALIDADE.GRAVE, "Repertório", "Sem repertório.", "Faltou dados/autores.", "Legitime seu argumento.");
    }
}

function analisarC4(texto, tokens, paragrafos, resC4) {
    const freqMap = new Map();
    tokens.forEach(t => {
        if (CACHE.SETS.CONECTIVOS.has(t)) freqMap.set(t, (freqMap.get(t) || 0) + 1);
    });
    const qtdUsados = freqMap.size;
    freqMap.forEach((qtd, conectivo) => {
        if (qtd > CONFIG.LIMITES.MAX_REPETICAO_CONECTIVO) {
            penalizar(resC4, CONFIG.PONTOS.PENALIDADE.REPETICAO, "Repetição", `Conectivo "${conectivo}" repetido.`, `${qtd} vezes.`, "Varie os conectivos.");
        }
    });

    if (qtdUsados < 2) penalizar(resC4, 80, "Coesão", "Texto desconexo.", "Poucos conectivos.", "Use conectivos.");
    else if (qtdUsados < 4) penalizar(resC4, 40, "Coesão", "Baixa variedade.", "Repertório limitado.", "Varie mais.");

    if (paragrafos.length > 2) {
        let conexoesInter = 0;
        const checkParagrafos = paragrafos.slice(1);
        checkParagrafos.forEach((p, idx) => {
            const inicioPara = tokenizar(p).slice(0, 15); 
            const temConectivo = inicioPara.some(t => CACHE.SETS.CONECTIVOS.has(t));
            if (temConectivo) conexoesInter++;
        });
        if (conexoesInter < (checkParagrafos.length / 2)) {
            penalizar(resC4, 40, "Coesão Interparágrafos", "Conexão fraca.", "Inícios sem conectivos.", "Ligue os parágrafos com termos de transição.");
        }
    }
}

function analisarC5(paragrafos, resC5) {
    resC5.nota = 0;
    let melhorNota = 0;
    let melhorFeedback = [];
    
    paragrafos.forEach((p, idx) => {
        if (p.length < 50 && idx !== paragrafos.length -1) return;
        const textoPara = normalizar(p);
        let elementos = 0;
        let errosTemp = [];

        LEXICO.C5_ELEMENTOS.forEach(el => {
            const regex = new RegExp(`\\b(${el.termos.join('|')})\\b`, 'i');
            if (regex.test(textoPara)) {
                elementos++;
            } else {
                errosTemp.push({ tipo: "Intervenção", descricao: el.msg, exemplo: `Faltou: ${el.chave}`, acao: "Complete a proposta." });
            }
        });

        const temExplicacao = /\b(pois|visto|ou seja|isto é|sentido de|capaz de)\b/.test(textoPara);
        if (textoPara.length > CONFIG.LIMITES.TAMANHO_DETALHAMENTO && (temExplicacao || elementos >= 4)) {
            elementos++;
        } else if (elementos >= 3) {
            errosTemp.push({ tipo: "Intervenção", descricao: "Faltou DETALHAMENTO.", exemplo: "Proposta curta.", acao: "Explique melhor." });
        }

        let notaTemp = elementos * CONFIG.PONTOS.BONUS.ELEMENTO_C5;
        if (/\b(conscientizar|palestra)\b/.test(textoPara)) {
            errosTemp.push({ tipo: "Qualidade", descricao: "Intervenção Genérica.", exemplo: "Evite 'conscientizar'.", acao: "Proponha ações concretas." });
            notaTemp -= 20; 
        }

        if (notaTemp > melhorNota) {
            melhorNota = notaTemp;
            melhorFeedback = errosTemp;
        }
    });

    resC5.nota = clamp(melhorNota);
    if (resC5.nota < 200) {
        if (melhorFeedback.length > 0) {
            melhorFeedback.forEach(e => {
                if (!resC5.erros.some(ex => ex.descricao === e.descricao)) resC5.erros.push(e);
            });
        } else if (paragrafos.length > 0) {
             resC5.erros.push({ tipo: "Intervenção", descricao: "Nenhuma proposta clara identificada.", exemplo: "Faltaram Agente/Ação.", acao: "Escreva uma proposta completa." });
        }
    }
}

// =================================================================
// 🚀 MAIN ENGINE
// =================================================================

function corrigirRedacao(texto, tema) {
    const resultado = {
        notaFinal: 0,
        competencias: {
            c1: { nome: "Norma Culta", nota: 200, erros: [] },
            c2: { nome: "Tema e Estrutura", nota: 200, erros: [] },
            c3: { nome: "Argumentação", nota: 200, erros: [] },
            c4: { nome: "Coesão", nota: 200, erros: [] },
            c5: { nome: "Proposta de Intervenção", nota: 0, erros: [] }
        },
        analiseGeral: []
    };

    const textoLimpo = texto.trim();
    
    // ⚠️ CHECK DE TEXTO VAZIO OU CURTO (Retorna ZERO imediatamente)
    if (!textoLimpo || textoLimpo.split(/\s+/).length < CONFIG.LIMITES.MIN_PALAVRAS) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 Texto muito curto ou insuficiente. Escreva pelo menos 50 palavras.");
        return resultado;
    }

    const textoLower = textoLimpo.toLowerCase();
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const frases = textoLimpo.split(CACHE.REGEX.FRASES_SPLIT).filter(f => f.trim().length > 0);
    const tokens = tokenizar(textoLimpo); 
    const totalPalavras = tokens.length;

    // ⚠️ CHECK DE SPAM (Zera tudo imediatamente)
    const uniqueTokens = new Set(tokens);
    if ((uniqueTokens.size / totalPalavras) < CONFIG.LIMITES.MIN_VOCABULARIO_UNICO) {
        zerarNotas(resultado); // Zera antes de retornar
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Repetição excessiva de palavras.");
        return resultado;
    }
    if (detectarRepeticaoFrases(frases)) {
        zerarNotas(resultado); // Zera antes de retornar
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Loop de frases idênticas detectado.");
        return resultado;
    }

    // Execução (Se passou pelos filtros)
    analisarC1(textoLimpo, textoLower, tokens, frases, resultado.competencias.c1);
    analisarC2(textoLower, tema, paragrafos, totalPalavras, resultado.competencias.c2);
    analisarC3(textoLower, resultado.competencias.c3);
    analisarC4(textoLimpo, tokens, paragrafos, resultado.competencias.c4);
    analisarC5(paragrafos, resultado.competencias.c5);

    // Soma Final
    resultado.notaFinal = Object.values(resultado.competencias).reduce((acc, c) => acc + c.nota, 0);

    return resultado;
}

module.exports = { corrigirRedacao };
