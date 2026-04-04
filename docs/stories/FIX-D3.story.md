# Story FIX-D3 — WBS-14: Validação de T-codes de predecessoras

**Épico:** FIX — Correções Sprint D (01-02/04/2026)
**Status:** Done
**Prioridade:** P2 — Médio
**Deadline:** 02/04/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)

---

## Contexto

Predecessoras no WBS aceitam qualquer string sem validação. Um T-code inválido é resolvido silenciosamente para undefined, quebrando o CPM sem aviso ao usuário.

---

## Acceptance Criteria

- [ ] **AC-1:** Após parse WBS, validar predecessoras contra `knownEapCodes`
- [ ] **AC-2:** T-code inválido → warning visível na UI (badge "⚠ X predecessoras não encontradas")
- [ ] **AC-3:** T-code inválido é **ignorado** no CPM (não quebra o forward pass)
- [ ] **AC-4:** Lista de T-codes inválidos exibida para o PM corrigir
- [ ] **AC-5:** Sem crashes ou erros silenciosos

---

## Definition of Done
- [ ] Typecheck zero erros | Testes passando | Commit + Push via Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/setup/wbs/page.tsx`
