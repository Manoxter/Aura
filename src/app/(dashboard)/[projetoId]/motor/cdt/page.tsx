'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Legacy route — CDT renamed to triangulo-matriz (Story 6.1 / Story 6.8)
export default function CdtRedirect() {
    const { projetoId } = useParams<{ projetoId: string }>()
    const router = useRouter()

    useEffect(() => {
        router.replace(`/${projetoId}/motor/triangulo-matriz`)
    }, [projetoId, router])

    return null
}
