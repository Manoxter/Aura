# Story FIX-D1 — CTX-04: Tipo TaskRef — eliminar mistura UUID/T-code

**Épico:** FIX — Correções Sprint D (01-02/04/2026)
**Status:** Done
**Prioridade:** P2 — Médio
**Deadline:** 02/04/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)

---

## Contexto

`dependencias: string[]` em `TarefaData` aceita tanto UUIDs quanto T-codes (ex: "1.2.3"). Isso causa falhas silenciosas quando um T-code não foi resolvido para UUID antes do CPM rodar.

---

## Acceptance Criteria

- [ ] **AC-1:** Resolução T-code→UUID acontece em função única de borda `resolveDependencias()`
- [ ] **AC-2:** CPM (`calculateCPMLocal`) nunca recebe T-codes — apenas UUIDs
- [ ] **AC-3:** Função `resolveDependencias()` exportada de `cpm.ts`
- [ ] **AC-4:** Falha de resolução (T-code não encontrado) gera warning, não crash silencioso
- [ ] **AC-5:** Testes CPM com input misto UUID+Tcode → resultado correto após resolução

---

## Definition of Done
- [ ] Typecheck zero erros | Testes passando | Commit + Push via Nexus

## Files Modified
- `src/lib/engine/cpm.ts`
- `src/app/(dashboard)/[projetoId]/setup/cpm/page.tsx` (se chamada de borda)
