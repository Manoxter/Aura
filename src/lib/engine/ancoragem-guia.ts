/**
 * Ancoragem GUIA — Sessão 29 (Proposta do Criador)
 *
 * A reta que NÃO se move é o GUIA. Seus pontos extremos determinam
 * os vértices do triângulo TM nos protocolos obtuso.
 *
 * - α (agudo): retas na posição natural dos gráficos, sem inversão
 * - γ (P²>E²+C²): Prazo=GUIA, custo×(-1)→"Liquidez" ↘
 * - β (C²>E²+P²): Custo=GUIA, prazo×(-1)→"Margem" ↗
 *
 * Sombras: a da reta GUIA fica inalterada. A da reta invertida
 * sofre rotação 180° no eixo vertical + deslocamento X.
 */

import type { TipoProtocolo } from './clairaut'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ManchaPoint {
    t: number   // tempo normalizado [0,1]
    fp: number  // burndown prazo [0,1]
    fc: number  // custo acumulado [0,1]
}

/** Resultado da ancoragem: flags de direção + label + sombra transformada */
export interface AncoragemResult {
    /** Flag de direção por reta: 1 = normal, -1 = invertida */
    direcaoCusto: 1 | -1
    direcaoPrazo: 1 | -1
    /** Labels dinâmicos */
    labelCusto: string
    labelPrazo: string
    /** Sub-label para legenda */
    subLabelCusto: string
    subLabelPrazo: string
    /** Qual reta é o GUIA (não se move) */
    retaGuia: 'custo' | 'prazo' | null  // null = agudo (ambas na posição natural)
}

// ─── Ancoragem ────────────────────────────────────────────────────────────────

/**
 * Determina a ancoragem GUIA e flags de direção para cada protocolo.
 */
export function calcularAncoragem(protocolo: TipoProtocolo): AncoragemResult {
    switch (protocolo) {
        case 'obtuso_gamma':
            // P² > E² + C² → prazo domina → prazo é GUIA → custo inverte
            return {
                direcaoCusto: -1,
                direcaoPrazo: 1,
                labelCusto: 'Liquidez restante',
                labelPrazo: 'Prazo',
                subLabelCusto: 'Orçamento − Custo acumulado',
                subLabelPrazo: 'Burndown regressivo',
                retaGuia: 'prazo',
            }
        case 'obtuso_beta':
            // C² > E² + P² → custo domina → custo é GUIA → prazo inverte
            return {
                direcaoCusto: 1,
                direcaoPrazo: -1,
                labelCusto: 'Custo',
                labelPrazo: 'Margem de prazo',
                subLabelCusto: 'Custo acumulado',
                subLabelPrazo: 'Prazo contratado − Prazo consumido',
                retaGuia: 'custo',
            }
        case 'agudo':
        case 'singular':
        default:
            // Retas na posição natural — sem inversão
            return {
                direcaoCusto: 1,
                direcaoPrazo: 1,
                labelCusto: 'Custo',
                labelPrazo: 'Prazo',
                subLabelCusto: 'Custo acumulado',
                subLabelPrazo: 'Burndown regressivo',
                retaGuia: null,
            }
    }
}

// ─── Transformação de Sombras ─────────────────────────────────────────────────

/**
 * Transforma os dados de sombra (manchaData) conforme a ancoragem.
 *
 * - Reta GUIA: sombra inalterada (fp ou fc mantido)
 * - Reta invertida: sombra sofre rotação 180° no eixo vertical (reverse do array)
 *   + deslocamento X proporcional ao deslocamento da reta
 *
 * Implementação: reverse do array de valores (discreto, sem interpolação).
 * Preserva a integral (área) por ser isometria.
 *
 * @param manchaData - Dados originais da sombra
 * @param protocolo - Protocolo ativo
 * @returns manchaData transformado para o protocolo
 */
export function transformarSombras(
    manchaData: ManchaPoint[],
    protocolo: TipoProtocolo,
): ManchaPoint[] {
    if (manchaData.length === 0) return manchaData

    const ancoragem = calcularAncoragem(protocolo)

    // Agudo/singular: sem transformação
    if (ancoragem.retaGuia === null) return manchaData

    if (ancoragem.retaGuia === 'prazo') {
        // γ: custo inverte → rotação 180° da sombra fc (reverse dos valores fc)
        // fp (prazo/GUIA) permanece inalterado
        const fcValues = manchaData.map(d => d.fc)
        const fcReversed = [...fcValues].reverse()

        return manchaData.map((d, i) => ({
            t: d.t,
            fp: d.fp,                // GUIA: inalterado
            fc: fcReversed[i],       // invertida: rotação 180°
        }))
    }

    if (ancoragem.retaGuia === 'custo') {
        // β: prazo inverte → rotação 180° da sombra fp (reverse dos valores fp)
        // fc (custo/GUIA) permanece inalterado
        const fpValues = manchaData.map(d => d.fp)
        const fpReversed = [...fpValues].reverse()

        return manchaData.map((d, i) => ({
            t: d.t,
            fp: fpReversed[i],       // invertida: rotação 180°
            fc: d.fc,                // GUIA: inalterado
        }))
    }

    return manchaData
}
