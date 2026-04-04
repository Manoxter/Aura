/**
 * extractors.test.ts — Story TEST-COVERAGE
 * Testa deterministicExtractor e wbsExtractor sem dependências externas.
 */

import { describe, it, expect } from 'vitest'
import { deterministicExtractor, wbsExtractor } from './extractors'

// ─── deterministicExtractor ──────────────────────────────────────────────────

describe('deterministicExtractor()', () => {
    describe('orçamento', () => {
        it('extrai valor com keyword de baseline (custo estimado)', () => {
            const result = deterministicExtractor('Custo Estimado: R$ 2.500.000')
            expect(result.orcamento).toBe(2500000)
        })

        it('extrai valor com keyword orçamento total', () => {
            const result = deterministicExtractor('Orçamento Total: R$ 1.200.000,00')
            expect(result.orcamento).toBe(1200000)
        })

        it('fallback para valor monetário quando não há keyword de baseline', () => {
            const result = deterministicExtractor('Investimento de R$ 500.000 aprovado.')
            expect(result.orcamento).toBe(500000)
        })

        it('ignora linha com "teto" ao calcular fallback', () => {
            const text = 'Teto da verba: R$ 99.000\nInvestimento: R$ 800.000'
            const result = deterministicExtractor(text)
            expect(result.orcamento).toBe(800000)
        })

        it('ignora linha com "contingência" ao calcular fallback', () => {
            const text = 'Contingência: R$ 50.000\nInvestimento: R$ 300.000'
            const result = deterministicExtractor(text)
            expect(result.orcamento).toBe(300000)
        })

        it('retorna 0 quando não há nenhum valor monetário', () => {
            const result = deterministicExtractor('Projeto sem valores definidos.')
            expect(result.orcamento).toBe(0)
        })

        it('prefere keyword de baseline sobre valor maior sem keyword', () => {
            const text = 'Custo estimado: R$ 1.000.000\nValor total do edital: R$ 9.999.999'
            const result = deterministicExtractor(text)
            expect(result.orcamento).toBe(1000000)
        })
    })

    describe('prazo', () => {
        it('extrai prazo em dias com keyword "prazo:"', () => {
            const result = deterministicExtractor('Prazo: 180 dias')
            expect(result.prazo).toBe(180)
        })

        it('extrai prazo em meses e converte para dias (×30)', () => {
            const result = deterministicExtractor('Duração: 6 meses')
            expect(result.prazo).toBe(180)
        })

        it('extrai prazo em anos e converte para dias (×365)', () => {
            const result = deterministicExtractor('durante os 7 anos de obra')
            expect(result.prazo).toBe(2555)
        })

        it('extrai prazo com padrão "N dias de projeto"', () => {
            const result = deterministicExtractor('90 dias de execução')
            expect(result.prazo).toBe(90)
        })

        it('usa marcos de anos como fallback quando sem keyword de prazo', () => {
            const text = 'M1 2024: Início\nM2 2026: Entrega Final'
            const result = deterministicExtractor(text)
            expect(result.prazo).toBe(730) // 2 anos × 365
        })

        it('retorna 0 quando não há prazo identificável', () => {
            const result = deterministicExtractor('Projeto sem data definida.')
            expect(result.prazo).toBe(0)
        })
    })

    describe('nome', () => {
        it('extrai nome após keyword "projeto:"', () => {
            const result = deterministicExtractor('Projeto: Construção da Ponte\nOutras info')
            expect(result.nome).toBe('Construção da Ponte')
        })

        it('extrai nome da primeira linha curta quando sem keyword', () => {
            const result = deterministicExtractor('Implantação Fibra Óptica\nOrçamento: R$ 500.000')
            expect(result.nome).toBe('Implantação Fibra Óptica')
        })

        it('não extrai nome de primeira linha longa (>50 chars) sem keyword', () => {
            // Linha longa sem keywords "projeto"/"nome" — não deve ser extraída como nome
            const longLine = 'Esta é uma linha muito longa e descritiva que ultrapassa cinquenta caracteres ao todo'
            const result = deterministicExtractor(longLine)
            expect(result.nome).toBe('')
        })
    })

    describe('texto vazio / edge cases', () => {
        it('retorna zeros e string vazia para texto vazio', () => {
            const result = deterministicExtractor('')
            expect(result).toEqual({ orcamento: 0, prazo: 0, nome: '' })
        })

        it('normaliza espaço não-quebrável (U+00A0)', () => {
            const text = 'Custo\u00A0Estimado:\u00A0R$\u00A01.000.000'
            const result = deterministicExtractor(text)
            expect(result.orcamento).toBe(1000000)
        })
    })
})

// ─── wbsExtractor ────────────────────────────────────────────────────────────

describe('wbsExtractor()', () => {
    it('retorna array vazio para texto vazio', () => {
        expect(wbsExtractor('')).toEqual([])
    })

    it('cria nó raiz de nível 1 para linha simples', () => {
        const nodes = wbsExtractor('Fase 1')
        expect(nodes).toHaveLength(1)
        expect(nodes[0].nivel).toBe(1)
        expect(nodes[0].pai_id).toBeNull()
    })

    it('detecta hierarquia por numeração PMBOK (1.1 → filho de 1)', () => {
        const text = '1. Planejamento\n1.1 Kickoff\n1.2 Análise'
        const nodes = wbsExtractor(text)
        const root = nodes.find(n => n.nivel === 1)!
        const children = nodes.filter(n => n.nivel === 2)
        expect(root).toBeDefined()
        expect(children).toHaveLength(2)
        children.forEach(c => expect(c.pai_id).toBe(root.id))
    })

    it('detecta hierarquia de 3 níveis (1.1.1)', () => {
        const text = '1. Fase\n1.1 Subfase\n1.1.1 Atividade'
        const nodes = wbsExtractor(text)
        expect(nodes[0].nivel).toBe(1)
        expect(nodes[1].nivel).toBe(2)
        expect(nodes[2].nivel).toBe(3)
        expect(nodes[1].pai_id).toBe(nodes[0].id)
        expect(nodes[2].pai_id).toBe(nodes[1].id)
    })

    it('detecta hierarquia por indentação (2 espaços = 1 nível)', () => {
        const text = 'Raiz\n  Filho\n    Neto'
        const nodes = wbsExtractor(text)
        expect(nodes[0].nivel).toBe(1)
        expect(nodes[1].nivel).toBe(2)
        expect(nodes[2].nivel).toBe(3)
        expect(nodes[1].pai_id).toBe(nodes[0].id)
        expect(nodes[2].pai_id).toBe(nodes[1].id)
    })

    it('remove prefixo PMBOK do nome do nó', () => {
        const nodes = wbsExtractor('1.1 Kickoff Meeting')
        expect(nodes[0].nome).toBe('Kickoff Meeting')
    })

    it('extrai duração "(5d)" do nome da linha', () => {
        const nodes = wbsExtractor('1.1 Fundação (5d)')
        expect(nodes[0].duracao).toBe(5)
    })

    it('extrai duração "10 dias" do nome da linha', () => {
        const nodes = wbsExtractor('Escavação 10 dias')
        expect(nodes[0].duracao).toBe(10)
    })

    it('filtra linhas de orçamento (não-WBS)', () => {
        const text = 'R$ 1.000.000\n1. Fase Real'
        const nodes = wbsExtractor(text)
        expect(nodes.every(n => !n.nome.startsWith('R$'))).toBe(true)
    })

    it('filtra linhas de justificativa/objetivo (não-WBS)', () => {
        const text = 'Justificativa: economizar tempo\n1. Tarefa'
        const nodes = wbsExtractor(text)
        expect(nodes.every(n => !n.nome.startsWith('Justificativa'))).toBe(true)
    })

    it('filtra separadores horizontais (---)', () => {
        const text = '1. Fase\n---\n1.1 Subfase'
        const nodes = wbsExtractor(text)
        expect(nodes.every(n => n.nome !== '---')).toBe(true)
    })

    it('todos os nós têm IDs únicos', () => {
        const text = '1. A\n1.1 B\n1.2 C\n2. D'
        const nodes = wbsExtractor(text)
        const ids = nodes.map(n => n.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('nó irmão não é filho do anterior (mesmo nível)', () => {
        const text = '1. A\n2. B'
        const nodes = wbsExtractor(text)
        expect(nodes[0].pai_id).toBeNull()
        expect(nodes[1].pai_id).toBeNull()
    })
})
