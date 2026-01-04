// src/ia_engine/corretor.js
// VERSÃO 18.0 - GOLD MASTER (Production Ready)
// Correção de bugs críticos, ajuste de C1 para pontuação interna e estabilidade.

// =================================================================
// ⚙️ CONFIGURAÇÕES
// =================================================================
const CONFIG = {
    PONTOS: {
        MAX: 200,
        MIN_SAFETY: 60, // Nota mínima para textos legíveis (evita zeros injustos)
        PENALIDADE: {
            LEVE: 10,
            MEDIA: 20,
            GRAVE: 40,
            FATAL: 80,
            REPETICAO: 5,
            FRASE_LONGA_BASE: 5
        },
        BONUS: {
            VOCABULARIO: 20,
            ELEMENTO_C5: 40,
            AUTORIDADE: 20
        }
    },
    LIMITES: {
        MIN_PALAVRAS: 50,
        // CORREÇÃO: Definido valor base para o cálculo dinâmico
        MIN_VOCABULARIO_UNICO: 0.22, 
        FRASE_LONGA_QTD: 40, // Limite padrão (sem vírgulas)
        FRASE_LONGA_COM_PONTUACAO: 60, // Limite estendido (se tiver vírgulas)
        MAX_REPETICAO_CONECTIVO: 4, 
        MIN_PARAGRAFOS: 3,
        TAMANHO_DETALHAMENTO: 70,
        MIN_DENSIDADE_COESIVA: 0.03
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
    
    PONTUACAO_DUPLICADA: /([!?.]){2,}/, 
    
    // Separado por gravidade
    INFORMALIDADE: ['vc', 'pq', 'tb', 'pra', 'mt', 'n', 'eh', 'aki', 'naum', 'axo', 'tá', 'né', 'daí', 'aí', 'então', 'coisa'],
    GIRIAS: ['pô', 'caraca', 'mano', 'véi', 'tipo assim', 'bagulho', 'treta', 'tlgd', 'blz', 'zuado'],
    
    VERBOS_CAUSA_EFEITO: [
        'acarretar', 'acarreta', 'gerar', 'gera', 'causar', 'causa', 
        'culminar', 'culmina', 'implicar', 'implica', 'fomentar', 'fomenta',
        'intensificar', 'intensifica', 'prejudicar', 'prejudica', 
        'favorecer', 'favorece', 'resultar', 'resulta', 'agravar', 'agrava',
        'evidenciar', 'evidencia'
    ],

    CONECTIVOS_TRANSICAO: [
        'além disso', 'visto que', 'dessa forma', 'em suma', 'nesse sentido', 
        'sob esse viés', 'diante disso', 'em contrapartida', 'primeiramente', 
        'por fim', 'em síntese', 'dessa maneira', 'outro fator', 'vale ressaltar', 
        'no brasil', 'por outro lado', 'sendo assim', 'posto que', 'haja vista', 
        'em virtude de', 'por conseguinte', 'portanto', 'entretanto', 'contudo', 
        'todavia', 'consequentemente', 'outrossim', 'adicionando', 'assim', 'logo', 
        'ademais', 'mas', 'porém'
    ],

    REFERENCIAS: [
        'o mesmo', 'a mesma', 'os mesmos', 'as mesmas', 'referido', 'citado', 
        'mencionado', 'dito', 'supracitado', 'isso', 'isto', 'esse', 'essa', 
        'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'disso', 
        'desse', 'dessa', 'daquele', 'daquela', 'neste', 'nesta', 'naquele', 
        'naquela', 'tal', 'tais', 'outro', 'outra', 'outros'
    ],
    
    REPERTORIO_GENERICO: ['dados', 'estatística', 'pesquisa', 'estudo', 'cenário', 'panorama', 'notícia', 'reportagem', 'internet'],
    REPERTORIO_AUTORIDADE: [
        'segundo', 'de acordo', 'conforme', 'ibge', 'oms', 'onu', 'constituição', 'lei', 'artigo', 
        'filósofo', 'sociólogo', 'pensador', 'obra', 'livro', 'filme', 'série', 'documentário', 
        'universidade', 'ciência', 'história', 'guerra', 'revolução', 'literatura', 
        'mec', 'ministerio', 'pierre bourdieu', 'zygmund bauman', 'durkheim', 'kant', 'aristóteles',
        'paulo freire', 'machado de assis', '1988', 'carta magna'
    ],
    
    C5_ELEMENTOS: [
        { chave: 'AGENTE', msg: 'Faltou AGENTE (Quem?)', termos: ['governo', 'estado', 'ministério', 'escola', 'mídia', 'sociedade', 'família', 'ongs', 'poder público', 'legislativo', 'executivo', 'cabe ao', 'cabe à', 'indivíduo', 'cidadão', 'iniciativa', 'parcerias', 'instituições', 'entidades', 'gestores'] },
        { chave: 'ACAO', msg: 'Faltou AÇÃO (O quê?)', termos: ['deve', 'precisa', 'necessita', 'cabe a', 'promover', 'criar', 'fiscalizar', 'investir', 'implementar', 'fomentar', 'realizar', 'garantir', 'desenvolver', 'elaborar', 'instituir', 'viabilizar', 'atuar', 'assegurar', 'fortalecimento', 'estimular', 'articulem', 'reduzir', 'disponibilizar', 'ofertar'] },
        { chave: 'MEIO', msg: 'Faltou MEIO/MODO (Como?)', termos: ['por meio', 'através', 'mediante', 'intermédio', 'uso de', 'via', 'auxílio', 'partir de', 'utilização de', 'aliada à', 'associação com', 'baseado em', 'parceria', 'apoio de', 'conjunto com'] },
        { chave: 'FINALIDADE', msg: 'Faltou FINALIDADE (Para quê?)', termos: ['a fim', 'intuito', 'para que', 'visando', 'fito', 'objetivando', 'sentido de', 'mitigar', 'resolver', 'propósito', 'possibilita que', 'permitindo que', 'capaz de', 'garantindo que', 'contribuir para', 'ampliem', 'promovendo', 'garantir', 'efeito de'] }
    ]
};

// =================================================================
// 🚀 PERFORMANCE CACHE
// =================================================================
const CACHE = {
    C5: LEXICO.C5_ELEMENTOS.map(el => ({
        ...el,
        regex: new RegExp(`\\b(${el.termos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i')
    })),
    
    AUTORIDADE_REGEX: new RegExp(`\\b(${LEXICO.REPERTORIO_AUTORIDADE.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i'),
    
    CONECTIVOS_REGEX: LEXICO.CONECTIVOS_TRANSICAO.map(c => ({
        termo: c,
        regex: new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    }))
};

// =================================================================
// 🛠️ HELPERS
// =================================================================

function normalizar(txt) {
    if(!txt) return "";
    return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\r/g, "").trim();
}

function encontrarTrecho(texto, termo) {
    const idx = texto.toLowerCase().indexOf(termo.toLowerCase());
    if (idx !== -1) {
        const inicio = Math.max(0, idx - 15);
        const fim = Math.min(texto.length, idx + termo.length + 15);
        return "..." + texto.substring(inicio, fim).trim() + "...";
    }
    return termo;
}

function penalizar(comp, pontos, tipo, descricao, exemplo, acao, severidade = 'media') {
    comp.nota = Math.max(0, comp.nota - pontos);
    if (!comp.erros.some(e => e.descricao === descricao)) {
        comp.erros.push({ tipo, descricao, exemplo, acao, severidade });
    }
}

function tokenizar(texto) {
    return texto.match(/\b[a-zA-ZÀ-ÿ0-9'-]+\b/g) || [];
}

function detectarRepeticaoFrases(frases) {
    const setFrases = new Set();
    return frases.some(f => {
        if (f.length < 25) return false; 
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

function contemTermo(texto, listaTermos) {
    // Busca simples e rápida
    return listaTermos.some(termo => texto.includes(termo));
}

// =================================================================
// 🧠 MÓDULOS DE ANÁLISE
// =================================================================

function analisarC1(texto, tokens, frases, resC1) {
    const tokensNorm = tokens.map(t => t.toLowerCase());
    
    // 1. Informalidade vs Gíria
    const girias = tokensNorm.filter(t => LEXICO.GIRIAS.includes(t));
    if (girias.length > 0) {
        const trecho = encontrarTrecho(texto, girias[0]);
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.MEDIA, "Linguagem Inadequada", "Uso de gírias.", trecho, "Remova gírias.", 'alta');
    }

    const informais = tokensNorm.filter(t => LEXICO.INFORMALIDADE.includes(t));
    if (informais.length > 0) {
        const trecho = encontrarTrecho(texto, informais[0]);
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Oralidade", "Termo informal.", trecho, "Use a norma padrão.", 'media');
    }

    // 2. Erros Comuns
    LEXICO.ERROS_COMUNS.forEach(erro => {
        const match = texto.match(erro.reg);
        if (match) {
            const trecho = encontrarTrecho(texto, match[0]);
            penalizar(resC1, CONFIG.PONTOS.PENALIDADE.MEDIA, "Gramática", erro.desc, trecho, "Corrija a construção.", 'alta');
        }
    });

    if (LEXICO.PONTUACAO_DUPLICADA.test(texto)) {
        penalizar(resC1, CONFIG.PONTOS.PENALIDADE.LEVE, "Pontuação", "Sinais duplicados.", "Uso informal (!!).", "Use apenas um sinal.", 'baixa');
    }

    // 3. Frases Longas (Lógica Melhorada)
    // Se tiver vírgula, tolera mais. Se não tiver, tolera menos.
    let penalidadeFraseAcumulada = 0;
    frases.forEach(f => {
        const palavras = f.split(/\s+/).length;
        const temPontuacaoInterna = f.includes(',') || f.includes(';') || f.includes(':');
        // Se tem vírgula, limite sobe para 60. Se não, 40.
        const limiteReal = temPontuacaoInterna ? CONFIG.LIMITES.FRASE_LONGA_COM_PONTUACAO : CONFIG.LIMITES.FRASE_LONGA_QTD;

        if (palavras > limiteReal) {
            const excesso = Math.floor((palavras - limiteReal) / 5);
            penalidadeFraseAcumulada += (CONFIG.PONTOS.PENALIDADE.FRASE_LONGA_BASE * (1 + excesso));
        }
    });
    
    if (penalidadeFraseAcumulada > 0) {
        penalizar(resC1, Math.min(50, Math.floor(penalidadeFraseAcumulada)), "Fluidez", "Frases muito extensas.", "Períodos longos dificultam a leitura.", "Divida em orações menores.", 'media');
    }

    // 4. Repetição (Threshold Dinâmico)
    const limiteRepeticao = Math.max(5, Math.floor(tokens.length * 0.015));
    const contagem = {};
    tokensNorm.forEach(t => {
        if (t.length > 4 && isNaN(t)) contagem[t] = (contagem[t] || 0) + 1;
    });
    
    let repeticoes = 0;
    let exemplo = "";
    Object.entries(contagem).forEach(([palavra, qtd]) => {
        const ignorar = ['sobre', 'todos', 'assim', 'ainda', 'fazer', 'poder', 'sendo', 'mesmo', 'agora', 'então', 'forma', 'parte'];
        if (qtd > limiteRepeticao && !ignorar.includes(palavra)) {
            repeticoes += (qtd - limiteRepeticao);
            exemplo = palavra;
        }
    });

    if (repeticoes > 0) {
        penalizar(resC1, Math.min(40, repeticoes * CONFIG.PONTOS.PENALIDADE.REPETICAO), "Vocabulário", "Repetição excessiva.", `Ex: "${exemplo}"`, "Use sinônimos.", 'media');
    }

    resC1.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC1.nota);
}

function analisarC2(textoNorm, temaNorm, paragrafos, resC2) {
    if (!temaNorm || temaNorm === "livre") return;

    const stopWords = ['a', 'o', 'e', 'do', 'da', 'de', 'em', 'para', 'com', 'que', 'na', 'no', 'dos', 'das', 'sobre', 'pela', 'pelo'];
    const tokensTema = temaNorm.split(/\s+/).filter(t => t.length > 2 && !stopWords.includes(t));
    
    let acertos = 0;
    tokensTema.forEach(t => { if (textoNorm.includes(t)) acertos++; });
    
    const cobertura = acertos / tokensTema.length;
    const isTemaCurto = tokensTema.length < 3;

    if (acertos === 0) {
        resC2.nota = 40; 
        penalizar(resC2, 0, "Tema", "Fuga ao tema.", "Nenhuma palavra-chave encontrada.", "Use os termos do tema.", 'alta');
    } else if (cobertura < (isTemaCurto ? 0.9 : 0.5)) {
        const desconto = Math.floor((1 - cobertura) * 80);
        penalizar(resC2, desconto, "Tema", "Abordagem parcial.", "Tangenciamento.", "Explore todos os termos do tema.", 'alta');
    }

    if (paragrafos.length < CONFIG.LIMITES.MIN_PARAGRAFOS) {
        const pts = paragrafos.length === 2 ? 40 : 80;
        penalizar(resC2, pts, "Estrutura", "Estrutura incompleta.", `Apenas ${paragrafos.length} parágrafos.`, "Escreva Intro, Desenv. e Conclusão.", 'alta');
    }
    
    resC2.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC2.nota);
}

function analisarC3(textoLower, resC3) {
    // Conta conectivos com Regex (Performance Cache)
    let countConc = 0;
    // Lista simplificada para C3 (foca nos principais)
    ['portanto', 'logo', 'assim', 'consequentemente'].forEach(c => {
        if(textoLower.includes(c)) countConc++;
    });

    const countVerbos = LEXICO.VERBOS_CAUSA_EFEITO.reduce((acc, t) => acc + contarOcorrencias(textoLower, t), 0);

    const forcaArgumentativa = (countConc * 1.5) + (countVerbos * 0.8);

    if (forcaArgumentativa < 3) {
        penalizar(resC3, 40, "Argumentação", "Falta aprofundamento.", "Argumentos expositivos.", "Use 'pois', 'visto que' ou verbos de impacto.", 'alta');
    } else if (forcaArgumentativa < 6) {
        penalizar(resC3, 20, "Desenvolvimento", "Argumentação tímida.", "Ideias pouco exploradas.", "Detalhe mais consequências.", 'media');
    }

    // Repertório
    const temAutoridade = CACHE.AUTORIDADE_REGEX.test(textoLower);
    const temGenerico = contemTermo(textoLower, LEXICO.REPERTORIO_GENERICO);

    if (!temAutoridade && !temGenerico) {
        penalizar(resC3, 60, "Repertório", "Sem repertório externo.", "Texto baseado no senso comum.", "Cite dados, leis ou autores.", 'alta');
    } else if (temAutoridade) {
        // Bônus seguro (teto 200)
        resC3.nota = Math.min(200, resC3.nota + CONFIG.PONTOS.BONUS.AUTORIDADE);
    }
    
    resC3.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC3.nota);
}

function analisarC4(textoLower, tokens, paragrafos, resC4) {
    let totalCoesivos = 0;
    
    CACHE.CONECTIVOS_REGEX.forEach(item => {
        const matches = textoLower.match(item.regex);
        if(matches) totalCoesivos += matches.length;
    });

    LEXICO.REFERENCIAS.forEach(ref => {
        // Regex simples para refs
        const regex = new RegExp(`\\b${ref}\\b`, 'gi');
        const matches = textoLower.match(regex);
        if(matches) totalCoesivos += (matches.length * 0.6);
    });

    const densidadeAlvo = Math.min(0.04, Math.max(0.02, tokens.length * 0.0001)); 
    const densidadeAtual = totalCoesivos / tokens.length;

    if (densidadeAtual < densidadeAlvo) {
        penalizar(resC4, 60, "Coesão", "Texto desconexo.", "Baixa densidade de elementos de ligação.", "Use mais conectivos.", 'alta');
    }

    let conexoesInter = 0;
    if (paragrafos.length > 1) {
        for (let i = 1; i < paragrafos.length; i++) {
            const inicio = paragrafos[i].trim().substring(0, 25).toLowerCase();
            const temConectivo = LEXICO.CONECTIVOS_TRANSICAO.some(c => inicio.includes(c));
            const temRef = LEXICO.REFERENCIAS.some(r => inicio.includes(r));
            const outros = ['nesse', 'dessa', 'diante', 'enfim', 'ademais', 'outro', 'tal', 'mediante'].some(o => inicio.includes(o));

            if (temConectivo || temRef || outros) conexoesInter++;
        }
    }

    if (conexoesInter < 2 && paragrafos.length > 2) {
        penalizar(resC4, 40, "Estrutura", "Falta elo entre parágrafos.", "Parágrafos isolados.", "Use 'Além disso', 'Nesse contexto'.", 'media');
    }
    
    resC4.nota = Math.max(CONFIG.PONTOS.MIN_SAFETY, resC4.nota);
}

function analisarC5(paragrafos, resC5) {
    let textoConclusao = paragrafos[paragrafos.length - 1] ? normalizar(paragrafos[paragrafos.length - 1]) : "";
    if (paragrafos.length > 3 && textoConclusao.length < 150) {
        textoConclusao = normalizar(paragrafos[paragrafos.length - 2]) + " " + textoConclusao;
    }
    
    resC5.nota = 0; 
    let elementosEncontrados = 0;
    let erros = [];

    CACHE.C5.forEach(el => {
        if (el.regex.test(textoConclusao)) {
            elementosEncontrados++;
        } else {
            erros.push(el.msg);
        }
    });

    resC5.nota = elementosEncontrados * 40;

    if (resC5.nota === 0 && textoConclusao.length > 80) {
        resC5.nota = 60; 
        resC5.erros.push({ tipo: "Aviso", descricao: "Proposta vaga.", exemplo: "Elementos não identificados.", acao: "Use termos como 'O Governo deve...'", severidade: 'alta' });
    } else if (resC5.nota < 200 && erros.length > 0) {
        const errosPrioritarios = erros.filter(e => e.includes('AGENTE') || e.includes('AÇÃO'));
        const msgErro = errosPrioritarios.length > 0 ? errosPrioritarios.join(", ") : erros.slice(0, 2).join(", ");
        penalizar(resC5, 0, "Completeness", "Elementos ausentes.", msgErro, "Complete a proposta.", 'media');
    }
    
    if (textoConclusao.length > 150 && elementosEncontrados >= 3) {
        resC5.nota = Math.min(200, resC5.nota + 40);
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

    const textoLower = normalizar(textoLimpo);
    const paragrafos = textoLimpo.split(/\n+/).filter(p => p.trim().length > 0);
    const frases = textoLimpo.match(/[^.?!]+[.?!]+|[^.?!]+$/g) || [];
    const tokens = tokenizar(textoLimpo); 
    const temaNorm = normalizar(tema);

    const uniqueTokens = new Set(tokens.map(t => t.toLowerCase()));
    const ratio = uniqueTokens.size / tokens.length;
    // Cálculo seguro do mínimo dinâmico
    const minVocabDinamico = Math.max(0.15, CONFIG.LIMITES.MIN_VOCABULARIO_UNICO - (50 / tokens.length));
    
    if (ratio < minVocabDinamico) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 SPAM: Repetição excessiva de palavras.");
        return resultado;
    }
    if (detectarRepeticaoFrases(frases)) {
        zerarNotas(resultado);
        resultado.analiseGeral.push("🚨 SPAM: Frases duplicadas.");
        return resultado;
    }

    analisarC1(textoLimpo, tokens, frases, resultado.competencias.c1);
    analisarC2(textoLower, temaNorm, paragrafos, resultado.competencias.c2);
    analisarC3(textoLower, resultado.competencias.c3);
    analisarC4(textoLower, tokens, paragrafos, resultado.competencias.c4);
    analisarC5(paragrafos, resultado.competencias.c5);

    resultado.notaFinal = Object.values(resultado.competencias).reduce((acc, c) => acc + c.nota, 0);
    resultado.notaFinal = Math.min(1000, Math.max(0, resultado.notaFinal));

    return resultado;
}

module.exports = { corrigirRedacao };
