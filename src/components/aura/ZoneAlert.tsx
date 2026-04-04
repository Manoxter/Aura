'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Shield, AlertTriangle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZonaMATED, ZoneAlertItem } from '@/hooks/useZoneAlert'
import { ZONA_LABELS } from '@/lib/constants/cdt-labels'

// ═══════════════════════════════════════════════════════════════════════════
// ZoneAlert — Toast notification for MATED zone transitions
// Color-coded by zone using Aura design tokens, stacks vertically
// ═══════════════════════════════════════════════════════════════════════════

interface ZoneAlertProps {
    zona: ZonaMATED
    message?: string
    onDismiss: () => void
}

// ─── Zone Configuration ─────────────────────────────────────────────────

const ZONE_CONFIG: Record<ZonaMATED, {
    Icon: typeof CheckCircle2
    label: string
    defaultMessage: string
    containerClass: string
    iconClass: string
    labelClass: string
    messageClass: string
    progressClass: string
    glowShadow: string
}> = {
    OTIMO: {
        Icon: CheckCircle2,
        label: ZONA_LABELS.OTIMO.nome,
        defaultMessage: 'Projeto em equilibrio ideal',
        containerClass: 'bg-zona-otimo-bg border-zona-otimo-border',
        iconClass: 'text-zona-otimo-text',
        labelClass: 'text-zona-otimo-text',
        messageClass: 'text-zona-otimo-text/70',
        progressClass: 'bg-zona-otimo',
        glowShadow: 'shadow-glow-emerald',
    },
    SEGURO: {
        Icon: Shield,
        label: ZONA_LABELS.SEGURO.nome,
        defaultMessage: 'Margem de resiliencia reduzida \u2014 monitorar',
        containerClass: 'bg-zona-seguro-bg border-zona-seguro-border',
        iconClass: 'text-zona-seguro-text',
        labelClass: 'text-zona-seguro-text',
        messageClass: 'text-zona-seguro-text/70',
        progressClass: 'bg-zona-seguro',
        glowShadow: 'shadow-glow-blue',
    },
    RISCO: {
        Icon: AlertTriangle,
        label: ZONA_LABELS.RISCO.nome,
        defaultMessage: 'Desvio significativo detectado \u2014 acao recomendada',
        containerClass: 'bg-zona-risco-bg border-zona-risco-border',
        iconClass: 'text-zona-risco-text',
        labelClass: 'text-zona-risco-text',
        messageClass: 'text-zona-risco-text/70',
        progressClass: 'bg-zona-risco',
        glowShadow: 'shadow-glow-amber',
    },
    CRISE: {
        Icon: AlertCircle,
        label: ZONA_LABELS.CRISE.nome,
        defaultMessage: 'Ruptura de resiliencia \u2014 War Room recomendado',
        containerClass: 'bg-zona-crise-bg border-zona-crise-border',
        iconClass: 'text-zona-crise-text',
        labelClass: 'text-zona-crise-text',
        messageClass: 'text-zona-crise-text/70',
        progressClass: 'bg-zona-crise',
        glowShadow: 'shadow-glow-rose',
    },
}

// ─── Single Toast ────────────────────────────────────────────────────────

function ZoneAlertToast({ zona, message, onDismiss }: ZoneAlertProps) {
    const [visible, setVisible] = useState(false)
    const [exiting, setExiting] = useState(false)
    const config = ZONE_CONFIG[zona]
    const { Icon } = config
    const displayMessage = message ?? config.defaultMessage

    // Animate in on mount
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    const handleDismiss = () => {
        setExiting(true)
        setTimeout(() => onDismiss(), 300)
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={cn(
                // Layout
                'relative flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border backdrop-blur-md',
                // Zone styles
                config.containerClass,
                config.glowShadow,
                // Animation
                'transition-all duration-300 ease-out',
                visible && !exiting
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-10 opacity-0',
                // Mobile: full-width
                'sm:max-w-sm max-w-[calc(100vw-2rem)]',
            )}
        >
            {/* Zone icon */}
            <div className={cn('flex-shrink-0 mt-0.5', config.iconClass)}>
                <Icon size={20} strokeWidth={2.5} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-bold uppercase tracking-widest', config.labelClass)}>
                    Zona {config.label}
                </p>
                <p className={cn('text-sm mt-1 leading-snug', config.messageClass)}>
                    {displayMessage}
                </p>
            </div>

            {/* Dismiss button */}
            <button
                onClick={handleDismiss}
                className={cn(
                    'flex-shrink-0 p-1 rounded-lg transition-colors',
                    'hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20',
                    config.iconClass,
                )}
                aria-label="Fechar alerta"
            >
                <X size={14} />
            </button>

            {/* Auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
                <div
                    className={cn('h-full rounded-b-xl animate-shrink-width', config.progressClass)}
                />
            </div>
        </div>
    )
}

// ─── Toast Container (stacks multiple toasts) ───────────────────────────

interface ZoneAlertContainerProps {
    alerts: ZoneAlertItem[]
    onDismiss: (id: string) => void
}

/**
 * Renders a fixed stack of zone alert toasts in the top-right corner.
 * Each toast slides in from the right and auto-dismisses after 5 seconds.
 *
 * Usage:
 * ```tsx
 * const { alerts, dismiss } = useZoneAlert(cdt.zona_mated)
 * return <ZoneAlertContainer alerts={alerts} onDismiss={dismiss} />
 * ```
 */
export function ZoneAlertContainer({ alerts, onDismiss }: ZoneAlertContainerProps) {
    if (alerts.length === 0) return null

    return (
        <div
            className={cn(
                'fixed top-4 right-4 z-50',
                'flex flex-col gap-3',
                // Mobile: center horizontally
                'sm:right-4 sm:left-auto left-4 right-4 sm:w-auto',
            )}
            aria-label="Alertas de zona MATED"
        >
            {alerts.map(alert => (
                <ZoneAlertToast
                    key={alert.id}
                    zona={alert.zona}
                    message={alert.message}
                    onDismiss={() => onDismiss(alert.id)}
                />
            ))}
        </div>
    )
}

// Re-export individual toast for standalone usage
export { ZoneAlertToast as ZoneAlert }
export type { ZoneAlertProps }
