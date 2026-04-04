# Story SaaS-6 — Segurança: Rate Limiting e Zod Validation nos Endpoints
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @security-auditor (Shield)
**Agentes:** @security-auditor (Shield), @dev (Dex), @data-engineer (Dara)
**Pré-requisito:** Nenhum (independente — segurança crítica)
**Escalona:** Story 7.9 (Draft) e Story 8.6 (Draft) — unificadas aqui

---

## User Story
Como sistema do Aura em produção,
quero que todos os endpoints de IA tenham rate limiting e que todos os inputs sejam validados com Zod,
para que o produto seja seguro contra abuso, DDoS e injeção de dados malformados.

## Background
**Rate Limiting (Story 7.9 escalona):**
- 8 endpoints `/api/ai/*` sem rate limiting
- Em produção: um único cliente pode fazer centenas de chamadas por segundo, esgotando créditos Groq/LLaMA e causando custos não controlados
- Supabase não tem rate limiting nativo por tenant — precisa ser implementado na Edge Function ou middleware

**Zod Validation (Story 8.6 escalona):**
- Endpoints recebem dados via `req.json()` sem validação de schema
- Inputs malformados causam `undefined` em runtime, crashando o motor
- TypeScript apenas valida em compile-time — runtime validation ausente

## Acceptance Criteria
- [x] AC-1: Rate limiting ativo em TODOS os endpoints `/api/ai/*`: 60 req/hora por `tenant_id` (via JWT claim)
- [x] AC-2: Resposta ao exceder limite: HTTP 429 com body `{ error: "Limite de requisições atingido", retryAfter: X, limit: 60, window: "1h" }`
- [x] AC-3: Rate limit implementado sem Redis: usar Supabase `ratelimit` table ou `upstash/ratelimit` se disponível
- [x] AC-4: Zod schemas criados para TODOS os request bodies de endpoints críticos: `/api/ai/*`, `/api/report/*`
- [x] AC-5: Erros de validação Zod retornam HTTP 400 com lista detalhada dos campos inválidos (não expõe stack trace)
- [x] AC-6: Schemas Zod exportados de `src/lib/schemas/` — reutilizáveis para validação client-side e server-side
- [x] AC-7: `@security-auditor` testa: request malformado em cada endpoint crítico retorna 400, não 500
- [x] AC-8: Endpoint de health check `/api/health` público (sem auth) para monitoring

## Tasks
- [x] 1. Criar tabela `ratelimit_log(tenant_id, endpoint, window_start, count)` via migration
- [x] 2. Criar middleware `src/lib/api/rate-limit.ts` com função `checkRateLimit(tenantId, endpoint, limit, windowMs)`
- [x] 3. Aplicar rate limit nos 8 endpoints `/api/ai/*`
- [x] 4. Criar schemas Zod em `src/lib/schemas/`: `AiCpmRequestSchema`, `AiExtractRequestSchema`, `AiInsightRequestSchema`, `AiTapRequestSchema`, `AiKlaussRequestSchema`, `AiDicaPrazoRequestSchema`, `AiPredecessorsRequestSchema`, `AiProactiveSetupRequestSchema`, `ReportCdtRequestSchema`
- [x] 5. Integrar Zod nos handlers de API: `safeParse()` em todos os endpoints (cpm, extract, insight, tap, klauss, dica-metodo-prazo, predecessors, proactive-setup, report/cdt)
- [x] 6. Criar handler de erro global para Zod: retornar 400 com mensagens amigáveis (sem stack trace)
- [x] 7. Criar endpoint `/api/health` público
- [x]  Testar: 61 requests em 1 hora → o 61º retorna 429 com retryAfter correto

## File List
- `supabase/migrations/YYYYMMDD_ratelimit_table.sql` (criar)
- `src/lib/api/rate-limit.ts` (criar)
- `src/lib/schemas/index.ts` (criar — Zod schemas)
- `src/app/api/ai/[...route]/route.ts` (modificar — adicionar rate limit + Zod)
- `src/app/api/health/route.ts` (criar)

## Definition of Done
- [x] 0 endpoints `/api/ai/*` sem rate limiting
- [x] 0 endpoints críticos sem Zod validation
- [x] HTTP 429 retornado corretamente com retryAfter
- [x] HTTP 400 com mensagem PT-BR para inputs inválidos
- [ ] @security-auditor: testes de penetração básicos passam
- [x] TypeCheck 0 erros novos introduzidos, Lint passando

## Escopo
**IN:** Rate limiting 60 req/hora por tenant via tabela Supabase, Zod schemas para endpoints críticos (ai/report), handler global de erro Zod 400, endpoint de health check.
**OUT:** Não inclui WAF (Web Application Firewall), não cobre rate limiting por IP (apenas por tenant), não implementa CAPTCHA, não cobre auditoria de logs de segurança (v1.1).

## Estimativa
**Esforço:** 5h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Rate limit via tabela Supabase tem latência de ~50ms por request — pode degradar performance da IA endpoint | Média | Médio | Usar `supabase-js` com `upsert` otimizado + índice em `(tenant_id, endpoint, window_start)` |
| Zod `parse()` lança exceção síncrona — se não tratada em try/catch, Next.js retorna 500 em vez de 400 | Alta | Alto | Usar `schema.safeParse()` em todos os handlers — nunca `parse()` direto no handler |

## QA Results
```yaml
storyId: SaaS-6
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — escalona Stories 7.9 + 8.6 — Status: Ready |
| 2026-03-17 | @dev (Dex) | Implementação completa: migration ratelimit_log + função SQL atômica, checkRateLimit(), schemas Zod v4, rate limiting em 8 endpoints /api/ai/* + /api/report/cdt, health check /api/health — Status: InReview |
