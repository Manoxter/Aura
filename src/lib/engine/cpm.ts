/**
 * CPM Engine — Critical Path Method (deterministic, no LLM required)
 *
 * Algoritmos:
 *   - calculateCPMLocal: Forward/backward pass (ES, EF, LS, LF, Folga)
 *   - findAllCriticalPaths: Enumeração de todos os caminhos críticos + ranking PMBOK
 *
 * Display utilities:
 *   - extractEapCode: extrai código numérico do nome do nó EAP ("1.1.1 Nome" → "1.1.1")
 *   - sanitizeTaskName: remove valores de custo inline do nome da tarefa
 *   - buildDisplayMap: mapeia real ID → display ID (EAP code > T1.0 > T01 fallback)
 */

export type TarefaData = {
    id: string
    nome: string
    duracao_estimada: number
    dependencias: string[]
    es: number
    ef: number
    ls: number
    lf: number
    folga: number
    critica: boolean
}

export type CriticalPath = {
    tasks: TarefaData[]
    totalDuration: number
    maxTaskDuration: number
    rank: number
}

// ─── Forward + Backward Pass ───────────────────────────────────────────────

export function calculateCPMLocal(tarefas: TarefaData[]): TarefaData[] {
    if (tarefas.length === 0) return []

    // WBS-CPM-01: valida IDs duplicados e duração inválida antes do passe
    const idCount = new Map<string, number>()
    for (const t of tarefas) {
        idCount.set(t.id, (idCount.get(t.id) ?? 0) + 1)
        if ((t.duracao_estimada ?? 0) <= 0) {
            console.warn(`[CPM] Tarefa "${t.nome}" (id: ${t.id}) tem duração ≤ 0 — CPM pode produzir resultados incorretos.`)
        }
    }
    idCount.forEach((count, id) => {
        if (count > 1) console.warn(`[CPM] ID duplicado detectado: ${id} — apenas a última ocorrência será usada.`)
    })

    const taskMap = new Map(tarefas.map(t => [t.id, { ...t }]))
    const sorted = [...tarefas].map(t => ({ ...t }))

    const visited = new Set<string>()
    const order: string[] = []

    function visit(id: string) {
        if (visited.has(id)) return
        visited.add(id)
        const t = taskMap.get(id)
        if (!t) return
        for (const dep of (t.dependencias || [])) {
            visit(dep)
        }
        order.push(id)
    }

    sorted.forEach(t => visit(t.id))

    // Forward Pass: ES, EF
    for (const id of order) {
        const t = taskMap.get(id)!
        const preds = (t.dependencias || []).map(d => taskMap.get(d)).filter(Boolean) as TarefaData[]
        t.es = preds.length === 0 ? 0 : Math.max(...preds.map(p => p.ef))
        t.ef = t.es + t.duracao_estimada
    }

    // Backward Pass: LS, LF, Folga
    const duracaoTotal = Math.max(...Array.from(taskMap.values()).map(t => t.ef))

    for (let i = order.length - 1; i >= 0; i--) {
        const t = taskMap.get(order[i])!
        const succs = Array.from(taskMap.values()).filter(s =>
            (s.dependencias || []).includes(t.id)
        )
        t.lf = succs.length === 0 ? duracaoTotal : Math.min(...succs.map(s => s.ls))
        t.ls = t.lf - t.duracao_estimada
        t.folga = t.ls - t.es
        t.critica = t.folga === 0
    }

    return sorted.map(t => taskMap.get(t.id)!)
}

// ─── Critical Path Enumeration (PMBOK multi-path) ──────────────────────────

export function findAllCriticalPaths(tarefas: TarefaData[]): CriticalPath[] {
    if (tarefas.length === 0) return []

    const criticalTasks = tarefas.filter(t => t.ef > 0 && t.folga === 0)
    if (criticalTasks.length === 0) return []

    // End tasks: no other critical task starts exactly when this one ends
    const endTasks = criticalTasks.filter(t =>
        !criticalTasks.some(other => other.id !== t.id && other.es === t.ef)
    )
    const effectiveEnds = endTasks.length > 0 ? endTasks
        : [criticalTasks.reduce((best, t) => t.ef > best.ef ? t : best)]

    const paths: TarefaData[][] = []
    const visited = new Set<string>()
    // WBS-CPM-02: limite de caminhos para evitar explosão em grafos densos
    const MAX_PATHS = 100

    function tracePath(task: TarefaData, currentPath: TarefaData[]) {
        if (paths.length >= MAX_PATHS) return
        const key = task.id + '|' + currentPath.map(t => t.id).join(',')
        if (visited.has(key)) return
        visited.add(key)
        const preds = criticalTasks.filter(p => p.id !== task.id && p.ef === task.es)
        if (preds.length === 0) {
            paths.push([task, ...currentPath])
        } else {
            for (const pred of preds) {
                tracePath(pred, [task, ...currentPath])
            }
        }
    }

    for (const endTask of effectiveEnds) {
        tracePath(endTask, [])
    }

    const seen = new Set<string>()
    const uniquePaths = paths.filter(p => {
        const key = p.map(t => t.id).join('→')
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })

    // PMBOK: rank by longest individual task (drives schedule risk), tiebreak by total
    const ranked = uniquePaths.map(tasks => ({
        tasks,
        totalDuration: tasks.reduce((sum, t) => sum + t.duracao_estimada, 0),
        maxTaskDuration: Math.max(...tasks.map(t => t.duracao_estimada)),
        rank: 0,
    }))

    ranked.sort((a, b) => b.maxTaskDuration !== a.maxTaskDuration
        ? b.maxTaskDuration - a.maxTaskDuration
        : b.totalDuration - a.totalDuration)

    ranked.forEach((p, i) => { p.rank = i + 1 })
    return ranked
}

// ─── Boundary: T-code → UUID Resolution ──────────────────────────────────

/**
 * Resolve dependências T-code/EAP → UUID antes de rodar o CPM.
 * AC-1: Resolução centralizada em função de borda.
 * AC-2: CPM nunca recebe T-codes após esta função.
 * AC-4: T-codes não encontrados geram warning, não crash silencioso.
 */
export function resolveDependencias(tarefas: TarefaData[]): TarefaData[] {
    // Constrói mapa: eapCode (extraído do nome) → uuid
    const codeToUUID = new Map<string, string>()

    for (const t of tarefas) {
        const codeFromNome = extractEapCode(t.nome)
        if (codeFromNome) codeToUUID.set(codeFromNome.toLowerCase(), t.id)
        // IDs que já são T-codes mapeiam para si mesmos
        if (/^T\d+(?:\.\d+)*$/i.test(t.id)) {
            codeToUUID.set(t.id.toLowerCase(), t.id)
        }
    }

    const isUUID = (s: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    const isTCode = (s: string) => /^(T?\d+(?:\.\d+)*)$/i.test(s)

    return tarefas.map(t => {
        const resolved = (t.dependencias || []).flatMap(dep => {
            if (isUUID(dep)) return [dep]
            if (isTCode(dep)) {
                const uuid = codeToUUID.get(dep.toLowerCase())
                if (uuid) return [uuid]
                console.warn(
                    `[CPM] resolveDependencias: T-code "${dep}" não encontrado ` +
                    `(tarefa "${t.nome}", id: ${t.id})`
                )
                return []
            }
            return [dep]
        })
        return { ...t, dependencias: resolved }
    })
}

// ─── Display ID Utilities ──────────────────────────────────────────────────

/**
 * Extrai código EAP do nome do nó.
 * "1.1.1 Licenciamento Ambiental" → "1.1.1"
 * "T2.1 Construcao da Bacia" → "T2.1"
 * "T1 Planejamento" → "T1"
 * "Nome sem código" → null
 */
export function extractEapCode(nome: string): string | null {
    const m = nome.match(/^(T\d+(?:\.\d+)*|\d+(?:\.\d+)*)\s+/i)
    return m ? m[1] : null
}

/**
 * Remove valores de custo/orçamento inline do final do nome.
 * "Escavação 18 200M  1.1" → "Escavação"
 */
export function sanitizeTaskName(nome: string): string {
    return nome.replace(/\s+\d[\d\s.,]*[MBK]\b.*/i, '').trim()
}

/**
 * Constrói mapa de display IDs para exibição no PERT/Gantt.
 * Prioridade: EAP codes numéricas > T1.0 hierárquico > T01 sequencial
 */
export function buildDisplayMap(tarefas: TarefaData[]): Map<string, string> {
    const map = new Map<string, string>()

    if (tarefas.length === 0) return map

    // Se IDs já são códigos EAP puros ("1.1.1"), usa diretamente
    if (tarefas.every(t => /^\d+(?:\.\d+)+$/.test(t.id))) {
        tarefas.forEach(t => map.set(t.id, t.id))
        return map
    }

    // Se IDs são T-prefixados hierárquicos (T1.0), usa diretamente
    if (tarefas.some(t => /^T\d+\.\d+/.test(t.id))) {
        tarefas.forEach(t => map.set(t.id, t.id))
        return map
    }

    // Fallback: extrai código EAP do nome, ou gera T01/T02...
    tarefas.forEach((t, i) => {
        const eapCode = extractEapCode(t.nome)
        map.set(t.id, eapCode ?? `T${String(i + 1).padStart(2, '0')}`)
    })
    return map
}
