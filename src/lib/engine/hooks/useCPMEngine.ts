/**
 * useCPMEngine — Hook reativo para Forward/Backward Pass CPM
 *
 * Encapsula `calculateCPMLocal` + `findAllCriticalPaths` + `buildDisplayMap`
 * com memoização por conteúdo (serialização JSON das tarefas).
 *
 * Story 4.1 — Sprint PERT-V2
 */

import { useMemo } from 'react'
import {
  calculateCPMLocal,
  findAllCriticalPaths,
  buildDisplayMap,
  resolveDependencias,
  type TarefaData,
  type CriticalPath,
} from '../cpm'

export interface UseCPMEngineResult {
  /** Tarefas com ES/EF/LS/LF/folga/critica calculados */
  tarefasCalculadas: TarefaData[]
  /** Caminhos críticos ordenados por ranking PMBOK */
  criticalPaths: CriticalPath[]
  /** Mapa real ID → display ID (EAP code > T1.0 > T01) */
  displayMap: Map<string, string>
  /** true quando há ao menos uma tarefa calculada */
  pronto: boolean
}

/**
 * Hook que roda o pipeline CPM completo (forward+backward pass + critical paths)
 * sempre que a lista de tarefas mudar.
 *
 * @param tarefas - Lista de tarefas brutas (sem ES/EF calculados)
 */
export function useCPMEngine(tarefas: TarefaData[]): UseCPMEngineResult {
  // Serializar para detectar mudanças de conteúdo (não só referência)
  const tarefasKey = useMemo(
    () => tarefas.map(t => `${t.id}:${t.duracao_estimada}:${t.dependencias.join(',')}`).join('|'),
    [tarefas]
  )

  return useMemo(() => {
    if (tarefas.length === 0) {
      return {
        tarefasCalculadas: [],
        criticalPaths: [],
        displayMap: new Map(),
        pronto: false,
      }
    }

    const tarefasResolvidas = resolveDependencias(tarefas)
    const tarefasCalculadas = calculateCPMLocal(tarefasResolvidas)
    const criticalPaths = findAllCriticalPaths(tarefasCalculadas)
    const displayMap = buildDisplayMap(tarefasCalculadas)

    return {
      tarefasCalculadas,
      criticalPaths,
      displayMap,
      pronto: true,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefasKey])
}
