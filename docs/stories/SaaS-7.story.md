# Story SaaS-7 — Error Boundaries e Logging Estruturado
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @dev (Dex)
**Agentes:** @dev (Dex), @qa (Quinn)
**Pré-requisito:** Nenhum (estabilidade crítica — independente)

---

## User Story
Como sistema do Aura em produção,
quero que erros em componentes React sejam capturados graciosamente com fallback UI,
e que erros de servidor sejam logados estruturadamente para diagnóstico,
para que o usuário nunca veja tela branca e o time tenha contexto suficiente para corrigir bugs rapidamente.

## Background
Atualmente:
- Um erro em qualquer componente React derruba toda a página (tela branca — sem ErrorBoundary)
- Os 4 crashes ativos (UX4, UX5, UX7, M7) derrubariam o app sem ErrorBoundary
- `console.error()` é usado em vez de logging estruturado
- Sem correlationId entre request do client e log do servidor
- Em produção, stack traces aparecem no browser (vazamento de informação)

## Acceptance Criteria
- [x] AC-1: `ErrorBoundary` criado em `src/components/ui/ErrorBoundary.tsx` com fallback UI: card com "Algo deu errado nesta seção" + botão "Tentar novamente" + link para suporte
- [x] AC-2: ErrorBoundary aplicado em 5 rotas críticas: `/dashboard`, `/motor/cdt`, `/motor/cpm`, `/governanca/kanban`, `/governanca/gerenciamento`
- [x] AC-3: Erros capturados pelo ErrorBoundary são logados com: `componentStack`, `timestamp`, `route`
- [x] AC-4: Em `NODE_ENV=production`: stack trace NUNCA exibido ao usuário — apenas mensagem genérica
- [x] AC-5: Em `NODE_ENV=development`: stack trace completo exibido no fallback para debugging
- [x] AC-6: Logging estruturado nos API routes: cada request loga `{ method, path, status, duration_ms, tenantId, correlationId }`
- [x] AC-7: `correlationId` (UUID v4) gerado por request, enviado no header `X-Correlation-ID` e logado tanto no client quanto no servidor
- [x] AC-8: Erros de servidor (status 500) não expõem stack trace na response — retornam `{ error: "Erro interno", correlationId: "..." }` para o client rastrear no log

## Tasks
- [x] 1. Criar `src/components/ui/ErrorBoundary.tsx` como React class component (ErrorBoundary requer class)
- [x] 2. Aplicar ErrorBoundary em 5 rotas críticas (wrapper no page.tsx de cada rota)
- [x] 3. Criar `src/lib/logger.ts` com funções: `logRequest()`, `logError()`, `logInfo()` com saída JSON estruturada
- [x] 4. Criar middleware de logging para API routes: interceptar request + response para logar métricas
- [x] 5. Implementar `correlationId` via middleware: gerar + propagar via header
- [x] 6. Atualizar handlers de erro dos API routes: usar `logger.logError()` + retornar correlationId ao client
- [x] 7. Garantir que em production, ErrorBoundary não expõe componentStack ao usuário

## File List
- `src/components/ui/ErrorBoundary.tsx` (criar)
- `src/lib/logger.ts` (criar)
- `src/middleware.ts` (modificar — adicionar correlationId — compartilha com SaaS-1)
- `src/app/dashboard/page.tsx` (modificar — wrap com ErrorBoundary)
- `src/app/cpm/page.tsx` (modificar — wrap com ErrorBoundary)
- Demais 3 rotas críticas (modificar — wrap)

## Definition of Done
- [x] Tela branca eliminada nas 5 rotas críticas (ErrorBoundary ativo)
- [x] Em production: 0 stack traces no browser
- [x] Logs estruturados JSON com correlationId
- [x] API routes retornam correlationId em erros 500
- [x] TypeCheck 0 erros novos introduzidos (3 erros pré-existentes não relacionados à SaaS-7)

## Escopo
**IN:** ErrorBoundary nas 5 rotas críticas, logger estruturado JSON, correlationId por request, ocultação de stack trace em production, fallback UI com "Tentar novamente".
**OUT:** Não integra Sentry ou Datadog (v1.1 — monitoring externo), não cobre logging de auditoria de ações do usuário (LGPD — v1.1), não implementa alertas automáticos baseados em taxa de erros.

## Estimativa
**Esforço:** 4h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| ErrorBoundary em Next.js App Router requer que o componente seja Client Component (`'use client'`) — conflita com pages que são Server Components | Alta | Médio | Criar `ErrorBoundaryWrapper.tsx` como client component e envolver apenas o conteúdo interativo, não o layout server |
| Logs estruturados em `console.log(JSON.stringify(...))` em Vercel ficam em plaintext — difícil de filtrar | Baixa | Baixo | Usar prefixo de nível: `[ERROR]`, `[INFO]`, `[REQUEST]` para facilitar grep no Vercel logs |

## QA Results
```yaml
storyId: SaaS-7
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — Status: Done |
