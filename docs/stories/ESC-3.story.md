# Story ESC-3 — Ajuste de Testes + Validacao Big Dig + Horizonte

**Epic:** EP-ESCALENO
**Sprint:** G1 — Fundacao Matematica Escalena
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @qa (Quinn), @aura-math
**Complexidade:** L | **Prioridade:** ALTA
**Dependencias:** ESC-1, ESC-2

---

## Contexto

Com a nova normalizacao (ESC-1) e remocao do override (ESC-2), todos os asserts de testes que esperavam C=P=sqrt(2) no baseline vao falhar. Esta story atualiza os 653+ testes para os novos valores escalenos.

---

## Acceptance Criteria

- [ ] `cdt-v2.test.ts`: todos os testes atualizados para valores escalenos
- [ ] `big-dig-simulation.test.ts`: Big Dig produz triangulos escalenos com zonas corretas
- [ ] `execution.test.ts`: TA/TM com valores escalenos
- [ ] `tap-motor-flow.test.ts`: fluxo completo com escalenos
- [ ] `cpm.test.ts`: nenhum impacto (CPM nao calcula CDT)
- [ ] `mapper.test.ts`: nenhum impacto
- [ ] Novos testes: validar que |C - P| > 0.01 para projetos com curvas de forma diferente
- [ ] Novo teste: validar que isosceles so emerge quando curvas tem mesma forma
- [ ] `npx tsc --noEmit`: 0 erros
- [ ] `npm run build`: producao OK
- [ ] Todos os testes passando (total >= 653)

---

## Scope

### IN
- Todos os arquivos `*.test.ts`
- Adicionar testes de escaleno emergente

### OUT
- Codigo de producao (ja alterado em ESC-1 e ESC-2)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 77b2a8e (664/664 tests) |
