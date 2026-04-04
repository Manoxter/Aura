/**
 * Compensação Bidirecional TM↔TA — Sessão 29 (Etapa 5)
 *
 * Calcula os deltas entre TM (baseline) e TA (atual) por lado,
 * normaliza pelo baseline, e recomenda qual lado compensar
 * prioritariamente para recuperar o equilíbrio geométrico.
 */

import type { CDTResult } from './math'
import type { CompensacaoBidirecionalResult } from './types-sessao29'

/**
 * Calcula a compensação bidirecional entre TM e TA.
 *
 * @param tm - CDTResult do Triângulo Matriz (baseline)
 * @param ta - CDTResult do Triângulo Atual (real)
 * @returns Deltas, normalizações e recomendação de prioridade
 */
export function calcularCompensacaoBidirecional(
    tm: CDTResult,
    ta: CDTResult,
): CompensacaoBidirecionalResult {
    // Deltas absolutos: TA - TM (positivo = TA maior que TM)
    const delta_E = ta.lados.escopo - tm.lados.escopo
    const delta_C = ta.lados.orcamento - tm.lados.orcamento
    const delta_P = ta.lados.prazo - tm.lados.prazo

    // Normalizar pelo baseline (proteger contra divisão por zero)
    const delta_E_norm = tm.lados.escopo > 1e-9 ? delta_E / tm.lados.escopo : 0
    const delta_C_norm = tm.lados.orcamento > 1e-9 ? delta_C / tm.lados.orcamento : 0
    const delta_P_norm = tm.lados.prazo > 1e-9 ? delta_P / tm.lados.prazo : 0

    // Lado prioritário: maior delta normalizado absoluto
    const absE = Math.abs(delta_E_norm)
    const absC = Math.abs(delta_C_norm)
    const absP = Math.abs(delta_P_norm)
    const maxAbs = Math.max(absE, absC, absP)

    let lado_prioritario: 'E' | 'C' | 'P' = 'E'
    if (maxAbs === absC) lado_prioritario = 'C'
    else if (maxAbs === absP) lado_prioritario = 'P'

    // Direção geral: se a maioria dos deltas é positiva, TA está "acima"
    const positivos = [delta_E_norm, delta_C_norm, delta_P_norm].filter(d => d > 0.01).length
    const negativos = [delta_E_norm, delta_C_norm, delta_P_norm].filter(d => d < -0.01).length
    const direcao = positivos > negativos ? 'acima' : negativos > positivos ? 'abaixo' : 'neutro'

    // Divergência de protocolo
    const protocoloTM = tm.protocolo ?? 'agudo'
    const protocoloTA = ta.protocolo ?? 'agudo'

    return {
        delta_E,
        delta_C,
        delta_P,
        delta_E_norm,
        delta_C_norm,
        delta_P_norm,
        lado_prioritario,
        direcao,
        divergencia_protocolo: protocoloTM !== protocoloTA,
    }
}

/**
 * Gera texto prescritivo para o gestor baseado na compensação.
 */
export function gerarRecomendacao(comp: CompensacaoBidirecionalResult): string {
    const lado = comp.lado_prioritario === 'E' ? 'Escopo'
        : comp.lado_prioritario === 'C' ? 'Custo' : 'Prazo'

    const delta = comp.lado_prioritario === 'E' ? comp.delta_E_norm
        : comp.lado_prioritario === 'C' ? comp.delta_C_norm : comp.delta_P_norm

    const pct = Math.abs(delta * 100).toFixed(1)
    const dir = delta > 0 ? 'acima' : 'abaixo'

    if (Math.abs(delta) < 0.05) {
        return `Projeto dentro da tolerância (±5%). Nenhuma compensação necessária.`
    }

    if (comp.divergencia_protocolo) {
        return `ALERTA: protocolo mudou. ${lado} está ${pct}% ${dir} do baseline. ` +
            `Compensação prioritária em ${lado} para retornar ao regime planejado.`
    }

    return `${lado} está ${pct}% ${dir} do baseline. ` +
        `Sugestão: ajustar ${lado} para aproximar o TA do TM planejado.`
}
