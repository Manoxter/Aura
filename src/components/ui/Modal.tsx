'use client'

// ---------------------------------------------------------------------------
// Modal — DS-8
//
// Reusable accessible modal dialog component.
// Accessibility:
//   - role="dialog", aria-modal="true", aria-labelledby
//   - Focus trap: Tab/Shift+Tab cycles within modal
//   - Esc closes modal
//   - Focus moves to close button on open
// WCAG: 4.1.2 (Name Role Value, AA), 2.1.1 (Keyboard, A)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  titleId?: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleId = 'modal-title',
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus trap: focus close button on open
    setTimeout(() => firstFocusableRef.current?.focus(), 50)

    // Trap Tab within modal, close on Esc
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const modal = overlayRef.current
      if (!modal) return
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={overlayRef}
    >
      <div
        className={`relative bg-surface-raised border border-border rounded-3xl shadow-modal w-full ${maxWidth} mx-4 p-6`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            aria-label="Fechar modal"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-surface-overlay transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
