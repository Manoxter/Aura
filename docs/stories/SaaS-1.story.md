# Story SaaS-1 — Auth UX: Login, Register e Password Reset
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @dev (Dex)
**Agentes:** @dev (Dex), @ux-design-expert (Uma), @security-auditor (Shield)
**Pré-requisito:** Nenhum (Supabase Auth já configurado)

---

## User Story
Como novo usuário do Aura,
quero um fluxo de login e registro claro, com feedback visual de erros e estados de loading,
para que eu acesse o sistema sem fricção e saiba exatamente o que fazer quando algo der errado.

## Background
O Supabase Auth está configurado e funcional, mas os fluxos de UX nunca foram revisados formalmente:
- Formulários de login/register existem mas sem validação client-side visível
- Erros do Supabase são expostos em inglês técnico ao usuário
- Estado de loading ausente (botão não desativa durante submit)
- Password reset existe mas sem confirmação visual de "email enviado"
- Rota de retorno após login não é preservada (sempre vai para `/dashboard`)
- Sem proteção de rota: páginas autenticadas são acessíveis sem login até hidratação

## Acceptance Criteria
- [x] AC-1: Formulário de login com validação client-side (email válido, senha ≥ 8 chars) antes de chamar Supabase
- [x] AC-2: Mensagens de erro traduzidas para português: "Email ou senha incorretos", "Email não encontrado", "Muitas tentativas — aguarde X segundos"
- [x] AC-3: Botão de submit desabilita + spinner durante chamada Supabase (sem duplo-submit)
- [x] AC-4: Password reset: tela de "Link de recuperação enviado para {email}" com countdown de 60s para reenviar
- [x] AC-5: Redirect pós-login preserva rota original: usuário clica em `/cpm` sem login → vai para login → após auth vai para `/cpm`
- [x] AC-6: Middleware Next.js protege todas as rotas autenticadas: redirect para `/login?redirect={path}` se sem sessão
- [x] AC-7: Register: validação de senha forte (≥8 chars, ≥1 número) com indicador visual de força
- [x] AC-8: Session refresh automático: token Supabase renovado silenciosamente antes de expirar (onAuthStateChange)
- [x] AC-9: Logout limpa contexto local (ProjectContext reset) antes de redirect para `/login`

## Tasks
- [x] 1. Criar validação client-side nos formulários de login e register (react-hook-form ou nativo)
- [x] 2. Mapear códigos de erro Supabase → mensagens PT-BR em `src/lib/auth/error-messages.ts`
- [x] 3. Adicionar estado de loading nos botões de submit (disabled + spinner)
- [x] 4. Atualizar tela de password reset com confirmação visual + countdown de reenvio
- [x] 5. Criar middleware `src/middleware.ts` para proteção de rotas autenticadas com preservação de redirect
- [x] 6. Adicionar indicador de força de senha no register
- [x] 7. Configurar `onAuthStateChange` para refresh automático de sessão
- [x] 8. Garantir que logout reseta ProjectContext antes de redirect

## File List
- `src/middleware.ts` (modificado — proteção de rota com redirect param)
- `src/lib/auth/error-messages.ts` (criado — PT-BR error map)
- `src/lib/auth/logout.ts` (criado — helper centralizado de logout)
- `src/context/AuthContext.tsx` (criado — AuthProvider com onAuthStateChange)
- `src/app/layout.tsx` (modificado — wrap com AuthProvider)
- `src/app/login/page.tsx` (modificado — validação, spinner, redirect, erros PT-BR)
- `src/app/register/page.tsx` (modificado — validação, força senha, confirm password, erros PT-BR)
- `src/app/forgot-password/page.tsx` (modificado — confirmação, countdown 60s, erros PT-BR)
- `src/context/ProjectContext.tsx` (modificado — expõe resetContext)
- `src/app/page.tsx` (modificado — logout via performLogout)
- `src/app/(dashboard)/[projetoId]/admin/planos/page.tsx` (modificado — logout via performLogout)

## Definition of Done
- [x] Middleware ativo: 0 rotas autenticadas acessíveis sem sessão
- [x] Todos os erros Supabase exibidos em PT-BR
- [x] Botões de submit nunca permitem duplo-clique
- [x] Redirect pós-login preserva rota original
- [x] TypeCheck 0 erros nos arquivos modificados (3 erros pré-existentes em cet_dupla não relacionados)
- [x] 190 testes passando (npm test)

## Escopo
**IN:** Validação client-side, tradução de erros PT-BR, loading states, middleware de proteção de rota, redirect pós-login, indicador força senha, session refresh, logout com context reset.
**OUT:** Não inclui social login (Google/GitHub), não cobre 2FA, não implementa magic link UX melhorado, não cria fluxo de email verification manual (Supabase cuida).

## Estimativa
**Esforço:** 4h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Middleware Next.js pode interferir com rotas públicas (`/demo`, `/login`, `/register`) causando redirect loop | Alta | Alto | Definir `publicRoutes` explícitas no middleware antes de aplicar proteção |
| `onAuthStateChange` duplicado em múltiplos componentes causa múltiplos refresh tokens | Média | Médio | Centralizar listener em `AuthProvider` único no layout raiz |

## QA Results
```yaml
storyId: SaaS-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — Status: Done |
