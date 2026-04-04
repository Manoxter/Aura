# Story TM-1 — TM-SHADOW: Triângulo Baseline como Sombra
**Épico:** EP-04 Motor CDT
**Sprint:** TM-SHADOW
**Status:** Done
**Agentes:** @dev (Dex), @dataviz (Viz)

## User Story
Como PM, quero ver o Triângulo Matriz (TM — baseline planejado) como sombra semitransparente atrás do Triângulo Atual (TA), para visualizar de imediato o quanto o projeto desviou do plano original.

## Acceptance Criteria
- [x] AC-1: `TrianglePlotter` aceita nova prop `baselineTriangle?: Triangle` (opcional, retrocompatível)
- [x] AC-2: Quando fornecido, TM renderizado ATRÁS do TA como polígono cinza semitransparente (fill rgba(148,163,184,0.08), stroke rgba(148,163,184,0.35), strokeDasharray "6 3", strokeWidth 1.5)
- [x] AC-3: Ambos os triângulos usam escala compartilhada (max de TM+TA combinados) — sem distorção relativa
- [x] AC-4: Legend inline no plotter: "◼ TM Planejado" (cinza) e "◼ TA Atual" (azul)
- [x] AC-5: Quando TM == TA (dia 0), sobreposição natural — nenhum artefato visual
- [x] AC-6: TypeCheck: 0 erros

## Tasks
- [x] 1. Extrair helper `mapCDTVerticesToCanvas(cdt, sharedMaxX, sharedMaxY)` no page
- [x] 2. Modificar `currentTriangle` useMemo para usar escala compartilhada com `cdtBaseline`
- [x] 3. Adicionar prop `baselineTriangle?: Triangle` ao `TrianglePlotter`
- [x] 4. Renderizar TM shadow no SVG antes do triângulo principal
- [x] 5. Legend TM / TA no canto superior esquerdo do plotter

## File List
- `src/components/motor/TrianglePlotter.tsx` *(modificado)*
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx` *(modificado)*

## Definition of Done
- [x] TM shadow visível e correto geometricamente
- [x] Escala compartilhada — TM maior que TA quando projeto tem scope creep
- [x] Retrocompatível (sem baseline = comportamento atual)
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: TM-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @sm (River) | Story criada — Sprint TM-SHADOW |
