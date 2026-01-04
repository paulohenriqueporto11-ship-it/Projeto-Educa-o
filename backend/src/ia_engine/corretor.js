// src/ia_engine/corretor.js
// VERSÃO 10.0 - CORREÇÃO DE CALIBRAGEM E NORMALIZAÇÃO

// =================================================================
// ⚙️ CONFIGURAÇÕES
// =================================================================
const CONFIG = {
    PONTOS: {
        MAX: 200,
        MIN: 40, // Nota mínima para não zerar injustamente (fuga total é tratado separado)
        PENALIDADE: {
            LEVE: 20,
            MEDIA: 40,
            GRAVE: 60,
            FATAL: 120,
            REPETICAO: 20,
            FRASE_LONGA: 20 // Aumentado para punir falta de pontuação
        },
        BONUS: {
            VOCABULARIO: 20,
            ELEMENTO_C5: 40
        }
    },
    LIMITES: {
        MIN_PALAVRAS: 50,
        // Reduzi para 0.20 pois textos escolares repetem muito "escola/aluno"
        MIN_VOCABULARIO_UNICO: 0.20, 
        FRASE_LONGA_QTD: 45, // Frases com mais de 45 palavras sem ponto final
        MAX_REPETICAO_CONECTIVO: 3,
        MIN_PARAGRAFOS: 3,
        TAMANHO_DETALHAMENTO: 60
    }
};

// =================================================================
// 📚 LÉXICO & DADOS
// =================================================================
const LEXICO = {
    // Adicionamos erros comuns de concordância e grafia
    ERROS_COMUNS: [
        { reg: /\b(muitas|varias|bastante)\s+problema/i, desc: "Concordância nominal", ex: "muitas problema" },
        { reg: /\b(os|as)\s+educação/i, desc: "Concordância nominal", ex: "os educação" },
        { reg: /\b(a|o)\s+mesmos\b/i, desc: "Concordância", ex: "a mesmos" },
        { reg: /\b(diante)\s+a\b/i, desc: "Regência", ex: "diante a (correto: diante da)" },
        { reg: /\b(frequentes)\s+não\b/i, desc: "Pontuação", ex: "falta vírgula antes de 'não'" },
        { reg: /\b(diversidades)\b/i, desc: "Vocabulário impreciso", ex: "diversidades (provável: adversidades)" },
        { reg: /\b(conseguiram)\s+ter\b/i, desc: "Redundância", ex: "conseguiram ter" },
        { reg: /\b(acessos)\s+as\b/i, desc: "Crase/Regência", ex: "acessos as (correto: acesso às)" }
    ],
    ORALIDADE: ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo', 'aí', 'então', 'daí', 'né', 'ta', 'tá', 'blz', 'so', 'tlgd'],
    VOCABULARIO_RICO: ['imprescindível', 'intrínseco', 'corroborar', 'paradigma', 'utopia', 'efêmero', 'mitigar', 'exacerbar', 'viés', 'conjuntura', 'preponderante', 'inexorável', 'fomento', 'alicerce', 'consoante', 'premissa', 'análogo', 'dissonância', 'inerente', 'fundamental', 'crucial', 'consolidar', 'assegurar', 'democratização', 'segregação', 'articular', 'adversidade'],
    // Expandimos marcas de opinião
    MARCAS_OPINIAO: ['fundamental', 'imprescindível', 'urgente', 'notório', 'grave', 'deve-se', 'precisa-se', 'defende-se', 'acredita-se', 'observa-se', 'inaceitável', 'crucial', 'lastimável', 'preocupante', 'indispensável', 'necessário', 'evidente', 'inadmissível', 'infelizmente', 'entrave', 'desafio', 'problema', 'barreira', 'obstáculo'],
    
    CONECTIVOS_TRANSICAO: [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além', 'visto', 'dessa forma', 'em suma', 'consequentemente', 'nesse sentido', 'sob esse viés', 'diante disso', 'outrossim', 'adicionando', 'em contrapartida', 'assim', 'logo', 'primeiramente', 'ademais', 'por fim', 'em síntese', 'dessa maneira', 'outro fator', 'vale ressaltar', 'historicamente', 'consequentemente', 'no brasil', 'por outro lado', 'mas', 'porém'
    ],
    
    REPERTORIO: ['segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário', 'dados', 'estatística', 'pesquisa', 'estudo', 'universidade', 'ciência', 'história', 'guerra', 'revolução', 'cenário', 'panorama', 'literatura', 'notícia', 'reportagem', 'pandemia', 'covid', 'mec'],
    
    C5_ELEMENTOS: [
        { chave: 'AGENTE', msg: 'Faltou AGENTE (Quem?)', termos: ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo', 'executivo', 'cabe ao', 'cabe à', 'indivíduo', 'cidadão', 'iniciativa', 'parcerias', 'instituições', 'entidades', 'gestores'] },
        { chave: 'ACAO', msg: 'Faltou AÇÃO (O quê?)', termos: ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar', 'realizar', 'garantir', 'desenvolver', 'elaborar', 'instituir', 'viabilizar', 'atuar', 'assegurar', 'fortalecimento', 'estimular', 'articulem', 'reduzir', 'disponibilizar'] },
        { chave: 'MEIO', msg: 'Faltou MEIO/MODO (Como?)', termos: ['por meio', 'através', 'mediante', 'intermédio', 'uso de', 'via', 'auxílio', 'partir de', 'utilização de', 'aliada à', 'associação com', 'baseado em'] },
        { chave: 'FINALIDADE', msg: 'Faltou FINALIDADE (Para quê?)', termos: ['a fim', 'intuito', 'para que', 'visando', 'fito', 'objetivando', 'sentido de', 'mitigar', 'resolver', 'propósito', 'possibilita que', 'permitindo que', 'capaz de', 'garantindo que', 'contribuir para', 'ampliem', 'promovendo', 'garantir'] }
    ]
};

// =================================================================
// 🛠️ HELPERS
// =================================================================

function normalizar(txt) {
    if(!txt) return "";
    return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\r/g, "").trim();
}

function clamp(val) {
    return Math.max(CONFIG.PONTOS.MIN, Math.min(CONFIG.PONTOS.MAX, val));
}

function penalizar(comp, pontos, tipo, descricao, exemplo, acao) {
    comp.nota = Math.max(0, comp.nota - pontos); // Pode zerar aqui
    // Evita duplicar erro idêntico
    if (!comp.erros.some(e => e.descricao === descricao)) {
        comp.erros.push({ tipo, descricao, exemplo, acao });
    }
}

function tokenizar(texto) {
    // Tokeniza mantendo palavras hifenizadas e removendo pontuação
    return normalizar(texto).match(/\b[a-z0-9\-\u00C0-\u00FF]+\b/g) || [];
}

function detectarRepeticaoFrases(frases) {
    const setFrases = new Set();
    // Aumentamos o tamanho mínimo da frase para evitar falso positivo em "Enfim."
    return frases.some(f => {
        if (f.length < 30) return false; 
        const fNorm = normalizar(f).replace(/\s+/g, ' ');
        if (setFrases.has(fNorm)) return true;
        setFrases.add(fNorm);
        return false;
    });
}

function zerarNotas(resultado) {
    resultado.notaFinal = 0;
    Object.keys(resultado.competencias).forEach(k => {
        resultado.competencias[k].nota = 0;
    });
}

// =================================================================
// 🧠 MÓDULOS DE COMPETÊNCIA
// =================================================================

function analisarC1(texto, tokens, frases, resC1) {
    // 1. Oralidade e Gírias
    const oralidadesEncontradas = tokens.filter(t => LEXICO.ORALIDADE.includes(t));
    if (oralidadesEncontradas.length > 0) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Oralidade", "Uso de termos informais.", `Ex: ${oralidadesEncontradas[0]}`, "Substitua por linguagem formal.");
    }

    // 2. Erros Comuns (Regex Específico)
    LEXICO.ERROS_COMUNS.forEach(erro => {
        if (erro.reg.test(texto)) {
            penalizar(resC1, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", erro.desc, erro.ex, "Corrija a concordância/regência.");
        }
    });

    // 3. Frases Labirínticas (Muito longas sem pontuação adequada)
    // No texto do aluno: "As escolas tiveram diversos problemas... internet," (muito longo)
    let frasesLongas = 0;
    frases.forEach(f => {
        const palavras = f.split(/\s+/).length;
        if (palavras > CONFIG.LIMITES.FRASE_LONGA_QTD) frasesLongas++;
    });

    if (frasesLongas > 0) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.FRASE_LONGA * frasesLongas, "Fluidez", "Períodos muito extensos.", "Frases muito longas cansam o leitor.", "Use mais pontos finais para dividir ideias.");
    }

    // 4. Repetição de palavras não-conectivas (Ex: "escola", "alunos", "dispositivos")
    const contagem = {};
    tokens.forEach(t => {
        if (t.length > 4) contagem[t] = (contagem[t] || 0) + 1;
    });
    
    let repeticoesGraves = 0;
    Object.entries(contagem).forEach(([palavra, qtd]) => {
        if (qtd > 5 && !['que', 'para', 'como', 'maís'].includes(palavra)) repeticoesGraves++;
    });

    if (repeticoesGraves > 2) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.REPETICAO, "Vocabulário", "Repetição excessiva de palavras.", "Ex: muitos termos repetidos.", "Use sinônimos ou pronomes.");
    }
}

function analisarC2(texto, tema, paragrafos, resC2) {
    // Se não tem tema definido, assume nota máxima
    if (!tema || tema === "Livre" || tema === "Tema Livre") return;

    const textoNorm = normalizar(texto);
    const temaNorm = normalizar(tema); // NORMALIZA O TEMA AGORA!
    
    // Palavras-chave do tema (ignorando preposições)
    const stopWords = ['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'na', 'no', 'dos', 'das'];
    const tokensTema = temaNorm.split(/\s+/).filter(t => t.length > 2 && !stopWords.includes(t));
    
    let encontrouTema = false;
    let citacoes = 0;

    tokensTema.forEach(t => {
        if (textoNorm.includes(t)) citacoes++;
    });

    // Lógica mais suave: Se citou pelo menos METADE das palavras chave, considera dentro do tema
    if (citacoes === 0) {
        resC2.nota = 40; // Tangenciamento total, não zero
        penalizar(resC2, 0, "Tema", "Possível fuga ao tema.", `Tema esperado: ${tema}`, "Certifique-se de usar as palavras do tema.");
    } else if (citacoes < tokensTema.length / 2) {
        penalizar(resC2, CONFIG.PONTOS.PENALIDADE.GRAVE, "Tema", "Abordagem incompleta.", "Você citou poucas palavras-chave.", "Explore todos os aspectos do tema.");
    }

    // Estrutura
    if (paragrafos.length < CONFIG.LIMITES.MIN_PARAGRAFOS) {
        penalizar(resC2, CONFIG.PONTOS.PENALIDADE.GRAVE, "Estrutura", "Texto com poucos parágrafos.", "Estrutura dissertativa exige Intro/Desenv/Concl.", "Divida melhor seu texto.");
    }
}

function analisarC3(textoLower, resC3) {
    // Verifica progressão de ideias
    const explicativos = ['porque', 'pois', 'visto', 'dado', 'haja', 'virtude', 'medida', 'devido'];
    const conclusivos = ['consequentemente', 'logo', 'acarreta', 'gera', 'ocasiona', 'leva', 'promove', 'implica'];
    
    const temExpl = explicativos.some(t => textoLower.includes(t));
    const temConc = conclusivos.some(t => textoLower.includes(t));

    if (!temExpl) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Argumentação", "Falta aprofundamento.", "Poucas justificativas ('pois', 'porque').", "Explique o porquê dos fatos.");
    if (!temConc) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Consequência", "Falta impacto.", "Não mostrou as consequências.", "Use 'isso gera', 'acarretando'.");

    // Repertório (Verifica se citou algo externo)
    const temRepertorio = LEXICO.REPERTORIO.some(r => textoLower.includes(r));
    if (!temRepertorio) {
        penalizar(resC3, CONFIG.PONTOS.PENALIDADE.GRAVE, "Repertório", "Ausência de Repertório Sociocultural.", "Texto baseou-se no senso comum.", "Cite autores, leis, dados ou fatos históricos.");
    }
}

function analisarC4(tokens, paragrafos, resC4) {
    // Variedade de conectivos
    const conectivosUsados = new Set();
    tokens.forEach(t => {
        if (LEXICO.CONECTIVOS_TRANSICAO.includes(t)) conectivosUsados.add(t);
    });

    if (conectivosUsados.size < 4) {
        penalizar(resC4, CONFIG.PONTOS.PENALIDADE.GRAVE, "Coesão", "Repertório de conectivos limitado.", "Texto pouco articulado.", "Use 'Entretanto', 'Ademais', 'Portanto'.");
    }

    // Coesão Interparágrafos (Obrigatorio no ENEM ter conectivo no inicio de 2 parágrafos)
    let conexoesInter = 0;
    if (paragrafos.length > 1) {
        // Pula o primeiro (intro)
        for (let i = 1; i < paragrafos.length; i++) {
            const inicio = paragrafos[i].trim().split(/\s+/)[0].toLowerCase().replace(',', '');
            if (LEXICO.CONECTIVOS_TRANSICAO.includes(inicio) || ['nesse', 'dessa', 'diante', 'entretanto', 'enfim'].includes(inicio)) {
                conexoesInter++;
            }
        }
    }

    if (conexoesInter < 2 && paragrafos.length > 2) {
        penalizar(resC4, 40, "Estrutura", "Falta conectivo no início dos parágrafos.", "Parágrafos desconexos.", "Comece com 'Além disso', 'Por fim'.");
    }
}

function analisarC5(paragrafos, resC5) {
    // Tenta encontrar a proposta no último parágrafo (padrão)
    const conclusao = paragrafos[paragrafos.length - 1] ? normalizar(paragrafos[paragrafos.length - 1]) : "";
    
    resC5.nota = 0; // Começa zerado e ganha pontos
    let elementosEncontrados = 0;
    let erros = [];

    LEXICO.C5_ELEMENTOS.forEach(el => {
        const regex = new RegExp(`\\b(${el.termos.join('|')})\\b`, 'i');
        if (regex.test(conclusao)) {
            elementosEncontrados++;
        } else {
            erros.push(el.msg); // Guarda o erro mas não penaliza ainda
        }
    });

    // Pontuação baseada em quantos elementos achou (max 200)
    resC5.nota = elementosEncontrados * 40;

    // Se a nota for baixa, dá feedback
    if (resC5.nota < 160) {
        if (erros.length > 0) {
            // Mostra até 2 erros para não poluir
            penalizar(resC5, 0, "Intervenção Incompleta", "Sua proposta precisa de mais detalhes.", erros.slice(0, 2).join(", "), "Adicione Agente, Ação, Meio e Finalidade.");
        }
    }
    
    // Bonifica se tiver detalhamento
    if (conclusao.length > CONFIG.LIMITES.TAMANHO_DETALHAMENTO && elementosEncontrados >= 3) {
        resC5.nota = Math.min(200, resC5.nota + 40);
    }
    
    // Penaliza genéricos
    if (/\b(conscientizar|palestra)\b/.test(conclusao)) {
        penalizar(resC5, 40, "Qualidade", "Ação pouco efetiva.", "Evite 'conscientizar'.", "Proponha algo concreto.");
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
    
    if (!textoLimpo || textoLimpo.split(/\s+/).length < CONFIG.LIMITES.MIN_PALAVRAS) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 Texto muito curto. Escreva pelo menos 50 palavras.");
        return resultado;
    }

    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    // Separa frases por pontuação final (. ? !)
    const frases = textoLimpo.split(/[.?!]+/).filter(f => f.trim().length > 0);
    const tokens = tokenizar(textoLimpo); 
    const textoLower = normalizar(textoLimpo);

    // --- CHECK ANTI-SPAM (Calibrado) ---
    const uniqueTokens = new Set(tokens);
    const ratio = uniqueTokens.size / tokens.length;
    
    if (ratio < CONFIG.LIMITES.MIN_VOCABULARIO_UNICO) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Repetição excessiva de palavras. Texto anulado.");
        return resultado;
    }
    if (detectarRepeticaoFrases(frases)) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 DETECÇÃO DE SPAM: Loop de frases idênticas. Texto anulado.");
        return resultado;
    }

    // --- ANÁLISE ---
    analisarC1(textoLimpo, tokens, frases, resultado.competencias.c1);
    analisarC2(textoLimpo, tema, paragrafos, resultado.competencias.c2);
    analisarC3(textoLower, resultado.competencias.c3);
    analisarC4(tokens, paragrafos, resultado.competencias.c4);
    analisarC5(paragrafos, resultado.competencias.c5);

    // Soma Final
    resultado.notaFinal = Object.values(resultado.competencias).reduce((acc, c) => acc + c.nota, 0);

    return resultado;
}

module.exports = { corrigirRedacao };
