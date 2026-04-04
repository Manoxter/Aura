/**
 * Hook de controle de camadas do TrianglePlotter.
 *
 * Sessão 29 (S29-13): Consolida os toggles de camadas dispersos
 * em um hook reutilizável. Preparação para filtro de camadas,
 * heatmap e dashboard hierárquico.
 */

import { useState, useCallback, useMemo } from 'react'
import type { LayerFilterConfig } from '@/lib/engine/types-sessao29'
import { LAYER_FILTER_DEFAULT } from '@/lib/engine/types-sessao29'

export interface UseTriangleLayersReturn {
    /** Estado atual das camadas */
    layers: LayerFilterConfig
    /** Toggle individual de uma camada */
    toggleLayer: (key: keyof LayerFilterConfig) => void
    /** Ativar todas as camadas */
    showAll: () => void
    /** Desativar todas as camadas (exceto triângulo base) */
    hideAll: () => void
    /** Resetar para defaults */
    reset: () => void
    /** Contar camadas ativas */
    activeCount: number
}

export function useTriangleLayers(
    initialConfig?: Partial<LayerFilterConfig>
): UseTriangleLayersReturn {
    const [layers, setLayers] = useState<LayerFilterConfig>({
        ...LAYER_FILTER_DEFAULT,
        ...initialConfig,
    })

    const toggleLayer = useCallback((key: keyof LayerFilterConfig) => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    const showAll = useCallback(() => {
        setLayers(prev => {
            const all = { ...prev }
            for (const key of Object.keys(all) as (keyof LayerFilterConfig)[]) {
                all[key] = true
            }
            return all
        })
    }, [])

    const hideAll = useCallback(() => {
        setLayers(prev => {
            const all = { ...prev }
            for (const key of Object.keys(all) as (keyof LayerFilterConfig)[]) {
                all[key] = false
            }
            all.triangulo = true // sempre manter triângulo base
            return all
        })
    }, [])

    const reset = useCallback(() => {
        setLayers({ ...LAYER_FILTER_DEFAULT, ...initialConfig })
    }, [initialConfig])

    const activeCount = useMemo(() => {
        return Object.values(layers).filter(Boolean).length
    }, [layers])

    return { layers, toggleLayer, showAll, hideAll, reset, activeCount }
}
