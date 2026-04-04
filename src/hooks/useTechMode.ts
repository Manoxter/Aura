'use client'

import { useState, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// useTechMode — Toggle entre modo técnico (E/P/O/MATED) e modo PM (gerencial)
// Story 5.7 — Labels Semânticos CDT
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'aura-mode'

/**
 * Hook para controlar o modo de exibição das métricas CDT.
 *
 * - isTechMode = true: exibe labels técnicos (E, P, O, MATED, NVO)
 * - isTechMode = false: exibe labels gerenciais (Escopo, Prazo, Orçamento, Índice de Qualidade)
 *
 * Persiste preferência via localStorage ('aura-mode').
 */
export function useTechMode(): { isTechMode: boolean; toggleTechMode: () => void } {
    const [isTechMode, setIsTechMode] = useState<boolean>(false)

    // Lê preferência salva no mount (client-side only)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored !== null) {
                setIsTechMode(stored === 'true')
            }
        } catch {
            // localStorage indisponível (SSR ou modo privado) — graceful fallback
        }
    }, [])

    const toggleTechMode = useCallback(() => {
        setIsTechMode(prev => {
            const next = !prev
            try {
                localStorage.setItem(STORAGE_KEY, String(next))
            } catch {
                // Graceful degradation: preferência não persiste
            }
            return next
        })
    }, [])

    return { isTechMode, toggleTechMode }
}
