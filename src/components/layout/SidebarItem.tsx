'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

export type SidebarItemStatus = 'done' | 'pending' | 'warning' | 'grey'

interface SidebarItemProps {
    label: string
    icon: React.ElementType
    href: string
    status?: SidebarItemStatus
    isActive?: boolean
    locked?: boolean
    collapsed?: boolean
}

const statusIconMap: Record<SidebarItemStatus, string> = {
    done: '✓',
    pending: '○',
    warning: '⚠',
    grey: '○',
}

const statusColorMap: Record<SidebarItemStatus, string> = {
    done: 'text-emerald-400',
    pending: 'text-slate-500',
    warning: 'text-amber-400',
    grey: 'text-slate-600',
}

const statusDotMap: Record<SidebarItemStatus, string> = {
    done: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    pending: 'bg-slate-700',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    grey: 'bg-slate-700',
}

export function SidebarItem({
    label,
    icon: Icon,
    href,
    status = 'grey',
    isActive = false,
    locked = false,
    collapsed = false,
}: SidebarItemProps) {
    const content = (
        <div
            data-testid={`sidebar-item-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
            title={locked ? 'Complete o SETUP para acessar' : label}
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive && !collapsed
                    ? 'bg-emerald-50/5 text-emerald-400 border-l-2 border-emerald-500'
                    : isActive && collapsed
                        ? 'text-blue-400 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 bg-blue-500/10'
                        : locked
                            ? 'text-slate-600 cursor-not-allowed opacity-60'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }
                ${collapsed ? 'justify-center' : ''}
            `}
        >
            {/* Icon */}
            <div className="relative flex items-center justify-center shrink-0">
                {locked ? (
                    <Lock className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-600'}`} />
                ) : (
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                )}
                {/* Status dot */}
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    {status === 'done' && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusDotMap[status]}`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDotMap[status]}`} />
                </span>
            </div>

            {/* Label + status icon */}
            {!collapsed && (
                <>
                    <span className="flex-1 truncate">{label}</span>
                    <span className={`text-xs shrink-0 ${statusColorMap[status]}`}>
                        {statusIconMap[status]}
                    </span>
                </>
            )}
        </div>
    )

    if (locked) {
        return content
    }

    return (
        <Link href={href}>
            {content}
        </Link>
    )
}
