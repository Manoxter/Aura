/**
 * zones.ts — Story 3.0-C
 *
 * Classificação de candidatos do Eixo de Dimensão CEt nas 5 zonas operacionais.
 * Cada zona descreve o custo operacional real (dias + R$) de uma decisão disponível.
 *
 * Zonas (P e O avaliados independentemente — assimétricas):
 *   Verde   — P ≤ 1.0 E O ≤ 1.0          (dentro do operacional)
 *   Amarela — P ou O dentro da folga/contingência (gerenciável)
 *   Vermelha— P ou O esgota a folga/contingência (limiar crítico)
 *   Cinza   — P > prazo_total / caminho_critico  (prazo existe, mas além do total)
 *   Nula    — O > 1 + pct/100              (dinheiro não existe — bloqueado)
 */

export type ZonaOperacional = 'verde' | 'amarela' | 'vermelha' | 'cinza' | 'nula'

export interface LimitesZona {
    /** caminho crítico baseline em dias (denominador de P) */
    caminho_critico_baseline_dias: number
    /** prazo total do TAP em dias (teto de P) */
    prazo_total_dias: number
    /** percentual de contingência (ex: 15 → 15%) */
    percentual_contingencia: number
    /** orçamento operacional = orcamento_total × (1 − pct/100) */
    orcamento_operacional: number
}

export interface ClassificacaoCEt {
    zona: ZonaOperacional
    /** lado_P desnormalizado em dias */
    prazo_real_dias: number
    /** lado_O desnormalizado em R$ */
    custo_real_brl: number
    /** dias acima do caminho crítico (0 se dentro do operacional) */
    dias_extra: number
    /** custo acima do operacional em R$ (0 se dentro do operacional) */
    custo_extra_brl: number
    /** true apenas para Zona Nula (dinheiro não existe) */
    bloqueado: boolean
    /** texto descritivo para o PM */
    consequencia: string
}

// ─── Tolerância numérica para limiar "esgota exatamente" (Zona Vermelha) ──────
const TOLERANCIA_LIMIAR = 0.01

/**
 * Classifica um candidato CEt nas 5 zonas operacionais com desnormalização.
 *
 * @param candidato - lados normalizados { P, O } do TA candidato
 * @param limites   - parâmetros do projeto para cálculo dos limiares e desnorm.
 */
export function classificarCandidatoCEt(
    candidato: { P: number; O: number },
    limites: LimitesZona
): ClassificacaoCEt {
    const { P, O } = candidato
    const {
        caminho_critico_baseline_dias,
        prazo_total_dias,
        percentual_contingencia,
        orcamento_operacional,
    } = limites

    // ─── Limiares ──────────────────────────────────────────────────────────────
    // Prazo: limite da folga = prazo_total / caminho_critico (normalizado)
    const limiteP_folga = caminho_critico_baseline_dias > 0
        ? prazo_total_dias / caminho_critico_baseline_dias
        : 1.0

    // Orçamento: limite da contingência = 1 + pct/100
    const limiteO_contingencia = 1 + percentual_contingencia / 100

    // ─── Desnormalização ───────────────────────────────────────────────────────
    const prazo_real_dias = P * caminho_critico_baseline_dias
    const custo_real_brl = O * orcamento_operacional
    const dias_extra = Math.max(0, prazo_real_dias - caminho_critico_baseline_dias)
    const custo_extra_brl = Math.max(0, custo_real_brl - orcamento_operacional)

    // ─── Classificação (Zona Nula tem prioridade — dinheiro não existe) ────────

    // Zona Nula: O esgotou orçamento total (acima da contingência)
    if (O > limiteO_contingencia + TOLERANCIA_LIMIAR) {
        return {
            zona: 'nula',
            prazo_real_dias,
            custo_real_brl,
            dias_extra,
            custo_extra_brl,
            bloqueado: true,
            consequencia:
                'Orçamento total esgotado — decisão bloqueada. Necessário aporte de capital ou redução de escopo antes de prosseguir.',
        }
    }

    // Zona Cinza: P além do prazo total (tempo existe, mas esgotou margem)
    if (P > limiteP_folga + TOLERANCIA_LIMIAR) {
        return {
            zona: 'cinza',
            prazo_real_dias,
            custo_real_brl,
            dias_extra,
            custo_extra_brl,
            bloqueado: false,
            consequencia:
                'Prazo total ultrapassado — projeto fora da janela contratual. Revisão de escopo ou calendário obrigatória.',
        }
    }

    // Zona Vermelha: P ou O no limiar de esgotamento (±0.01 tolerância)
    // Usa >= na borda inferior para evitar erro de ponto flutuante:
    //   1.16 - 1.15 = 0.010000...005 > 0.01 em IEEE 754, portanto
    //   Math.abs(1.16 - 1.15) <= 0.01 dá FALSE incorretamente.
    //   1.16 >= 1.15 - 0.01 = 1.16 >= 1.14 → TRUE (não sofre esse erro).
    // Já sabemos que Nula/Cinza não dispararam → P e O estão abaixo dos tetos.
    const pEsgota = P >= limiteP_folga - TOLERANCIA_LIMIAR
    const oEsgota = O >= limiteO_contingencia - TOLERANCIA_LIMIAR
    if (pEsgota || oEsgota) {
        const motivo = pEsgota && oEsgota
            ? 'Prazo e orçamento no limite crítico'
            : pEsgota
                ? 'Folga de prazo esgotada'
                : 'Reserva de contingência esgotada'
        return {
            zona: 'vermelha',
            prazo_real_dias,
            custo_real_brl,
            dias_extra,
            custo_extra_brl,
            bloqueado: false,
            consequencia:
                `${motivo} — qualquer avanço coloca o projeto em Zona Nula. Ação imediata requerida.`,
        }
    }

    // Zona Verde: P ≤ 1.0 e O ≤ 1.0 (dentro do operacional puro)
    if (P <= 1.0 && O <= 1.0) {
        return {
            zona: 'verde',
            prazo_real_dias,
            custo_real_brl,
            dias_extra: 0,
            custo_extra_brl: 0,
            bloqueado: false,
            consequencia: 'Projeto dentro dos parâmetros operacionais — sem ação corretiva necessária.',
        }
    }

    // Zona Amarela: P ou O acima de 1.0 mas dentro da folga/contingência
    const motivoAmarela: string[] = []
    if (P > 1.0) {
        motivoAmarela.push(`prazo +${diasExtra(dias_extra)} dias além do crítico`)
    }
    if (O > 1.0) {
        const pctUsado = ((O - 1.0) / (percentual_contingencia / 100) * 100).toFixed(0)
        motivoAmarela.push(`${pctUsado}% da contingência consumida`)
    }
    return {
        zona: 'amarela',
        prazo_real_dias,
        custo_real_brl,
        dias_extra,
        custo_extra_brl,
        bloqueado: false,
        consequencia:
            `Zona de atenção: ${motivoAmarela.join('; ')} — monitoramento intensivo recomendado.`,
    }
}

// ─── Helper interno ────────────────────────────────────────────────────────────

function diasExtra(dias: number): string {
    return dias === 1 ? '1 dia' : `${Math.round(dias)} dias`
}
