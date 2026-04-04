# Story CEt-2 — Badge Área no Motor CDT (desvio_qualidade)
**Épico:** EP-03 Motor CDT
**Sprint:** C-CEt
**Status:** Done
**Agentes:** @dev (Dex), @dataviz (Viz)

## User Story
Como PM, quero ver um badge mostrando a área do triângulo atual em relação ao baseline (%), para avaliar a contração ou expansão do triângulo de qualidade.

## Acceptance Criteria
- [x] AC-1: Badge `AreaBadge` exibido no header após CetDuplaBadge
- [x] AC-2: Mostra "Área Nx% baseline" com cor: ≥85%=verde, ≥60%=azul, ≥35%=âmbar, <35%=vermelho
- [x] AC-3: Quando `desvio_qualidade === null`: badge acinzentado "Área — (sem baseline)"
- [x] AC-4: TypeCheck: 0 erros

## Tasks
- [x] 1. Criar `AreaBadge` no cdt/page.tsx
- [x] 2. Exibir no header quando `cdtAtual !== null`

## File List
- `src/app/(dashboard)/[projetoId]/motor/cdt/page.tsx` *(modificado)*

## QA Results
```yaml
storyId: CEt-2
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @sm (River) | Story criada — Sprint C-CEt |
