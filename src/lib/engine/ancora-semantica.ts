/**
 * Âncora Semântica — Construção do TM/TA por fórmula única parametrizada.
 *
 * Sessão 29 (D-S29-01): Aprovada pelo criador do MetodoAura.
 * Proposta: @fermat (Opção 4). Prova de congruência SSS em 2 linhas.
 *
 * Princípio: o triângulo é SEMPRE construído pela mesma lei dos cossenos.
 * A ÚNICA variável é a seleção de quais lados são (a, b, c) — uma decisão
 * de rotulação semântica, não de geometria.
 *
 * ```
 * V0 = (0, 0)                                    // âncora
 * V1 = (a, 0)                                    // lado 'a' na base
 * V2 = (b·cos(θ), signY·b·sin(θ))               // lado 'b' pelo ângulo θ
 * ```
 *
 * Teorema (Congruência SSS): {a, b, c} é permutação de {E, C, P}.
 * |V0V1| = a, |V0V2| = b, |V1V2| = c (lei dos cossenos). QED.
 */

import { clampCos } from './guards'
import type { TipoProtocolo } from './clairaut'
import type { AncoraSemantica } from './types-sessao29'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AncoraConfig {
    /** Lados selecionados: a (base), b (angular), c (oposto) */
    a: number
    b: number
    c: number
    /** Inversão Y para distinguir β (abre para baixo) de γ (abre para cima) */
    flipY: boolean
    /** Vértice semântico usado como âncora */
    vertice: 'epsilon' | 'omega' | 'alpha'
    /** Mapa reverso: qual lado semântico está em cada posição geométrica */
    mapaLados: {
        V0V1: 'E' | 'C' | 'P'  // lado na base (= a)
        V0V2: 'E' | 'C' | 'P'  // lado angular (= b)
        V1V2: 'E' | 'C' | 'P'  // lado oposto (= c)
    }
}

export interface TrianguloAncorado {
    /** Vértices posicionados */
    V0: [number, number]
    V1: [number, number]
    V2: [number, number]
    /** Ângulo na âncora (em radianos) */
    anguloAncora: number
    /** Configuração usada */
    config: AncoraConfig
    /** Metadado para CDTResult */
    ancora: AncoraSemantica
}

// ─── Seleção de Âncora por Protocolo ──────────────────────────────────────────

/**
 * Seleciona a configuração da âncora semântica com base no protocolo.
 *
 * | Protocolo | Âncora | a (base) | b (angular) | c (oposto) | flipY |
 * |-----------|--------|----------|-------------|------------|-------|
 * | agudo     | ε      | C        | P           | E          | false |
 * | beta      | ω      | E        | C           | P          | true  |
 * | gamma     | α      | E        | P           | C          | false |
 * | singular  | ε      | C        | P           | E          | false |
 *
 * Singular herda de α (é o último instante antes da transição para obtuso).
 */
export function selecionarAncora(
    E: number,
    C: number,
    P: number,
    protocolo: TipoProtocolo,
): AncoraConfig {
    switch (protocolo) {
        case 'obtuso_beta':
            return {
                a: E, b: C, c: P,
                flipY: true,
                vertice: 'omega',
                mapaLados: { V0V1: 'E', V0V2: 'C', V1V2: 'P' },
            }
        case 'obtuso_gamma':
            return {
                a: E, b: P, c: C,
                flipY: false,
                vertice: 'alpha',
                mapaLados: { V0V1: 'E', V0V2: 'P', V1V2: 'C' },
            }
        case 'agudo':
        case 'singular':
        default:
            return {
                a: C, b: P, c: E,
                flipY: false,
                vertice: 'epsilon',
                mapaLados: { V0V1: 'C', V0V2: 'P', V1V2: 'E' },
            }
    }
}

// ─── Construção do Triângulo ──────────────────────────────────────────────────

/**
 * Constrói o triângulo pela Âncora Semântica — fórmula ÚNICA para todos os protocolos.
 *
 * @param E - Lado Escopo normalizado (tipicamente 1.0)
 * @param C - Lado Custo/Orçamento normalizado
 * @param P - Lado Prazo normalizado
 * @param protocolo - Protocolo ativo (determina a seleção de âncora)
 * @returns Triângulo posicionado com metadados
 */
export function construirTriangulo(
    E: number,
    C: number,
    P: number,
    protocolo: TipoProtocolo,
): TrianguloAncorado {
    const config = selecionarAncora(E, C, P, protocolo)
    const { a, b, c, flipY } = config

    // Ângulo na âncora via lei dos cossenos: θ = arccos((a²+b²-c²)/(2ab))
    const cosTheta = clampCos((a * a + b * b - c * c) / (2 * a * b))
    const theta = Math.acos(cosTheta)

    // Fator Y: +1 (abre para cima) ou -1 (abre para baixo, β)
    const signY = flipY ? -1 : 1

    // Vértices
    const V0: [number, number] = [0, 0]
    const V1: [number, number] = [a, 0]
    const V2: [number, number] = [b * Math.cos(theta), signY * b * Math.sin(theta)]

    return {
        V0,
        V1,
        V2,
        anguloAncora: theta,
        config,
        ancora: {
            vertice: config.vertice,
            lados: { a, b, c },
            flipY,
            protocolo,
        },
    }
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/**
 * Calcula a área do triângulo construído (verificação de sanidade).
 * Deve ser igual a areaTri(E, C, P) por Heron.
 */
export function areaTrianguloAncorado(t: TrianguloAncorado): number {
    const [x0, y0] = t.V0
    const [x1, y1] = t.V1
    const [x2, y2] = t.V2
    return Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / 2
}

/**
 * Retorna o centróide do triângulo ancorado.
 */
export function centroideAncorado(t: TrianguloAncorado): [number, number] {
    return [
        (t.V0[0] + t.V1[0] + t.V2[0]) / 3,
        (t.V0[1] + t.V1[1] + t.V2[1]) / 3,
    ]
}

/**
 * Converte o triângulo ancorado para o formato {A, B, C} usado pelo TrianglePlotter.
 * O mapa semântico garante que cada vértice carrega o significado correto.
 */
export function paraFormatoPlotter(t: TrianguloAncorado): {
    A: { x: number; y: number }
    B: { x: number; y: number }
    C: { x: number; y: number }
} {
    return {
        A: { x: t.V0[0], y: t.V0[1] },
        B: { x: t.V1[0], y: t.V1[1] },
        C: { x: t.V2[0], y: t.V2[1] },
    }
}
