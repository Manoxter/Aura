'use client'

/**
 * useFirstVisit — SaaS-2 AC-9
 *
 * Tracks first-visit state for a given section key using localStorage.
 * Returns `isFirstVisit: true` on the first render (no prior visit recorded),
 * and `false` after `markVisited()` is called.
 *
 * Storage key: `aura-visited-${sectionKey}`
 */

import { useState, useEffect, useCallback } from 'react'

export interface UseFirstVisitReturn {
  isFirstVisit: boolean
  markVisited: () => void
}

export function useFirstVisit(sectionKey: string): UseFirstVisitReturn {
  const storageKey = `aura-visited-${sectionKey}`

  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    try {
      const visited = localStorage.getItem(storageKey)
      setIsFirstVisit(visited === null)
    } catch {
      // SSR or private browsing — treat as visited to avoid annoying tooltips
      setIsFirstVisit(false)
    }
  }, [storageKey])

  const markVisited = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // Ignore localStorage errors silently
    }
    setIsFirstVisit(false)
  }, [storageKey])

  return { isFirstVisit, markVisited }
}
