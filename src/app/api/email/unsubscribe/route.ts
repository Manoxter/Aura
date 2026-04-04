import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

// SEC-04: valida token com HMAC-SHA256
// Formato novo:  btoa(`${projectId}:${userId}:${hmacHex}`)
// Formato legado: btoa(`${projectId}:${userId}`) — aceito apenas em modo compat
function verifyUnsubscribeToken(token: string): { projectId: string; userId: string } {
    const decoded = atob(token)
    const parts = decoded.split(':')

    if (parts.length === 3) {
        // Formato seguro: projectId:userId:hmacSig
        const [projectId, userId, sig] = parts
        if (!projectId || !userId || !sig) throw new Error('Malformed token')

        const secret = process.env.UNSUBSCRIBE_SECRET || ''
        if (!secret) throw new Error('UNSUBSCRIBE_SECRET not configured')

        const expected = createHmac('sha256', secret)
            .update(`${projectId}:${userId}`)
            .digest('hex')

        // timingSafeEqual previne timing attacks
        const sigBuf = Buffer.from(sig.padEnd(expected.length, '0').slice(0, expected.length))
        const expBuf = Buffer.from(expected)
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
            throw new Error('Invalid signature')
        }
        return { projectId, userId }
    }

    if (parts.length === 2) {
        // Formato legado (base64 simples) — aceito apenas se UNSUBSCRIBE_SECRET não estiver configurado
        // Quando secret for definido, legado é rejeitado
        const secret = process.env.UNSUBSCRIBE_SECRET || ''
        if (secret) throw new Error('Legacy token rejected — HMAC required')
        const [projectId, userId] = parts
        if (!projectId || !userId) throw new Error('Invalid token')
        return { projectId, userId }
    }

    throw new Error('Invalid token format')
}

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    try {
        const { projectId, userId } = verifyUnsubscribeToken(token)

        const supabase = getSupabaseAdmin()
        await supabase
            .from('project_members')
            .update({ email_alerts_enabled: false })
            .eq('projeto_id', projectId)
            .eq('user_id', userId)

        return new NextResponse(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Cancelado</title></head>
      <body style="font-family:system-ui;text-align:center;padding:60px;background:#0a0a0a;color:#e2e8f0;">
        <h2>Alertas cancelados</h2>
        <p style="color:#94a3b8;">Você não receberá mais alertas por email para este projeto.</p>
      </body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
    } catch {
        return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 })
    }
}
