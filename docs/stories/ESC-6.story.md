# Story ESC-6 — Mapeamento Inverso TM→Graficos (Cinematica Inversa)

**Epic:** EP-ESCALENO
**Sprint:** G2 — Diagrama Geometrico + Visualizacao
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @aura-math, @roberta, @dev (Dex)
**Complexidade:** XL | **Prioridade:** ALTA
**Dependencias:** ESC-1, ESC-4

---

## Contexto

O mapeamento forward (graficos→TM) ja existe. Esta story implementa o inverso: dado um estado geometrico desejado (ou uma variacao angular delta), calcular as mudancas correspondentes nas curvas de custo e prazo.

Analogia: cinematica inversa em robotica — dado o ponto desejado do efetuador, calcular os angulos das juntas.

---

## Acceptance Criteria

### AC-1: Funcao inverseTM()
- [ ] `inverseTM(E, C_novo, P_novo)` retorna `{ delta_slope_custo, delta_slope_prazo }`
- [ ] `inverseFromAngle(E, C, P, angulo, delta_graus)` retorna `{ C_novo, P_novo }`
- [ ] Ambas funcoes validam CEt antes de retornar (rejeita estados impossiveis)
- [ ] Implementada em `src/lib/engine/math.ts`

### AC-2: Traducao para PM
- [ ] `delta_slope_custo` traduzido para `delta_R$` e `delta_dias_custo`
- [ ] `delta_slope_prazo` traduzido para `delta_dias_prazo`
- [ ] Funcao `traduzirDeltaGeometrico()` em `src/lib/engine/traducao.ts`
- [ ] Resultado: "reduzir angulo gamma em 2° → ganho de X dias, custo adicional de R$ Y"

### AC-3: Integracao com DecisionSimulator
- [ ] Slider angular no DecisionSimulator permite variar alpha/beta/gamma
- [ ] Preview em tempo real: burndown e custo acumulado mudam com o slider
- [ ] O TM se redeforma em tempo real conforme o slider move

### AC-4: Bidirecionalidade completa
- [ ] Alterar grafico de burndown → TM muda
- [ ] Alterar angulo no TM → burndown e custo mudam
- [ ] Ciclo fechado: forward(inverse(x)) = x (dentro da precisao numerica)

### AC-5: Registro de decisao
- [ ] Cada decisao no simulador gera um registro com:
  - Estado anterior (E, C, P, angulos, area)
  - Estado proposto (E', C', P', angulos', area')
  - Traducao PM (delta dias, delta R$)
  - Timestamp
- [ ] Registro persistido em `decisoes` (Supabase)

---

## Notas Tecnicas (@aura-math)

```typescript
// Cinematica inversa: dado delta_angulo, calcular novos lados
function inverseFromAngle(
    E: number, C: number, P: number,
    angulo: 'alpha' | 'beta' | 'gamma',
    deltaGraus: number
): { C_novo: number; P_novo: number } {
    // 1. Calcular angulo atual via lei dos cossenos
    // 2. Aplicar delta
    // 3. Resolver para C_novo e P_novo mantendo E fixo
    // 4. Validar CEt
}

// Traducao: slope → PM quantities
function traduzirDeltaGeometrico(
    deltaSlopeCusto: number, deltaSlopePrazo: number,
    avgCustoRate: number, avgPrazoRate: number,
    prazoBase: number
): { deltaDias: number; deltaR$: number } {
    // slope_prazo = burndownRange / T → deltaDias = delta_slope * T / range
    // slope_custo = custoRange / T → deltaR$ = delta_slope * custoRange
}
```

---

## Scope

### IN
- `src/lib/engine/math.ts`: `inverseTM()`, `inverseFromAngle()`
- `src/lib/engine/traducao.ts`: `traduzirDeltaGeometrico()`
- `src/components/aura/DecisionSimulator.tsx`: slider angular
- Supabase: novos campos em `decisoes`

### OUT
- Calibracao Bayesiana (ESC-7)
- Documentacao (ESC-8)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 6577183 |
