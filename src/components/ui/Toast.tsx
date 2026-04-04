'use client'

// ---------------------------------------------------------------------------
// Toast — DS-2
//
// Fixed toast stack in the bottom-right corner.
// 4 variants mapping to MATED zone tokens:
//   success → zona-otimo  (green)
//   info    → klauss      (blue/indigo)
//   warning → zona-risco  (yellow/amber)
//   error   → zona-crise  (red/rose)
//
// Accessibility:
//   success/info  → role="status"  aria-live="polite"
//   warning/error → role="alert"   aria-live="assertive"
//
// Keyboard: Esc dismisses the most recent toast.
// ---------------------------------------------------------------------------

import { useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToast, type ToastItem, type ToastVariant } from '@/hooks/useToast'

// ---------------------------------------------------------------------------
// Variant configuration — uses Tailwind classes only, no hex hardcoded.
// ---------------------------------------------------------------------------
const variantConfig: Record<
    ToastVariant,
    {
        container: string
        icon: string
        iconLabel: string
        ariaRole: 'status' | 'alert'
        ariaLive: 'polite' | 'assertive'
    }
> = {
    success: {
        container:
            'bg-emerald-950 border border-emerald-700 text-emerald-100 shadow-lg shadow-emerald-900/40',
        icon: 'text-emerald-400',
        iconLabel: '✓',
        ariaRole: 'status',
        ariaLive: 'polite',
    },
    info: {
        container:
            'bg-indigo-950 border border-indigo-700 text-indigo-100 shadow-lg shadow-indigo-900/40',
        icon: 'text-indigo-400',
        iconLabel: 'ℹ',
        ariaRole: 'status',
        ariaLive: 'polite',
    },
    warning: {
        container:
            'bg-amber-950 border border-amber-600 text-amber-100 shadow-lg shadow-amber-900/40',
        icon: 'text-amber-400',
        iconLabel: '⚠',
        ariaRole: 'alert',
        ariaLive: 'assertive',
    },
    error: {
        container:
            'bg-rose-950 border border-rose-700 text-rose-100 shadow-lg shadow-rose-900/40',
        icon: 'text-rose-400',
        iconLabel: '✕',
        ariaRole: 'alert',
        ariaLive: 'assertive',
    },
}

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
    const cfg = variantConfig[item.variant]

    return (
        <div
            role={cfg.ariaRole}
            aria-live={cfg.ariaLive}
            className={[
                'flex items-start gap-3 w-full max-w-sm rounded-xl px-4 py-3',
                'transition-all duration-300 ease-out',
                'animate-in slide-in-from-right-4 fade-in',
                cfg.container,
            ].join(' ')}
        >
            {/* Variant icon */}
            <span className={['mt-0.5 text-base font-bold select-none shrink-0', cfg.icon].join(' ')}>
                {cfg.iconLabel}
            </span>

            {/* Message */}
            <p className="flex-1 text-sm leading-snug">{item.message}</p>

            {/* Dismiss button */}
            <button
                type="button"
                aria-label="Fechar notificação"
                onClick={() => onDismiss(item.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Toast container — rendered once in the layout via ToastProviderWrapper.
// ---------------------------------------------------------------------------
export function ToastContainer() {
    const { toasts, dismiss } = useToast()

    const dismissLatest = useCallback(() => {
        if (toasts.length > 0) {
            dismiss(toasts[toasts.length - 1].id)
        }
    }, [toasts, dismiss])

    // Esc key dismisses the most recent toast
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dismissLatest()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [dismissLatest])

    if (toasts.length === 0) return null

    return (
        <div
            aria-label="Notificações"
            className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end"
        >
            {toasts.map(item => (
                <ToastCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
        </div>
    )
}

export default ToastContainer
