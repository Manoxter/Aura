'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, AlertCircle, Shield, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertaResult, ZonaMATED } from '@/lib/engine/alertas'
import { ZONA_LABELS } from '@/lib/constants/cdt-labels'

// ═══════════════════════════════════════════════════════════════════════════
// AlertaBanner — Story 5.5
// Banner fixo que exibe alertas de desvio clínico TA/TM.
// Persiste badge amarelo no localStorage para a sidebar detectar.
// ═══════════════════════════════════════════════════════════════════════════

/** Chave localStorage para badge amarelo na sidebar */
const BADGE_KEY = (projetoId: string) => `aura-alerta-badge-${projetoId}`

// ─── Zone config ─────────────────────────────────────────────────────────

type ZoneDisplayConfig = {
    Icon: typeof AlertTriangle
    containerClass: string
    iconClass: string
    badgeClass: string
    labelClass: string
    label: string
    acaoLabel: string
    acaoHref: (projetoId: string) => string
}

const ZONE_DISPLAY: Record<ZonaMATED, ZoneDisplayConfig> = {
    OTIMO: {
        Icon: Shield,
        containerClass: 'bg-zona-otimo-bg border-zona-otimo-border',
        iconClass: 'text-zona-otimo-text',
        badgeClass: 'bg-zona-otimo text-white',
        labelClass: 'text-zona-otimo-text',
        label: ZONA_LABELS.OTIMO.nome,
        acaoLabel: 'Ver MATED',
        acaoHref: (id) => `/projetos/${id}/mated`,
    },
    SEGURO: {
        Icon: Shield,
        containerClass: 'bg-zona-seguro-bg border-zona-seguro-border',
        iconClass: 'text-zona-seguro-text',
        badgeClass: 'bg-zona-seguro text-white',
        labelClass: 'text-zona-seguro-text',
        label: ZONA_LABELS.SEGURO.nome,
        acaoLabel: 'Ver MATED',
        acaoHref: (id) => `/projetos/${id}/mated`,
    },
    RISCO: {
        Icon: AlertTriangle,
        containerClass: 'bg-zona-risco-bg border-zona-risco-border',
        iconClass: 'text-zona-risco-text',
        badgeClass: 'bg-zona-risco text-white',
        labelClass: 'text-zona-risco-text',
        label: ZONA_LABELS.RISCO.nome,
        acaoLabel: 'Consultar Klauss',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        acaoHref: (_id) => '/klauss',
    },
    CRISE: {
        Icon: AlertCircle,
        containerClass: 'bg-zona-crise-bg border-zona-crise-border',
        iconClass: 'text-zona-crise-text',
        badgeClass: 'bg-zona-crise text-white',
        labelClass: 'text-zona-crise-text',
        label: ZONA_LABELS.CRISE.nome,
        acaoLabel: 'Consultar Klauss',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        acaoHref: (_id) => '/klauss',
    },
}

// ─── Single banner item ───────────────────────────────────────────────────

interface AlertaBannerItemProps {
    alerta: AlertaResult
    onSilenciar: () => void
}

function AlertaBannerItem({ alerta, onSilenciar }: AlertaBannerItemProps) {
    const [visible, setVisible] = useState(false)
    const config = ZONE_DISPLAY[alerta.zona]
    const { Icon } = config
    const desvioPercent = (alerta.mated * 100).toFixed(1)

    // Animate in
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    const handleSilenciar = () => {
        setVisible(false)
        // Aguarda animação de saída antes de chamar callback
        setTimeout(onSilenciar, 300)
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={cn(
                // Layout
                'flex items-center gap-3 w-full px-4 py-3 border-b backdrop-blur-sm',
                config.containerClass,
                // Animação
                'transition-all duration-300 ease-out',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
            )}
        >
            {/* Ícone da zona */}
            <div className={cn('flex-shrink-0', config.iconClass)}>
                <Icon size={18} strokeWidth={2.5} />
            </div>

            {/* Badge de zona */}
            <span
                className={cn(
                    'flex-shrink-0 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-md',
                    config.badgeClass,
                )}
            >
                {config.label}
            </span>

            {/* Desvio */}
            <span className={cn('text-sm font-medium', config.labelClass)}>
                Desvio TA/TM: <strong>{desvioPercent}%</strong>
            </span>

            {/* Separador */}
            <span className="flex-1" />

            {/* Botão de ação */}
            <a
                href={config.acaoHref(alerta.projetoId)}
                className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg',
                    'border transition-colors duration-150',
                    'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1',
                    config.badgeClass,
                    'border-transparent',
                )}
            >
                {config.acaoLabel}
                <ExternalLink size={12} />
            </a>

            {/* Botão Silenciar 24h */}
            <button
                onClick={handleSilenciar}
                title="Silenciar por 24h"
                aria-label="Silenciar alerta por 24 horas"
                className={cn(
                    'flex-shrink-0 p-1.5 rounded-lg transition-colors duration-150',
                    'hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20',
                    config.iconClass,
                )}
            >
                <X size={14} />
            </button>
        </div>
    )
}

// ─── AlertaBanner principal ───────────────────────────────────────────────

export interface AlertaBannerProps {
    alertas: AlertaResult[]
    onSilenciar: () => void
}

/**
 * AlertaBanner — Banner fixo no topo da página para alertas de desvio TA/TM.
 *
 * - Aparece quando há alertas ativos
 * - Badge amarelo no localStorage para sidebar detectar via evento customizado
 * - Botão X silencia por 24h (via localStorage)
 * - Para RISCO/CRISE: botão "Consultar Klauss"
 * - Para OTIMO/SEGURO: botão "Ver MATED"
 */
export function AlertaBanner({ alertas, onSilenciar }: AlertaBannerProps) {
    // Persistir badge amarelo no localStorage quando há alertas de RISCO ou CRISE
    useEffect(() => {
        const projetoId = alertas[0]?.projetoId
        if (!projetoId || typeof window === 'undefined') return

        const temAlertaGrave = alertas.some(
            a => a.zona === 'RISCO' || a.zona === 'CRISE'
        )

        if (temAlertaGrave) {
            localStorage.setItem(BADGE_KEY(projetoId), '1')
            window.dispatchEvent(
                new CustomEvent('aura:alerta-badge', {
                    detail: { projetoId, ativo: true },
                })
            )
        }

        return () => {
            // Remove badge ao desmontar ou quando alertas somem
            if (!temAlertaGrave) {
                localStorage.removeItem(BADGE_KEY(projetoId))
                window.dispatchEvent(
                    new CustomEvent('aura:alerta-badge', {
                        detail: { projetoId, ativo: false },
                    })
                )
            }
        }
    }, [alertas])

    if (alertas.length === 0) return null

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex flex-col"
            aria-label="Alertas de desvio clínico MATED"
        >
            {alertas.map((alerta, idx) => (
                <AlertaBannerItem
                    key={`${alerta.projetoId}-${alerta.zona}-${idx}`}
                    alerta={alerta}
                    onSilenciar={onSilenciar}
                />
            ))}
        </div>
    )
}

export default AlertaBanner
