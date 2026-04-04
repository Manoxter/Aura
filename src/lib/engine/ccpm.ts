/**
 * CCPM Engine — Critical Chain Project Management
 *
 * Diferença do CPM (Corporate):
 *   CPM:  Forward+Backward pass → folga → caminho crítico (só dependências)
 *   CCPM: Cadeia crítica (dependências + recursos) → cortar estimativas → buffers RSS → back-scheduling
 *
 * Decisões: D1 (corte estimativa), D3 (notificação), D4 (temporizador 48h)
 *
 * @aura-production — TOC, CCPM, Goldratt
 */

import type { TarefaData } from './cpm'

// ─── Tipos CCPM ───────────────────────────────────────────────────────────────

/** Tarefa CCPM estende TarefaData com campos de estimativa agressiva e recurso */
export interface TarefaCCPM extends TarefaData {
    /** Duração otimista (agressiva) — D1: Agressiva = Otimista */
    duracao_otimista: number
    /** Duração segura (com gordura) — a estimativa original */
    duracao_segura: number
    /** Custo otimista */
    custo_otimista: number
    /** Custo seguro */
    custo_seguro: number
    /** ID do recurso atribuído (para detecção de conflito) */
    recurso_id: string | null
    /** Nome do recurso */
    recurso_nome: string | null
}

/** Conflito de recurso detectado entre duas tarefas */
export interface ResourceConflict {
    recurso_id: string
    tarefa_a: string
    tarefa_b: string
    overlap_inicio: number
    overlap_fim: number
}

/** Resultado do scheduling CCPM */
export interface CCPMResult {
    /** Tarefas com schedule CCPM aplicado (back-scheduled) */
    tarefas: TarefaCCPM[]
    /** Cadeia crítica (IDs das tarefas) */
    cadeia_critica: string[]
    /** Conflitos de recurso detectados antes do nivelamento */
    conflitos: ResourceConflict[]
    /** Duração total da cadeia crítica (com estimativas agressivas) */
    duracao_cadeia_critica: number
    /** Gordura removida total (diferença entre segura e agressiva) */
    gordura_total: number
}

// ─── D1: Corte de Estimativa ──────────────────────────────────────────────────

/**
 * Calcula a duração agressiva (otimista) a partir da estimativa segura.
 * Goldratt: corta ~50% da gordura. Usamos fator 0.5 por default.
 *
 * @param duracao_segura - estimativa original com margem de segurança
 * @param fator_corte - fator de corte (0.5 = corta 50% da gordura). Default: 0.5
 * @returns duração agressiva (mínimo 1)
 */
export function cortarEstimativa(duracao_segura: number, fator_corte: number = 0.5): number {
    if (duracao_segura <= 0) return 1
    const agressiva = Math.max(1, Math.ceil(duracao_segura * fator_corte))
    return agressiva
}

/**
 * Calcula custo agressivo na mesma proporção do corte de duração.
 */
export function cortarCusto(custo_seguro: number, duracao_segura: number, duracao_otimista: number): number {
    if (duracao_segura <= 0 || custo_seguro <= 0) return 0
    return custo_seguro * (duracao_otimista / duracao_segura)
}

// ─── Detecção de Conflito de Recurso ──────────────────────────────────────────

/**
 * Detecta conflitos de recurso: tarefas alocadas ao mesmo recurso com overlap temporal.
 */
export function detectarConflitosRecurso(tarefas: TarefaCCPM[]): ResourceConflict[] {
    const conflitos: ResourceConflict[] = []
    const porRecurso = new Map<string, TarefaCCPM[]>()

    for (const t of tarefas) {
        if (!t.recurso_id) continue
        const lista = porRecurso.get(t.recurso_id) ?? []
        lista.push(t)
        porRecurso.set(t.recurso_id, lista)
    }

    for (const [recurso_id, grupo] of Array.from(porRecurso.entries())) {
        for (let i = 0; i < grupo.length; i++) {
            for (let j = i + 1; j < grupo.length; j++) {
                const a = grupo[i]
                const b = grupo[j]
                const overlap_inicio = Math.max(a.es, b.es)
                const overlap_fim = Math.min(a.ef, b.ef)
                if (overlap_inicio < overlap_fim) {
                    conflitos.push({
                        recurso_id,
                        tarefa_a: a.id,
                        tarefa_b: b.id,
                        overlap_inicio,
                        overlap_fim,
                    })
                }
            }
        }
    }

    return conflitos
}

// ─── Nivelamento de Recurso (heurística simples) ──────────────────────────────

/**
 * Nivela conflitos de recurso atrasando a tarefa com menor prioridade (maior folga).
 * Retorna tarefas com ES/EF ajustados.
 */
export function nivelarRecursos(tarefas: TarefaCCPM[]): TarefaCCPM[] {
    const resultado = tarefas.map(t => ({ ...t }))
    const taskMap = new Map(resultado.map(t => [t.id, t]))

    let conflitos = detectarConflitosRecurso(resultado)
    let iteracoes = 0
    const MAX_ITER = 100

    while (conflitos.length > 0 && iteracoes < MAX_ITER) {
        for (const c of conflitos) {
            const a = taskMap.get(c.tarefa_a)!
            const b = taskMap.get(c.tarefa_b)!

            // Atrasa a tarefa com maior folga (menor prioridade)
            const atrasar = a.folga >= b.folga ? a : b
            const manter = a.folga >= b.folga ? b : a

            atrasar.es = manter.ef
            atrasar.ef = atrasar.es + atrasar.duracao_estimada
            atrasar.folga = atrasar.ls - atrasar.es
        }

        conflitos = detectarConflitosRecurso(resultado)
        iteracoes++
    }

    return resultado
}

// ─── Identificar Cadeia Crítica ───────────────────────────────────────────────

/**
 * Identifica a cadeia crítica: o caminho mais longo considerando
 * dependências E restrições de recurso (após nivelamento).
 */
export function identificarCadeiaCritica(tarefas: TarefaCCPM[]): string[] {
    if (tarefas.length === 0) return []

    const taskMap = new Map(tarefas.map(t => [t.id, t]))
    const duracaoTotal = Math.max(...tarefas.map(t => t.ef))

    // Tarefas finais (nenhuma outra depende delas)
    const dependentes = new Set(tarefas.flatMap(t => t.dependencias))
    const finais = tarefas.filter(t => !dependentes.has(t.id) || t.ef === duracaoTotal)

    // Traçar para trás a partir de cada final
    let melhorCaminho: string[] = []
    let melhorDuracao = 0

    function tracar(tarefa: TarefaCCPM, caminhoAtual: string[], duracaoAtual: number) {
        const novoCaminho = [tarefa.id, ...caminhoAtual]
        const novaDuracao = duracaoAtual + tarefa.duracao_estimada

        const predecessoras = tarefas.filter(t =>
            tarefa.dependencias.includes(t.id) ||
            (tarefa.recurso_id && t.recurso_id === tarefa.recurso_id && t.ef === tarefa.es)
        )

        if (predecessoras.length === 0) {
            if (novaDuracao > melhorDuracao) {
                melhorDuracao = novaDuracao
                melhorCaminho = novoCaminho
            }
            return
        }

        for (const pred of predecessoras) {
            tracar(pred, novoCaminho, novaDuracao)
        }
    }

    for (const final of finais) {
        tracar(final, [], 0)
    }

    return melhorCaminho
}

// ─── Pipeline CCPM Completo ───────────────────────────────────────────────────

/**
 * Executa o pipeline CCPM completo:
 * 1. Cortar estimativas (D1)
 * 2. Forward pass com durações agressivas
 * 3. Detectar conflitos de recurso
 * 4. Nivelar recursos
 * 5. Identificar cadeia crítica
 *
 * @param tarefas - TarefaData do CPM com campos CCPM extras
 * @param fator_corte - fator de corte das estimativas (default 0.5)
 */
export function calculateCCPM(
    tarefas: TarefaCCPM[],
    fator_corte: number = 0.5
): CCPMResult {
    if (tarefas.length === 0) {
        return {
            tarefas: [],
            cadeia_critica: [],
            conflitos: [],
            duracao_cadeia_critica: 0,
            gordura_total: 0,
        }
    }

    // 1. Cortar estimativas
    let gordura_total = 0
    const cortadas = tarefas.map(t => {
        const duracao_otimista = cortarEstimativa(t.duracao_segura, fator_corte)
        const custo_otimista = cortarCusto(t.custo_seguro, t.duracao_segura, duracao_otimista)
        gordura_total += t.duracao_segura - duracao_otimista
        return {
            ...t,
            duracao_otimista,
            custo_otimista,
            duracao_estimada: duracao_otimista, // CPM usa duracao_estimada
        }
    })

    // 2. Forward pass com durações agressivas
    const taskMap = new Map(cortadas.map(t => [t.id, { ...t }]))
    const visited = new Set<string>()
    const order: string[] = []

    function visit(id: string) {
        if (visited.has(id)) return
        visited.add(id)
        const t = taskMap.get(id)
        if (!t) return
        for (const dep of t.dependencias) visit(dep)
        order.push(id)
    }
    cortadas.forEach(t => visit(t.id))

    for (const id of order) {
        const t = taskMap.get(id)!
        const preds = t.dependencias.map(d => taskMap.get(d)).filter(Boolean) as TarefaCCPM[]
        t.es = preds.length === 0 ? 0 : Math.max(...preds.map(p => p.ef))
        t.ef = t.es + t.duracao_estimada
    }

    const duracaoTotal = Math.max(...Array.from(taskMap.values()).map(t => t.ef))
    for (let i = order.length - 1; i >= 0; i--) {
        const t = taskMap.get(order[i])!
        const succs = Array.from(taskMap.values()).filter(s => s.dependencias.includes(t.id))
        t.lf = succs.length === 0 ? duracaoTotal : Math.min(...succs.map(s => s.ls))
        t.ls = t.lf - t.duracao_estimada
        t.folga = t.ls - t.es
        t.critica = t.folga === 0
    }

    const scheduled = Array.from(taskMap.values())

    // 3. Detectar conflitos
    const conflitos = detectarConflitosRecurso(scheduled)

    // 4. Nivelar recursos (se houver conflitos)
    const niveladas = conflitos.length > 0 ? nivelarRecursos(scheduled) : scheduled

    // 5. Cadeia crítica
    const cadeia_critica = identificarCadeiaCritica(niveladas)
    const duracao_cadeia_critica = cadeia_critica.reduce((sum, id) => {
        const t = taskMap.get(id)
        return sum + (t?.duracao_estimada ?? 0)
    }, 0)

    return {
        tarefas: niveladas,
        cadeia_critica,
        conflitos,
        duracao_cadeia_critica,
        gordura_total,
    }
}

// ─── D4: Temporizador 48h + Status de Tarefa ─────────────────────────────────

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada'

/**
 * Verifica se uma tarefa precisa de escalação (D4: temporizador 48h).
 * Se a tarefa está em_andamento há mais de 48h sem progresso, escalação é necessária.
 *
 * @param inicio_real - timestamp ISO de quando a tarefa iniciou
 * @param agora - timestamp atual (default: Date.now())
 * @param limite_horas - limite em horas para escalação (default: 48)
 */
export function precisaEscalacao(
    inicio_real: string,
    agora: number = Date.now(),
    limite_horas: number = 48
): boolean {
    const inicio = new Date(inicio_real).getTime()
    if (isNaN(inicio)) return false
    const horasDecorridas = (agora - inicio) / (1000 * 60 * 60)
    return horasDecorridas >= limite_horas
}
