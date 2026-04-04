# Story FIX-A2 — Gantt Custo: Fallback quando totalDurationAll=0

**Épico:** FIX — Correções Sprint A (25-26/03/2026)
**Status:** Done
**Prioridade:** P0 — Crítico
**Deadline:** 26/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Push:** @devops (Nexus)

---

## Contexto

O mini-Gantt de acumulação de custo na aba Tarefas não renderiza quando CPM não foi rodado.

`totalDurationAll = Math.max(...tarefas.map(t => t.ef || 0))` retorna 0 quando todos `ef = 0`.

Condição `tarefas.length > 0 && totalDurationAll > 0` falha → Gantt invisível.

---

## User Story

Como PM visualizando a aba Tarefas, quero ver o Gantt CPM de acumulação de custo mesmo antes de rodar o CPM, para planejar distribuição de custos com base nas durações estimadas.

---

## Acceptance Criteria

- [ ] **AC-1:** Gantt custo aparece quando `tarefas.length > 0` e CPM foi rodado (`ef > 0`)
- [ ] **AC-2:** Gantt custo aparece quando `prazoBase > 0` mesmo sem CPM calculado
- [ ] **AC-3:** `totalDurationAll` nunca é 0 quando há tarefas com duração estimada > 0
- [ ] **AC-4:** Barras usam `t.es || 0` para posição (tarefas sem ES iniciam em dia 0 — visualmente correto como "paralelo total")
- [ ] **AC-5:** Gantt **não** aparece quando `tarefas = []`

---

## Implementação

**Arquivo:** `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`

**Linha ~229 — trocar cálculo de totalDurationAll:**
```typescript
// DE:
const totalDurationAll = tarefas.length > 0
  ? Math.max(...tarefas.map(t => t.ef || 0)) : 0

// PARA:
const totalDurationAll = tarefas.length > 0
  ? Math.max(
      Math.max(...tarefas.map((t: any) => t.ef || 0)),
      prazoBase || 0,
      prazoEfetivo || 0
    )
  : 0
```

**Condição de renderização:** Manter `tarefas.length > 0 && totalDurationAll > 0` (já funciona com o fix acima).

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] `npm test` — passando
- [ ] Testado: aba Tarefas com CPM não rodado → Gantt visível com barras posicionadas em dia 0
- [ ] Testado: aba Tarefas com CPM rodado → Gantt com posições corretas por ES
- [ ] @aura-production aprovou
- [ ] Commit + Push via Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`
