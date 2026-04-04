'use client'

/**
 * AuthProvider (SaaS-1 — AC-8, AC-9 + SaaS-2 — AC-1, AC-8)
 *
 * Centralises Supabase onAuthStateChange so that:
 *  - The session token is refreshed automatically before expiry (SaaS-1 AC-8)
 *  - The listener is created once and cleaned up on unmount (no duplicates)
 *  - onboarding_completed status is exposed for first-visit redirect (SaaS-2 AC-1)
 *
 * Usage: wrap your root layout with <AuthProvider>.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  session: Session | null
  loading: boolean
  /** null = not yet fetched; true/false = fetched value */
  onboardingCompleted: boolean | null
  /** Re-fetch onboarding_completed from DB (call after onboarding finishes) */
  refreshOnboarding: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  onboardingCompleted: null,
  refreshOnboarding: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  async function fetchOnboarding(userId: string) {
    const { data } = await supabase
      .from('tenants')
      .select('onboarding_completed')
      .eq('owner_id', userId)
      .maybeSingle()

    // If no tenant row yet (brand-new user) treat as not completed
    setOnboardingCompleted(data?.onboarding_completed ?? false)
  }

  const refreshOnboarding = async () => {
    const { data: { session: current } } = await supabase.auth.getSession()
    if (current?.user?.id) {
      await fetchOnboarding(current.user.id)
    }
  }

  useEffect(() => {
    // Hydrate initial session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user?.id) {
        fetchOnboarding(data.session.user.id)
      } else {
        setOnboardingCompleted(null)
      }
    })

    // Subscribe — Supabase calls TOKEN_REFRESHED automatically before expiry
    const {
      data: { subscription },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = supabase.auth.onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        fetchOnboarding(newSession.user.id)
      } else {
        setOnboardingCompleted(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, loading, onboardingCompleted, refreshOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext)
}
