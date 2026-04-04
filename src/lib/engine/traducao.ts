// traducao.ts — RFN-4 AC1: Tradução CDTResult → linguagem de gestão
// @dev (Dex) | @aura-klauss (Klauss) | Sessão 21 Sprint C

import type { CDTResult } from './math'

// ═══════════════════════════════════════════════════════════════════════════
// Tipos públicos
// ═══════════════════════════════════════════════════════════════════════════

export type Severidade = 'ok' | 'atencao' | 'critico'

export interface SituacaoProjetoTexto {
    /** Título curto para card de Saúde */
    titulo: string
    /** Descrição de 1-2 frases em linguagem de gestão */
    descricao: string
    /** Ação concreta recomendada ao PM */
    acao_recomendada: string
    /** Semáforo de severidade */
    severidade: Severidade
    /** Tendência geométrica (para card Tendência) */
    tendencia: string
    /** Interpretação da forma do triângulo */
    forma_natural: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Mapeamento zona → saúde
// ═══════════════════════════════════════════════════════════════════════════

const SAUDE_ZONA: Record<string, { titulo: string; descricao: string; severidade: Severidade }> = {
    OTIMO: {
        titulo: 'Projeto em excelência executiva',
        descricao: 'O triângulo está dentro da Zona de Resiliência Elástica. Prazo, custo e escopo estão em equilíbrio geométrico — o projeto absorve variações sem deformação permanente.',
        severidade: 'ok',
    },
    SEGURO: {
        titulo: 'Execução controlada',
        descricao: 'Desvios dentro da margem de segurança. A geometria mantém resiliência elástica. Monitoramento de rotina suficiente.',
        severidade: 'ok',
    },
    RISCO: {
        titulo: 'Atenção — triângulo se aproxima da crise',
        descricao: 'O projeto está saindo da zona de conforto geométrico. Cada nova decisão aumenta o risco de deformação permanente. Intervenção preventiva recomendada.',
        severidade: 'atencao',
    },
    CRISE: {
        titulo: 'Crise ativa — deformação plástica detectada',
        descricao: 'O projeto ultrapassou o limiar de crise. A geometria entrou em regime plástico — as alterações agora deixam cicatrizes permanentes no Triângulo Matriz.',
        severidade: 'critico',
    },
}

// ═══════════════════════════════════════════════════════════════════════════
// Mapeamento forma → tendência e texto natural
// ═══════════════════════════════════════════════════════════════════════════

const FORMA_NATURAL: Record<string, { tendencia: string; forma_natural: string }> = {
    acutangulo: {
        tendencia: 'Equilíbrio — todos os ângulos menores que 90°',
        forma_natural: 'Triângulo acutângulo: projeto equilibrado entre prazo, custo e escopo.',
    },
    obtusangulo_c: {
        tendencia: 'Pressão financeira — triângulo inclinando para custo',
        forma_natural: 'Triângulo obtusângulo no custo: o orçamento está dominando a geometria. Risco de deformação financeira estrutural.',
    },
    obtusangulo_p: {
        tendencia: 'Pressão de cronograma — triângulo inclinando para prazo',
        forma_natural: 'Triângulo obtusângulo no prazo: o cronograma está consumindo a geometria. Considere comprimir o caminho crítico.',
    },
    retangulo: {
        tendencia: 'Ponto de inflexão — ângulo reto detectado',
        forma_natural: 'Ângulo reto entre prazo e custo: o projeto perdeu resiliência elástica. Redesenho da TAP recomendado.',
    },
    invalido: {
        tendencia: 'Ruptura geométrica — CET violada',
        forma_natural: 'O triângulo não existe matematicamente. A Condição de Existência foi violada. Intervenção imediata obrigatória.',
    },
}

// ═══════════════════════════════════════════════════════════════════════════
// Gerador de ação recomendada
// ═══════════════════════════════════════════════════════════════════════════

function gerarAcaoRecomendada(cdtData: CDTResult): string {
    const { zona_mated, forma_triangulo, lados, cet } = cdtData

    if (!cet?.valida) {
        return 'Acione o Gabinete de Crise imediatamente. A CET foi violada — redefina escopo ou renegocie prazo e custo na TAP.'
    }
    if (zona_mated === 'CRISE' || forma_triangulo === 'invalido') {
        return 'Abra o War Room. Acione o Gabinete de Crise e identifique a causa-raiz com Ishikawa ou 5 Porquês.'
    }
    if (forma_triangulo === 'retangulo') {
        return 'Redesenho urgente da TAP. Use o Simulador de Decisões para identificar o delta compensatório antes de qualquer mudança.'
    }
    if (zona_mated === 'RISCO') {
        if (forma_triangulo === 'obtusangulo_c') {
            return 'Revisar baseline de custo. Identifique tarefas com custo acima do planejado e aplique contenção financeira (PDCA).'
        }
        if (forma_triangulo === 'obtusangulo_p') {
            return 'Revisar caminho crítico. Comprima tarefas com maior folga total ou negocie entregáveis opcionais com o patrocinador.'
        }
        return 'Monitoramento intensificado. Registre uma decisão MATED e simule o impacto geométrico antes de aprovar mudanças.'
    }
    if (lados.orcamento > 1.3 && lados.prazo <= 1.1) {
        return 'Pressão financeira moderada. Revise contratos de fornecedores e identifique escopo de baixo valor que pode ser removido.'
    }
    if (lados.prazo > 1.3 && lados.orcamento <= 1.1) {
        return 'Pressão de cronograma moderada. Avalie horas extras estratégicas no caminho crítico para recuperar buffer.'
    }
    return 'Manter cadência de revisão. Registre decisões relevantes no MATED para rastreabilidade geométrica.'
}

// ═══════════════════════════════════════════════════════════════════════════
// Função principal — RFN-4 AC1
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Traduz um CDTResult para linguagem de gestão sem jargão matemático.
 *
 * @example
 * const situacao = traduzirCDT(cdtData)
 * // situacao.titulo → "Execução controlada"
 * // situacao.tendencia → "Equilíbrio — todos os ângulos menores que 90°"
 * // situacao.acao_recomendada → "Manter cadência de revisão..."
 */
export function traduzirCDT(cdtData: CDTResult): SituacaoProjetoTexto {
    const zona = cdtData.zona_mated ?? 'SEGURO'
    const forma = cdtData.forma_triangulo ?? 'acutangulo'

    const saude = SAUDE_ZONA[zona] ?? SAUDE_ZONA.SEGURO
    const formaInfo = FORMA_NATURAL[forma] ?? FORMA_NATURAL.acutangulo
    const acao = gerarAcaoRecomendada(cdtData)

    return {
        titulo: saude.titulo,
        descricao: saude.descricao,
        acao_recomendada: acao,
        severidade: saude.severidade,
        tendencia: formaInfo.tendencia,
        forma_natural: formaInfo.forma_natural,
    }
}
