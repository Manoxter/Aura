'use client'

import React from 'react'
import Link from 'next/link'

export type EmptyStateZona = 'otimo' | 'seguro' | 'risco' | 'crise' | 'info'

export interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    ctaLabel?: string
    ctaHref?: string
    zona?: EmptyStateZona
    children?: React.ReactNode
}

const zonaStyles: Record<EmptyStateZona, {
    iconBg: string
    iconText: string
    titleText: string
    border: string
    ctaBg: string
    ctaHover: string
    ctaText: string
}> = {
    info: {
        iconBg: 'bg-blue-500/10',
        iconText: 'text-blue-400',
        titleText: 'text-blue-100',
        border: 'border-blue-900/40',
        ctaBg: 'bg-blue-600',
        ctaHover: 'hover:bg-blue-500',
        ctaText: 'text-white',
    },
    otimo: {
        iconBg: 'bg-emerald-500/10',
        iconText: 'text-emerald-400',
        titleText: 'text-emerald-100',
        border: 'border-emerald-900/40',
        ctaBg: 'bg-emerald-600',
        ctaHover: 'hover:bg-emerald-500',
        ctaText: 'text-white',
    },
    seguro: {
        iconBg: 'bg-cyan-500/10',
        iconText: 'text-cyan-400',
        titleText: 'text-cyan-100',
        border: 'border-cyan-900/40',
        ctaBg: 'bg-cyan-600',
        ctaHover: 'hover:bg-cyan-500',
        ctaText: 'text-white',
    },
    risco: {
        iconBg: 'bg-amber-500/10',
        iconText: 'text-amber-400',
        titleText: 'text-amber-100',
        border: 'border-amber-900/40',
        ctaBg: 'bg-amber-500',
        ctaHover: 'hover:bg-amber-400',
        ctaText: 'text-slate-900',
    },
    crise: {
        iconBg: 'bg-rose-500/10',
        iconText: 'text-rose-400',
        titleText: 'text-rose-100',
        border: 'border-rose-900/40',
        ctaBg: 'bg-rose-600',
        ctaHover: 'hover:bg-rose-500',
        ctaText: 'text-white',
    },
}

export function EmptyState({
    icon,
    title,
    description,
    ctaLabel,
    ctaHref,
    zona = 'info',
    children,
}: EmptyStateProps) {
    const styles = zonaStyles[zona]

    return (
        <div
            data-testid="empty-state"
            className={`flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border ${styles.border} bg-slate-900/60 animate-in fade-in duration-300`}
        >
            {icon && (
                <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-5 ${styles.iconBg}`}>
                    <span className={styles.iconText}>{icon}</span>
                </div>
            )}

            <h3 className={`text-lg font-bold mb-2 ${styles.titleText}`}>{title}</h3>

            {description && (
                <p className="text-slate-400 text-sm max-w-xs mb-5 leading-relaxed">{description}</p>
            )}

            {children && (
                <div className="mb-5 w-full max-w-xs">{children}</div>
            )}

            {ctaLabel && ctaHref && (
                <Link
                    href={ctaHref}
                    data-testid="empty-state-cta"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${styles.ctaBg} ${styles.ctaHover} ${styles.ctaText}`}
                >
                    {ctaLabel}
                </Link>
            )}
        </div>
    )
}

// ─── Inline SVG illustrations ───────────────────────────────────────────────

export function TasksEmptyIllustration({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="20" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="24" y1="22" x2="24" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="24" cy="25.5" r="0.5" fill="currentColor" />
        </svg>
    )
}

export function EapEmptyIllustration({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <rect x="12" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="16" y1="8" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="8" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="12" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <rect x="14" y="12" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <rect x="20" y="12" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
    )
}

export function CpmEmptyIllustration({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <circle cx="6" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="26" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="9" y1="14" x2="13" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="17.5" x2="13" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
            <line x1="19" y1="9.5" x2="23" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
            <line x1="19" y1="22" x2="23" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
        </svg>
    )
}

export function DashboardEmptyIllustration({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <polygon points="16,4 28,26 4,26" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3 2" />
            <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="16" y1="12" x2="16" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5" />
            <line x1="13.5" y1="16.5" x2="4" y2="26" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5" />
            <line x1="18.5" y1="16.5" x2="28" y2="26" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5" />
        </svg>
    )
}

export function KlaussEmptyIllustration({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <rect x="4" y="6" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 20 L8 26 L14 22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="10" cy="13" r="1.5" fill="currentColor" opacity="0.6" />
            <circle cx="14" cy="13" r="1.5" fill="currentColor" opacity="0.6" />
            <circle cx="18" cy="13" r="1.5" fill="currentColor" opacity="0.6" />
            <circle cx="26" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
            <line x1="24.5" y1="7" x2="27.5" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="24.5" y1="9" x2="27.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    )
}
