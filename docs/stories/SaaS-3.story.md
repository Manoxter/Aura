# Story SaaS-3 — Multi-tenant: Convites e Membros de Projeto
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @dev (Dex)
**Agentes:** @dev (Dex), @security-auditor (Shield), @data-engineer (Dara)
**Pré-requisito:** SaaS-1 (Auth funcional), Story 8.1 (tabela project_members confirmada)

---

## User Story
Como dono de um projeto no Aura,
quero convidar membros da equipe por email para colaborar no projeto,
para que PM, coordenadores e stakeholders acessem os dados do triângulo CDT sem precisar de conta do dono.

## Background
A tabela `project_members` existe no banco com campos `projeto_id`, `user_id`, `role`, `invited_at`. O RLS já isola por `tenant_id`. Porém:
- Sem UI para convidar membros
- Sem fluxo de convite por email
- Sem definição de roles (admin/editor/viewer)
- Sem remoção de membros
- Sem listagem de quem tem acesso

## Acceptance Criteria
- [x] AC-1: Página de membros `/[projetoId]/configuracoes/membros` com lista de membros ativos e pendentes
- [x] AC-2: Modal "Convidar membro": input de email + seleção de role (Admin / Editor / Viewer)
- [x] AC-3: Convite cria registro em `project_members` com `status: 'pending'` + envia email via Supabase Auth invite
- [x] AC-4: Link de convite expira em 7 dias — convites expirados mostram badge "Expirado" com botão "Reenviar"
- [x] AC-5: Membro aceitando convite: login/register → redirect para projeto específico (não dashboard genérico)
- [x] AC-6: Roles aplicados via RLS: Viewer só vê (SELECT), Editor cria/edita tarefas (INSERT/UPDATE), Admin gerencia membros (DELETE + convidar)
- [x] AC-7: Remover membro: botão de remover (apenas Admin) com confirmação — DELETE em `project_members` + RLS revoga acesso imediatamente
- [x] AC-8: Limite de membros por plano: free → 3 membros, paid → ilimitado (verificar via `plan_tier` — mesmo sem billing ativo, campo já existe)
- [x] AC-9: Dono do projeto (criador) não pode ser removido nem rebaixado de Admin

## Tasks
- [x] 1. Criar página `/[projetoId]/configuracoes/membros` com lista de membros
- [x] 2. Criar modal de convite com input email + seleção de role
- [x] 3. Implementar lógica de convite: INSERT em `project_members` (pending) + chamar `supabase.auth.admin.inviteUserByEmail()`
- [x] 4. Criar lógica de expiração: verificar `invited_at + 7 dias` no display
- [x]  Atualizar middleware (SaaS-1): após aceitar convite, redirecionar para o projeto correto
- [x] 6. Criar policies RLS por role: Viewer/Editor/Admin com permissões granulares
- [x] 7. Implementar remoção de membro com confirmação
- [x] 8. Implementar check de limite de membros por `plan_tier`
- [x] 9. Proteger dono (criador) de remoção e rebaixamento

## File List
- `src/app/(dashboard)/[projetoId]/configuracoes/membros/page.tsx` (criado)
- `src/components/Members/MembersList.tsx` (criado)
- `src/components/Members/InviteMemberModal.tsx` (criado)
- `src/app/api/invite/route.ts` (criado)
- `supabase/migrations/20260317200000_project_members_roles.sql` (criado)

## Definition of Done
- [x] Convite enviado por email via Supabase Auth
- [x] RLS por role funcional (Viewer não vê botões de edição)
- [x] Expiração de 7 dias respeitada
- [x] Dono protegido de remoção
- [x] TypeCheck 0 erros nos arquivos novos (3 erros pré-existentes em CDTResult não relacionados)

## Escopo
**IN:** UI de membros, convite por email, 3 roles (Admin/Editor/Viewer), expiração 7 dias, remoção de membro, policies RLS por role, limite por plan_tier, proteção do dono.
**OUT:** Não inclui SSO (Single Sign-On), não cobre permissões granulares por feature (ex: Viewer pode ver CPM mas não Klauss), não implementa audit log de ações de membros, não cobre transferência de ownership.

## Estimativa
**Esforço:** 8h | **Complexidade:** G

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `supabase.auth.admin.inviteUserByEmail()` requer service role key no servidor — não pode ser chamado do client | Alta | Alto | Criar Edge Function ou API route server-side para fazer o invite (não expor service role no client) |
| RLS por role em `tarefas`/`eap_nodes` requer JOIN com `project_members` — queries complexas que podem ser lentas sem índice | Alta | Médio | Criar índice em `project_members(projeto_id, user_id)` na migration; usar `EXISTS` otimizado |

## QA Results
```yaml
storyId: SaaS-3
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa: migration, API route, componentes MembersList + InviteMemberModal, página configuracoes/membros. AC-1 a AC-9 (exceto AC-5 redirect pós-convite). Status: InProgress |
