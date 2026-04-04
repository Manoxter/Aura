/**
 * Aura Deterministic Extractor
 * Objetivo: Extrair valores vitais da TAP (Orçamento/Prazo) sem depender de IA.
 */

export interface ExtractedValues {
    orcamento: number;
    prazo: number;
    nome: string;
}

export interface WBSNodeDraft {
    id: string;
    nome: string;
    pai_id: string | null;
    nivel: number;
    duracao?: number;
}

export function deterministicExtractor(text: string): ExtractedValues {
    const values: ExtractedValues = {
        orcamento: 0,
        prazo: 0,
        nome: ''
    };

    if (!text) return values;

    // Normalize unicode: replace non-breaking spaces, zero-width chars, smart quotes
    text = text
        .replace(/[\u00A0\u2000-\u200B\u202F\uFEFF]/g, ' ')  // non-breaking spaces → regular space
        .replace(/[\u201C\u201D\u201E]/g, '"')                 // smart quotes
        .replace(/[\u2018\u2019]/g, "'")                       // smart apostrophes
        .replace(/[\u2013\u2014]/g, '-')                       // en/em dash
        .replace(/\u200B/g, '')                                 // zero-width space

    // 1. Extração de Orçamento
    // Estrategia: buscar primeiro por keywords de BASELINE (custo estimado, orcamento base),
    // depois fallback para qualquer valor monetario. Evita pegar "Teto da TAP" ou contingencia.

    function parseCurrencyValue(raw: string): number {
        const hasCommaDecimal = /\d\.\d{3}/.test(raw) && /,\d{1,2}$/.test(raw);
        const hasDotDecimal = /\d,\d{3}/.test(raw) && /\.\d{1,2}$/.test(raw);
        if (hasCommaDecimal || (raw.includes('.') && !raw.includes(','))) {
            return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
        } else if (hasDotDecimal) {
            return parseFloat(raw.replace(/,/g, '')) || 0;
        }
        return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
    }

    // Prioridade 1: Keywords de baseline (custo estimado, orcamento base/total/aprovado, custo base)
    const baselinePatterns = [
        /(?:custo\s*estimado\s*(?:base)?|orcamento\s*(?:base|total|aprovado)|orçamento\s*(?:base|total|aprovado))\s*[:\-]?\s*(?:USD|US\$|R\$|\$)?\s*([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{1,2})?)/gi,
    ];

    // Prioridade 2: Qualquer valor monetario (excluindo keywords de teto/contingencia/reserva)
    // Aceita: US$, R$, $, USD (sem símbolo de dólar — ex: "USD 2.800.000.000")
    const monetaryPattern = /(?:USD|US\$|R\$|\$)\s?([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{1,2})?)/gi;

    // Linhas que indicam teto/contingencia — NAO usar como orcamento base
    const tetoExclusion = /(?:teto|contingencia|contingência|reserva|excedente)/i;

    let baselineBudget = 0;
    let fallbackBudget = 0;

    // Tentar baseline primeiro
    for (const regex of baselinePatterns) {
        const matches = Array.from(text.matchAll(regex));
        for (const match of matches) {
            const val = parseCurrencyValue(match[1]);
            if (val > baselineBudget) baselineBudget = val;
        }
    }

    // Fallback: qualquer valor monetario, excluindo linhas de teto/contingencia
    if (baselineBudget === 0) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (tetoExclusion.test(line)) continue;
            const matches = Array.from(line.matchAll(monetaryPattern));
            for (const match of matches) {
                const val = parseCurrencyValue(match[1]);
                if (val > fallbackBudget) fallbackBudget = val;
            }
        }
    }

    values.orcamento = baselineBudget || fallbackBudget;

    // 2. Extração de Prazo
    // Busca: "7 anos", "prazo: 365 dias", "durante os 7 anos", marcos com datas
    const deadlinePatterns = [
        // "Prazo total: 4745 dias", "Prazo: 365 dias", "Prazo de execução: 12 meses"
        /(?:prazo|duração|duracao|tempo|cronograma)\s*(?:\w+\s*)?[:\-]\s*(\d+)\s*(dias?|meses?|mês|anos?)/gi,
        /(?:durante|ao\s+longo\s+de|em)\s+(?:os\s+)?(\d+)\s+(dias?|meses?|mês|anos?)/gi,
        /(\d+)\s+(dias?|meses?|mês|anos?)\s+(?:de\s+)?(?:duração|prazo|obra|projeto|execução)/gi,
    ];

    for (const regex of deadlinePatterns) {
        const matches = Array.from(text.matchAll(regex));
        if (matches.length > 0 && values.prazo === 0) {
            const amount = parseInt(matches[0][1]);
            const unit = matches[0][2].toLowerCase();
            if (unit.startsWith('dia')) values.prazo = amount;
            else if (unit.startsWith('m')) values.prazo = amount * 30;
            else if (unit.startsWith('a')) values.prazo = amount * 365;
        }
    }

    // Fallback: calcular prazo pelos marcos (diferenca entre primeiro e ultimo marco)
    if (values.prazo === 0) {
        const dateRegex = /(?:M\d|Marco\s*\d)[^]*?(\d{4})/gi;
        const years = Array.from(text.matchAll(dateRegex)).map(m => parseInt(m[1])).filter(y => y > 2000);
        if (years.length >= 2) {
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            values.prazo = (maxYear - minYear) * 365;
        }
    }

    // 3. Extração de Nome — exige ":" para capturar só o valor, não o rótulo
    // "Nome do Projeto: Boston Big Dig" → "Boston Big Dig"
    // "Projeto: Big Dig" → "Big Dig"
    const nameRegex = /(?:nome\s+do\s+projeto|nome\s+do\s+empreendimento|nome|projeto)\s*:\s*([^\n\r]+)/i;
    const nameMatch = text.match(nameRegex);
    if (nameMatch) {
        values.nome = nameMatch[1].trim();
    } else {
        // Tenta pegar a primeira linha curta sem rótulo
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.length < 80 && !firstLine.includes(':')) values.nome = firstLine;
    }

    return values;
}

/**
 * WBS/EAP Hierarchical Extractor
 * Interpreta numeração (1.1, 1.1.1) e indentação para gerar árvore.
 */
/**
 * Patterns que indicam linhas NAO-estruturais (metadata da TAP, nao pacotes WBS).
 * Estas linhas sao filtradas antes do parsing hierarquico.
 */
const NON_WBS_PATTERNS = [
    /^(?:R\$|\$|orcamento|orçamento|investimento|valor|budget|custo\s*total)/i,
    /^(?:prazo|duração|duracao|deadline|tempo\s*total)/i,
    /^(?:restrição|restricao|constraint|limitação)/i,
    /^(?:justificativa|objetivo|escopo\s*sintetizado|resumo)/i,
    /^(?:sponsor|gestor|responsável|stakeholder|equipe)/i,
    /^(?:data\s*de\s*início|data\s*início|start\s*date)/i,
    /^(?:---+|===+|\*\*\*+)$/,  // separadores horizontais
    /^\|/,                       // linhas de tabela Markdown (iniciam com pipe)
    /^[-|:]{3,}$/,               // separadores de tabela (--- ou |---|)
    /^[^\x00-\x7F]/,             // linhas que iniciam com caractere não-ASCII (emoji, ex: 📈 Tabela de Custos)
    /^(?:c[oó]d\.?|code|pacote\s+de\s+trabalho|work\s+package)\s*[\t|]/i, // cabeçalho de tabela de custos
];

function isNonWBSLine(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length < 3) return true;
    return NON_WBS_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Remove prefixo WBS do nome.
 * Numérico PMBOK: "1.1.1 Fundacao" → "Fundacao", "1. Name" → "Name"
 * T-code: "T2.1 Construcao" → "Construcao", "T1 Planejamento" → "Planejamento"
 * Letra maiúscula: "A. Planejamento" → "Planejamento", "A.1 Kickoff" → "Kickoff"
 * Requis: espaço após o código (impede remover 1ª letra de palavras como "Fase")
 */
function cleanWBSName(name: string): string {
    return name
        .replace(/^T\d+(?:\.\d+)*\s+/i, '')              // T-code: T1, T2.1, T2.1.3
        .replace(/^(?:[A-Z](?:\.\d+)*|\d+(?:\.\d+)*)\.?\s+/i, '') // numeric PMBOK / letter
        .replace(/^[-–—)]\s*/, '')  // optional leading dash/paren
        .trim();
}

export function wbsExtractor(text: string): WBSNodeDraft[] {
    const lines = text.split('\n').filter(l => l.trim().length > 0 && !isNonWBSLine(l));
    const nodes: WBSNodeDraft[] = [];
    const stack: { id: string; nivel: number }[] = [];

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        // 1. Detect Level via Indentation (2 spaces = 1 level)
        const indentMatch = line.match(/^(\s+)/);
        const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) + 1 : 1;

        // 2. Detect Level via WBS code:
        //    T-code:        "T1 Name" → level 1, "T2.1 Name" → level 2, "T2.1.3 Name" → level 3
        //    Numeric PMBOK: "1.1.1 Name" → level 3
        //    Letter + dot:  "A. Name" → level 1, "A.1 Name" → level 2, "A.1.1 Name" → level 3
        //    (plain "A Name" without dot is NOT matched — too ambiguous)
        const numMatch = trimmed.match(/^(T\d+(?:\.\d+)*|\d+(?:\.\d+)*\.?|[A-Z](?:\.\d+)+\.?|[A-Z]\.)(?=[\s-–—)]|$)/i);
        let numberingLevel = 0;
        if (numMatch) {
            numberingLevel = numMatch[1].split('.').filter(Boolean).length;
        }

        const finalLevel = numberingLevel > 0 ? numberingLevel : (indentLevel > 1 ? indentLevel : 1);

        // 3. Find Parent using Stack
        while (stack.length > 0 && stack[stack.length - 1].nivel >= finalLevel) {
            stack.pop();
        }

        const nodeId = generateId();
        const paiId = stack.length > 0 ? stack[stack.length - 1].id : null;

        // 4. Detect Duration in line (e.g. "Tarefa A (5d)" or "10 dias")
        const durRegex = /(?:(?:\(|\s)(\d+)\s?(?:d|dias|days)(?:\)|\s|$))/i;
        const durMatch = trimmed.match(durRegex);
        const duracaoValue = durMatch ? parseInt(durMatch[1]) : undefined;

        // 5. Clean name: remove PMBOK numbering prefix
        const cleanedName = cleanWBSName(trimmed);

        nodes.push({
            id: nodeId,
            nome: cleanedName || trimmed,
            pai_id: paiId,
            nivel: finalLevel,
            duracao: duracaoValue
        });

        stack.push({ id: nodeId, nivel: finalLevel });
    });

    return nodes;
}
