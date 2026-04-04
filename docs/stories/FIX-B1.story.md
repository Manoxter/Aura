# Story FIX-B1 — execution.ts: Motor TA com denominadores canônicos (Story 3.0 D7c)

**Épico:** FIX — Correções Sprint B (27-29/03/2026)
**Status:** Done
**Prioridade:** P0 — Crítico
**Deadline:** 29/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn) + @aura-math
**Valida:** @aura-math + @roberta + @aura-production
**Pré-requisito:** Story 3.0-B (especificação dos denominadores)

---

## Contexto

A Story 3.0 D7c define canonicamente:
> "TA usa posição (`dias_corridos / caminho_critico`) — `execution.ts`.
> TM usa velocidade (coef. burndown) — `math.ts`.
> São triângulos distintos com fórmulas de P distintas."

O arquivo `execution.ts` **não existe** no projeto. Atualmente, o TM (`math.ts`) é usado para ambos os papéis, o que viola a arquitetura definida. A Sprint anterior (brownfield) propôs erroneamente trocar OLS por tangentePontual em P — esse fix foi **revertido** após identificar o conflito com Story 3.0 D7c.

**Nota importante (@aura-math):** OLS global em P do TM está **correto** conforme MASTERPLAN Passo 1 ("Regressão OLS global → reta tangente Prazo"). O que está faltando é o motor **TA separado** com a fórmula de posição.

---

## User Story

Como motor de execução, quero calcular o Triângulo Atual (TA) com denominadores baseados em posição real (dias_corridos/caminho_critico e custo_acumulado/orcamento_operacional) conforme Story 3.0, para que o TA reflita o estado de execução do projeto e não seja confundido com o TM de velocidade.

---

## Acceptance Criteria

- [ ] **AC-1:** Arquivo `src/lib/engine/execution.ts` criado e exporta `recalcularTA()`
- [ ] **AC-2:** `lado_P = duracao_acumulada / duracao_caminho_critico_baseline` (D1 da Story 3.0)
  - `duracao_acumulada = data_atual − data_inicio_real` (dias calendário)
  - `duracao_caminho_critico_baseline` = snapshot imutável do TAP (D7a)
- [ ] **AC-3:** `lado_O = custo_acumulado / orcamento_operacional` (D2)
  - `orcamento_operacional = orcamento_total × (1 − percentual_contingencia / 100)` (D5)
- [ ] **AC-4:** `lado_E = n_tarefas_atual / n_tarefas_baseline` (Story 1.5)
- [ ] **AC-5:** CEt dupla validada nos valores brutos (lado_P, lado_O, lado_E) antes de normalizar
- [ ] **AC-6:** `recalcularTA()` retorna `CDTResult | null` (null quando CEt inválida)
- [ ] **AC-7:** Testes unitários em `execution.test.ts`:
  - Dia 0: TA equilátero (P=1, O=1, E=1)
  - Dia 50% do prazo, custo 50%: P≈1.0, O≈1.0, E=1.0
  - Big Dig 1993: P≈1.0 (prazo ok), O≈1.67 (custo +67%)
- [ ] **AC-8:** TM (`math.ts`) **não é modificado** — mantém OLS velocity para P

---

## Especificação Técnica

```typescript
// src/lib/engine/execution.ts

export interface TAInput {
  custo_acumulado: number       // R$ gasto até hoje
  orcamento_operacional: number // = orcamento_total × (1 - contingencia/100)
  duracao_acumulada: number     // dias desde data_inicio_real
  caminho_critico_baseline: number // snapshot imutável do TAP (D7a)
  n_tarefas_atual: number
  n_tarefas_baseline: number
}

export function recalcularTA(input: TAInput): CDTResult | null {
  const lado_P = input.duracao_acumulada / input.caminho_critico_baseline
  const lado_O = input.custo_acumulado / input.orcamento_operacional
  const lado_E = input.n_tarefas_baseline > 0
    ? Math.max(input.n_tarefas_atual / input.n_tarefas_baseline, 0.5)
    : 1.0

  // CEt dupla pré-normalização
  const cetResult = checkCETDupla(lado_E, lado_O, lado_P)
  if (!cetResult.valid) return null  // ou retorna com cet_dupla.valid=false

  // Normaliza e calcula área, NVO, MATED etc.
  // ... (reutilizar helpers de math.ts)
}
```

---

## Definition of Done

- [ ] `execution.ts` criado com `recalcularTA()` e `execution.test.ts`
- [ ] `npm test` — todos incluindo execution.test.ts passando
- [ ] @roberta revisou fórmulas de P e O contra MetodoAura.md
- [ ] @aura-math assinou: TA e TM são agora distintos e corretos
- [ ] MASTERPLAN atualizado: `execution.ts` adicionado ao inventário de funções
- [ ] Commit + Push via Nexus

## Files Created
- `src/lib/engine/execution.ts`
- `src/lib/engine/execution.test.ts`

---

## Resolução @aura-math + @aura-production (2026-03-25)

**Conflito C-02 resolvido.** Na auditoria, constatou-se que `execution.ts` **já existia** e estava mais completo do que a story especificava: implementação assíncrona com integração Supabase, retornando `TrianguloAtual` (não `CDTResult`). Os denominadores canônicos `dias_corridos / caminho_critico` e `custo / orcamento_operacional` estão corretos conforme Story 3.0 D7c. 30+ testes unitários passando.

**Assinatura @aura-math:** TA e TM são distintos e corretos — `execution.ts` usa posição, `math.ts` usa velocidade OLS. ✅
