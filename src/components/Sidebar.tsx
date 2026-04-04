'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
    FileText, Calendar, Activity, DollarSign,
    Settings, Users, LineChart, Columns3, AlertCircle, Siren, ShieldAlert,
    Layers, Clock, FlaskConical, Menu, X, Palette, LogOut, CreditCard, Command,
    LayoutGrid, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import Link from 'next/link'
import { useProject } from '@/context/ProjectContext'
import { IQBadge } from '@/components/aura/IQBadge'
import { AuraLogo } from '@/components/ui/AuraLogo'
import { useTechMode } from '@/hooks/useTechMode'
import { useSetupCompletion } from '@/hooks/useSetupCompletion'
import { SidebarGroup } from '@/components/layout/SidebarGroup'
import { SidebarItem } from '@/components/layout/SidebarItem'
import type { SidebarItemStatus } from '@/components/layout/SidebarItem'
import { SetupStepper } from '@/components/Setup/SetupStepper'
import { supabase } from '@/lib/supabase'

const SIDEBAR_KEY = 'aura_sidebar_collapsed'

// User-controlled collapse with localStorage persistence.
// Falls back to auto-collapse on md breakpoint only when no user preference stored.
function useIsCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        const stored = localStorage.getItem(SIDEBAR_KEY)
        if (stored !== null) {
            setCollapsed(stored === 'true')
        } else {
            // Default: auto-collapse at md breakpoint
            const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
            setCollapsed(mq.matches)
        }
    }, [])
    const toggle = () => {
        setCollapsed(prev => {
            const next = !prev
            localStorage.setItem(SIDEBAR_KEY, String(next))
            return next
        })
    }
    return [collapsed, toggle]
}

export function Sidebar() {
    const { projetoId } = useParams()
    const pathname = usePathname()
    const {
        isTapReady, isEapReady, isCpmReady, isOrcamentoReady,
        isFuncoesReady,
        isCalendarioReady, isMotorReady, iq, matedAtual, prazoBase
    } = useProject()
    const { isTechMode, toggleTechMode } = useTechMode()
    const { temNome, temTarefas, temEap, temDatas, percentual: setupPercent } = useSetupCompletion()
    const [isOpen, setIsOpen] = useState(false)
    const [isCollapsed, toggleCollapsed] = useIsCollapsed()
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [avatarOpen, setAvatarOpen] = useState(false)
    const avatarRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.auth.getUser().then(({ data }: { data: any }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [])

    // Close avatar dropdown on outside click
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
                setAvatarOpen(false)
            }
        }
        if (avatarOpen) document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [avatarOpen])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const userInitials = userEmail
        ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
        : '?'

    // Close on Esc key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false)
    }, [])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Close sidebar when route changes (mobile nav)
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    if (!projetoId || typeof projetoId !== 'string') {
        return (
            <>
                {/* Mobile hamburger — no project */}
                <button
                    className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    onClick={() => setIsOpen(v => !v)}
                    aria-label="Abrir menu"
                >
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:flex ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <Link href="/" className="hover:opacity-90 transition-opacity">
                            <AuraLogo size="sm" variant="full" />
                        </Link>
                    </div>
                    <div className="p-4 text-slate-400 text-sm">Selecione um projeto para continuar.</div>
                </aside>
                {/* Overlay */}
                {isOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                )}
            </>
        )
    }

    // ── SETUP items status ──
    const setupItemStatus = (ready: boolean): SidebarItemStatus => ready ? 'done' : 'pending'

    // SETUP group progress (4 criteria: nome, tarefas, eap, datas)
    const setupItems = [temNome, temTarefas, temEap, temDatas]
    const setupDone = setupItems.filter(Boolean).length
    const setupProgress = Math.round((setupDone / 4) * 100)

    // MOTOR blocked if SETUP < 60%
    const motorBlocked = setupPercent < 60

    // MOTOR group progress
    const motorItems = [isFuncoesReady, isMotorReady]
    const motorDone = motorItems.filter(Boolean).length
    const motorProgress = Math.round((motorDone / motorItems.length) * 100)

    const sidebarWidth = isCollapsed ? 'w-14' : 'w-64'

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                onClick={() => setIsOpen(v => !v)}
                aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Overlay — mobile only */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-slate-950 border-r border-slate-800 flex flex-col
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static md:flex md:sticky md:top-0 md:h-screen md:shrink-0 md:overflow-y-auto md:z-10
            `}>
                {/* Logo header — home button + collapse toggle */}
                <div className="h-16 flex items-center px-3 border-b border-slate-800 shrink-0 gap-2">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-1 min-w-0" title="Painel de Projetos">
                        {isCollapsed
                            ? <AuraLogo size="xs" variant="icon" />
                            : <AuraLogo size="sm" variant="full" className="truncate" />
                        }
                    </Link>
                    <button
                        onClick={toggleCollapsed}
                        className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                        title={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                        aria-label={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                    >
                        {isCollapsed
                            ? <PanelLeftOpen className="h-4 w-4" />
                            : <PanelLeftClose className="h-4 w-4" />
                        }
                    </button>
                </div>

                {/* IQ Badge */}
                {iq !== null && !isCollapsed && (
                    <div className="px-4 pt-3 pb-1">
                        <IQBadge iq={iq} mated={matedAtual} prazoBase={prazoBase} className="w-full justify-center" />
                    </div>
                )}

                <div className="p-3 space-y-5 flex-1 overflow-y-auto">

                    {/* ── GRUPO: SETUP ── */}
                    <SidebarGroup
                        label="SETUP"
                        progressPercent={setupProgress}
                        locked={false}
                        collapsed={isCollapsed}
                    >
                        {/* Compact stepper: visible when sidebar is expanded and setup not 100% */}
                        {!isCollapsed && setupPercent < 100 && (
                            <SetupStepper
                                variant="compact"
                                projetoId={typeof projetoId === 'string' ? projetoId : ''}
                            />
                        )}
                        <SidebarItem
                            label="TAP / Projeto"
                            icon={FileText}
                            href={`/${projetoId}/setup/tap`}
                            status={setupItemStatus(isTapReady)}
                            isActive={pathname === `/${projetoId}/setup/tap`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="WBS"
                            icon={Layers}
                            href={`/${projetoId}/setup/wbs`}
                            status={setupItemStatus(isEapReady)}
                            isActive={pathname === `/${projetoId}/setup/wbs`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Calendário"
                            icon={Calendar}
                            href={`/${projetoId}/setup/calendario`}
                            status={setupItemStatus(isCalendarioReady)}
                            isActive={pathname === `/${projetoId}/setup/calendario`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Tarefas e Diagramas"
                            icon={Clock}
                            href={`/${projetoId}/setup/tarefas-diagramas`}
                            status={setupItemStatus(isCpmReady)}
                            isActive={pathname === `/${projetoId}/setup/tarefas-diagramas`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Orçamento"
                            icon={DollarSign}
                            href={`/${projetoId}/setup/orcamento`}
                            status={setupItemStatus(isOrcamentoReady)}
                            isActive={pathname === `/${projetoId}/setup/orcamento`}
                            collapsed={isCollapsed}
                        />
                    </SidebarGroup>

                    {/* ── GRUPO: MOTOR ── */}
                    <SidebarGroup
                        label="MOTOR"
                        progressPercent={motorProgress}
                        locked={motorBlocked}
                        collapsed={isCollapsed}
                    >
                        <SidebarItem
                            label="Funções Motor"
                            icon={Activity}
                            href={`/${projetoId}/setup/funcoes`}
                            status={setupItemStatus(isFuncoesReady)}
                            isActive={pathname === `/${projetoId}/setup/funcoes`}
                            locked={motorBlocked}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Triângulo Matriz"
                            icon={Activity}
                            href={`/${projetoId}/motor/triangulo-matriz`}
                            status={isMotorReady ? 'done' : motorBlocked ? 'grey' : 'warning'}
                            isActive={pathname === `/${projetoId}/motor/triangulo-matriz`}
                            locked={motorBlocked}
                            collapsed={isCollapsed}
                        />
                    </SidebarGroup>

                    {/* ── DASHBOARD — sempre visível ── */}
                    <div className="pt-1">
                        <Link
                            href={`/${projetoId}`}
                            className={[
                                'flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all',
                                isCollapsed ? 'justify-center' : '',
                                isMotorReady
                                    ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border border-indigo-500/40 hover:border-indigo-400/70 text-indigo-300 hover:text-white shadow-[0_0_12px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                    : 'border border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700',
                            ].join(' ')}
                            title="Dashboard do Projeto"
                        >
                            <Command className={`h-4 w-4 shrink-0 ${isMotorReady ? 'text-indigo-400' : 'text-slate-600'}`} />
                            {!isCollapsed && (
                                <span className="tracking-wide uppercase text-xs">Dashboard</span>
                            )}
                        </Link>
                    </div>

                    {/* ── GRUPO: GOVERNANÇA ── */}
                    <SidebarGroup
                        label="GOVERNANÇA"
                        collapsed={isCollapsed}
                    >
                        <SidebarItem
                            label="Klauss IA"
                            icon={LineChart}
                            href={`/${projetoId}/decisao/ia`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/decisao/ia`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Gerenciamento"
                            icon={Settings}
                            href={`/${projetoId}/governanca/gerenciamento`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/governanca/gerenciamento`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="MATED"
                            icon={LineChart}
                            href={`/${projetoId}/decisao/mated`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/decisao/mated`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Kanban"
                            icon={Columns3}
                            href={`/${projetoId}/governanca/kanban`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/governanca/kanban`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Monitor de Razão"
                            icon={AlertCircle}
                            href={`/${projetoId}/governanca/relatorios`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/governanca/relatorios`}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Gabinete de Crise"
                            icon={Siren}
                            href={`/${projetoId}/governanca/gabinete`}
                            status="grey"
                            isActive={pathname.startsWith(`/${projetoId}/governanca/gabinete`)}
                            collapsed={isCollapsed}
                        />
                        <SidebarItem
                            label="Riscos"
                            icon={ShieldAlert}
                            href={`/${projetoId}/governanca/riscos`}
                            status="grey"
                            isActive={pathname === `/${projetoId}/governanca/riscos`}
                            collapsed={isCollapsed}
                        />
                    </SidebarGroup>

                    {/* ── GRUPO: DEV TOOLS (development only) ── */}
                    {process.env.NODE_ENV === 'development' && (
                        <SidebarGroup
                            label="DEV TOOLS"
                            collapsed={isCollapsed}
                        >
                            <SidebarItem
                                label="Design System"
                                icon={Palette}
                                href="/design-system"
                                status="grey"
                                isActive={pathname === '/design-system'}
                                collapsed={isCollapsed}
                            />
                        </SidebarGroup>
                    )}
                </div>

                {/* Footer: Portfólio + Modo Técnico + Avatar */}
                <div className="px-3 py-3 border-t border-slate-800 shrink-0 space-y-1">
                    {/* Portfólio */}
                    <Link
                        href="/dashboard"
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 ${isCollapsed ? 'justify-center' : ''}`}
                        title="Portfólio de Projetos"
                    >
                        <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
                        {!isCollapsed && <span>Gerenciar Portfólio</span>}
                    </Link>
                    {/* Modo Técnico */}
                    <button
                        onClick={toggleTechMode}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isTechMode
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                        title={isTechMode ? 'Desativar modo técnico (E/P/O)' : 'Ativar modo técnico (E/P/O)'}
                    >
                        <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" />
                        {!isCollapsed && <span>{isTechMode ? 'Modo Técnico Ativo' : 'Modo Técnico'}</span>}
                    </button>

                    {/* Avatar/User menu */}
                    <div ref={avatarRef} className="relative">
                        <button
                            onClick={() => setAvatarOpen(v => !v)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 ${isCollapsed ? 'justify-center' : ''}`}
                            title={userEmail ?? 'Conta'}
                        >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                                {userInitials}
                            </span>
                            {!isCollapsed && (
                                <span className="truncate flex-1 text-left">{userEmail ?? 'Conta'}</span>
                            )}
                        </button>

                        {avatarOpen && (
                            <div className={`absolute bottom-full mb-2 ${isCollapsed ? 'left-12' : 'left-0 right-0'} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 min-w-[180px]`}>
                                {!isCollapsed && userEmail && (
                                    <div className="px-4 py-3 border-b border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Conta</p>
                                        <p className="text-xs text-slate-300 truncate mt-0.5">{userEmail}</p>
                                    </div>
                                )}
                                <div className="p-1">
                                    <button
                                        onClick={() => { setAvatarOpen(false); router.push(`/${projetoId}/admin/planos`) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors text-left"
                                    >
                                        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                                        Conta e plano
                                    </button>
                                    <button
                                        onClick={() => { setAvatarOpen(false); router.push(`/${projetoId}/admin/perfis`) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors text-left"
                                    >
                                        <Users className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                                        Perfis de Acesso
                                    </button>
                                    <div className="my-1 border-t border-slate-800" />
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                                    >
                                        <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
                                        Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    )
}
