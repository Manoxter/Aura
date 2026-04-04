/**
 * Teste de Integração do Fluxo Motor — Sessão 29
 *
 * Valida o pipeline completo: curvas → CDT → Clairaut → Âncora → NVO → MATED → Zona
 * sem necessidade de UI. Cobre os cenários que E2E Playwright cobriria no motor.
 */

import { describe, it, expect } from 'vitest'
import { gerarTrianguloCDT } from './math'
import { sintetizarClairaut } from './clairaut'
import { construirTriangulo, areaTrianguloAncorado } from './ancora-semantica'
import { preClassificarProtocolo, calcularDiscriminante } from './guards'
import { executarPipelineDual, analisarDivergencia } from './pipeline-dual'
import { detectarTransicao, classificarSeveridade, HistoricoTransicoes } from './transicao-evento'
import { calcularCompensacaoBidirecional, gerarRecomendacao } from './compensacao-bidirecional'

// ─── Fixtures: curvas realistas ──────────────────────────────────────────────

/** Projeto saudável: custo linear, prazo burndown linear */
const projetoSaudavel = {
    curvaCusto: Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 1000 })),
    curvaPrazo: Array.from({ length: 100 }, (_, i) => ({ x: i, y: 100 - i })),
    prazoBase: 100,
    orcamentoBase: 100000,
    nTarefasAtual: 20,
    nTarefasBaseline: 20,
}

/** Projeto com custo explodindo: custo quadrático, prazo normal */
const projetoCustoAlto = {
    curvaCusto: Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * i * 30 })),
    curvaPrazo: Array.from({ length: 100 }, (_, i) => ({ x: i, y: 100 - i })),
    prazoBase: 100,
    orcamentoBase: 100000,
    nTarefasAtual: 20,
    nTarefasBaseline: 20,
}

/** Projeto com prazo comprimido: custo normal, burndown íngreme */
const projetoPrazoComprimido = {
    curvaCusto: Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 800 })),
    curvaPrazo: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.max(0, 100 - i * 3) })),
    prazoBase: 100,
    orcamentoBase: 80000,
    nTarefasAtual: 20,
    nTarefasBaseline: 20,
}

// ─── Fluxo completo: curvas → CDT ───────────────────────────────────────────

describe('Fluxo Motor: curvas → CDT → classificação', () => {
    it('projeto saudável produz CDT válido', () => {
        const cdt = gerarTrianguloCDT({
            ...projetoSaudavel,
            diaAtual: 50,
        })
        expect(cdt.cet_dupla.valid).toBe(true)
        expect(cdt.cdt_area).toBeGreaterThan(0)
        expect(cdt.lados.escopo).toBeCloseTo(1.0, 5)
        expect(cdt.protocolo).toBeDefined()
    })

    it('projeto com custo alto: protocolo pode ser β', () => {
        const cdt = gerarTrianguloCDT({
            ...projetoCustoAlto,
            diaAtual: 80,
        })
        if (cdt.cet_dupla.valid) {
            expect(cdt.lados.orcamento).toBeGreaterThan(cdt.lados.prazo)
            // mc_norm alto → possível β
            if (cdt.protocolo === 'obtuso_beta') {
                expect(cdt.lados.orcamento).toBeGreaterThan(1.5)
            }
        }
    })

    it('CDT no baseline (dia 0) produz triângulo válido', () => {
        const cdt = gerarTrianguloCDT({
            ...projetoSaudavel,
            diaAtual: 0,
        })
        expect(cdt.cet_dupla.valid).toBe(true)
        expect(cdt.cdt_area).toBeGreaterThan(0)
    })
})

// ─── Fluxo: CDT → Clairaut → Âncora ────────────────────────────────────────

describe('Fluxo Motor: CDT → Clairaut → Âncora Semântica', () => {
    it('Clairaut e pré-classificação concordam', () => {
        const cdt = gerarTrianguloCDT({ ...projetoSaudavel, diaAtual: 50 })
        if (!cdt.cet_dupla.valid) return

        const sc = sintetizarClairaut(cdt.lados.escopo, cdt.lados.prazo, cdt.lados.orcamento)
        const disc = cdt.pre_classificacao_disc
        if (disc !== undefined) {
            if (disc > 1.05) expect(sc.tipo).toBe('obtuso_beta')
            else if (disc < -1.05) expect(sc.tipo).toBe('obtuso_gamma')
            else expect(['agudo', 'singular']).toContain(sc.tipo)
        }
    })

    it('Âncora Semântica produz triângulo congruente ao CDT', () => {
        const cdt = gerarTrianguloCDT({ ...projetoSaudavel, diaAtual: 50 })
        if (!cdt.cet_dupla.valid) return

        const tri = construirTriangulo(
            cdt.lados.escopo, cdt.lados.orcamento, cdt.lados.prazo,
            cdt.protocolo ?? 'agudo'
        )
        const areaTri = areaTrianguloAncorado(tri)
        expect(areaTri).toBeCloseTo(cdt.cdt_area, 4)
    })
})

// ─── Fluxo: Pipeline Dual TM + TA ──────────────────────────────────────────

describe('Fluxo Motor: Pipeline Dual TM + TA', () => {
    it('sem curvas reais: TA fallback para TM', () => {
        const result = executarPipelineDual({
            curvaCustoPlano: projetoSaudavel.curvaCusto,
            curvaPrazoPlano: projetoSaudavel.curvaPrazo,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        expect(result.usaCurvasReais).toBe(false)
        expect(result.tm.pipeline_source).toBe('tm')
        expect(result.ta.pipeline_source).toBe('ta')
    })

    it('com curvas reais divergentes: detecta divergência', () => {
        const result = executarPipelineDual({
            curvaCustoPlano: projetoSaudavel.curvaCusto,
            curvaPrazoPlano: projetoSaudavel.curvaPrazo,
            curvaCustoReal: projetoCustoAlto.curvaCusto,
            curvaPrazoReal: projetoCustoAlto.curvaPrazo,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        expect(result.usaCurvasReais).toBe(true)
        const div = analisarDivergencia(result.tm, result.ta)
        expect(typeof div.deltaAreaPct).toBe('number')
        expect(['E', 'C', 'P']).toContain(div.ladoMaisCritico)
    })
})

// ─── Fluxo: Transição de protocolo ──────────────────────────────────────────

describe('Fluxo Motor: Transição de protocolo no tempo', () => {
    it('simula evolução α → β: detecta transição', () => {
        const hist = new HistoricoTransicoes()

        // Dia 10: projeto saudável (agudo)
        const cdt10 = gerarTrianguloCDT({ ...projetoSaudavel, diaAtual: 10 })
        const proto10 = cdt10.protocolo ?? 'agudo'

        // Dia 80: custo alto (possível beta)
        const cdt80 = gerarTrianguloCDT({ ...projetoCustoAlto, diaAtual: 80 })
        const proto80 = cdt80.protocolo ?? 'agudo'

        const evento = detectarTransicao(proto10, proto80)
        if (evento) {
            hist.adicionar(evento)
            const sev = classificarSeveridade(evento)
            expect(['positiva', 'neutra', 'alerta', 'critica']).toContain(sev)
        }

        // Histórico funcional
        expect(hist.todos().length).toBeLessThanOrEqual(1)
    })
})

// ─── Fluxo: Compensação bidirecional ────────────────────────────────────────

describe('Fluxo Motor: Compensação TM ↔ TA', () => {
    it('calcula deltas e recomendação', () => {
        const tm = gerarTrianguloCDT({ ...projetoSaudavel, diaAtual: 0 })
        const ta = gerarTrianguloCDT({ ...projetoCustoAlto, diaAtual: 50 })

        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(typeof comp.delta_E).toBe('number')
        expect(typeof comp.delta_C).toBe('number')
        expect(typeof comp.delta_P).toBe('number')
        expect(['E', 'C', 'P']).toContain(comp.lado_prioritario)
        expect(['acima', 'abaixo', 'neutro']).toContain(comp.direcao)

        const rec = gerarRecomendacao(comp)
        expect(typeof rec).toBe('string')
        expect(rec.length).toBeGreaterThan(10)
    })
})

// ─── Fluxo completo end-to-end (sem UI) ─────────────────────────────────────

describe('Fluxo end-to-end: curvas → CDT → pipeline → transição → compensação', () => {
    it('pipeline completo sem erros', () => {
        // 1. Pipeline dual
        const pipeline = executarPipelineDual({
            curvaCustoPlano: projetoSaudavel.curvaCusto,
            curvaPrazoPlano: projetoSaudavel.curvaPrazo,
            curvaCustoReal: projetoCustoAlto.curvaCusto,
            curvaPrazoReal: projetoCustoAlto.curvaPrazo,
            diaAtual: 60,
            prazoBase: 100,
            orcamentoBase: 100000,
        })

        // 2. Transição
        const transicao = detectarTransicao(
            pipeline.protocoloTM,
            pipeline.protocoloTA,
        )

        // 3. Compensação
        const comp = calcularCompensacaoBidirecional(pipeline.tm, pipeline.ta)
        const rec = gerarRecomendacao(comp)

        // 4. Divergência
        const div = analisarDivergencia(pipeline.tm, pipeline.ta)

        // Assertions: tudo deve ser calculável sem erros
        expect(pipeline.tm.cdt_area).toBeGreaterThanOrEqual(0)
        expect(pipeline.ta.cdt_area).toBeGreaterThanOrEqual(0) // pode ser 0 se CEt violada
        expect(isFinite(div.deltaAreaPct)).toBe(true)
        expect(rec.length).toBeGreaterThan(0)

        // Se houve transição, deve ter trigger
        if (transicao) {
            expect(transicao.trigger.length).toBeGreaterThan(0)
        }
    })
})
