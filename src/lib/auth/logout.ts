/**
 * Centralised logout helper (SaaS-1 — AC-9)
 *
 * Calls supabase.auth.signOut() and delegates context reset via a callback
 * so the caller (component with useProject access) can clear the
 * ProjectContext before the /login redirect.
 *
 * Usage:
 *   import { performLogout } from '@/lib/auth/logout'
 *   // In a component that has access to resetContext:
 *   const { resetContext } = useProject()
 *   await performLogout(router, resetContext)
 */

import { supabase } from '@/lib/supabase'
import { clearAuraStorage } from '@/lib/storage/local-storage'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export async function performLogout(
  router: AppRouterInstance,
  onBeforeRedirect?: () => void,
): Promise<void> {
  // 1. Clear ProjectContext (or any other local state) first
  onBeforeRedirect?.()

  // Story 8.7: limpa dados de sessão com prefixo aura_ do localStorage
  clearAuraStorage()

  // 2. Sign out from Supabase (invalidates server session / cookies)
  await supabase.auth.signOut()

  // 3. Redirect to login
  router.replace('/login')
}
