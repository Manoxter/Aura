'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// useZoneAlert — Tracks MATED zone transitions and manages toast alerts
// ═══════════════════════════════════════════════════════════════════════════

export type ZonaMATED = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

export interface ZoneAlertItem {
    id: string
    zona: ZonaMATED
    message: string
    timestamp: number
}

const ZONE_MESSAGES: Record<ZonaMATED, string> = {
    OTIMO: 'Projeto em equilibrio ideal',
    SEGURO: 'Margem de resiliencia reduzida \u2014 monitorar',
    RISCO: 'Desvio significativo detectado \u2014 acao recomendada',
    CRISE: 'Ruptura de resiliencia \u2014 War Room recomendado',
}

/** Auto-dismiss timeout in milliseconds */
const AUTO_DISMISS_MS = 5000

/**
 * Custom hook that tracks MATED zone changes and emits toast alerts.
 *
 * - Ignores the initial render (no alert on mount)
 * - Triggers an alert only when `zona` changes to a different value
 * - Stores dismissed alert IDs to avoid re-showing the same transition
 * - Auto-dismisses each alert after 5 seconds
 *
 * @param zona - Current zona_mated value from CDTResult
 * @returns { alerts, dismiss, clearAll }
 */
export function useZoneAlert(zona: ZonaMATED | undefined) {
    const [alerts, setAlerts] = useState<ZoneAlertItem[]>([])
    const prevZonaRef = useRef<ZonaMATED | undefined>(undefined)
    const isFirstRender = useRef(true)
    const dismissedIds = useRef<Set<string>>(new Set())
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    // Schedule auto-dismiss for a given alert ID
    const scheduleAutoDismiss = useCallback((id: string) => {
        const timer = setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id))
            dismissedIds.current.add(id)
            timersRef.current.delete(id)
        }, AUTO_DISMISS_MS)
        timersRef.current.set(id, timer)
    }, [])

    // Dismiss a single alert
    const dismiss = useCallback((id: string) => {
        const timer = timersRef.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(id)
        }
        dismissedIds.current.add(id)
        setAlerts(prev => prev.filter(a => a.id !== id))
    }, [])

    // Clear all alerts
    const clearAll = useCallback(() => {
        timersRef.current.forEach(timer => clearTimeout(timer))
        timersRef.current.clear()
        setAlerts(prev => {
            prev.forEach(a => dismissedIds.current.add(a.id))
            return []
        })
    }, [])

    // Track zone changes
    useEffect(() => {
        if (zona === undefined) return

        if (isFirstRender.current) {
            isFirstRender.current = false
            prevZonaRef.current = zona
            return
        }

        if (zona !== prevZonaRef.current) {
            const id = `zone-${zona}-${Date.now()}`

            // Only add if not previously dismissed (same transition key)
            if (!dismissedIds.current.has(id)) {
                const newAlert: ZoneAlertItem = {
                    id,
                    zona,
                    message: ZONE_MESSAGES[zona],
                    timestamp: Date.now(),
                }
                setAlerts(prev => [...prev, newAlert])
                scheduleAutoDismiss(id)
            }

            prevZonaRef.current = zona
        }
    }, [zona, scheduleAutoDismiss])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(timer => clearTimeout(timer))
            timersRef.current.clear()
        }
    }, [])

    return { alerts, dismiss, clearAll }
}
