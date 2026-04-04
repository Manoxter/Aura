/**
 * Aura — Testes de Integração: Fluxo TAP → EAP → CPM → Motor CDT
 *
 * Cobre o pipeline completo de dados de um projeto real:
 *   1. Extração de dados da TAP (deterministicExtractor)
 *   2. Parsing de EAP/WBS (wbsExtractor) — incluindo rejeição de tabelas
 *   3. Cálculo CPM — forwardPass + backwardPass (ES/EF/LS/LF, caminho crítico)
 *   4. Geração do triângulo CDT (gerarTrianguloCDT)
 *   5. Integração completa: TAP → CPM → CDT
 *
 * @squad aura-math, aura-production
 * @sprint 4.8
 */

import { describe, it, expect } from 'vitest'
import { deterministicExtractor, wbsExtractor } from './extractors'
import { forwardPass, backwardPass, gerarTrianguloCDT } from './math'
import type { Tarefa } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTarefa(overrides: Partial<Tarefa> & { id: string; duracao_estimada: number }): Tarefa {
    return {
        projeto_id: 'proj-test',
        tenant_id: 'tenant-test',
        nome: overrides.id,
        ordem: null,
        duracao_realizada: null,
        es: null,
        ef: null,
        ls: null,
        lf: null,
        folga_total: null,
        folga_livre: null,
        no_caminho_critico: false,
        status: 'planejado',
        data_inicio_real: null,
        data_fim_real: null,
        predecessoras: null,
        concluida: false,
        ...overrides,
    }
}

// ─── TAP EXTRAÇÃO ─────────────────────────────────────────────────────────────

describe('deterministicExtractor — TAP parsing', () => {
    it('extrai orçamento base e prazo de TAP típica', () => {
        const tap = `
Projeto: Construção do Viaduto Norte
Orçamento Base: R$ 12.500.000,00
Prazo: 24 meses
Responsável: Engenharia Municipal
        `
        const result = deterministicExtractor(tap)
        expect(result.orcamento).toBe(12_500_000)
        expect(result.prazo).toBe(720) // 24 * 30
        expect(result.nome).toMatch(/Construção|Viaduto/)
    })

    it('extrai prazo em anos e converte para dias', () => {
        const tap = `
Projeto: Ampliação do Porto
Orçamento Total: R$ 85.000.000,00
Duração: 3 anos
        `
        const result = deterministicExtractor(tap)
        expect(result.prazo).toBe(1095) // 3 * 365
        expect(result.orcamento).toBe(85_000_000)
    })

    it('ignora linhas de contingência ao extrair orçamento', () => {
        const tap = `
Projeto: Pavimentação SP-330
Orçamento Base: R$ 5.200.000,00
Contingência: R$ 520.000,00
Reserva de Teto: R$ 600.000,00
Prazo: 180 dias
        `
        const result = deterministicExtractor(tap)
        // Deve pegar 5.200.000 (baseline), não contingência/teto
        expect(result.orcamento).toBe(5_200_000)
        expect(result.prazo).toBe(180)
    })

    it('retorna zeros para TAP vazia', () => {
        const result = deterministicExtractor('')
        expect(result.orcamento).toBe(0)
        expect(result.prazo).toBe(0)
        expect(result.nome).toBe('')
    })
})

// ─── EAP / WBS EXTRAÇÃO ──────────────────────────────────────────────────────

describe('wbsExtractor — EAP parsing', () => {
    it('extrai hierarquia de 3 níveis sem incluir metadados TAP como tarefas', () => {
        const eap = `
1. Infraestrutura
1.1 Fundação
1.1.1 Escavação
1.1.2 Concretagem
1.2 Estrutura Metálica
2. Instalações
2.1 Hidráulica
2.2 Elétrica
        `
        const nodes = wbsExtractor(eap)
        const nomes = nodes.map(n => n.nome)
        expect(nomes).not.toContain('Projeto:')
        expect(nomes).not.toContain('Orçamento Base:')
        // Nós devem ter hierarquia correta
        const nivel3 = nodes.filter(n => n.nivel === 3)
        expect(nivel3.length).toBe(2) // Escavação, Concretagem
    })

    it('NÃO trata linhas com separadores de tabela como tarefas', () => {
        const eapComTabela = `
1. Escopo Principal
1.1 Pacote A
| Código | Nome | Duração |
|--------|------|---------|
| T01    | Estacas | 10d  |
1.2 Pacote B
        `
        const nodes = wbsExtractor(eapComTabela)
        const nomesInvalidos = nodes.map(n => n.nome).filter(n =>
            n.includes('|') || n.startsWith('Código') || n.startsWith('---')
        )
        expect(nomesInvalidos).toHaveLength(0)
    })

    it('extrai duração inline quando presente (formato 10d)', () => {
        const eap = `
1. Fundação (15d)
1.1 Escavação (5d)
1.2 Concretagem (10d)
        `
        const nodes = wbsExtractor(eap)
        const escavacao = nodes.find(n => n.nome.includes('Escavação'))
        expect(escavacao?.duracao).toBe(5)
    })

    it('remove prefixos numéricos PMBOK do nome', () => {
        const eap = `1.1.1 Mobilização de Equipamentos`
        const nodes = wbsExtractor(eap)
        expect(nodes[0].nome).toBe('Mobilização de Equipamentos')
    })

    it('funciona com indentação em vez de numeração', () => {
        const eap = `
Fase 1
  Atividade A
    Sub-atividade A1
  Atividade B
Fase 2
        `
        const nodes = wbsExtractor(eap)
        expect(nodes.find(n => n.nome === 'Fase 1')?.nivel).toBe(1)
        expect(nodes.find(n => n.nome === 'Atividade A')?.nivel).toBe(2)
        expect(nodes.find(n => n.nome === 'Sub-atividade A1')?.nivel).toBe(3)
    })
})

// ─── CPM: forwardPass + backwardPass ─────────────────────────────────────────

describe('forwardPass + backwardPass — CPM engine', () => {
    it('rede linear A→B→C: ES/EF/LS/LF corretos e todas críticas', () => {
        const A = makeTarefa({ id: 'A', duracao_estimada: 5, ordem: 1, predecessoras: [] })
        const B = makeTarefa({ id: 'B', duracao_estimada: 3, ordem: 2, predecessoras: ['A'] })
        const C = makeTarefa({ id: 'C', duracao_estimada: 4, ordem: 3, predecessoras: ['B'] })

        const forward = forwardPass([A, B, C])
        const result = backwardPass(forward)

        const a = result.find(t => t.id === 'A')!
        const b = result.find(t => t.id === 'B')!
        const c = result.find(t => t.id === 'C')!

        expect(a.es).toBe(0);  expect(a.ef).toBe(5)
        expect(b.es).toBe(5);  expect(b.ef).toBe(8)
        expect(c.es).toBe(8);  expect(c.ef).toBe(12)

        // LS/LF
        expect(c.lf).toBe(12); expect(c.ls).toBe(8)
        expect(b.lf).toBe(8);  expect(b.ls).toBe(5)
        expect(a.lf).toBe(5);  expect(a.ls).toBe(0)

        // Folga zero = todas críticas
        expect(a.folga_total).toBe(0)
        expect(b.folga_total).toBe(0)
        expect(c.folga_total).toBe(0)
        expect(a.no_caminho_critico).toBe(true)
    })

    it('rede paralela: apenas o caminho mais longo é crítico', () => {
        // A(5) → C(4)
        // B(3) → C(4)
        // Caminho crítico: A→C (duração 9). B tem folga 2.
        const A = makeTarefa({ id: 'A', duracao_estimada: 5, ordem: 1, predecessoras: [] })
        const B = makeTarefa({ id: 'B', duracao_estimada: 3, ordem: 2, predecessoras: [] })
        const C = makeTarefa({ id: 'C', duracao_estimada: 4, ordem: 3, predecessoras: ['A', 'B'] })

        const result = backwardPass(forwardPass([A, B, C]))

        const a = result.find(t => t.id === 'A')!
        const b = result.find(t => t.id === 'B')!
        const c = result.find(t => t.id === 'C')!

        expect(c.ef).toBe(9) // projeto dura 9 dias
        expect(a.no_caminho_critico).toBe(true)
        expect(b.no_caminho_critico).toBe(false)
        expect(b.folga_total).toBe(2) // B pode atrasar 2 dias
        expect(c.no_caminho_critico).toBe(true)
    })

    it('rede sem predecessoras: todas as tarefas iniciam no dia 0', () => {
        const A = makeTarefa({ id: 'A', duracao_estimada: 10, ordem: 1, predecessoras: [] })
        const B = makeTarefa({ id: 'B', duracao_estimada: 7, ordem: 2, predecessoras: [] })

        const result = backwardPass(forwardPass([A, B]))

        expect(result.find(t => t.id === 'A')!.es).toBe(0)
        expect(result.find(t => t.id === 'B')!.es).toBe(0)
    })

    it('Aura desempate: entre caminhos críticos iguais, o de maior tarefa individual é soberano', () => {
        // Caminho 1: A(5) → C(3) = 8d
        // Caminho 2: B(5) → D(3) = 8d — ambos críticos
        // B tem maior tarefa (B=5 = A=5, mas D=3 = C=3) — empate total, deve escolher qualquer
        const A = makeTarefa({ id: 'A', duracao_estimada: 5, ordem: 1, predecessoras: [] })
        const B = makeTarefa({ id: 'B', duracao_estimada: 5, ordem: 2, predecessoras: [] })
        const C = makeTarefa({ id: 'C', duracao_estimada: 3, ordem: 3, predecessoras: ['A'] })
        const D = makeTarefa({ id: 'D', duracao_estimada: 3, ordem: 4, predecessoras: ['B'] })

        const result = backwardPass(forwardPass([A, B, C, D]))
        const criticas = result.filter(t => t.no_caminho_critico)
        // Todas devem ser críticas (2 caminhos paralelos com mesma duração)
        expect(criticas.length).toBe(4)
    })
})

// ─── CDT: gerarTrianguloCDT ──────────────────────────────────────────────────

describe('gerarTrianguloCDT — Motor CDT v2', () => {
    // Curvas sintéticas de um projeto simples de 100 dias / R$100.000
    const curvaCusto = [
        { x: 0, y: 0 },
        { x: 25, y: 20000 },
        { x: 50, y: 50000 },
        { x: 75, y: 80000 },
        { x: 100, y: 100000 },
    ]
    const curvaPrazo = [
        { x: 0, y: 0 },
        { x: 25, y: 25 },
        { x: 50, y: 50 },
        { x: 75, y: 75 },
        { x: 100, y: 100 },
    ]

    it('gera triângulo CDT com vertices A, B, C válidos', () => {
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(result.A).toHaveLength(2)
        expect(result.B).toHaveLength(2)
        expect(result.C).toHaveLength(2)
        expect(result.cdt_area).toBeGreaterThanOrEqual(0)
    })

    it('CEt válida para projeto sem desvios (dia 0)', () => {
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        // cet está em result.cet.valida conforme CDTResult
        expect(result.cet).toBeDefined()
        expect(typeof result.cet.valida).toBe('boolean')
    })

    it('zona_mated é uma string válida', () => {
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(['OTIMO', 'SEGURO', 'RISCO', 'CRISE']).toContain(result.zona_mated)
    })

    it('desvio_qualidade é null sem areaBaseline, e 100% quando baseline = area atual', () => {
        const r1 = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        // Sem areaBaseline fornecida → null (normal no dia 0 sem histórico)
        expect(r1.desvio_qualidade).toBeNull()

        // Com areaBaseline = área atual → desvio = 100% (sem desvio)
        const area = r1.cdt_area
        const r2 = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, areaBaseline: area })
        expect(r2.desvio_qualidade).toBeCloseTo(100, 0)
    })
})

// ─── INTEGRAÇÃO: TAP → CPM → CDT ────────────────────────────────────────────

describe('Fluxo integrado TAP → CPM → CDT', () => {
    it('extrai TAP, calcula CPM, gera CDT e produz projeto válido', () => {
        // 1. TAP
        const tapText = `
Projeto: Estação de Tratamento de Água Norte
Orçamento Base: R$ 8.000.000,00
Prazo: 12 meses
        `
        const tap = deterministicExtractor(tapText)
        expect(tap.orcamento).toBe(8_000_000)
        expect(tap.prazo).toBe(360)

        // 2. CPM — 4 tarefas com dependências em série/paralelo
        const T1 = makeTarefa({ id: 'T1', nome: 'Fundação', duracao_estimada: 60, ordem: 1, predecessoras: [] })
        const T2 = makeTarefa({ id: 'T2', nome: 'Estrutura', duracao_estimada: 90, ordem: 2, predecessoras: ['T1'] })
        const T3 = makeTarefa({ id: 'T3', nome: 'Hidráulica', duracao_estimada: 45, ordem: 3, predecessoras: ['T1'] })
        const T4 = makeTarefa({ id: 'T4', nome: 'Acabamento', duracao_estimada: 30, ordem: 4, predecessoras: ['T2', 'T3'] })

        const cpm = backwardPass(forwardPass([T1, T2, T3, T4]))

        const duracaoTotal = Math.max(...cpm.map(t => t.ef || 0))
        expect(duracaoTotal).toBe(180) // T1(60) + T2(90) + T4(30) = 180

        const t2 = cpm.find(t => t.id === 'T2')!
        const t3 = cpm.find(t => t.id === 'T3')!
        expect(t2.no_caminho_critico).toBe(true)
        expect(t3.no_caminho_critico).toBe(false) // T3 tem folga 45d (90-45)
        expect(t3.folga_total).toBe(45)

        // 3. CDT — projeta curvas sintéticas a partir dos dados CPM
        // CPM retorna tarefas em ordem topológica (não necessariamente por EF).
        // Ordenar por EF crescente antes de construir curvas cumulativas para CDT.
        const prazoBase = tap.prazo // 360 dias (projeto)
        const cpmSorted = [...cpm].sort((a, b) => (a.ef || 0) - (b.ef || 0))
        const curvaCusto = [
            { x: 0, y: 0 },
            ...cpmSorted.map((t, i) => ({
                x: t.ef || 0,
                y: (tap.orcamento / cpm.length) * (i + 1)
            }))
        ]
        const curvaPrazo = [
            { x: 0, y: 0 },
            ...cpmSorted.map(t => ({
                x: t.ef || 0,
                y: ((t.ef || 0) / prazoBase) * 100
            }))
        ]

        const cdt = gerarTrianguloCDT({
            curvaCusto,
            curvaPrazo,
            diaAtual: 0,
            diaBaseline: 0,
        })

        expect(cdt.A).toHaveLength(2)
        expect(cdt.cdt_area).toBeGreaterThan(0)
        expect(cdt.cet).toBeDefined()
        expect(typeof cdt.cet.valida).toBe('boolean')
    })

    it('EAP com tabela embutida: tabela não vira tarefa no CPM', () => {
        const eapComTabela = `
1. Terraplenagem
1.1 Corte de Solo
1.2 Aterro Compactado

| Recurso | Unidade | Qtd |
|---------|---------|-----|
| Trator  | h/m     | 200 |

2. Pavimentação
2.1 Base Granular
2.2 Revestimento Asfáltico
        `

        const nodes = wbsExtractor(eapComTabela)

        // Nenhum nó deve ter nome contendo pipe ou traços de tabela
        nodes.forEach(n => {
            expect(n.nome).not.toMatch(/\|/)
            expect(n.nome).not.toMatch(/^-+$/)
            expect(n.nome).not.toMatch(/^Recurso/)
        })

        // Apenas os pacotes legítimos devem aparecer
        const nomesLegitimos = ['Terraplenagem', 'Corte de Solo', 'Aterro Compactado', 'Pavimentação', 'Base Granular', 'Revestimento Asfáltico']
        const nomesExtraidos = nodes.map(n => n.nome)
        nomesLegitimos.forEach(nome => {
            expect(nomesExtraidos).toContain(nome)
        })
    })
})
