'use client'

import React from 'react'

interface SidebarGroupProps {
    label: string
    progressPercent?: number   // 0-100
    locked?: boolean           // show blocked badge
    collapsed?: boolean        // sidebar is collapsed to icons only
    children: React.ReactNode
}

function getProgressColor(pct: number): string {
    if (pct >= 75) return 'bg-emerald-500'
    if (pct >= 50) return 'bg-cyan-500'
    if (pct >= 25) return 'bg-amber-400'
    return 'bg-rose-500'
}

export function SidebarGroup({
    label,
    progressPercent,
    locked = false,
    collapsed = false,
    children,
}: SidebarGroupProps) {
    const showProgress = progressPercent !== undefined && !collapsed

    return (
        <div data-testid={`sidebar-group-${label.toLowerCase()}`}>
            {/* Group header */}
            {!collapsed && (
                <div className="flex items-center justify-between px-3 mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {label}
                    </p>
                    {locked && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                            Bloqueado
                        </span>
                    )}
                </div>
            )}

            {/* Progress bar */}
            {showProgress && (
                <div className="mx-3 mb-2 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progressPercent)}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}

            {/* Items */}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    )
}
