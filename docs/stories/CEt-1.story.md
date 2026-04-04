# Story CEt-1 — CEt PRÉ-Normalização: Badge no Motor CDT
**Épico:** EP-03 Motor CDT
**Sprint:** C-CEt
**Status:** Done
**Agentes:** @dev (Dex), @aura-math

## User Story
Como PM usando o Motor CDT, quero ver um badge que indique o status da Condição de Existência do Triângulo pré-normalização, para saber se o triângulo é geometricamente válido nos valores brutos.

## Acceptance Criteria
- [x] AC-1: Badge `CetDuplaBadge` exibido no header do Motor CDT abaixo de HealthBadge
- [x] AC-2: Verde (CEt ✓ PRÉ+PÓS) quando `cet_dupla.valid === true`
- [x] AC-3: Vermelho (CEt ✗ PRÉ · Lado X) quando `stage === 'pre'`
- [x] AC-4: Âmbar (CEt ✗ PÓS · Lado X) quando `stage === 'post'`
- [x] AC-5: Tooltip "Condição de Existência (|P-C| < E < P+C)"
- [x] AC-6: TypeCheck: 0 erros

## Tasks
- [x] 1. Criar `CetDuplaBadge` no cdt/page.tsx
- [x] 2. Exibir no header quando `cdtAtual !== null`

## File List
- `src/app/(dashboard)/[projetoId]/motor/cdt/page.tsx` *(modificado)*

## QA Results
```yaml
storyId: CEt-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @sm (River) | Story criada — Sprint C-CEt |
