"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { PlanTier, Tenant } from "@/lib/types"
import {
    Crown,
    Zap,
    Rocket,
    Check,
    X,
    ArrowRight,
    CreditCard,
    Settings,
    Shield,
    
    
    
    Loader2,
    AlertTriangle,
    ChevronLeft,
    Star,
    Sparkles,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════════════════════
   Plan Definitions
   ═══════════════════════════════════════════════════════════════════════ */

interface PlanFeature {
    label: string
    start: boolean | string
    pro: boolean | string
    elite: boolean | string
}

const FEATURES: PlanFeature[] = [
    { label: "Projetos ativos",          start: "5",         pro: "20",          elite: "Ilimitado" },
    { label: "CDT (Custo-Prazo-Escopo)", start: "Basico",    pro: "v2 Completo", elite: "v2 Completo" },
    { label: "War Room / Gabinete de Crise", start: false,   pro: true,          elite: true },
    { label: "MATED (analise euclidiana)", start: false,     pro: true,          elite: true },
    { label: "Monte Carlo Simulation",   start: false,       pro: true,          elite: true },
    { label: "Indice de Qualidade Ortico", start: false,     pro: true,          elite: true },
    { label: "API Access",               start: false,       pro: false,         elite: true },
    { label: "Priority Support",         start: false,       pro: false,         elite: true },
    { label: "Custom Branding",          start: false,       pro: false,         elite: true },
    { label: "Colaboradores",            start: "1",         pro: "5",           elite: "Ilimitado" },
]

interface PlanDef {
    id: PlanTier
    name: string
    price: string
    period: string
    tagline: string
    icon: React.ReactNode
    gradient: string
    glowColor: string
    borderColor: string
    badgeColor: string
}

const PLANS: PlanDef[] = [
    {
        id: "START",
        name: "Start",
        price: "R$ 0",
        period: "gratis para sempre",
        tagline: "Para freelancers e pequenos times explorando o Aura",
        icon: <Zap className="w-7 h-7" />,
        gradient: "from-slate-500 to-slate-400",
        glowColor: "rgba(148,163,184,0.12)",
        borderColor: "border-slate-600/40",
        badgeColor: "bg-slate-600 text-slate-200",
    },
    {
        id: "PRO",
        name: "Pro",
        price: "R$ 149",
        period: "/mes",
        tagline: "Engenharia de precisao para gestores profissionais",
        icon: <Rocket className="w-7 h-7" />,
        gradient: "from-blue-500 to-indigo-500",
        glowColor: "rgba(99,102,241,0.15)",
        borderColor: "border-indigo-500/40",
        badgeColor: "bg-indigo-600 text-white",
    },
    {
        id: "ELITE",
        name: "Elite",
        price: "Sob consulta",
        period: "",
        tagline: "Governanca corporativa com recursos exclusivos",
        icon: <Crown className="w-7 h-7" />,
        gradient: "from-amber-400 to-orange-500",
        glowColor: "rgba(245,158,11,0.15)",
        borderColor: "border-amber-500/40",
        badgeColor: "bg-amber-600 text-white",
    },
]

/* ═══════════════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function AssinaturaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [processingPlan, setProcessingPlan] = useState<PlanTier | null>(null)
    const [portalLoading, setPortalLoading] = useState(false)
    const [error, setError] = useState("")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [successMsg, setSuccessMsg] = useState("")

    const currentPlan: PlanTier = tenant?.plan_tier ?? tenant?.plan ?? "START"

    /* ── Load tenant data ──────────────────────────────────────────── */
    useEffect(() => {
        loadTenant()
    }, [])

    async function loadTenant() {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace("/login")
                return
            }

            const { data } = await supabase
                .from("tenants")
                .select("*")
                .eq("owner_id", session.user.id)
                .order("created_at")
                .limit(1)
                .maybeSingle()

            if (data) {
                setTenant(data as Tenant)
            }
        } catch (_err) {
            setError("Falha ao carregar dados da assinatura.")
        } finally {
            setLoading(false)
        }
    }

    /* ── Stripe Checkout ───────────────────────────────────────────── */
    const handleUpgrade = useCallback(async (planId: PlanTier) => {
        if (planId === currentPlan) return

        if (planId === "ELITE") {
            window.location.href = "mailto:enterprise@aura.app?subject=Upgrade para ELITE"
            return
        }

        setProcessingPlan(planId)
        setError("")

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace("/login")
                return
            }

            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ planId }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Falha ao iniciar checkout.")
                return
            }

            if (data.url) {
                window.location.href = data.url
            }
        } catch (_err) {
            setError("Erro de rede ao conectar com o servidor de pagamento.")
        } finally {
            setProcessingPlan(null)
        }
    }, [currentPlan, router])

    /* ── Stripe Portal ─────────────────────────────────────────────── */
    const handlePortal = useCallback(async () => {
        setPortalLoading(true)
        setError("")

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace("/login")
                return
            }

            const res = await fetch("/api/stripe/portal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Falha ao abrir portal de faturamento.")
                return
            }

            if (data.url) {
                window.location.href = data.url
            }
        } catch (_err) {
            setError("Erro de rede ao conectar com o portal.")
        } finally {
            setPortalLoading(false)
        }
    }, [router])

    /* ── Loading State ─────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-klauss animate-spin" />
                    <span className="text-sm font-mono uppercase tracking-widest text-slate-500">
                        Carregando assinatura...
                    </span>
                </div>
            </div>
        )
    }

    const planIndex = PLANS.findIndex(p => p.id === currentPlan)

    return (
        <div className="min-h-screen bg-surface text-white">
            {/* ── Background Decorations ──────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ── Navigation ──────────────────────────────────── */}
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition mb-8 group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar ao Dashboard
                </button>

                {/* ── Header ──────────────────────────────────────── */}
                <header className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent mb-3 uppercase tracking-tight">
                        Planos e Assinatura
                    </h1>
                    <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                        Escale sua engenharia com geometria analitica.
                        Escolha o plano ideal para seu portfolio.
                    </p>

                    {/* Current Plan Badge */}
                    <div className="mt-6 inline-flex items-center gap-3 bg-surface-raised/80 backdrop-blur-md border border-border-subtle rounded-2xl px-6 py-3">
                        <Shield className="w-4 h-4 text-zona-otimo-text" />
                        <span className="text-slate-400 text-sm font-medium">Plano atual:</span>
                        <span className={`font-black text-sm uppercase tracking-widest ${
                            currentPlan === "ELITE" ? "text-amber-400" :
                            currentPlan === "PRO" ? "text-indigo-400" :
                            "text-slate-300"
                        }`}>
                            {currentPlan}
                        </span>
                    </div>
                </header>

                {/* ── Upgrade CTA (START users only) ──────────────── */}
                {currentPlan === "START" && (
                    <div className="mb-10 mx-auto max-w-2xl bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl p-6 text-center animate-fade-in">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-bold text-white">Desbloqueie todo o potencial do Aura</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            Faca upgrade para PRO e acesse War Room, MATED, Monte Carlo e muito mais.
                        </p>
                        <button
                            onClick={() => handleUpgrade("PRO")}
                            disabled={processingPlan === "PRO"}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition shadow-glow-indigo hover:shadow-[0_0_40px_rgba(99,102,241,0.3)]"
                        >
                            {processingPlan === "PRO" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Rocket className="w-4 h-4" />
                            )}
                            Upgrade para PRO
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── Error / Success Messages ────────────────────── */}
                {error && (
                    <div className="mb-8 mx-auto max-w-2xl flex items-center gap-3 bg-zona-crise-bg border border-zona-crise-border rounded-xl p-4 animate-fade-in">
                        <AlertTriangle className="w-5 h-5 text-zona-crise-text flex-shrink-0" />
                        <span className="text-zona-crise-text text-sm font-medium">{error}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-8 mx-auto max-w-2xl flex items-center gap-3 bg-zona-otimo-bg border border-zona-otimo-border rounded-xl p-4 animate-fade-in">
                        <Check className="w-5 h-5 text-zona-otimo-text flex-shrink-0" />
                        <span className="text-zona-otimo-text text-sm font-medium">{successMsg}</span>
                    </div>
                )}

                {/* ── Plan Cards ──────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
                    {PLANS.map((plan, idx) => {
                        const isCurrent = currentPlan === plan.id
                        const isUpgrade = idx > planIndex
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const isDowngrade = idx < planIndex
                        const isRecommended = plan.id === "PRO"

                        return (
                            <div
                                key={plan.id}
                                className={`
                                    relative flex flex-col rounded-2xl p-[1px] transition-all duration-500
                                    ${isRecommended && !isCurrent ? "md:-translate-y-3" : ""}
                                    ${isCurrent ? "scale-[1.02] md:scale-105" : "hover:scale-[1.01]"}
                                `}
                                style={{
                                    background: isCurrent
                                        ? `linear-gradient(135deg, ${plan.glowColor}, transparent)`
                                        : undefined,
                                }}
                            >
                                {/* Glassmorphism Card */}
                                <div
                                    className={`
                                        relative flex flex-col h-full rounded-2xl p-6 lg:p-8
                                        bg-surface-raised/60 backdrop-blur-lg
                                        border ${isCurrent ? plan.borderColor : "border-border/60"}
                                        hover:border-border-subtle transition-colors duration-300
                                    `}
                                    style={{
                                        boxShadow: isCurrent
                                            ? `0 0 40px ${plan.glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`
                                            : "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
                                    }}
                                >
                                    {/* Recommended Badge */}
                                    {isRecommended && !isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-1 rounded-full text-2xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                            <Star className="w-3 h-3" />
                                            Recomendado
                                        </div>
                                    )}

                                    {/* Current Plan Badge */}
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zona-otimo text-white px-4 py-1 rounded-full text-2xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                                            <Shield className="w-3 h-3" />
                                            Seu Plano
                                        </div>
                                    )}

                                    {/* Plan Icon + Name */}
                                    <div className="mb-6 pt-2">
                                        <div className={`
                                            inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4
                                            bg-gradient-to-br ${plan.gradient} text-white shadow-lg
                                        `}>
                                            {plan.icon}
                                        </div>
                                        <h3 className="text-xl font-bold uppercase tracking-widest text-slate-200 mb-1">
                                            {plan.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{plan.tagline}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <span className="text-3xl lg:text-4xl font-black text-white">{plan.price}</span>
                                        {plan.period && (
                                            <span className="text-sm text-slate-500 ml-1">{plan.period}</span>
                                        )}
                                    </div>

                                    {/* Key features (compact) */}
                                    <ul className="flex-grow space-y-3 mb-8">
                                        {FEATURES.slice(0, 6).map((feat, i) => {
                                            const val = feat[plan.id.toLowerCase() as 'start' | 'pro' | 'elite']
                                            const hasFeature = val !== false

                                            return (
                                                <li key={i} className="flex items-center gap-3 text-sm">
                                                    {hasFeature ? (
                                                        <Check className="w-4 h-4 text-zona-otimo-text flex-shrink-0" />
                                                    ) : (
                                                        <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                                    )}
                                                    <span className={hasFeature ? "text-slate-300" : "text-slate-600"}>
                                                        {feat.label}
                                                        {typeof val === "string" && (
                                                            <span className="ml-1.5 text-2xs font-semibold text-klauss-text">
                                                                ({val})
                                                            </span>
                                                        )}
                                                    </span>
                                                </li>
                                            )
                                        })}
                                    </ul>

                                    {/* Action Button */}
                                    {isCurrent ? (
                                        <button
                                            disabled
                                            className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider bg-surface border border-border text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Plano Atual
                                        </button>
                                    ) : isUpgrade ? (
                                        <button
                                            onClick={() => handleUpgrade(plan.id)}
                                            disabled={!!processingPlan}
                                            className={`
                                                w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider
                                                transition-all duration-300 flex items-center justify-center gap-2
                                                bg-gradient-to-r ${plan.gradient} text-white
                                                hover:shadow-lg hover:brightness-110
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                            `}
                                            style={{
                                                boxShadow: `0 0 20px ${plan.glowColor}`,
                                            }}
                                        >
                                            {processingPlan === plan.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="w-4 h-4" />
                                            )}
                                            {processingPlan === plan.id ? "Processando..." : `Upgrade para ${plan.name}`}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider bg-surface-raised border border-border text-slate-600 cursor-not-allowed"
                                        >
                                            Incluido no seu plano
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Comparison Table ─────────────────────────────── */}
                <section className="mb-16">
                    <h2 className="text-xl font-bold text-center text-white mb-8 uppercase tracking-widest">
                        Comparativo completo
                    </h2>

                    <div className="bg-surface-raised/60 backdrop-blur-lg border border-border rounded-2xl overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-4 gap-0 border-b border-border">
                            <div className="p-4 lg:p-6">
                                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Recurso</span>
                            </div>
                            {PLANS.map(plan => (
                                <div
                                    key={plan.id}
                                    className={`p-4 lg:p-6 text-center ${
                                        currentPlan === plan.id
                                            ? "bg-zona-otimo-bg border-x border-zona-otimo-border"
                                            : ""
                                    }`}
                                >
                                    <span className={`text-sm font-bold uppercase tracking-widest ${
                                        currentPlan === plan.id ? "text-zona-otimo-text" : "text-slate-400"
                                    }`}>
                                        {plan.name}
                                    </span>
                                    {currentPlan === plan.id && (
                                        <span className="block text-2xs text-zona-otimo-text mt-0.5">Atual</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Table Body */}
                        {FEATURES.map((feat, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-4 gap-0 ${
                                    i < FEATURES.length - 1 ? "border-b border-border/50" : ""
                                } ${i % 2 === 0 ? "" : "bg-surface/30"}`}
                            >
                                <div className="p-4 lg:p-5 flex items-center">
                                    <span className="text-sm text-slate-300">{feat.label}</span>
                                </div>
                                {(["start", "pro", "elite"] as const).map(tier => {
                                    const val = feat[tier]
                                    const tierPlan = tier.toUpperCase() as PlanTier
                                    const isCurrentCol = currentPlan === tierPlan

                                    return (
                                        <div
                                            key={tier}
                                            className={`p-4 lg:p-5 flex items-center justify-center ${
                                                isCurrentCol ? "bg-zona-otimo-bg/50 border-x border-zona-otimo-border/30" : ""
                                            }`}
                                        >
                                            {val === true ? (
                                                <Check className="w-5 h-5 text-zona-otimo-text" />
                                            ) : val === false ? (
                                                <X className="w-5 h-5 text-slate-700" />
                                            ) : (
                                                <span className="text-sm font-semibold text-white">{val}</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Manage Subscription (PRO/ELITE) ─────────────── */}
                {(currentPlan === "PRO" || currentPlan === "ELITE") && (
                    <section className="mb-16">
                        <div className="mx-auto max-w-2xl bg-surface-raised/60 backdrop-blur-lg border border-border rounded-2xl p-8 text-center">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <CreditCard className="w-6 h-6 text-klauss-text" />
                                <h3 className="text-lg font-bold text-white">Gerenciar assinatura</h3>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">
                                Altere seu metodo de pagamento, veja faturas anteriores ou cancele sua assinatura
                                pelo portal seguro do Stripe.
                            </p>
                            <button
                                onClick={handlePortal}
                                disabled={portalLoading}
                                className="inline-flex items-center gap-2.5 bg-surface border border-border-subtle hover:border-klauss-border text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 hover:shadow-glow-indigo disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {portalLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Settings className="w-4 h-4" />
                                )}
                                {portalLoading ? "Abrindo portal..." : "Gerenciar no Stripe"}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </section>
                )}

                {/* ── Footer ──────────────────────────────────────── */}
                <footer className="text-center pb-12">
                    <p className="text-slate-600 text-xs">
                        Pagamentos processados com seguranca pelo Stripe.
                        Cancele a qualquer momento pelo portal de faturamento.
                    </p>
                </footer>
            </div>
        </div>
    )
}
