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
        FRASE_LONGA_QTD: 55,
        MAX_REPETICAO_CONECTIVO: 3,
        MIN_PARAGRAFOS: 3,
        TAMANHO_DETALHAMENTO: 150
    }
};

// =================================================================
// 📚 LÉXICO & DADOS
// =================================================================
const LEXICO = {
    // Listas Simples (Palavras Únicas) -> Serão convertidas em SETs para O(1)
    ORALIDADE: ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'coisa', 'negócio', 'tipo', 'aí', 'então', 'daí', 'né', 'ta', 'tá', 'blz', 'so'],
    VOCABULARIO_RICO: ['imprescindível', 'intrínseco', 'corroborar', 'paradigma', 'utopia', 'efêmero', 'mitigar', 'exacerbar', 'viés', 'conjuntura', 'preponderante', 'inexorável', 'fomento', 'alicerce', 'consoante', 'premissa', 'análogo', 'dissonância', 'inerente'],
    MARCAS_OPINIAO: ['fundamental', 'imprescindível', 'urgente', 'notório', 'grave', 'deve-se', 'precisa-se', 'defende-se', 'acredita-se', 'observa-se', 'inaceitável', 'crucial', 'lastimável', 'preocupante'],
    CONECTIVOS_TRANSICAO: ['portanto', 'entretanto', 'contudo', 'todavia', 'além', 'visto', 'dessa', 'suma', 'consequentemente', 'nesse', 'sob', 'diante', 'outrossim', 'adicionando', 'contrapartida', 'assim', 'logo', 'primeiramente', 'ademais', 'fim'],
    
    // Listas Complexas (Frases/Regex) -> Serão pré-compiladas
    CLICHES: ['hoje em dia', 'nos dias de hoje', 'desde os primórdios', 'a cada dia que passa', 'com certeza', 'no mundo atual', 'atualmente', 'desde sempre'],
    REPERTORIO: ['segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário', 'dados', 'estatística', 'pesquisa', 'estudo', 'universidade', 'ciência', 'história', 'guerra', 'revolução', 'cenário', 'panorama', 'literatura'],
    
    // Estruturas C5
    C5_ELEMENTOS: [
        { chave: 'AGENTE', msg: 'Faltou AGENTE (Quem?)', termos: ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo', 'executivo', 'cabe ao', 'cabe à', 'indivíduo', 'cidadão'] },
        { chave: 'ACAO', msg: 'Faltou AÇÃO (O quê?)', termos: ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar', 'realizar', 'garantir', 'desenvolver', 'elaborar', 'instituir', 'viabilizar'] },
        { chave: 'MEIO', msg: 'Faltou MEIO/MODO (Como?)', termos: ['por meio', 'através', 'mediante', 'intermédio', 'uso de', 'via', 'auxílio', 'partir de'] },
        { chave: 'FINALIDADE', msg: 'Faltou FINALIDADE (Para quê?)', termos: ['a fim', 'intuito', 'para que', 'visando', 'fito', 'objetivando', 'sentido de', 'mitigar', 'resolver', 'propósito'] }
    ],
    C5_GENERICOS: ['conscientizar', 'palestra']
};

// =================================================================
// ⚡ CACHE DE PERFORMANCE (PRÉ-COMPILAÇÃO)
// =================================================================
// Executado apenas UMA vez quando o servidor inicia.
const CACHE = {
    SETS: {
        ORALIDADE: new Set(LEXICO.ORALIDADE),
        VOCABULARIO_RICO: new Set(LEXICO.VOCABULARIO_RICO),
        MARCAS_OPINIAO: new Set(LEXICO.MARCAS_OPINIAO),
        CONECTIVOS: new Set(LEXICO.CONECTIVOS_TRANSICAO)
    },
    REGEX: {
        // Cria um regex gigante OR (termo1|termo2|...) para checagem rápida de frases
        CLICHES: new RegExp(`\\b(${LEXICO.CLICHES.join('|')})\\b`, 'gi'),
        REPERTORIO: new RegExp(`\\b(${LEXICO.REPERTORIO.join('|')})\\b`, 'gi'),
        // Gramática
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
// 🛠️ HELPERS OTIMIZADOS
// =================================================================

function normalizar(txt) {
    return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function clamp(val) {
    return Math.max(CONFIG.PONTOS.MIN, Math.min(CONFIG.PONTOS.MAX, val));
}

function penalizar(comp, pontos, tipo, descricao, exemplo, acao) {
    comp.nota = clamp(comp.nota - pontos);
    // Verificação de unicidade otimizada
    if (!comp.erros.some(e => e.descricao === descricao)) {
        comp.erros.push({ tipo, descricao, exemplo, acao });
    }
}

function bonificar(comp, pontos) {
    comp.nota = clamp(comp.nota + pontos);
}

// Tokenizador Robusto (Gera array de palavras limpas)
function tokenizar(texto) {
    return normalizar(texto).match(/\b[\wÀ-ÿ]+\b/g) || [];
}

// Checagem de frases exatas usando Regex Pré-Compilado
function contemFrase(texto, regex) {
    return regex.test(texto);
}

// Checagem de palavras soltas usando SET (O(1))
function contemPalavra(tokens, setAlvo) {
    return tokens.some(t => setAlvo.has(t));
}

// Contador de frequencia usando MAP (Passagem única)
function analisarFrequencia(tokens, setAlvo) {
    const mapa = new Map();
    tokens.forEach(t => {
        if (setAlvo.has(t)) {
            mapa.set(t, (mapa.get(t) || 0) + 1);
        }
    });
    return mapa;
}

// Hash de frase para detecção de loop (ignora pontuação e espaços)
function hashFrase(frase) {
    return normalizar(frase).replace(/[^\w]/g, '');
}

// =================================================================
// 🧠 MÓDULOS DE COMPETÊNCIA
// =================================================================

function analisarC1(texto, textoLower, tokens, frases, resC1) {
    // 1. Oralidade (Uso de SET - O(1) por token)
    const oralidadesEncontradas = tokens.filter(t => CACHE.SETS.ORALIDADE.has(t));
    if (oralidadesEncontradas.length > 0) {
        const exemplo = [...new Set(oralidadesEncontradas)].slice(0, 3).join(', ');
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Oralidade", "Termos informais.", `Ex: ${exemplo}`, "Use linguagem culta.");
    }

    // 2. Pontuação e Gramática (Regex Pré-compilados)
    const check = (regex, pontos, tipo, desc, ex, acao) => {
        if (regex.test(texto)) penalizar(resC1, pontos, tipo, desc, ex, acao);
    };

    check(CACHE.REGEX.PONTUACAO_ESPACO_ANTES, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Espaço antes de sinal.", "Ex: 'Olá ,'", "Remova o espaço.");
    check(CACHE.REGEX.PONTUACAO_FALTA_ESPACO, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Falta espaço após sinal.", "Ex: 'Olá,mundo'", "Adicione espaço.");
    check(CACHE.REGEX.PONTO_SOLTO, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Ponto final isolado.", "Ex: 'fim . Começo'", "Una o ponto à palavra.");
    check(CACHE.REGEX.CONCORDANCIA, CONFIG.PONTOS.PENALIDADE.MEDIA, "Concordância", "Erro plural/singular.", "Ex: 'Os problema'", "Ajuste o número.");
    check(CACHE.REGEX.HOUVERAM, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "Uso de 'Houveram'.", "'Houveram fatos'", "Use 'Houve'.");
    check(CACHE.REGEX.FAZEM_TEMPO, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "Uso de 'Fazem' (tempo).", "'Fazem anos'", "Use 'Faz anos'.");
    check(CACHE.REGEX.CRASE_ERRO, CONFIG.PONTOS.PENALIDADE.MEDIA, "Crase", "Crase indevida.", "Antes de masculino/verbo.", "Remova a crase.");
    check(CACHE.REGEX.MIM_CONJUGA, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", "'Mim' conjuga verbo.", "'Para mim ir'", "Use 'Para eu ir'.");
    check(CACHE.REGEX.INICIO_OBLIQUO, CONFIG.PONTOS.PENALIDADE.LEVE, "Colocação", "Início com oblíquo.", "'Me ajuda'", "Use 'Ajude-me'.");

    // 3. Frases Longas
    let frasesLongas = 0;
    frases.forEach(f => {
        // Contagem aproximada por espaços é mais rápida que tokenizar cada frase
        if ((f.match(/\s/g) || []).length > CONFIG.LIMITES.FRASE_LONGA_QTD) frasesLongas++;
    });
    if (frasesLongas > 0) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.FRASE_LONGA * frasesLongas, "Fluidez", "Frases muito longas.", `${frasesLongas} períodos extensos.`, "Pontue mais.");
    }

    // 4. Bônus Vocabulário (Set O(1))
    const ricasCount = tokens.reduce((acc, t) => acc + (CACHE.SETS.VOCABULARIO_RICO.has(t) ? 1 : 0), 0);
    if (ricasCount >= 2 && resC1.nota < CONFIG.PONTOS.MAX) {
        bonificar(resC1, CONFIG.PONTOS.BONUS.VOCABULARIO);
    }
}

function analisarC2(textoLower, tema, paragrafos, resC2) {
    // 1. Tema
    if (tema && tema !== "Livre") {
        const stopWords = new Set(['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'um', 'uma', 'os', 'as']);
        const tokensTema = tokenizar(tema).filter(t => t.length > 3 && !stopWords.has(t));
        
        // Verifica presença (O(n*m) mas n e m são pequenos aqui)
        const citacoes = tokensTema.reduce((acc, t) => acc + (textoLower.includes(t) ? 1 : 0), 0);

        if (citacoes === 0) {
            resC2.nota = 40;
            penalizar(resC2, 0, "Tema", "Fuga do tema.", `Tema: ${tema}`, "Nenhuma palavra-chave encontrada.");
        } else if (citacoes < tokensTema.length / 2) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.GRAVE, "Tema", "Tangenciamento.", "Tema incompleto.", "Use todos os termos do tema.");
        }
    }

    // 2. Estrutura
    if (paragrafos.length < CONFIG.LIMITES.MIN_PARAGRAFOS) {
        penalizar(resC2, CONFIG.PONTOS.PENALIDADE.FATAL, "Estrutura", "Texto insuficiente.", "Menos de 3 parágrafos.", "Siga a estrutura dissertativa.");
    } else {
        // Monoblocos
        for (let i = 1; i < paragrafos.length - 1; i++) {
            const qtdFrases = (paragrafos[i].match(CACHE.REGEX.FRASES_SPLIT) || []).length;
            if (qtdFrases < 2) {
                penalizar(resC2, CONFIG.PONTOS.PENALIDADE.MEDIA, "Estrutura", "Parágrafo Monobloco.", `Parágrafo ${i+1}.`, "Divida em mais frases.");
            }
        }
        // Tese (Tokens do 1º paragrafo vs Set de Marcas)
        const tokensIntro = tokenizar(paragrafos[0]);
        if (!contemPalavra(tokensIntro, CACHE.SETS.MARCAS_OPINIAO)) {
            penalizar(resC2, CONFIG.PONTOS.PENALIDADE.MEDIA, "Tese", "Sem marca de opinião.", "Intro expositiva.", "Use 'é fundamental', 'é grave'.");
        }
    }
}

function analisarC3(textoLower, resC3) {
    const explicativos = ['porque', 'pois', 'visto', 'dado', 'haja'];
    const conclusivos = ['consequentemente', 'logo', 'acarreta', 'gera', 'ocasiona'];

    // Verificação rápida de substrings
    const temExpl = explicativos.some(t => textoLower.includes(t));
    const temConc = conclusivos.some(t => textoLower.includes(t));

    if (!temExpl) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Argumentação", "Falta justificativa.", "Sem 'pois', 'visto que'.", "Explique o porquê.");
    if (!temConc) penalizar(resC3, CONFIG.PONTOS.PENALIDADE.MEDIA, "Aprofundamento", "Falta consequência.", "Sem 'isso gera'.", "Mostre o impacto.");

    if (!CACHE.REGEX.REPERTORIO.test(textoLower)) {
        penalizar(resC3, CONFIG.PONTOS.PENALIDADE.GRAVE, "Repertório", "Sem repertório.", "Faltou dados/autores.", "Legitime seu argumento.");
    }

    if (CACHE.REGEX.CLICHES.test(textoLower)) {
        penalizar(resC3, CONFIG.PONTOS.PENALIDADE.LEVE, "Estilo", "Clichê detectado.", "Ex: 'Nos dias de hoje'", "Seja específico.");
    }
}

function analisarC4(texto, tokens, paragrafos, resC4) {
    // Mapa de frequência dos conectivos (Passagem única pelos tokens)
    const freqMap = analyzeConnectiveFrequency(tokens);
    const qtdUsados = freqMap.size;
    let totalConectivos = 0;

    freqMap.forEach((qtd, conectivo) => {
        totalConectivos += qtd;
        if (qtd > CONFIG.LIMITES.MAX_REPETICAO_CONECTIVO) {
            penalizar(resC4, CONFIG.PONTOS.PENALIDADE.REPETICAO_CONECTIVO, "Repetição", `Conectivo "${conectivo}" repetido.`, `${qtd} vezes.`, "Varie os conectivos.");
        }
    });

    if (qtdUsados < 2) penalizar(resC4, 120, "Coesão", "Texto desconexo.", "Poucos conectivos.", "Use conectivos.");
    else if (qtdUsados < 4) penalizar(resC4, 60, "Coesão", "Baixa variedade.", "Repertório limitado.", "Varie mais.");

    // Interparágrafos
    if (paragrafos.length > 2) {
        let conexoesInter = 0;
        const checkParagrafos = paragrafos.slice(1);
        
        checkParagrafos.forEach((p, idx) => {
            const tokensInicio = tokenizar(p.split('.')[0]); // Tokens da 1ª frase
            const temConectivo = tokensInicio.some(t => CACHE.SETS.CONECTIVOS.has(t));
            if (temConectivo) conexoesInter++;

            // Lógica Conclusiva no Desenvolvimento
            const ehConclusao = idx === checkParagrafos.length - 1;
            if (!ehConclusao && tokensInicio.some(t => ['portanto', 'concluindo', 'suma'].includes(t))) {
                penalizar(resC4, CONFIG.PONTOS.PENALIDADE.MEDIA, "Lógica", "Conclusão no desenvolvimento.", "Início com 'Portanto'.", "Use 'Ademais'.");
            }
        });

        if (conexoesInter === 0) {
            penalizar(resC4, 60, "Coesão", "Parágrafos soltos.", "Inícios sem conectivos.", "Ligue os parágrafos.");
        }
    }
}

// Helper específico para C4
function analyzeConnectiveFrequency(tokens) {
    const map = new Map();
    tokens.forEach(t => {
        if (CACHE.SETS.CONECTIVOS.has(t)) {
            map.set(t, (map.get(t) || 0) + 1);
        }
    });
    return map;
}

function analisarC5(paragrafos, resC5) {
    resC5.nota = 0;
    if (paragrafos.length > 1) {
        const conclusao = normalizar(paragrafos[paragrafos.length - 1]);
        let elementos = 0;

        // Loop Dinâmico sobre Configuração
        LEXICO.C5_ELEMENTOS.forEach(el => {
            // Regex local simples é rápido aqui pois 'termos' é pequeno
            const regex = new RegExp(`\\b(${el.termos.join('|')})\\b`, 'i');
            if (regex.test(conclusao)) {
                elementos++;
            } else {
                penalizar(resC5, 0, "Intervenção", el.msg, `Faltou: ${el.chave}`, "Complete a proposta.");
            }
        });

        // Detalhamento
        const temExplicacao = /\b(pois|visto|ou seja|isto é)\b/.test(conclusao);
        if (conclusao.length > CONFIG.LIMITES.TAMANHO_DETALHAMENTO && (temExplicacao || elementos >= 4)) {
            elementos++;
        } else if (elementos >= 3) {
            penalizar(resC5, 0, "Intervenção", "Faltou DETALHAMENTO.", "Proposta curta.", "Explique melhor.");
        }

        // Genéricos
        if (/\b(conscientizar|palestra)\b/.test(conclusao)) {
            penalizar(resC5, 0, "Qualidade", "Intervenção Genérica.", "Evite 'conscientizar'.", "Ação concreta.");
            resC5.nota = Math.min(elementos * CONFIG.PONTOS.BONUS.ELEMENTO_C5, 120);
        } else {
            resC5.nota = clamp(elementos * CONFIG.PONTOS.BONUS.ELEMENTO_C5);
        }
    } else {
        penalizar(resC5, 0, "Estrutura", "Sem conclusão.", "Inacabado.", "Escreva o fim.");
    }
}

// =================================================================
// 🚀 ENGINE PRINCIPAL
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
        resultado.analiseGeral.push("🚨 Texto muito curto.");
        return resultado;
    }

    // ⚡ PROCESSAMENTO ÚNICO (PIPELINE)
    const textoLower = textoLimpo.toLowerCase();
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const frases = textoLimpo.split(CACHE.REGEX.FRASES_SPLIT).filter(f => f.trim().length > 0);
    const tokens = tokenizar(textoLimpo); // Array de palavras limpas

    // --- SEGURANÇA ---
    const uniqueTokens = new Set(tokens);
    if ((uniqueTokens.size / tokens.length) < CONFIG.LIMITES.MIN_VOCABULARIO_UNICO) {
        resultado.analiseGeral.push("🚨 SPAM: Repetição excessiva.");
        return resultado;
    }
    
    // Anti-Loop com Hash
    const hashesFrases = new Set();
    const temLoop = frases.some(f => {
        if (f.length < 20) return false;
        const hash = hashFrase(f);
        if (hashesFrases.has(hash)) return true;
        hashesFrases.add(hash);
        return false;
    });
    if (temLoop) {
        resultado.analiseGeral.push("🚨 SPAM: Loop de frases.");
        return resultado;
    }

    // --- EXECUÇÃO ---
    analisarC1(textoLimpo, textoLower, tokens, frases, resultado.competencias.c1);
    analisarC2(textoLower, tema, paragrafos, resultado.competencias.c2);
    analisarC3(textoLower, resultado.competencias.c3);
    analisarC4(textoLimpo, tokens, paragrafos, resultado.competencias.c4);
    analisarC5(paragrafos, resultado.competencias.c5);

    // Soma Final
    resultado.notaFinal = Object.values(resultado.competencias).reduce((acc, c) => acc + c.nota, 0);

    return resultado;
}

function hashFrase(frase) {
    return normalizar(frase).replace(/[^\w]/g, '');
}

module.exports = { corrigirRedacao };
