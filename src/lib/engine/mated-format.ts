/**
 * MATED Format — PM-friendly formatting for MATED metrics
 * Sprint 8 Sessão 27 (Req F)
 *
 * Converte métricas brutas MATED em linguagem acionável para o PM.
 * Consulta: @aura-production, @kenki, @ux
 */

export interface MATEDInfo {
    /** Distância ao equilíbrio como percentual (0-100%) */
    distanciaPct: string
    /** Zona textual com emoji */
    zonaLabel: string
    /** Diagnóstico em linguagem natural */
    diagnostico: string
    /** Ação recomendada */
    acao: string
    /** Cor CSS da zona */
    cor: string
}

/**
 * Formata métricas MATED para linguagem PM-friendly.
 * @param distancia - MATED distance (0 = perfeito, >0.30 = crise)
 * @param zona - Zona classificada (OTIMO/SEGURO/RISCO/CRISE)
 * @param direcao - Eixo dominante do desvio ('custo' | 'prazo' | 'equilibrado')
 */
export function formatMATEDInfo(
    distancia: number,
    zona: 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE',
    direcao?: 'custo' | 'prazo' | 'equilibrado'
): MATEDInfo {
    const pct = (distancia * 100).toFixed(1)

    const zonaMap = {
        OTIMO:  { label: 'Equilíbrio ideal', cor: '#10b981', diagnostico: 'O projeto opera dentro do envelope de segurança. Nenhuma intervenção necessária.', acao: 'Manter monitoramento regular.' },
        SEGURO: { label: 'Desvio gerenciável', cor: '#3b82f6', diagnostico: 'Pequeno desvio detectado, ainda dentro dos limites aceitáveis.', acao: 'Monitorar a tendência nas próximas semanas.' },
        RISCO:  { label: 'Atenção requerida', cor: '#f59e0b', diagnostico: `Desvio significativo de ${pct}% — o projeto se afasta do equilíbrio.${direcao === 'custo' ? ' Pressão predominante no CUSTO.' : direcao === 'prazo' ? ' Pressão predominante no PRAZO.' : ''}`, acao: 'Avaliar ações corretivas. Considerar fast-tracking ou re-escopo.' },
        CRISE:  { label: 'Intervenção imediata', cor: '#ef4444', diagnostico: `Desvio crítico de ${pct}% — geometria do projeto em colapso.${direcao === 'custo' ? ' Custo fora de controle.' : direcao === 'prazo' ? ' Cronograma em colapso.' : ''}`, acao: 'Convocar gabinete de crise. Renegociar escopo, prazo ou orçamento.' },
    }

    const info = zonaMap[zona]
    return {
        distanciaPct: `${pct}%`,
        zonaLabel: info.label,
        diagnostico: info.diagnostico,
        acao: info.acao,
        cor: info.cor,
    }
}
