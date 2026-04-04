# Story FIX-C3 — curvaCusto: Unificar TM vs funcoes + buildCurvaCusto()

**Épico:** FIX — Correções Sprint C (30-31/03/2026)
**Status:** Done
**Prioridade:** P1 — Médio
**Deadline:** 31/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Valida:** @aura-production

---

## Contexto

`curvaCusto` tem comportamento diferente entre as duas páginas:
- `triangulo-matriz/page.tsx`: usa `seedCustosTarefas()` como fallback quando `custosTarefas` vazio
- `funcoes/page.tsx`: não usa fallback seed

Resultado: TM pode mostrar triângulo diferente de funcoes para o mesmo projeto sem custos definidos.

---

## Acceptance Criteria

- [ ] **AC-1:** Função `buildCurvaCusto()` criada em `src/lib/engine/custo.ts` (ou `math.ts`)
  ```typescript
  export function buildCurvaCusto(
    tarefas: TarefaData[],
    custosTarefas: Record<string, number>,
    marcos: any[],
    prazoBase: number,
    projectCost: number,
    useSeed: boolean
  ): { x: number; y: number }[]
  ```
- [ ] **AC-2:** `triangulo-matriz/page.tsx` usa `buildCurvaCusto(... useSeed: true)`
- [ ] **AC-3:** `funcoes/page.tsx` usa `buildCurvaCusto(... useSeed: false)` (sem seed)
- [ ] **AC-4:** Para os mesmos inputs com `custosTarefas` definido: ambas retornam **curvas idênticas**
- [ ] **AC-5:** TM e funcoes mostram mesmo triângulo CDT para mesmo projeto com custos definidos

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] Teste: `buildCurvaCusto(mesmos_inputs, useSeed=true)` === `buildCurvaCusto(mesmos_inputs, useSeed=false)` quando custos definidos
- [ ] @aura-production aprovou
- [ ] Commit + Push via Nexus

## Files Created/Modified
- `src/lib/engine/math.ts` (buildCurvaCusto adicionado ao final)
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`
- `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`

---

## Resolução @aura-production (2026-03-25)

**Implementado.** `buildCurvaCusto()` exportada de `math.ts` (não criado `custo.ts` separado — evita fragmentação). Assinatura idêntica à AC-1. TM chama com `useSeed: true` (fallback seed quando custos vazios), funcoes com `useSeed: false`. Para projetos com `custosTarefas` definido, ambas retornam curvas idênticas — inconsistência eliminada.

**@aura-production:** TM e funcoes agora usam mesma lógica de curvaCusto. ✅
