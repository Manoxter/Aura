# Story EXEC-1 — EXEC-MODULE: Conectar recalcularTA ao Hub de Gerenciamento
**Épico:** EP-05 Execução
**Sprint:** EXEC-MODULE
**Status:** Done
**Agentes:** @dev (Dex)

## User Story
Como PM em fase de execução, quero que o "Pulso CDT Online" no Hub de Gerenciamento exiba os lados reais do Triângulo Atual (TA) calculados pelo `recalcularTA`, para que os valores de Escopo/Prazo/Orçamento reflitam o progresso real registrado nas tarefas — não uma simulação estática.

## Acceptance Criteria
- [x] AC-1: `recalcularTA` é chamado ao carregar o Hub (após `loadTarefas`) e os valores E/P/O são armazenados em estado `taAtual`
- [x] AC-2: `recalcularTA` é chamado novamente após cada `handleProgressSaved` (trigger: save de % avanço)
- [x] AC-3: Os valores exibidos abaixo do CDTCanvas (Escopo / Orçamento / Prazo) usam `taAtual.E`, `taAtual.O`, `taAtual.P` quando disponíveis
- [x] AC-4: `TMAditivo.ladosAtuais` recebe `{ E: taAtual.E, P: taAtual.P, O: taAtual.O }` real (não mock)
- [x] AC-5: Fallback: quando `taAtual` ainda é `null` (carregando), os valores mockados baseados em kanban são mantidos
- [x] AC-6: TypeCheck: 0 erros

## Tasks
- [x] 1. Adicionar import `recalcularTA` + `TrianguloAtual` de `@/lib/engine/execution`
- [x] 2. Adicionar estado `taAtual: TrianguloAtual | null`
- [x] 3. Chamar `recalcularTA` no fim de `loadTarefas` e em `handleProgressSaved`
- [x] 4. Conectar `taAtual` ao `cdtData` useMemo (lados reais)
- [x] 5. Conectar `taAtual` ao `TMAditivo.ladosAtuais`

## File List
- `src/app/(dashboard)/[projetoId]/governanca/gerenciamento/page.tsx` *(modificado)*

## Definition of Done
- [x] Hub mostra lados reais de TA após salvar progresso
- [x] TMAditivo recebe lados reais
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: EXEC-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @dev (Dex) | Story criada e implementada — Sprint EXEC-MODULE |
