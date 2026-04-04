# Story RFN-8 — Admin: Cadastro e Gestão de Operadores
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-3
**Status:** Draft
**Agentes:** @dev (Dex), @data-engineer (Dara)
**Prioridade:** ALTA

---

## User Story
Como administrador da empresa contratante,
quero cadastrar usuários, vinculá-los a projetos com roles específicos e revogar acessos,
para controlar quem participa de cada projeto e com qual nível de permissão.

## Acceptance Criteria

- [ ] AC1: Rota `/admin/operadores` lista todos os usuários da tenant com nome, email, data de cadastro e projetos vinculados
- [ ] AC2: Formulário de convite por email: campo email + seleção de role + seleção de projeto — envia convite via Supabase Auth (magic link)
- [ ] AC3: Revogar acesso: botão por usuário que remove da `membros_projeto` e invalida sessão ativa (via Supabase Admin API)
- [ ] AC4: Painel mostra contagem de projetos ativos, projetos arquivados, usuários por role
- [ ] AC5: Somente usuários com role `admin` acessam `/admin/operadores` — redirect automático para dashboard se não-admin
- [ ] AC6: Log de auditoria: cada ação de concessão/revogação grava em tabela `audit_log` com timestamp e executor

## Scope
**IN:** Rota `/admin/operadores`, convite por email, revogação, audit_log
**OUT:** Billing e planos (já existe em `/admin/planos`), SSO enterprise

## Dependencies
- RFN-6 (RBAC base)

## Estimativa
L (8–12h)

## Definition of Done
- [ ] Admin consegue convidar, vincular e revogar em < 3 cliques
- [ ] Audit_log popula corretamente
- [ ] 0 erros TypeScript/ESLint
