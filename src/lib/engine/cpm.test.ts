import { describe, it, expect } from 'vitest'
import { calculateCPMLocal, findAllCriticalPaths, extractEapCode, sanitizeTaskName, buildDisplayMap, type TarefaData } from './cpm'

// ─── Fixtures ──────────────────────────────────────────────────────────────

function tarefa(overrides: Partial<TarefaData> & Pick<TarefaData, 'id' | 'duracao_estimada'>): TarefaData {
    return {
        nome: overrides.id,
        dependencias: [],
        es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false,
        ...overrides,
    }
}

// Simple linear chain: A(3) → B(5) → C(2)
const linearChain: TarefaData[] = [
    tarefa({ id: 'A', duracao_estimada: 3 }),
    tarefa({ id: 'B', duracao_estimada: 5, dependencias: ['A'] }),
    tarefa({ id: 'C', duracao_estimada: 2, dependencias: ['B'] }),
]

// Diamond: A → {B, C} → D
// Critical path: A(1) → C(5) → D(1) = 7 (B=2 has folga 3)
const diamond: TarefaData[] = [
    tarefa({ id: 'A', duracao_estimada: 1 }),
    tarefa({ id: 'B', duracao_estimada: 2, dependencias: ['A'] }),
    tarefa({ id: 'C', duracao_estimada: 5, dependencias: ['A'] }),
    tarefa({ id: 'D', duracao_estimada: 1, dependencias: ['B', 'C'] }),
]

// Parallel independent tasks: no dependencies
const parallel: TarefaData[] = [
    tarefa({ id: 'X', duracao_estimada: 4 }),
    tarefa({ id: 'Y', duracao_estimada: 6 }),
    tarefa({ id: 'Z', duracao_estimada: 3 }),
]

// Big Dig simplified: 4 phases
const bigDigSimple: TarefaData[] = [
    tarefa({ id: '1', duracao_estimada: 18, nome: 'Planejamento' }),
    tarefa({ id: '2', duracao_estimada: 36, nome: 'Infraestrutura', dependencias: ['1'] }),
    tarefa({ id: '3', duracao_estimada: 48, nome: 'Tuneis', dependencias: ['2'] }),
    tarefa({ id: '4', duracao_estimada: 12, nome: 'Mitigacao Ambiental', dependencias: ['2'] }),
    tarefa({ id: '5', duracao_estimada: 6, nome: 'Entrega', dependencias: ['3', '4'] }),
]

// ─── calculateCPMLocal ─────────────────────────────────────────────────────

describe('calculateCPMLocal', () => {
    it('retorna array vazio para entrada vazia', () => {
        expect(calculateCPMLocal([])).toEqual([])
    })

    it('calcula ES/EF corretos para cadeia linear', () => {
        const result = calculateCPMLocal(linearChain)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))

        expect(byId['A'].es).toBe(0)
        expect(byId['A'].ef).toBe(3)
        expect(byId['B'].es).toBe(3)
        expect(byId['B'].ef).toBe(8)
        expect(byId['C'].es).toBe(8)
        expect(byId['C'].ef).toBe(10)
    })

    it('calcula LS/LF/Folga corretos para cadeia linear', () => {
        const result = calculateCPMLocal(linearChain)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))

        expect(byId['A'].folga).toBe(0)
        expect(byId['B'].folga).toBe(0)
        expect(byId['C'].folga).toBe(0)
        expect(byId['A'].critica).toBe(true)
        expect(byId['B'].critica).toBe(true)
        expect(byId['C'].critica).toBe(true)
    })

    it('identifica caminho crítico correto no diamante A→{B,C}→D', () => {
        const result = calculateCPMLocal(diamond)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))

        const maxEF = Math.max(...result.map(t => t.ef))
        expect(maxEF).toBe(7)

        expect(byId['A'].critica).toBe(true)
        expect(byId['C'].critica).toBe(true)
        expect(byId['D'].critica).toBe(true)
        expect(byId['B'].critica).toBe(false)
        expect(byId['B'].folga).toBe(3)
    })

    it('tarefas paralelas sem dependências têm ES=0 e duração total = max individual', () => {
        const result = calculateCPMLocal(parallel)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))

        expect(byId['X'].es).toBe(0)
        expect(byId['Y'].es).toBe(0)
        expect(byId['Z'].es).toBe(0)

        const maxEF = Math.max(...result.map(t => t.ef))
        expect(maxEF).toBe(6)

        expect(byId['Y'].critica).toBe(true)
        expect(byId['X'].critica).toBe(false)
        expect(byId['Z'].critica).toBe(false)
    })

    it('preserva a ordem original de retorno', () => {
        const result = calculateCPMLocal(linearChain)
        expect(result.map(t => t.id)).toEqual(['A', 'B', 'C'])
    })

    it('calcula Big Dig simplificado: caminho crítico passa por tuneis', () => {
        const result = calculateCPMLocal(bigDigSimple)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))

        expect(byId['5'].ef).toBe(108)
        expect(byId['3'].critica).toBe(true)
        expect(byId['4'].critica).toBe(false)
        expect(byId['4'].folga).toBeGreaterThan(0)
    })

    it('não modifica as tarefas originais (imutabilidade)', () => {
        const original = linearChain.map(t => ({ ...t }))
        calculateCPMLocal(linearChain)
        linearChain.forEach((t, i) => {
            expect(t.es).toBe(original[i].es)
            expect(t.ef).toBe(original[i].ef)
        })
    })
})

// ─── findAllCriticalPaths ──────────────────────────────────────────────────

describe('findAllCriticalPaths', () => {
    it('retorna array vazio para lista vazia', () => {
        expect(findAllCriticalPaths([])).toEqual([])
    })

    it('retorna array vazio quando nenhuma tarefa tem ef > 0', () => {
        const uncalculated = linearChain.map(t => ({ ...t, ef: 0 }))
        expect(findAllCriticalPaths(uncalculated)).toEqual([])
    })

    it('encontra único caminho crítico em cadeia linear', () => {
        const calc = calculateCPMLocal(linearChain)
        const paths = findAllCriticalPaths(calc)

        expect(paths).toHaveLength(1)
        expect(paths[0].rank).toBe(1)
        expect(paths[0].tasks.map(t => t.id)).toEqual(['A', 'B', 'C'])
        expect(paths[0].totalDuration).toBe(10)
    })

    it('encontra 1 caminho crítico no diamante (o mais longo)', () => {
        const calc = calculateCPMLocal(diamond)
        const paths = findAllCriticalPaths(calc)

        expect(paths).toHaveLength(1)
        const ids = paths[0].tasks.map(t => t.id)
        expect(ids).toContain('A')
        expect(ids).toContain('C')
        expect(ids).toContain('D')
        expect(ids).not.toContain('B')
    })

    it('classifica por PMBOK: tarefa de maior duração individual primeiro', () => {
        const tasks: TarefaData[] = [
            tarefa({ id: 'A', duracao_estimada: 2 }),
            tarefa({ id: 'B', duracao_estimada: 2 }),
            tarefa({ id: 'C', duracao_estimada: 3, dependencias: ['A'] }),
            tarefa({ id: 'D', duracao_estimada: 4, dependencias: ['B'] }),
            tarefa({ id: 'E', duracao_estimada: 1, dependencias: ['C'] }),
            tarefa({ id: 'F', duracao_estimada: 1, dependencias: ['D'] }),
        ]
        const calc = calculateCPMLocal(tasks)
        const paths = findAllCriticalPaths(calc)

        expect(paths.length).toBeGreaterThanOrEqual(1)
        if (paths.length > 1) {
            expect(paths[0].maxTaskDuration).toBeGreaterThanOrEqual(paths[1].maxTaskDuration)
        }
    })

    it('rank 1 tem maxTaskDuration >= todos os outros', () => {
        const calc = calculateCPMLocal(bigDigSimple)
        const paths = findAllCriticalPaths(calc)

        if (paths.length > 1) {
            const rank1Max = paths[0].maxTaskDuration
            paths.slice(1).forEach(p => {
                expect(rank1Max).toBeGreaterThanOrEqual(p.maxTaskDuration)
            })
        }
    })

    it('todos os caminhos retornados são únicos', () => {
        const calc = calculateCPMLocal(bigDigSimple)
        const paths = findAllCriticalPaths(calc)

        const keys = paths.map(p => p.tasks.map(t => t.id).join('→'))
        const uniqueKeys = new Set(keys)
        expect(keys.length).toBe(uniqueKeys.size)
    })
})

// ─── extractEapCode ────────────────────────────────────────────────────────

describe('extractEapCode', () => {
    it('extrai código numérico simples', () => {
        expect(extractEapCode('1 Planejamento')).toBe('1')
    })

    it('extrai código de 2 níveis', () => {
        expect(extractEapCode('2.3 Infraestrutura Subterrânea')).toBe('2.3')
    })

    it('extrai código de 3 níveis', () => {
        expect(extractEapCode('1.1.1 Licenciamento Ambiental')).toBe('1.1.1')
    })

    it('retorna null para nome sem código', () => {
        expect(extractEapCode('Licenciamento Ambiental')).toBeNull()
    })

    it('retorna null para string vazia', () => {
        expect(extractEapCode('')).toBeNull()
    })

    it('não extrai código se não seguido de espaço', () => {
        expect(extractEapCode('1.1.1Nome')).toBeNull()
    })

    it('extrai apenas o prefixo com texto longo', () => {
        expect(extractEapCode('3.2.1 Ted Williams Tunnel — travessia do porto')).toBe('3.2.1')
    })
})

// ─── sanitizeTaskName ──────────────────────────────────────────────────────

describe('sanitizeTaskName', () => {
    it('remove valor de custo com M (milhões)', () => {
        expect(sanitizeTaskName('Escavação 18 200M  1.1')).toBe('Escavação')
    })

    it('remove valor com B (bilhões)', () => {
        expect(sanitizeTaskName('Tuneis 2.5B  2.1')).toBe('Tuneis')
    })

    it('remove valor com K (milhares)', () => {
        expect(sanitizeTaskName('Planejamento 500K')).toBe('Planejamento')
    })

    it('não modifica nome sem custo inline', () => {
        expect(sanitizeTaskName('Licenciamento Ambiental')).toBe('Licenciamento Ambiental')
    })

    it('não modifica nome vazio', () => {
        expect(sanitizeTaskName('')).toBe('')
    })

    it('preserva código EAP no início do nome', () => {
        expect(sanitizeTaskName('1.1.1 Licenciamento')).toBe('1.1.1 Licenciamento')
    })
})

// ─── buildDisplayMap ───────────────────────────────────────────────────────

describe('buildDisplayMap', () => {
    it('retorna mapa vazio para array vazio', () => {
        expect(buildDisplayMap([])).toEqual(new Map())
    })

    it('usa IDs EAP puros quando são código numérico', () => {
        const tarefas: TarefaData[] = [
            tarefa({ id: '1.1.1', duracao_estimada: 5, nome: '1.1.1 Teste' }),
            tarefa({ id: '1.1.2', duracao_estimada: 3, nome: '1.1.2 Teste' }),
        ]
        const map = buildDisplayMap(tarefas)
        expect(map.get('1.1.1')).toBe('1.1.1')
        expect(map.get('1.1.2')).toBe('1.1.2')
    })

    it('usa IDs T-prefixados hierárquicos (T1.0 style)', () => {
        const tarefas: TarefaData[] = [
            tarefa({ id: 'T1.0', duracao_estimada: 5, nome: 'Tarefa 1.0' }),
            tarefa({ id: 'T1.1', duracao_estimada: 3, nome: 'Tarefa 1.1' }),
        ]
        const map = buildDisplayMap(tarefas)
        expect(map.get('T1.0')).toBe('T1.0')
        expect(map.get('T1.1')).toBe('T1.1')
    })

    it('fallback: extrai código EAP do nome quando ID é UUID', () => {
        const tarefas: TarefaData[] = [
            tarefa({ id: 'uuid-aaa', duracao_estimada: 5, nome: '1.1.1 Licenciamento' }),
            tarefa({ id: 'uuid-bbb', duracao_estimada: 3, nome: '1.1.2 Permissões' }),
        ]
        const map = buildDisplayMap(tarefas)
        expect(map.get('uuid-aaa')).toBe('1.1.1')
        expect(map.get('uuid-bbb')).toBe('1.1.2')
    })

    it('fallback: gera T01/T02 quando nome não tem código EAP', () => {
        const tarefas: TarefaData[] = [
            tarefa({ id: 'uuid-1', duracao_estimada: 5, nome: 'Tarefa Genérica A' }),
            tarefa({ id: 'uuid-2', duracao_estimada: 3, nome: 'Tarefa Genérica B' }),
        ]
        const map = buildDisplayMap(tarefas)
        expect(map.get('uuid-1')).toBe('T01')
        expect(map.get('uuid-2')).toBe('T02')
    })

    it('zero-pad até 2 dígitos (T01 não T1)', () => {
        const tarefas = Array.from({ length: 9 }, (_, i) =>
            tarefa({ id: `id-${i}`, duracao_estimada: 1, nome: `Tarefa ${i}` })
        )
        const map = buildDisplayMap(tarefas)
        expect(map.get('id-0')).toBe('T01')
        expect(map.get('id-8')).toBe('T09')
    })
})

// ─── Integração: Big Dig fluxo completo (CPM + Display IDs) ───────────────

describe('Integração Big Dig — CPM + DisplayMap', () => {
    const bigDigTarefas: TarefaData[] = [
        tarefa({ id: 'uuid-1', duracao_estimada: 18, nome: '1 Planejamento e Aprovação' }),
        tarefa({ id: 'uuid-2', duracao_estimada: 36, nome: '2 Infraestrutura Subterrânea', dependencias: ['uuid-1'] }),
        tarefa({ id: 'uuid-3', duracao_estimada: 48, nome: '3 Túneis', dependencias: ['uuid-2'] }),
        tarefa({ id: 'uuid-4', duracao_estimada: 12, nome: '4 Pontes', dependencias: ['uuid-2'] }),
        tarefa({ id: 'uuid-5', duracao_estimada: 24, nome: '5 Mitigação Ambiental', dependencias: ['uuid-2'] }),
        tarefa({ id: 'uuid-6', duracao_estimada: 6, nome: '6 Entrega Final', dependencias: ['uuid-3', 'uuid-4', 'uuid-5'] }),
    ]

    it('duração total correta: 18+36+48+6 = 108', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const maxEF = Math.max(...result.map(t => t.ef))
        expect(maxEF).toBe(108)
    })

    it('caminho crítico passa pelos túneis (maior tarefa individual = 48d)', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const paths = findAllCriticalPaths(result)

        expect(paths.length).toBeGreaterThanOrEqual(1)
        const primaryIds = paths[0].tasks.map(t => t.id)
        expect(primaryIds).toContain('uuid-3')
        expect(paths[0].maxTaskDuration).toBe(48)
    })

    it('Pontes e Mitigação Ambiental têm folga positiva', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const byId = Object.fromEntries(result.map(t => [t.id, t]))
        expect(byId['uuid-4'].folga).toBeGreaterThan(0)
        expect(byId['uuid-5'].folga).toBeGreaterThan(0)
    })

    it('displayMap extrai códigos EAP dos nomes (uuid → código EAP)', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const map = buildDisplayMap(result)
        expect(map.get('uuid-1')).toBe('1')
        expect(map.get('uuid-3')).toBe('3')
        expect(map.get('uuid-6')).toBe('6')
    })

    it('displayMap cobre 100% das tarefas', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const map = buildDisplayMap(result)
        result.forEach(t => {
            expect(map.has(t.id)).toBe(true)
            expect(map.get(t.id)).toBeTruthy()
        })
    })

    it('caminhos críticos têm rank sequencial começando em 1', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const paths = findAllCriticalPaths(result)
        paths.forEach((p, i) => {
            expect(p.rank).toBe(i + 1)
        })
    })

    it('ES de cada tarefa é não-negativo e EF > ES', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        result.forEach(t => {
            expect(t.es).toBeGreaterThanOrEqual(0)
            expect(t.ef).toBeGreaterThan(t.es)
        })
    })

    it('folga de tarefas críticas é zero', () => {
        const result = calculateCPMLocal(bigDigTarefas)
        const paths = findAllCriticalPaths(result)
        const criticalIds = new Set(paths[0].tasks.map(t => t.id))
        result.filter(t => criticalIds.has(t.id)).forEach(t => {
            expect(t.folga).toBe(0)
        })
    })
})
