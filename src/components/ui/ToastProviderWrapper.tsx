'use client'

// ---------------------------------------------------------------------------
// ToastProviderWrapper — DS-2
//
// Thin 'use client' boundary that wraps ToastProvider + ToastContainer so
// that layout.tsx can remain a Server Component while still providing the
// global toast context to the entire app.
// ---------------------------------------------------------------------------

import { type ReactNode } from 'react'
import { ToastProvider } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

export function ToastProviderWrapper({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            {children}
            <ToastContainer />
        </ToastProvider>
    )
}

export default ToastProviderWrapper
