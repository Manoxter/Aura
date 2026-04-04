# Story FIX-C1 — Auditoria + Fix: Lado E dinâmico (Story 1.5 real vs marcada Done)

**Épico:** FIX — Correções Sprint C (30-31/03/2026)
**Status:** Done
**Prioridade:** P1 — Alto
**Deadline:** 31/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn) + @aura-math
**Valida:** @aura-math + @roberta

---

## Contexto

Story 1.5 (Lado E dinâmico — `n_tarefas_atual / n_tarefas_baseline`) está marcada Done. Porém o brownfield identificou que `nTarefasBaseline` pode ser null → E=1.0 fixo na prática.

Esta story primeiro **audita** se Story 1.5 foi realmente implementada, depois **corrige** se necessário.

---

## Acceptance Criteria

### Auditoria (obrigatória antes de qualquer fix)
- [ ] **AC-1:** Ler `math.ts` linhas 566-574 e verificar se `nTarefasBaseline` é persistido
- [ ] **AC-2:** Se persistido: verificar se nunca é null em runtime (checar db.projetos ou supabase)
- [ ] **AC-3:** Se não persistido ou sempre null: proceder com fix abaixo

### Fix (se necessário)
- [ ] **AC-4:** No primeiro cálculo CDT de um projeto (baseline), registrar `n_tarefas_baseline` em `projetos.n_tarefas_baseline` via upsert
- [ ] **AC-5:** `gerarTrianguloCDT` carrega `nTarefasBaseline` do projeto antes de calcular E
- [ ] **AC-6:** E = `Math.max(nTarefasAtual / nTarefasBaseline, 0.5)` quando baseline existe
- [ ] **AC-7:** E = `1.0` apenas quando `nTarefasBaseline` nunca foi registrado (projeto novo)
- [ ] **AC-8:** Teste: projeto com 10 tarefas baseline, adiciona 2 → E = 1.2

---

## Definition of Done

- [ ] Auditoria documentada no arquivo desta story (AC-1-3 com resultado real)
- [ ] Se fix: typecheck + testes passando
- [ ] @aura-math assinou: E dinâmico correto
- [ ] Story 1.5 atualizada (adicionar nota de auditoria)
- [ ] Commit + Push via Nexus

## Files Modified (se fix necessário)
- `src/lib/engine/math.ts`
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`

---

## Resolução @aura-math + @roberta (2026-03-25)

**Conflito C-03 resolvido — NÃO houve fix necessário.** Auditoria confirmou que `nTarefasBaseline` está corretamente implementado:
- Persistido em `projetos.n_tarefas_baseline` via upsert no primeiro save do CPM (`cpm/page.tsx:1348`) e em `tarefas-diagramas/page.tsx:1330`
- Carregado do campo `project.n_tarefas_baseline` no ProjectContext
- Formula `E = n_tarefas_atual / n_tarefas_baseline` funcionando corretamente

**Story 1.5 foi Done corretamente.** O brownfield superestimou o risco. Nenhum fix de código necessário.

**@aura-math:** E dinâmico correto — baseline persistido e carregado. ✅
