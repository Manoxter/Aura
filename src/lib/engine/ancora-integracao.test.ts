/**
 * Teste de integração: Âncora Semântica no pipeline gerarTrianguloCDT.
 *
 * Valida que quando ENABLE_ANCORA_SEMANTICA=true, as grandezas SSS
 * (lados, área, protocolo, NVO) são idênticas à construção clássica.
 * As posições dos vértices MUDAM (esperado — âncora diferente).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { gerarTrianguloCDT } from './math'
import type { CDTResult } from './math'
import * as flagsModule from './types-sessao29'

// Curvas de teste realistas
const curvaCusto = Array.from({ length: 50 }, (_, i) => ({
    x: i * 2, y: i * i * 40, // custo acumulado quadrático
}))
const curvaPrazo = Array.from({ length: 50 }, (_, i) => ({
    x: i * 2, y: 100 - i * 2, // burndown linear
}))

const baseInput = {
    curvaCusto,
    curvaPrazo,
    diaAtual: 50,
    prazoBase: 100,
    orcamentoBase: 100000,
    nTarefasAtual: 15,
    nTarefasBaseline: 15,
}

describe('Integração Âncora Semântica — Congruência SSS', () => {
    let resultClassico: CDTResult
    let resultAncora: CDTResult

    beforeEach(() => {
        // 1. Gerar com flag OFF (clássico)
        const savedFlag = flagsModule.FEATURE_FLAGS_DEFAULT.ENABLE_ANCORA_SEMANTICA
        flagsModule.FEATURE_FLAGS_DEFAULT.ENABLE_ANCORA_SEMANTICA = false
        resultClassico = gerarTrianguloCDT(baseInput)

        // 2. Gerar com flag ON (âncora semântica)
        flagsModule.FEATURE_FLAGS_DEFAULT.ENABLE_ANCORA_SEMANTICA = true
        resultAncora = gerarTrianguloCDT(baseInput)

        // 3. Restaurar flag
        flagsModule.FEATURE_FLAGS_DEFAULT.ENABLE_ANCORA_SEMANTICA = savedFlag
    })

    it('lados normalizados são IDÊNTICOS (SSS)', () => {
        expect(resultAncora.lados.escopo).toBeCloseTo(resultClassico.lados.escopo, 8)
        expect(resultAncora.lados.orcamento).toBeCloseTo(resultClassico.lados.orcamento, 8)
        expect(resultAncora.lados.prazo).toBeCloseTo(resultClassico.lados.prazo, 8)
    })

    it('lados brutos são IDÊNTICOS', () => {
        expect(resultAncora.lados_brutos.E).toBeCloseTo(resultClassico.lados_brutos.E, 8)
        expect(resultAncora.lados_brutos.C).toBeCloseTo(resultClassico.lados_brutos.C, 8)
        expect(resultAncora.lados_brutos.P).toBeCloseTo(resultClassico.lados_brutos.P, 8)
    })

    it('área do triângulo é IDÊNTICA (Heron invariante)', () => {
        expect(resultAncora.cdt_area).toBeCloseTo(resultClassico.cdt_area, 6)
    })

    it('protocolo é IDÊNTICO', () => {
        expect(resultAncora.protocolo).toBe(resultClassico.protocolo)
    })

    it('forma_triangulo é IDÊNTICA', () => {
        expect(resultAncora.forma_triangulo).toBe(resultClassico.forma_triangulo)
    })

    it('CEt dupla é IDÊNTICA', () => {
        expect(resultAncora.cet_dupla.valid).toBe(resultClassico.cet_dupla.valid)
    })

    it('zona MATED é IDÊNTICA', () => {
        expect(resultAncora.zona_mated).toBe(resultClassico.zona_mated)
    })

    it('NVO nível é IDÊNTICO', () => {
        expect(resultAncora.nvo_nivel).toBe(resultClassico.nvo_nivel)
    })

    it('NVO tipo é IDÊNTICO', () => {
        expect(resultAncora.nvo_tipo).toBe(resultClassico.nvo_tipo)
    })

    it('desvio_qualidade é IDÊNTICO', () => {
        // Pode ser null se não há baseline
        expect(resultAncora.desvio_qualidade).toBe(resultClassico.desvio_qualidade)
    })

    it('R² custo é IDÊNTICO', () => {
        expect(resultAncora.r2_custo).toBeCloseTo(resultClassico.r2_custo ?? 0, 8)
    })

    it('R² prazo é IDÊNTICO', () => {
        expect(resultAncora.r2_prazo).toBeCloseTo(resultClassico.r2_prazo ?? 0, 8)
    })

    it('A_mancha é IDÊNTICA', () => {
        if (resultClassico.a_mancha != null) {
            expect(resultAncora.a_mancha).toBeCloseTo(resultClassico.a_mancha, 6)
        }
    })

    it('pre_classificacao_disc é IDÊNTICO', () => {
        expect(resultAncora.pre_classificacao_disc).toBeCloseTo(
            resultClassico.pre_classificacao_disc ?? 0, 8
        )
    })

    // Vértices PODEM mudar — isso é o esperado
    it('vértices PODEM diferir (âncora diferente é esperado)', () => {
        // Se o protocolo é agudo, a âncora muda de alpha_A para epsilon
        // Os vértices terão coordenadas diferentes, mas o triângulo é congruente
        if (resultClassico.protocolo === 'agudo') {
            // Os lados entre os vértices devem ser os mesmos
            const distAB_classico = Math.sqrt(
                (resultClassico.B[0] - resultClassico.A[0]) ** 2 +
                (resultClassico.B[1] - resultClassico.A[1]) ** 2
            )
            const distAB_ancora = Math.sqrt(
                (resultAncora.B[0] - resultAncora.A[0]) ** 2 +
                (resultAncora.B[1] - resultAncora.A[1]) ** 2
            )
            // Ambos produzem um dos lados {E, C, P} — pode ser um diferente
            // mas DEVE ser um dos 3 valores
            const lados = [
                resultClassico.lados.escopo,
                resultClassico.lados.orcamento,
                resultClassico.lados.prazo,
            ]
            const minDiffClassico = Math.min(...lados.map(l => Math.abs(distAB_classico - l)))
            const minDiffAncora = Math.min(...lados.map(l => Math.abs(distAB_ancora - l)))
            expect(minDiffClassico).toBeLessThan(0.01)
            expect(minDiffAncora).toBeLessThan(0.01)
        }
    })
})
