'use client'

/**
 * SetupContinueBanner — SaaS-2 AC-6
 *
 * Displayed in the dashboard when the user hasn't completed setup.
 * Hides automatically once the user has at least 1 project with tasks
 * (i.e., onboarding_completed = true and projetos count > 0).
 *
 * Uses useFirstVisit to allow dismissal per session.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Rocket } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFirstVisit } from '@/hooks/useFirstVisit'

interface BannerState {
  show: boolean
  projectId: string | null
}

export default function SetupContinueBanner() {
  const router = useRouter()
  const { markVisited: dismissBanner } = useFirstVisit('setup-banner-dismissed')
  const [state, setState] = useState<BannerState>({ show: false, projectId: null })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      // Check onboarding_completed in tenants
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, onboarding_completed')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      if (!tenant || tenant.onboarding_completed) return

      // Find first project (if any)
      const { data: projetos } = await supabase
        .from('projetos')
        .select('id')
        .order('criado_em', { ascending: true })
        .limit(1)

      setState({
        show: true,
        projectId: projetos?.[0]?.id ?? null,
      })
    }

    check()
  }, [])

  function handleDismiss() {
    setDismissed(true)
    dismissBanner()
  }

  function handleContinue() {
    if (state.projectId) {
      router.push(`/${state.projectId}/setup/tap`)
    } else {
      router.push('/onboarding')
    }
  }

  if (!state.show || dismissed) return null

  return (
    <div className="relative flex items-center gap-4 bg-zona-seguro/10 border border-zona-seguro/30 rounded-2xl px-5 py-4 mb-6">
      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-zona-seguro/20 shrink-0">
        <Rocket className="h-5 w-5 text-zona-seguro-text" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Continue o setup do seu projeto</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Seu projeto foi criado, mas ainda não tem TAP, CPM nem orçamento configurados.
        </p>
      </div>

      <button
        onClick={handleContinue}
        className="shrink-0 bg-zona-seguro hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
      >
        Continuar Setup
      </button>

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Fechar banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
