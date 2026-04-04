'use client'

// DrawerPanel — RFN-3 AC2/AC6
// Slide-in da direita com overlay escurecido e backdrop-blur-sm
// Usado para migrar painéis Level 3 do dashboard (EventoAtipicoForm, DecisionSimulator)

import React, { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface DrawerPanelProps {
    /** Título exibido no header do drawer */
    title: string
    /** Ícone opcional no header */
    icon?: React.ReactNode
    /** Controla visibilidade */
    open: boolean
    /** Callback para fechar */
    onClose: () => void
    /** Conteúdo do drawer */
    children: React.ReactNode
    /** Largura máxima (padrão: max-w-xl) */
    maxWidth?: string
}

/**
 * DrawerPanel — painel slide-in da direita.
 *
 * Transição: translate-x-full → translate-x-0 com duration-300 ease-out (RFN-3 AC6)
 * Mobile: ocupa 100% de largura em < 768px (RFN-3 AC7 implícito)
 *
 * @example
 * <DrawerPanel title="Ferramentas" icon={<Settings />} open={isOpen} onClose={() => setOpen(false)}>
 *   <EventoAtipicoForm ... />
 * </DrawerPanel>
 */
export function DrawerPanel({ title, icon, open, onClose, children, maxWidth = 'max-w-xl' }: DrawerPanelProps) {
    // Fecha com Esc
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKey)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [open, handleKey])

    return (
        <>
            {/* Overlay */}
            <div
                aria-hidden="true"
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                    open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Drawer */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`
                    fixed inset-y-0 right-0 z-50 w-full ${maxWidth}
                    bg-slate-950 border-l border-slate-800
                    shadow-2xl shadow-black/60
                    flex flex-col
                    transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                        {icon && <span className="text-blue-400">{icon}</span>}
                        {title}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all"
                        aria-label="Fechar painel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body — scroll interno */}
                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>
            </aside>
        </>
    )
}

export default DrawerPanel
