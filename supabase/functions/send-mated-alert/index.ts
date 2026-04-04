import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ZonaMATED = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

interface AlertPayload {
  project_id: string
  project_name: string
  zona: ZonaMATED
  lado_e: number
  lado_p: number
  lado_o: number
  tenant_id: string
}

const ZONE_COLORS: Record<ZonaMATED, string> = {
  OTIMO: '#10b981',
  SEGURO: '#3b82f6',
  RISCO: '#f59e0b',
  CRISE: '#f43f5e',
}

const ZONE_LABELS: Record<ZonaMATED, string> = {
  OTIMO: 'Ótimo',
  SEGURO: 'Seguro',
  RISCO: 'Risco',
  CRISE: 'Crise',
}

function buildAlertEmailHtml(payload: AlertPayload, unsubscribeToken: string): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://app.aura.app'
  const projectUrl = `${siteUrl}/${payload.project_id}/governanca/triangulo`
  const unsubscribeUrl = `${siteUrl}/api/email/unsubscribe?token=${unsubscribeToken}`
  const zoneColor = ZONE_COLORS[payload.zona]
  const zoneLabel = ZONE_LABELS[payload.zona]
  const isCrise = payload.zona === 'CRISE'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta MATED — ${payload.project_name}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
    <!-- Header zone-colored -->
    <div style="background:${zoneColor}20;border-bottom:2px solid ${zoneColor};padding:24px 40px;display:flex;align-items:center;gap:12px;">
      <div style="background:${zoneColor};border-radius:50%;width:12px;height:12px;flex-shrink:0;"></div>
      <div>
        <p style="color:${zoneColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0;">
          ${isCrise ? '⚠️ ALERTA CRÍTICO' : '⚠️ ALERTA'} · ZONA ${zoneLabel.toUpperCase()}
        </p>
        <h2 style="color:#e2e8f0;font-size:18px;font-weight:700;margin:4px 0 0;">${payload.project_name}</h2>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        ${isCrise
          ? `O projeto <strong style="color:#e2e8f0;">${payload.project_name}</strong> entrou na <strong style="color:${zoneColor};">Zona de Crise</strong>. Ação imediata recomendada.`
          : `O projeto <strong style="color:#e2e8f0;">${payload.project_name}</strong> está na <strong style="color:${zoneColor};">Zona de Risco</strong> há mais de 24 horas sem ação registrada.`
        }
      </p>
      <!-- Triangle state -->
      <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Triângulo Atual (TA)</p>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div style="text-align:center;">
            <p style="color:#3b82f6;font-size:24px;font-weight:700;margin:0;">${payload.lado_e.toFixed(2)}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Escopo (E)</p>
          </div>
          <div style="text-align:center;">
            <p style="color:#f59e0b;font-size:24px;font-weight:700;margin:0;">${payload.lado_p.toFixed(2)}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Prazo (P)</p>
          </div>
          <div style="text-align:center;">
            <p style="color:#10b981;font-size:24px;font-weight:700;margin:0;">${payload.lado_o.toFixed(2)}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Orçamento (O)</p>
          </div>
        </div>
      </div>
      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${projectUrl}" style="display:inline-block;background:${zoneColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;">
          Ver Projeto
        </a>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0 0 8px;">Aura · Sistema de Gestão de Projetos</p>
      <a href="${unsubscribeUrl}" style="color:#475569;font-size:11px;">Cancelar alertas por email para este projeto</a>
    </div>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'alertas@aura.app'
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: AlertPayload = await req.json()
    const { project_id, project_name, zona, tenant_id } = payload

    if (!['RISCO', 'CRISE'].includes(zona)) {
      return new Response(JSON.stringify({ skipped: true, reason: 'zona not alertable' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Throttle: check if email was sent in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentAlert } = await supabase
      .from('decisoes_mated')
      .select('id, criado_em')
      .eq('projeto_id', project_id)
      .eq('email_sent', true)
      .gte('criado_em', oneHourAgo)
      .limit(1)
      .single()

    if (recentAlert) {
      return new Response(JSON.stringify({ skipped: true, reason: 'throttled (1h)' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get project members with active email alerts (not opted out)
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id, status, email_alerts_enabled')
      .eq('projeto_id', project_id)
      .eq('status', 'active')
      .neq('email_alerts_enabled', false) // null or true = enabled

    if (!members?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no active members' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get tenant owner email too
    const { data: tenant } = await supabase
      .from('tenants')
      .select('owner_id')
      .eq('id', tenant_id)
      .single()

    const userIds = [...new Set([
      ...(members?.map((m: { user_id: string }) => m.user_id) || []),
      tenant?.owner_id,
    ].filter(Boolean))]

    // Get emails from auth.users (service role required)
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const emailMap = Object.fromEntries(users.map((u: { id: string; email?: string }) => [u.id, u.email]))

    // SEC-04: Generate HMAC-SHA256 unsubscribe token
    const unsubSecret = Deno.env.get('UNSUBSCRIBE_SECRET') || ''
    const sent: string[] = []
    for (const userId of userIds) {
      const email = emailMap[userId as string]
      if (!email) continue

      let unsubToken: string
      if (unsubSecret) {
        // Formato seguro: btoa(`projectId:userId:hmacHex`)
        const data = `${project_id}:${userId}`
        const key = await crypto.subtle.importKey(
          'raw', new TextEncoder().encode(unsubSecret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        )
        const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
        const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
        unsubToken = btoa(`${data}:${sigHex}`)
      } else {
        // Fallback legado — apenas quando UNSUBSCRIBE_SECRET não estiver configurado
        unsubToken = btoa(`${project_id}:${userId}`)
      }
      const html = buildAlertEmailHtml(payload, unsubToken)

      if (resendApiKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `Aura Alertas <${smtpFrom}>`,
            to: [email],
            subject: `⚠️ Alerta MATED: ${project_name} — Zona ${ZONE_LABELS[zona]}`,
            html,
          }),
        })
        if (res.ok) sent.push(email)
      } else {
        console.log(`[MATED ALERT] Zona: ${zona}, Project: ${project_name}, To: ${email}`)
        sent.push(email)
      }
    }

    // Mark email_sent in a recent decisoes_mated row
    await supabase
      .from('decisoes_mated')
      .update({ email_sent: true })
      .eq('projeto_id', project_id)
      .order('criado_em', { ascending: false })
      .limit(1)

    return new Response(JSON.stringify({ sent: sent.length, emails: sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-mated-alert error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
