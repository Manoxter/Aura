'use client'

/**
 * Accordion — Componente sanfona setup vs dashboard (D32)
 */

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
    id: string
    title: string
    badge?: string
    children: React.ReactNode
}

interface Props {
    items: AccordionItem[]
    defaultOpen?: string
}

export default function Accordion({ items, defaultOpen }: Props) {
    const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null)

    return (
        <div className="space-y-1">
            {items.map((item) => {
                const isOpen = openId === item.id
                return (
                    <div key={item.id} className="rounded-xl border border-border overflow-hidden">
                        <button
                            onClick={() => setOpenId(isOpen ? null : item.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised/50 hover:bg-surface-raised/70 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{item.title}</span>
                                {item.badge && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                    isOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {isOpen && (
                            <div className="px-4 py-3 bg-surface/50">
                                {item.children}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
