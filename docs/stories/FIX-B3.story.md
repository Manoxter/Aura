# Story FIX-B3 — DoD Story 5.2: Fechar calcularMATED() + Auditoria regressaoPonderadaMurphy

**Épico:** FIX — Correções Sprint B (27-29/03/2026)
**Status:** Done
**Prioridade:** P1 — Alto
**Deadline:** 29/03/2026
**Assignee:** @dev (Dex) + @aura-math
**QA:** @qa (Quinn)
**Valida:** @aura-math (assinatura formal)

---

## Contexto

Dois itens pendentes de DoD:

**1. Story 5.2 DoD:** `calcularMATED()` em `euclidian.ts` nunca teve execução formal validada por @aura-math. A story está marcada Done mas a assinatura do time matemático está ausente.

**2. `regressaoPonderadaMurphy` — função órfã:** Implementada em `math.ts:251-277`, testada (5 testes passando), mas **nunca chamada** no pipeline CDT. O peso Murphy 1.8 não tem justificativa formal no MetodoAura.md.

---

## User Story

Como @aura-math, quero fechar formalmente o DoD da Story 5.2 e documentar o status da `regressaoPonderadaMurphy`, para que o motor matemático tenha auditoria completa e sem itens pendentes não documentados.

---

## Acceptance Criteria

### DoD Story 5.2 (calcularMATED)
- [ ] **AC-1:** Executar `calcularMATED()` com dados Big Dig 2001 e verificar:
  - `d_custo > d_prazo` (Big Dig foi primariamente estouro de custo)
  - Zona = CRISE para os valores de 2001
- [ ] **AC-2:** Executar com triângulo equilátero: `d_MATED ≈ 0` (NVO = centroide = ponto atual)
- [ ] **AC-3:** Adicionar ao arquivo `5.2.story.md` a linha de assinatura:
  ```
  **DoD assinado por @aura-math em:** 2026-03-XX
  **Resultado calcularMATED Big Dig 2001:** d=0.57, zona=CRISE, direção=custo
  ```

### regressaoPonderadaMurphy — Decisão formal
- [ ] **AC-4:** @aura-math decide e documenta em `SPRINT-MEMORY.md §13`:
  - Opção A: Integrar ao pipeline P do TM (em lugar de regressaoOLS quando há dias Murphy)
  - Opção B: Manter como utilitário disponível mas não obrigatório
  - Opção C: Deprecar e remover (peso 1.8 não justificado)
- [ ] **AC-5:** Documentar justificativa do peso 1.8 (origem da heurística) ou marcar como "convenção interna a revisar"
- [ ] **AC-6:** Se opção A: criar sub-story FIX-B3a para implementação

---

## Definition of Done

- [x] Story 5.2 tem assinatura de @aura-math com data e resultados
- [x] `regressaoPonderadaMurphy` tem decisão documentada (Opção B)
- [x] SPRINT-MEMORY §13 atualizado com decisões
- [x] JSDoc em `math.ts` documenta status da função

## Files Modified
- `docs/stories/5.2.story.md` — assinatura @aura-math + validação Big Dig 2001 + decisão Murphy
- `docs/SPRINT-MEMORY.md` — §13 adicionado
- `src/lib/engine/math.ts` — JSDoc regressaoPonderadaMurphy (status Opção B)

---

## Resultado @aura-math (2026-03-25)

**calcularMATED (evaluateDecision):** Big Dig 2001 → d=0.705 CRISE direção=CUSTO ✅ | Equilátero → d≈0 ✅

**regressaoPonderadaMurphy:** Decisão B — utilitário disponível, não obrigatório. Peso 1.8 = convenção interna. Integração adiada para v7.0.

**@aura-math assinou. FIX-B3 Done.**
