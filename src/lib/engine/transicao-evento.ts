/**
 * Transição de Protocolo como Evento — Sessão 29 (Etapa 4)
 *
 * Detecta quando o protocolo do TA muda entre snapshots consecutivos.
 * Cada transição é um evento datável e persistível.
 *
 * Sequência típica: α → singular → β (custo estoura)
 * O detector identifica o trigger e registra o evento.
 */

import type { TipoProtocolo } from './clairaut'
import type { TransicaoEvento } from './types-sessao29'
import { DELTA_CLASSIFICACAO } from './guards'

// ─── Detector de Transição ────────────────────────────────────────────────────

/**
 * Detecta se houve transição de protocolo entre dois snapshots.
 *
 * @param protocoloAnterior - Protocolo do snapshot anterior (null = primeiro snapshot)
 * @param protocoloAtual - Protocolo do snapshot atual
 * @param anguloCritico - Ângulo que disparou a transição (opcional)
 * @returns TransicaoEvento se houve transição, null se não
 */
export function detectarTransicao(
    protocoloAnterior: TipoProtocolo | null,
    protocoloAtual: TipoProtocolo,
    anguloCritico?: number,
): TransicaoEvento | null {
    if (!protocoloAnterior) return null
    if (protocoloAnterior === protocoloAtual) return null

    const trigger = derivarTrigger(protocoloAnterior, protocoloAtual, anguloCritico)

    return {
        de: protocoloAnterior,
        para: protocoloAtual,
        timestamp: Date.now(),
        trigger,
        angulo_critico: anguloCritico,
    }
}

// ─── Derivar trigger da transição ─────────────────────────────────────────────

function derivarTrigger(
    de: TipoProtocolo,
    para: TipoProtocolo,
    angulo?: number,
): string {
    const ang = angulo ? ` (${angulo.toFixed(1)}°)` : ''

    // Transições de ida (α → obtuso)
    if (de === 'agudo' && para === 'obtuso_beta') return `ω > 90°${ang} — custo dominou`
    if (de === 'agudo' && para === 'obtuso_gamma') return `α > 90°${ang} — prazo dominou`
    if (de === 'agudo' && para === 'singular') return `ângulo = 90°${ang} — fronteira de transição`

    // Transições via singular
    if (de === 'singular' && para === 'obtuso_beta') return `ω ultrapassou 90°${ang} — singular → β`
    if (de === 'singular' && para === 'obtuso_gamma') return `α ultrapassou 90°${ang} — singular → γ`
    if (de === 'singular' && para === 'agudo') return `ângulo recuou de 90°${ang} — singular → α`

    // Remissões (obtuso → α)
    if (de === 'obtuso_beta' && para === 'agudo') return `ω < 90°${ang} — remissão β (custo recuperado)`
    if (de === 'obtuso_gamma' && para === 'agudo') return `α < 90°${ang} — remissão γ (prazo recuperado)`

    // Cruzamento (β ↔ γ, raro)
    if (de === 'obtuso_beta' && para === 'obtuso_gamma') return `transição β → γ${ang} — pressão migrou de custo para prazo`
    if (de === 'obtuso_gamma' && para === 'obtuso_beta') return `transição γ → β${ang} — pressão migrou de prazo para custo`

    return `${de} → ${para}${ang}`
}

// ─── Classificação de severidade ──────────────────────────────────────────────

export type SeveridadeTransicao = 'positiva' | 'neutra' | 'alerta' | 'critica'

/**
 * Classifica a severidade de uma transição de protocolo.
 */
export function classificarSeveridade(evento: TransicaoEvento): SeveridadeTransicao {
    const { de, para } = evento

    // Remissões são positivas (recuperação)
    if ((de === 'obtuso_beta' || de === 'obtuso_gamma') && para === 'agudo') return 'positiva'
    if (de === 'singular' && para === 'agudo') return 'positiva'

    // Cruzamento β↔γ é alerta (antes do check genérico de obtuso)
    if (de === 'obtuso_beta' && para === 'obtuso_gamma') return 'alerta'
    if (de === 'obtuso_gamma' && para === 'obtuso_beta') return 'alerta'

    // Entrar em singular é alerta (pré-transição)
    if (para === 'singular') return 'alerta'

    // Entrar em obtuso é crítico
    if (para === 'obtuso_beta' || para === 'obtuso_gamma') return 'critica'

    return 'neutra'
}

// ─── Histórico de Transições ──────────────────────────────────────────────────

/**
 * Gerencia o histórico de transições do projeto.
 * Limita a N eventos mais recentes para não sobrecarregar a memória.
 */
export class HistoricoTransicoes {
    private eventos: TransicaoEvento[] = []
    private readonly maxEventos: number

    constructor(maxEventos = 50) {
        this.maxEventos = maxEventos
    }

    /** Adiciona um evento ao histórico */
    adicionar(evento: TransicaoEvento): void {
        this.eventos.push(evento)
        if (this.eventos.length > this.maxEventos) {
            this.eventos = this.eventos.slice(-this.maxEventos)
        }
    }

    /** Retorna todos os eventos */
    todos(): readonly TransicaoEvento[] {
        return this.eventos
    }

    /** Retorna o último evento (mais recente) */
    ultimo(): TransicaoEvento | null {
        return this.eventos.length > 0 ? this.eventos[this.eventos.length - 1] : null
    }

    /** Conta transições por tipo */
    contarPorTipo(): Record<string, number> {
        const contagem: Record<string, number> = {}
        for (const e of this.eventos) {
            const key = `${e.de}→${e.para}`
            contagem[key] = (contagem[key] ?? 0) + 1
        }
        return contagem
    }

    /** Verifica se houve remissão (obtuso → agudo) no histórico */
    teveRemissao(): boolean {
        return this.eventos.some(e =>
            (e.de === 'obtuso_beta' || e.de === 'obtuso_gamma') && e.para === 'agudo'
        )
    }

    /** Limpa o histórico */
    limpar(): void {
        this.eventos = []
    }
}
