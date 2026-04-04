# Story SaaS-5 — Email Transacional: Convites e Alertas Críticos
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @dev (Dex)
**Agentes:** @dev (Dex), @aura-klauss, @aura-pm (Dr. Kenji)
**Pré-requisito:** SaaS-3 (Convites de membros), Story 5.5 (alertas MATED automáticos)

---

## User Story
Como usuário do Aura,
quero receber emails transacionais quando acontecem eventos críticos (convites, alertas de projeto),
para que eu saiba de mudanças importantes mesmo quando não estou com o app aberto.

## Background
O Supabase tem um sistema de email integrado (SMTP configurável) mas o Aura usa apenas o email padrão de reset de senha. Eventos críticos como "Zona MATED mudou para CRISE" não geram nenhuma notificação externa. Convites de membro usam o email padrão Supabase (em inglês, sem branding).

## Acceptance Criteria
- [x] AC-1: Template de email de convite: logo Aura + nome do projeto + nome de quem convidou + botão "Aceitar Convite" + expiração em 7 dias
- [x] AC-2: Email de alerta MATED zona-crise: disparado quando projeto entra na zona-crise + nome do projeto + triângulo CDT atual + botão "Ver projeto"
- [x] AC-3: Email de alerta MATED zona-risco: disparado quando projeto fica > 24h em zona-risco sem ação (threshold configurável)
- [x] AC-4: Preferência de notificação no perfil (SaaS-4): ativar/desativar alertas MATED por email por projeto (`email_alerts_enabled` em `project_members`)
- [x] AC-5: Emails usam Supabase SMTP customizado (não email genérico `noreply@supabase.io`) — Resend API via `RESEND_API_KEY` env var
- [x] AC-6: Idioma PT-BR em todos os templates
- [x] AC-7: Unsubscribe link em todo email de alerta (link para desabilitar alertas de email do projeto)
- [x] AC-8: Máximo 1 email de alerta por projeto por hora (throttle via `email_sent` flag + query 1h)

## Tasks
- [x] 1. Configurar SMTP customizado no Supabase (ou Resend/SendGrid como provider)
- [x] 2. Criar template HTML de email de convite com branding Aura
- [x] 3. Criar template HTML de email de alerta MATED zona-crise e zona-risco
- [x] 4. Criar Edge Function `send-mated-alert` disparada quando `decisoes_mated` registra zona-crise/risco
- [x] 5. Implementar throttle: verificar `last_email_sent` antes de disparar — intervalo mínimo 1h
- [x] 6. Integrar preferência de notificação com campo `email_alerts_enabled` em `project_members`
- [x] 7. Criar link de unsubscribe por projeto (token base64 de project_id:user_id)
- [x] 8. Testar: convite enviado, alerta disparado, throttle respeitado, unsubscribe funciona

## File List
- `supabase/functions/send-invite-email/index.ts` (criado — Edge Function)
- `supabase/functions/send-mated-alert/index.ts` (criado — Edge Function)
- `supabase/migrations/20260317400000_email_alerts_schema.sql` (criado — colunas email_sent + email_alerts_enabled)
- `src/app/api/email/unsubscribe/route.ts` (criado — Next.js API route para opt-out)
- Templates HTML de email (inline nas Edge Functions)

## Definition of Done
- [x] Email de convite com branding Aura chega formatado
- [x] Alerta de crise dispara e chega em < 2 minutos
- [x] Throttle 1h funcional (segundo alerta não envia)
- [x] Unsubscribe funciona e persiste
- [x] TypeCheck 0 erros nas Edge Functions

## Escopo
**IN:** Templates de email convite e alerta MATED (crise/risco), Edge Functions de envio, SMTP customizado, throttle 1h, preferência de opt-out, unsubscribe link.
**OUT:** Não inclui newsletter/marketing emails, não cobre email de relatório semanal automático, não implementa email digest (múltiplos alertas em um email), não cria sistema de inbox in-app.

## Estimativa
**Esforço:** 5h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Supabase free tier tem limite de emails/mês — em produção pode ultrapassar | Alta | Médio | Usar Resend ou SendGrid como SMTP externo (configuração única, sem custo em volumes baixos) |
| Edge Function de alerta disparada por trigger pode criar loop se a inserção em `decisoes_mated` re-dispara o trigger | Média | Alto | Usar flag `email_sent` na tabela ou verificar `pg_net` queue antes de reenviar |

## QA Results
```yaml
storyId: SaaS-5
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-17 | @dev (Dex) | Implementação completa — Status: Done |
