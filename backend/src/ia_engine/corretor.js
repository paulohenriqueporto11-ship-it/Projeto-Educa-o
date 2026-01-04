// src/ia_engine/corretor.js
// VERSÃO 12.0 - ELITE EDITION (Refinamento Pedagógico & Proporcionalidade)

// =================================================================
// ⚙️ CONFIGURAÇÕES
// =================================================================
const CONFIG = {
    PONTOS: {
        MAX: 200,
        MIN_SAFETY: 40, // Nota mínima se houver esforço legítimo
        PENALIDADE: {
            LEVE: 10,
            MEDIA: 20,
            GRAVE: 40,
            FATAL: 80,
            REPETICAO: 5,   // Reduzido para ser cumulativo
            FRASE_LONGA_BASE: 5 // Base para cálculo proporcional
        },
        BONUS: {
            VOCABULARIO: 20,
            ELEMENTO_C5: 40
        }
    },
    LIMITES: {
        MIN_PALAVRAS: 50,
        MIN_VOCABULARIO_UNICO: 0.22, 
        FRASE_LONGA_QTD: 40, // Começa a contar a partir de 40 palavras
        MAX_REPETICAO_CONECTIVO: 3,
        MIN_PARAGRAFOS: 3,
        TAMANHO_DETALHAMENTO: 70
    }
};

// =================================================================
// 📚 LÉXICO
// =================================================================
const LEXICO = {
    ERROS_COMUNS: [
        { reg: /\b(muitas|varias|bastante)\s+problema/i, desc: "Concordância nominal", ex: "muitas problema" },
        { reg: /\b(os|as)\s+educação/i, desc: "Concordância nominal", ex: "os educação" },
        { reg: /\b(a|o)\s+mesmos\b/i, desc: "Concordância", ex: "a mesmos" },
        { reg: /\b(diante)\s+a\b/i, desc: "Regência", ex: "diante a (correto: diante da)" },
        { reg: /\b(frequentes)\s+não\b/i, desc: "Pontuação", ex: "falta vírgula antes de 'não'" },
        { reg: /\b(diversidades)\b/i, desc: "Vocabulário impreciso", ex: "diversidades (provável: adversidades)" },
        { reg: /\b(conseguiram)\s+ter\b/i, desc: "Redundância", ex: "conseguiram ter" },
        { reg: /\b(acessos)\s+as\b/i, desc: "Crase/Regência", ex: "acessos as (correto: acesso às)" },
        { reg: /\b(através)\s+de\b/i, desc: "Estilo", ex: "Evite 'através de' para meio (use 'por meio de')." }
    ],
    
    PONTUACAO_DUPLICADA: /([!?.]){2,}/, // Ex: "!!" ou ".."
    
    ORALIDADE: ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo', 'aí', 'então', 'daí', 'né', 'ta', 'tá', 'blz', 'so', 'tlgd'],
    
    // Conectivos Clássicos (Operadores Argumentativos)
    CONECTIVOS_TRANSICAO: [
        'portanto', 'entretanto', 'contudo', 'todavia', 'além disso', 'visto que', 'dessa forma', 'em suma', 'consequentemente', 'nesse sentido', 'sob esse viés', 'diante disso', 'outrossim', 'adicionando', 'em contrapartida', 'assim', 'logo', 'primeiramente', 'ademais', 'por fim', 'em síntese', 'dessa maneira', 'outro fator', 'vale ressaltar', 'historicamente', 'no brasil', 'por outro lado', 'mas', 'porém', 'sendo assim'
    ],

    // NOVO: Referenciação Pronominal (Coesão Anafórica)
    REFERENCIAS: ['isso', 'isto', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'disso', 'desse', 'daquele', 'naquele', 'neste', 'esta'],
    
    REPERTORIO: ['segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário', 'dados', 'estatística', 'pesquisa', 'estudo', 'universidade', 'ciência', 'história', 'guerra', 'revolução', 'cenário', 'panorama', 'literatura', 'notícia', 'reportagem', 'pandemia', 'covid', 'mec', 'ministerio'],
    
    C5_ELEMENTOS: [
        { chave: 'AGENTE', msg: 'Faltou AGENTE (Quem?)', termos: ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo', 'executivo', 'cabe ao', 'cabe à', 'indivíduo', 'cidadão', 'iniciativa', 'parcerias', 'instituições', 'entidades', 'gestores'] },
        { chave: 'ACAO', msg: 'Faltou AÇÃO (O quê?)', termos: ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar', 'realizar', 'garantir', 'desenvolver', 'elaborar', 'instituir', 'viabilizar', 'atuar', 'assegurar', 'fortalecimento', 'estimular', 'articulem', 'reduzir', 'disponibilizar', 'ofertar'] },
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

function penalizar(comp, pontos, tipo, descricao, exemplo, acao) {
    comp.nota = Math.max(0, comp.nota - pontos);
    if (!comp.erros.some(e => e.descricao === descricao)) {
        comp.erros.push({ tipo, descricao, exemplo, acao });
    }
}

function tokenizar(texto) {
    // Melhorado: remove pontuação mas mantém palavras hifenizadas e acentuadas
    return texto.match(/[a-zA-ZÀ-ÿ0-9-]+/g) || [];
}

function detectarRepeticaoFrases(frases) {
    const setFrases = new Set();
    return frases.some(f => {
        // Ignora frases curtas (<30 chars) para evitar falso positivo em "Enfim."
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
// 🧠 MÓDULOS DE ANÁLISE DE COMPETÊNCIA
// =================================================================

/**
 * C1: NORMA CULTA
 * Melhorias: Penalidade proporcional e detecção de pontuação duplicada.
 */
function analisarC1(texto, tokens, frases, resC1) {
    // 1. Oralidade
    const tokensNorm = tokens.map(t => t.toLowerCase());
    const oralidadesEncontradas = tokensNorm.filter(t => LEXICO.ORALIDADE.includes(t));
    if (oralidadesEncontradas.length > 0) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Oralidade", "Uso de termos informais.", `Ex: ${oralidadesEncontradas[0]}`, "Substitua por linguagem formal.");
    }

    // 2. Erros Comuns e Pontuação Duplicada
    LEXICO.ERROS_COMUNS.forEach(erro => {
        if (erro.reg.test(texto)) penalizar(resC1, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", erro.desc, erro.ex, "Corrija a construção.");
    });

    if (LEXICO.PONTUACAO_DUPLICADA.test(texto)) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Sinais duplicados (!!, ..)", "Uso informal.", "Use apenas um sinal.");
    }

    // 3. Frases Longas (Lógica Proporcional)
    let penalidadeAcumulada = 0;
    frases.forEach(f => {
        const palavras = f.split(/\s+/).length;
        if (palavras > CONFIG.LIMITES.FRASE_LONGA_QTD) {
            // A cada 5 palavras excedentes, penaliza um pouco mais
            const excesso = Math.floor((palavras - CONFIG.LIMITES.FRASE_LONGA_QTD) / 5);
            penalidadeAcumulada += (CONFIG.PONTOS.PENALIDADE.FRASE_LONGA_BASE * (1 + excesso));
        }
    });
    
    if (penalidadeAcumulada > 0) {
        // Teto de 60 pontos para não destruir a nota só com isso
        penalizar(resC1, Math.min(60, penalidadeAcumulada), "Fluidez", "Frases muito extensas.", "Dificulta a leitura.", "Use mais pontos finais para dividir ideias.");
    }

    // 4. Repetição (Ignora números e siglas curtas)
    const contagem = {};
    tokensNorm.forEach(t => {
        // Ignora palavras curtas e números
        if (t.length > 4 && isNaN(t)) contagem[t] = (contagem[t] || 0) + 1;
    });
    
    let repeticoes = 0;
    let exemplo = "";
    Object.entries(contagem).forEach(([palavra, qtd]) => {
        if (qtd > 5 && !['sobre', 'todos', 'assim', 'ainda'].includes(palavra)) {
            repeticoes += (qtd - 5); // Penaliza o excedente
            exemplo = palavra;
        }
    });

    if (repeticoes > 0) {
        penalizar(resC1, Math.min(40, repeticoes * CONFIG.PONTOS.PENALIDADE.REPETICAO), "Vocabulário", "Repetição excessiva.", `Ex: "${exemplo}"`, "Use sinônimos.");
    }

    resC1.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC1.nota);
}

/**
 * C2: TEMA E ESTRUTURA
 * Melhorias: Nota proporcional à cobertura do tema.
 */
function analisarC2(texto, tema, paragrafos, resC2) {
    if (!tema || tema === "Livre") return;

    const textoNorm = normalizar(texto);
    const temaNorm = normalizar(tema);
    const stopWords = ['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'na', 'no', 'dos', 'das', 'sobre'];
    
    // Tokens do tema
    const tokensTema = temaNorm.split(/\s+/).filter(t => t.length > 2 && !stopWords.includes(t));
    
    let acertos = 0;
    tokensTema.forEach(t => { if (textoNorm.includes(t)) acertos++; });

    const cobertura = acertos / tokensTema.length; // 0.0 a 1.0

    if (acertos === 0) {
        resC2.nota = 40; // Fuga quase total
        penalizar(resC2, 0, "Tema", "Fuga ao tema.", `Tema: ${tema}`, "Use as palavras-chave do tema.");
    } else if (cobertura < 0.5) {
        // Penalidade proporcional: Se cobriu 30%, perde mais do que se cobriu 49%
        const desconto = Math.floor((1 - cobertura) * 100);
        penalizar(resC2, desconto, "Tema", "Abordagem parcial.", "Você explorou pouco o tema.", "Aprofunde a discussão.");
    }

    if (paragrafos.length < CONFIG.LIMITES.MIN_PARAGRAFOS) {
        penalizar(resC2, 80, "Estrutura", "Texto embrionário.", "Faltam partes estruturais.", "Escreva Intro, Desenvolvimento e Conclusão.");
    }
    
    resC2.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC2.nota);
}

/**
 * C3: ARGUMENTAÇÃO
 * Melhorias: Verifica densidade de operadores.
 */
function analisarC3(textoLower, resC3) {
    const explicativos = ['porque', 'pois', 'visto', 'dado', 'haja', 'virtude', 'medida', 'devido'];
    const conclusivos = ['consequentemente', 'logo', 'acarreta', 'gera', 'ocasiona', 'leva', 'promove', 'implica'];
    
    const countExpl = explicativos.reduce((acc, t) => acc + (textoLower.split(t).length - 1), 0);
    const countConc = conclusivos.reduce((acc, t) => acc + (textoLower.split(t).length - 1), 0);

    if (countExpl === 0) penalizar(resC3, 60, "Argumentação", "Falta justificativa.", "Argumentos apenas expositivos.", "Use 'pois', 'visto que'.");
    else if (countExpl < 2) penalizar(resC3, 20, "Aprofundamento", "Argumentação superficial.", "Poucas justificativas.", "Desenvolva mais.");

    if (countConc === 0) penalizar(resC3, 40, "Consequência", "Falta impacto.", "Não mostrou consequências.", "Use 'isso gera', 'acarretando'.");

    const temRepertorio = LEXICO.REPERTORIO.some(r => textoLower.includes(r));
    if (!temRepertorio) {
        penalizar(resC3, 60, "Repertório", "Sem repertório externo.", "Texto baseado no senso comum.", "Cite dados ou autores.");
    }
    
    resC3.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC3.nota);
}

/**
 * C4: COESÃO
 * Melhorias: Aceita pronomes (referenciação) como elementos coesivos.
 */
function analisarC4(tokens, paragrafos, resC4) {
    const tokensNorm = tokens.map(t => t.toLowerCase());
    const conectivos = new Set();
    const referencias = new Set();

    tokensNorm.forEach(t => {
        if (LEXICO.CONECTIVOS_TRANSICAO.includes(t)) conectivos.add(t);
        if (LEXICO.REFERENCIAS.includes(t)) referencias.add(t);
    });

    const totalCoesivos = conectivos.size + (referencias.size * 0.5); // Referências valem meio ponto de variedade

    if (totalCoesivos < 3) {
        penalizar(resC4, 60, "Coesão", "Texto desconexo.", "Poucos elementos de ligação.", "Use 'Isso', 'Entretanto', 'Portanto'.");
    } else if (totalCoesivos < 5) {
        penalizar(resC4, 20, "Variedade", "Repertório coesivo limitado.", "Repetição de conectivos.", "Varie os operadores.");
    }

    // Coesão Interparágrafos
    let conexoesInter = 0;
    if (paragrafos.length > 1) {
        for (let i = 1; i < paragrafos.length; i++) {
            const inicio = paragrafos[i].trim().split(/\s+/)[0].toLowerCase().replace(/[,.]/g, '');
            // Aceita conectivos OU referências no início
            if (LEXICO.CONECTIVOS_TRANSICAO.includes(inicio) || LEXICO.REFERENCIAS.includes(inicio) || ['nesse', 'dessa', 'diante', 'enfim'].includes(inicio)) {
                conexoesInter++;
            }
        }
    }

    if (conexoesInter < 2 && paragrafos.length > 2) {
        penalizar(resC4, 40, "Estrutura", "Falta elo entre parágrafos.", "Parágrafos isolados.", "Comece com 'Além disso', 'Nesse contexto'.");
    }
    
    resC4.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC4.nota);
}

/**
 * C5: PROPOSTA DE INTERVENÇÃO
 * Melhorias: Regex seguro e bônus de detalhamento mais inteligente.
 */
function analisarC5(paragrafos, resC5) {
    const conclusao = paragrafos[paragrafos.length - 1] ? normalizar(paragrafos[paragrafos.length - 1]) : "";
    
    resC5.nota = 0; 
    let elementosEncontrados = 0;
    let erros = [];

    LEXICO.C5_ELEMENTOS.forEach(el => {
        // Regex com Word Boundary (\b) para evitar falso positivo (Ex: "cabe" em "cabeça")
        const regex = new RegExp(`\\b(${el.termos.join('|')})\\b`, 'i');
        if (regex.test(conclusao)) {
            elementosEncontrados++;
        } else {
            erros.push(el.msg);
        }
    });

    resC5.nota = elementosEncontrados * 40;

    // Safety Net: Se escreveu bastante na conclusão mas a IA não pegou keywords, dá 40pts
    if (resC5.nota === 0 && conclusao.length > 80) {
        resC5.nota = 40;
        resC5.erros.push({ tipo: "Aviso", descricao: "Proposta não identificada claramente.", exemplo: "Use termos como 'O Governo deve...'", acao: "Deixe os elementos explícitos." });
    } else if (resC5.nota < 200 && erros.length > 0) {
        // Só mostra feedback se faltou algo real
        penalizar(resC5, 0, "Completeness", "Elementos ausentes.", erros.slice(0, 2).join(", "), "Complete a proposta.");
    }
    
    // Teto 200
    resC5.nota = Math.min(200, resC5.nota);
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
    const frases = textoLimpo.split(/[.?!]+/).filter(f => f.trim().length > 0);
    const tokens = tokenizar(textoLimpo); 
    const textoLower = normalizar(textoLimpo);

    // Check Anti-Spam (0.22)
    const uniqueTokens = new Set(tokens.map(t => t.toLowerCase()));
    const ratio = uniqueTokens.size / tokens.length;
    
    if (ratio < CONFIG.LIMITES.MIN_VOCABULARIO_UNICO) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 SPAM: Repetição excessiva. Texto anulado.");
        return resultado;
    }
    if (detectarRepeticaoFrases(frases)) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 SPAM: Frases duplicadas. Texto anulado.");
        return resultado;
    }

    analisarC1(textoLimpo, tokens, frases, resultado.competencias.c1);
    analisarC2(textoLimpo, tema, paragrafos, resultado.competencias.c2);
    analisarC3(textoLower, resultado.competencias.c3);
    analisarC4(tokens, paragrafos, resultado.competencias.c4);
    analisarC5(paragrafos, resultado.competencias.c5);

    resultado.notaFinal = Object.values(resultado.competencias).reduce((acc, c) => acc + c.nota, 0);
    resultado.notaFinal = Math.min(1000, Math.max(0, resultado.notaFinal));

    return resultado;
}

module.exports = { corrigirRedacao };
