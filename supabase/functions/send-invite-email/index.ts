import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  to_email: string
  project_name: string
  invited_by_name: string
  invite_token: string
  role: 'admin' | 'editor' | 'viewer'
}

function buildInviteEmailHtml(payload: InvitePayload): string {
  const roleLabel = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador' }[payload.role]
  const acceptUrl = `${Deno.env.get('SITE_URL') || 'https://app.aura.app'}/convite/${payload.invite_token}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Aura</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">AURA</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Gestão de Projetos com Método Triângulo</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="color:#e2e8f0;font-size:20px;margin:0 0 16px;">Você foi convidado!</h2>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#e2e8f0;">${payload.invited_by_name}</strong> convidou você para colaborar no projeto
        <strong style="color:#e2e8f0;">${payload.project_name}</strong> como <strong style="color:#818cf8;">${roleLabel}</strong>.
      </p>
      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${acceptUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;">
          Aceitar Convite
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
        Este convite expira em <strong>7 dias</strong>. Se não esperava este email, ignore-o.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">Aura · Sistema de Gestão de Projetos · <a href="https://aura.app" style="color:#6366f1;">aura.app</a></p>
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
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'noreply@aura.app'

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: InvitePayload = await req.json()
    const { to_email, project_name, invite_token } = payload

    if (!to_email || !project_name || !invite_token) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const _supabase = createClient(supabaseUrl, supabaseServiceKey)
    void _supabase // used for future DB ops if needed

    const html = buildInviteEmailHtml(payload)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `Aura <${smtpFrom}>`,
          to: [to_email],
          subject: `Convite para ${project_name} no Aura`,
          html,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(`Resend error: ${JSON.stringify(err)}`)
      }
    } else {
      // Log for development — no SMTP configured
      console.log(`[INVITE EMAIL] To: ${to_email}, Project: ${project_name}, Token: ${invite_token}`)
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-invite-email error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
