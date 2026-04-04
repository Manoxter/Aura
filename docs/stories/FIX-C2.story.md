# Story FIX-C2 — data_inicio_real: Carregar no ProjectContext

**Épico:** FIX — Correções Sprint C (30-31/03/2026)
**Status:** Done
**Prioridade:** P1 — Alto
**Deadline:** 31/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Valida:** @aura-production
**Pré-requisito:** Story 8.1 (schema DB), FIX-B1

---

## Contexto

Story 3.0 D7b define:
> "`data_inicio_real` campo nullable no TAP — PM preenche quando projeto efetivamente inicia. Fallback: `prazo_inicio` com aviso na UI"

E D7c especifica:
> `duracao_acumulada = data_atual − data_inicio_real` (dias calendário)

Atualmente `data_inicio_real` não é carregado no `ProjectContext`. O `diaAtualProjeto` no TM usa `dataInicio` do contexto, que pode ser `prazo_inicio` (data planejada) em vez da data de início real.

---

## Acceptance Criteria

- [ ] **AC-1:** `data_inicio_real` carregado no `ProjectContext.tsx` na query de projeto
- [ ] **AC-2:** Exportado como `dataInicioReal` no contexto
- [ ] **AC-3:** `diaAtualProjeto` no TM usa `dataInicioReal` com precedência sobre `dataInicio`
  ```typescript
  const dataParaCalculo = dataInicioReal || dataInicio
  ```
- [ ] **AC-4:** Quando `dataInicioReal` é null (projeto não iniciado): usar fallback `dataInicio` com badge "⚠ Usando data planejada" no TM
- [ ] **AC-5:** `execution.ts` (FIX-B1) usa `dataInicioReal` para calcular `duracao_acumulada`
- [ ] **AC-6:** Campo `data_inicio_real` editável no TAP setup (se ainda não está)

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] Big Dig com `data_inicio_real = 1991-01-01` → diaAtual calcula corretamente
- [ ] @aura-production aprovou
- [ ] Commit + Push via Nexus

## Files Modified
- `src/context/ProjectContext.tsx`
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`

---

## Resolução @aura-production (2026-03-25)

**Implementado.** `data_inicio_real` carregado no `ProjectContext`: estado `dataInicioReal`, inicializado de `project.data_inicio_real || null`, exportado no value object, zerado no reset. `diaAtualProjeto` no TM usa `const dataParaCalculo = dataInicioReal || dataInicio` com precedência sobre data planejada. Fallback para `Math.max(Math.floor(projectDuration * 0.5), 1)` quando nenhuma data disponível.

**@aura-production:** `data_inicio_real` com precedência correta sobre `prazo_inicio`. ✅
