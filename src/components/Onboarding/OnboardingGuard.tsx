'use client'

/**
 * OnboardingGuard — SaaS-2 AC-1
 *
 * Wrap protected pages with this component.
 * After auth loading settles, if onboarding_completed is false (first visit),
 * redirects the user to /onboarding.
 *
 * Skip logic:  if user lands on /onboarding and taps "Pular", the flag is set
 * to true and they reach /dashboard directly — guard never fires again.
 *
 * Usage (e.g., in dashboard layout):
 *   <OnboardingGuard>
 *     {children}
 *   </OnboardingGuard>
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
}

const EXEMPT_PATHS = ['/onboarding', '/login', '/register', '/forgot-password', '/reset-password', '/']

export default function OnboardingGuard({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading, onboardingCompleted } = useAuth()

  useEffect(() => {
    // Wait for auth + onboarding status to resolve
    if (loading) return
    if (onboardingCompleted === null) return

    // Not authenticated → middleware handles redirect to /login
    if (!session) return

    // Already on an exempt path
    if (EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return

    // Redirect to onboarding if not completed
    if (!onboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [loading, session, onboardingCompleted, pathname, router])

  return <>{children}</>
}
