'use client'

// ---------------------------------------------------------------------------
// useToast — DS-2
//
// Global toast queue with FIFO ordering, max 3 simultaneous, auto-dismiss,
// and deduplication of identical messages within 500ms.
//
// Auto-dismiss timings:
//   success / info  → 4s
//   warning / error → 8s
// ---------------------------------------------------------------------------

import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'info' | 'warning' | 'error'

export interface ToastItem {
    id: string
    message: string
    variant: ToastVariant
    duration?: number
}

interface ToastContextValue {
    toasts: ToastItem[]
    toast: (item: Omit<ToastItem, 'id'>) => void
    dismiss: (id: string) => void
    clear: () => void
}

const defaultDuration: Record<ToastVariant, number> = {
    success: 4000,
    info: 4000,
    warning: 8000,
    error: 8000,
}

const MAX_TOASTS = 3

// Context is created with no-op defaults so callers get a safe fallback when
// used outside a provider (avoids hard crash).
export const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    toast: () => undefined,
    dismiss: () => undefined,
    clear: () => undefined,
})

// ---------------------------------------------------------------------------
// Provider — rendered inside a 'use client' boundary (ToastProviderWrapper).
// ---------------------------------------------------------------------------
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    // Dedup tracker: message → timestamp of last enqueue
    const recentMessages = useRef<Map<string, number>>(new Map())
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    const dismiss = useCallback((id: string) => {
        const timer = timers.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timers.current.delete(id)
        }
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const toast = useCallback(
        (item: Omit<ToastItem, 'id'>) => {
            const now = Date.now()
            const lastSeen = recentMessages.current.get(item.message)

            // Deduplicate: skip if same message was added within 500ms
            if (lastSeen !== undefined && now - lastSeen < 500) return

            recentMessages.current.set(item.message, now)

            const id = `toast-${now}-${Math.random().toString(36).slice(2, 7)}`
            const duration = item.duration ?? defaultDuration[item.variant]

            setToasts(prev => {
                // FIFO: if already at max, drop oldest
                const trimmed = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
                return [...trimmed, { ...item, id, duration }]
            })

            const timer = setTimeout(() => dismiss(id), duration)
            timers.current.set(id, timer)
        },
        [dismiss],
    )

    const clear = useCallback(() => {
        timers.current.forEach(t => clearTimeout(t))
        timers.current.clear()
        recentMessages.current.clear()
        setToasts([])
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss, clear }}>
            {children}
        </ToastContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// Hook — use inside any client component.
// ---------------------------------------------------------------------------
export function useToast(): ToastContextValue {
    return useContext(ToastContext)
}
