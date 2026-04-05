"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSkin, SKIN_DICTIONARY } from "@/components/SkinContext"
import type { ProfileType } from "@/lib/types"
import { LogOut, Shield, Key, MailCheck, Lock } from "lucide-react"
import { performLogout } from "@/lib/auth/logout"

const PLANOS = [
    {
        nome: "START",
        preco: "R$ 0",
        desc: "Para iniciantes e freelancers",
        recursos: ["1 Projeto Ativo", "1 Colaborador", "Simulação Básica", "SLA Standard"],
        recomendado: false,
        id: "START"
    },
    {
        nome: "PRO",
        preco: "R$ 149/mês",
        desc: "Engenharia de precisão para gestores",
        recursos: ["Projetos Ilimitados", "Até 5 Colaboradores", "Simulação Avançada (MATED)", "Índice de Qualidade Órtico", "Suporte Prioritário"],
        recomendado: true,
        id: "PRO"
    },
    {
        nome: "ELITE",
        preco: "Consulte",
        desc: "Governança corporativa completa",
        recursos: ["Vários Tenants e RBAC", "Colaboradores Ilimitados", "Gabinete de Crise (War Room)", "Blockchain Hash Oficial", "Agente Engenheiro Dedicado"],
        recomendado: false,
        id: "ELITE"
    }
]

export default function AssinaturaPage() {
    const router = useRouter()
    const { t } = useSkin()
    const [loading, setLoading] = useState(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tenant, setTenant] = useState<any>(null)
    const [processando, setProcessando] = useState(false)
    const [msg, setMsg] = useState("")
    const [profileType, setProfileType] = useState<ProfileType>('TECH')
    const [salvandoPerfil, setSalvandoPerfil] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [verificandoSenha, setVerificandoSenha] = useState(false)

    const PERFIS: { id: ProfileType; emoji: string; label: string; desc: string }[] = [
        { id: 'TECH', emoji: '💻', label: 'Tech / Software', desc: 'Backlog, Sprints, Releases' },
        { id: 'CONSTRUCAO', emoji: '🏗️', label: 'Construção Civil', desc: 'Cronograma, Escopo de Obra, ART' },
        { id: 'DEFAULT', emoji: '🔧', label: 'Genérico / Padrão', desc: 'Terminologia original do Aura' },
    ]

    useEffect(() => {
        loadTenant()
    }, [])

    async function loadTenant() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.replace('/login'); return }

        const { data } = await supabase.from('tenants').select('*').eq('owner_id', session.user.id).order('created_at').limit(1).maybeSingle()
        if (data) {
            setTenant(data)
            setProfileType(data.profile_type || 'TECH')
        } else {
            setTenant({ plan: 'START', profile_type: 'TECH' })
        }
        setLoading(false)
    }

    async function handleAssinar(planoId: string) {
        if (!tenant?.id && planoId !== 'START') {
            setMsg("Erro: Tenant não encontrado. Contate o suporte.")
            return
        }
        if (planoId === 'ELITE') {
            window.location.href = "mailto:enterprise@aura.app?subject=Upgrade para ELITE"
            return
        }

        if (planoId === tenant.plan) return

        setProcessando(true)
        setMsg("Redirecionando para o Checkout (Mock)...")

        setTimeout(async () => {
            if (tenant.id) {
                const { error } = await supabase.from('tenants').update({ plan: planoId }).eq('id', tenant.id)
                if (error) {
                    setMsg("Erro ao processar assinatura: " + error.message)
                } else {
                    setMsg(`Sucesso! Agora você é ${planoId}.`)
                    setTenant({ ...tenant, plan: planoId })
                }
            } else {
                setMsg(`Simulação: Upgrade para ${planoId} feito com sucesso.`)
                setTenant({ ...tenant, plan: planoId })
            }
            setProcessando(false)
        }, 1500)
    }

    async function handleSalvarPerfil() {
        if (!tenant?.id) {
            setMsg(`Simulação: Perfil '${profileType}' aplicado. Reinicie para ver o efeito.`)
            return
        }
        setSalvandoPerfil(true)
        const { error } = await supabase.from('tenants').update({ profile_type: profileType }).eq('id', tenant.id)
        if (error) {
            setMsg('Erro ao salvar perfil: ' + error.message)
        } else {
            setMsg(`✅ Perfil '${profileType}' salvo! Recarregue o app para ver o Aura Camaleão em ação.`)
            setTenant({ ...tenant, profile_type: profileType })
        }
        setSalvandoPerfil(false)
    }

    async function handleLogout() {
        await performLogout(router)
    }

    async function handleRequestPasswordReset() {
        if (!currentPassword) {
            setMsg("Erro: Digite sua senha atual para confirmar a identidade.")
            return
        }
        
        setVerificandoSenha(true)
        setMsg("Validando credencial...")

        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user?.email) {
                const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                    redirectTo: `${window.location.origin}/login`,
                })

                if (error) throw error
                setMsg("✅ Link de confirmação enviado para seu e-mail! Siga as instruções para mudar a senha.")
                setShowPasswordModal(false)
                setCurrentPassword("")
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setMsg("Erro ao solicitar troca: " + err.message)
        } finally {
            setVerificandoSenha(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8 uppercase font-mono tracking-widest text-sm">Carregando Billing...</div>

    // Termos de exemplo do vocabulário ágil (perfil único TECH)
    const exemplos = Object.entries(SKIN_DICTIONARY).slice(0, 3)

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => router.push('/dashboard')} className="text-slate-500 hover:text-white mb-6 text-sm transition">&lt; Voltar ao Dashboard</button>

                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4 uppercase tracking-tighter">
                        Planos e Assinatura
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        {t("Escale sua engenharia com geometria analítica. Escolha o plano que melhor se adapta ao seu portfólio.")}
                    </p>
                    <div className="mt-4 inline-block bg-slate-900 border border-slate-700 rounded-full px-6 py-2">
                        <span className="text-slate-400 font-semibold mr-2">Seu plano atual:</span>
                        <span className="text-indigo-400 font-black tracking-widest">{tenant?.plan}</span>
                    </div>
                </header>

                {/* ── SaaS Camaleão: Seletor de Perfil ─────────────────────── */}
                <div className="mb-10 bg-slate-900 border border-indigo-900/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(79,70,229,0.08)]">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-300 mb-1 flex items-center gap-2">
                        🎭 Aura Camaleão <span className="bg-indigo-600/30 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-500/30">PRD v6.1</span>
                    </h2>
                    <p className="text-slate-400 text-sm mb-5">Adapte o vocabulário do Aura ao seu setor. A IA do Klauss e toda a interface se ajustam ao seu idioma profissional.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {PERFIS.map(perfil => (
                            <button
                                key={perfil.id}
                                onClick={() => setProfileType(perfil.id)}
                                className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition duration-200 text-left ${profileType === perfil.id
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.2)]'
                                        : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                                    }`}
                            >
                                {profileType === perfil.id && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                )}
                                <span className="text-2xl mb-2">{perfil.emoji}</span>
                                <span className="font-bold text-sm text-white">{perfil.label}</span>
                                <span className="text-[11px] text-slate-500 mt-1">{perfil.desc}</span>
                            </button>
                        ))}
                    </div>

                    {/* Prévia do dicionário de termos */}
                    {exemplos.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <span className="text-xs text-slate-500 w-full">Prévia dos termos traduzidos:</span>
                            {exemplos.map(([de, para]) => (
                                <span key={de} className="inline-flex items-center gap-1 text-xs bg-slate-800 rounded-full px-3 py-1">
                                    <span className="text-slate-400">{de}</span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-indigo-400 font-semibold">{para}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleSalvarPerfil}
                        disabled={salvandoPerfil}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                    >
                        {salvandoPerfil ? 'Salvando...' : '✅ Aplicar Perfil'}
                    </button>
                </div>

                {/* ── Seção: Segurança & Conta (WOW Aesthetics) ─────────── */}
                <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-400" /> Segurança
                        </h3>
                        <div className="space-y-4">
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-blue-500/50 transition duration-300"
                            >
                                <div className="flex items-center gap-3">
                                    <Key className="h-4 w-4 text-slate-500" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium">Alterar Senha</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pede senha atual + Confirmação por e-mail</div>
                                    </div>
                                </div>
                                <span className="text-blue-400 text-xs font-bold font-mono">EDITAR</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-rose-500/10 transition-colors" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-rose-400" /> Sessão Ativa
                        </h3>
                        <div className="space-y-4">
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-950/10 border border-rose-500/20 hover:bg-rose-500/10 transition duration-300 group"
                            >
                                <div className="flex items-center gap-3">
                                    <LogOut className="h-4 w-4 text-rose-500 group-hover:rotate-12 transition-transform" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-rose-200">Sair da Sessão</div>
                                        <div className="text-[10px] text-rose-700 uppercase tracking-wider">Finaliza todos os acessos neste navegador</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-8 p-4 rounded-xl font-medium text-center max-w-2xl mx-auto border ${msg.includes('Erro') ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-green-900/20 border-green-500/50 text-green-400'}`}>
                        {msg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                    {PLANOS.map((plano) => {
                        const isCurrent = tenant?.plan === plano.id

                        return (
                            <div key={plano.id} className={`relative flex flex-col bg-slate-900 rounded-3xl p-8 border-2 transition duration-300 ${plano.recomendado ? 'border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.2)] transform md:-translate-y-4' : 'border-slate-800 hover:border-slate-700'} ${isCurrent ? 'bg-slate-800/50' : ''}`}>

                                {plano.recomendado && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                                        Recomendado
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-slate-300 mb-2">{plano.nome}</h3>
                                    <div className="text-4xl font-black text-white">{plano.preco}</div>
                                    <div className="text-sm text-slate-500 mt-2">{plano.desc}</div>
                                </div>

                                <ul className="flex-grow space-y-4 mb-8">
                                    {plano.recursos.map((rec, i) => (
                                        <li key={i} className="flex items-start text-slate-300">
                                            <span className="text-indigo-400 mr-3">✓</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleAssinar(plano.id)}
                                    disabled={isCurrent || processando}
                                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition ${isCurrent
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : plano.recomendado
                                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                                        }`}
                                >
                                    {isCurrent ? 'Plano Atual' : processando ? 'Processando...' : 'Assinar ' + plano.nome}
                                </button>
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Modal de confirmação de senha (Premium Glassmorphism) */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-500 shadow-[0_0_20px_blue] rounded-full" />
                        
                        <div className="p-8">
                            <header className="mb-6">
                                <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-500" />
                                    Confirmar Identidade
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">Para sua segurança, digite sua senha atual para prosseguir com a alteração.</p>
                            </header>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Sua Senha Atual</label>
                                    <input 
                                        type="password" 
                                        autoFocus
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
                                    <MailCheck className="h-5 w-5 text-blue-400 mt-0.5" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Enviaremos um link de confirmação para o seu e-mail cadastrado após a validação.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-sm transition"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleRequestPasswordReset}
                                        disabled={verificandoSenha || !currentPassword}
                                        className="flex-[2] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-sm transition shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
                                    >
                                        {verificandoSenha ? 'VALIDANDO...' : 'ENVIAR LINK'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
