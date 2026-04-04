'use client'

import React from 'react'
import Link from 'next/link'
import { useSetupCompletion, type StepStatus, type SetupStep } from '@/hooks/useSetupCompletion'

// ── Color maps by status ──────────────────────────────────────────────────────

const statusDotColor: Record<StepStatus, string> = {
    complete: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    'in-progress': 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    pending: 'bg-slate-600',
    blocked: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
}

const statusIconChar: Record<StepStatus, string> = {
    complete: '✓',
    'in-progress': '●',
    pending: '○',
    blocked: '✗',
}

const statusIconColor: Record<StepStatus, string> = {
    complete: 'text-emerald-400',
    'in-progress': 'text-amber-400',
    pending: 'text-slate-500',
    blocked: 'text-rose-400',
}

const statusBorderColor: Record<StepStatus, string> = {
    complete: 'border-emerald-500/30',
    'in-progress': 'border-amber-400/30',
    pending: 'border-slate-700',
    blocked: 'border-rose-500/30',
}

const statusBgColor: Record<StepStatus, string> = {
    complete: 'bg-emerald-500/10',
    'in-progress': 'bg-amber-400/10',
    pending: 'bg-slate-800/50',
    blocked: 'bg-rose-500/10',
}

// ── Compact variant (horizontal dots for sidebar) ─────────────────────────────

interface CompactStepProps {
    step: SetupStep
}

function CompactStep({ step }: CompactStepProps) {
    return (
        <div
            title={`${step.label}: ${step.detalhe}`}
            className="flex flex-col items-center gap-0.5"
        >
            <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotColor[step.status]}`}
            />
        </div>
    )
}

// ── Expanded variant (vertical list for dashboard) ────────────────────────────

interface ExpandedStepProps {
    step: SetupStep
    isLast: boolean
}

function ExpandedStep({ step, isLast }: ExpandedStepProps) {
    return (
        <div className="flex gap-4">
            {/* Icon column */}
            <div className="flex flex-col items-center">
                <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border ${statusBgColor[step.status]} ${statusBorderColor[step.status]} ${statusIconColor[step.status]}`}
                >
                    {statusIconChar[step.status]}
                </div>
                {!isLast && (
                    <div className="flex-1 w-px bg-slate-800 my-1" />
                )}
            </div>

            {/* Content column */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${statusIconColor[step.status]}`}>
                        {step.label}
                    </p>
                    {step.ctaLabel && step.ctaHref && step.status !== 'blocked' && (
                        <Link
                            href={step.ctaHref}
                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors shrink-0 whitespace-nowrap"
                        >
                            {step.ctaLabel}
                        </Link>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{step.detalhe}</p>
            </div>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

interface SetupStepperProps {
    variant: 'compact' | 'expanded'
    projetoId: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SetupStepper({ variant, projetoId: _projetoId }: SetupStepperProps) {
    const { steps, percentual } = useSetupCompletion()

    if (variant === 'compact') {
        return (
            <div
                data-testid="setup-stepper-compact"
                className="mx-3 mb-2 flex items-center gap-1.5"
                title={`Setup ${percentual}% completo`}
            >
                {steps.map((step) => (
                    <CompactStep key={step.id} step={step} />
                ))}
                <span className="ml-auto text-[10px] font-bold text-slate-500 tabular-nums">
                    {percentual}%
                </span>
            </div>
        )
    }

    return (
        <div
            data-testid="setup-stepper-expanded"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 pt-4 pb-1"
        >
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Progresso do Setup
                </p>
                <span className="text-xs font-bold text-slate-300 tabular-nums">
                    {percentual}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${
                        percentual >= 75 ? 'bg-emerald-500' :
                        percentual >= 50 ? 'bg-cyan-500' :
                        percentual >= 25 ? 'bg-amber-400' :
                        'bg-rose-500'
                    }`}
                    style={{ width: `${percentual}%` }}
                />
            </div>

            {/* Steps */}
            <div>
                {steps.map((step, idx) => (
                    <ExpandedStep
                        key={step.id}
                        step={step}
                        isLast={idx === steps.length - 1}
                    />
                ))}
            </div>
        </div>
    )
}
