# Story FIX-D2 — WBS-08: Ordenação hierárquica antes do processamento de parent

**Épico:** FIX — Correções Sprint D (01-02/04/2026)
**Status:** Done
**Prioridade:** P2 — Médio
**Deadline:** 02/04/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)

---

## Contexto

No parser WBS, se um item filho aparece antes do pai (ex: "1.1.1" antes de "1.1"), a resolução de parent falha silenciosamente. O filho fica sem parent atribuído.

---

## Acceptance Criteria

- [ ] **AC-1:** Parser WBS ordena por código EAP **antes** de processar hierarquia
  ```typescript
  items.sort((a, b) => a.eapCode.localeCompare(b.eapCode, undefined, { numeric: true }))
  ```
- [ ] **AC-2:** WBS com ordem invertida (filho antes de pai) produz resultado **idêntico** ao WBS na ordem correta
- [ ] **AC-3:** Teste: WBS `[1.1.1, 1.0, 1.1, 2.0]` → estrutura igual a `[1.0, 1.1, 1.1.1, 2.0]`

---

## Definition of Done
- [ ] Typecheck zero erros | Testes passando | Commit + Push via Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/setup/wbs/page.tsx` (parser)
