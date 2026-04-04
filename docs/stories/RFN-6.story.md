# Story RFN-6 — RBAC: Roles e Credenciais por Projeto
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-3
**Status:** Draft
**Agentes:** @data-engineer (Dara), @dev (Dex), @ux-design-expert (Uma)
**Prioridade:** ALTA

---

## User Story
Como administrador da empresa,
quero definir o nível de acesso de cada usuário em cada projeto (Admin / PM / PO / Técnico / Cliente),
para que cada operador veja e interaja apenas com o que é pertinente à sua credencial.

## Acceptance Criteria

- [ ] AC1: Tabela `membros_projeto` no Supabase: `{ id, projeto_id, user_id, role, criado_em }` com RLS que permite admin ver todos, membro ver apenas próprio row
- [ ] AC2: Roles válidos: `admin` | `pm` | `po` | `tecnico` | `cliente` | `observador`
- [ ] AC3: Hook `useUserRole(projetoId): Role | null` em `src/hooks/useUserRole.ts`
- [ ] AC4: Componente `<CanAccess role="pm" projetoId>` que renderiza children apenas se o usuário tem role suficiente (hierarquia: admin > pm > po > tecnico > cliente > observador)
- [ ] AC5: Cor de acento do layout muda por role: admin=indigo, pm/po=blue (padrão), tecnico=emerald, cliente=amber
- [ ] AC6: Usuário `cliente` vê apenas: dashboard Level 1 (semáforo) + relatórios aprovados — nenhum setup ou motor
- [ ] AC7: Lista de projetos filtra automaticamente para mostrar apenas projetos onde o usuário é membro

## Scope
**IN:** Tabela `membros_projeto`, hook `useUserRole`, componente `<CanAccess>`, skin por role, filtro de lista
**OUT:** Sistema de convites por email (será story separada), SSO/OAuth

## Dependencies
- RFN-1 (design tokens de cor por role)

## Estimativa
L (8–12h)

## Definition of Done
- [ ] Migration aplicada no Supabase com RLS testada
- [ ] `<CanAccess>` bloqueia acesso visual correto em todos os roles
- [ ] Skin muda corretamente por role logado
- [ ] 0 erros TypeScript/ESLint
