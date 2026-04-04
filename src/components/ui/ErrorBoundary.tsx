'use client'

// ---------------------------------------------------------------------------
// ErrorBoundary — SaaS-7
//
// React class component required for componentDidCatch lifecycle.
// Wraps critical routes to prevent white-screen crashes.
// - Production: generic message only, no stack trace exposed
// - Development: full stack trace shown for debugging
// ---------------------------------------------------------------------------

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logError } from '@/lib/logger'

interface Props {
    children: ReactNode
    /** Optional custom fallback UI override */
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    componentStack: string | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            componentStack: null,
        }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            componentStack: null,
        }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        const route =
            typeof window !== 'undefined' ? window.location.pathname : 'unknown'

        logError({
            message: error.message,
            stack: error.stack,
            context: {
                componentStack: info.componentStack,
                timestamp: new Date().toISOString(),
                route,
            },
        })

        // Store componentStack in state for development display
        this.setState({ componentStack: info.componentStack ?? null })
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, componentStack: null })
    }

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children
        }

        if (this.props.fallback) {
            return this.props.fallback
        }

        const isDev = process.env.NODE_ENV === 'development'

        return (
            <div className="min-h-[200px] flex items-center justify-center p-8">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                    {/* Icon */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <svg
                                className="h-5 w-5 text-rose-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-white">
                            Algo deu errado nesta seção
                        </h2>
                    </div>

                    <p className="text-slate-400 text-sm mb-6">
                        Ocorreu um erro inesperado. Você pode tentar novamente ou entrar em
                        contato com o suporte.
                    </p>

                    {/* Development-only stack trace */}
                    {isDev && this.state.error && (
                        <details className="mb-6 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                            <summary className="px-4 py-2 text-[11px] font-mono font-bold text-amber-400 cursor-pointer uppercase tracking-wider">
                                [DEV] Stack trace
                            </summary>
                            <div className="px-4 pb-4">
                                <pre className="text-[10px] text-rose-300 font-mono whitespace-pre-wrap break-all mt-2">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                                {this.state.componentStack && (
                                    <>
                                        <p className="text-[10px] font-bold text-amber-400 font-mono mt-3 mb-1 uppercase">
                                            Component Stack:
                                        </p>
                                        <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap break-all">
                                            {this.state.componentStack}
                                        </pre>
                                    </>
                                )}
                            </div>
                        </details>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={this.handleReset}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                        >
                            Tentar novamente
                        </button>
                        <a
                            href="mailto:suporte@aura.app"
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition border border-slate-700"
                        >
                            Suporte
                        </a>
                    </div>
                </div>
            </div>
        )
    }
}

export default ErrorBoundary
