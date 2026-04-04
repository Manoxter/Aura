# Story ESC-2 — Remocao Override diaAtual=0 + Fingerprint Baseline

**Epic:** EP-ESCALENO
**Sprint:** G1 — Fundacao Matematica Escalena
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @aura-math, @dev (Dex)
**Complexidade:** M | **Prioridade:** CRITICA
**Dependencia:** ESC-1

---

## Contexto

O bloco `if (diaAtual === 0) { C_raw = Math.SQRT2; P_raw = Math.SQRT2 }` descarta completamente o fingerprint do projeto planejado. Com a nova normalizacao (ESC-1), esse override nao e mais necessario — C e P emergirem naturalmente da forma das curvas.

---

## Acceptance Criteria

- [ ] Override `diaAtual===0` removido de `gerarTrianguloCDT()`
- [ ] No dia 0, C e P sao calculados pelas curvas planejadas (CPM/custo) com a formula ESC-1
- [ ] `semExecucaoReal` continua existindo mas NAO forca isosceles — usa o baseline real
- [ ] Dashboard page.tsx e triangulo-matriz/page.tsx usam cdtBaseline com valores escalenos
- [ ] O TM de referencia (canonico) permanece como comparacao visual mas NAO sobrepoe o calculo
- [ ] Projeto com custos front-loaded produz C > P no dia 0
- [ ] Projeto com custos back-loaded produz C < P no dia 0

---

## Scope

### IN
- `src/lib/engine/math.ts`: remover override linhas 630-633
- `src/app/(dashboard)/[projetoId]/page.tsx`: ajustar `cdtData` para usar baseline escaleno
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`: ajustar `cdtBaseline`
- `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`: ajustar `ideal` no burndown overlay

### OUT
- Testes (ESC-3)
- Visualizacao (ESC-4)

---

## Notas Tecnicas

O TM isosceles canonico (E=1, C=P=sqrt(2)) nao desaparece — ele se torna uma **referencia de comparacao** (como era o equilatero antes). O triangulo REAL do projeto sera escaleno.

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 77b2a8e |
