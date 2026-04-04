# Story ESC-4 — A_mancha como Plano de Fundo + Borda Rebarba + Escopo Base

**Epic:** EP-ESCALENO
**Sprint:** G2 — Diagrama Geometrico + Visualizacao
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @dev (Dex), @dataviz, @aura-math
**Complexidade:** XL | **Prioridade:** ALTA
**Dependencia:** ESC-1

---

## Contexto

O TM deve ser sobreposto sobre a "sombra" formada pela uniao das areas das curvas por integral (A_mancha). Esta sombra e o **campo real de operacao** do projeto — o plano de fundo por onde o triangulo existe e pode variar.

A sombra e delimitada:
- **Acima:** pela curva max(f_p, f_c) normalizada (limite superior do campo)
- **Abaixo:** pela reta Escopo (mesmo que Escopo nao seja colinear ao eixo x)
- **Borda:** a "rebarba" (A_rebarba = A_mancha - A_TM) destacada com contorno visual

---

## Acceptance Criteria

### AC-1: Sombra A_mancha como plano de fundo
- [ ] O diagrama TM (TrianglePlotter ou SVG) exibe a A_mancha como area preenchida atras do triangulo
- [ ] Projecao de f_p (burndown normalizado) vem de um lado
- [ ] Projecao de f_c (custo normalizado) vem do outro lado
- [ ] Uniao das sombras cobre toda a reta Escopo
- [ ] Zona de intersecao (A_intersecao) visualmente mais escura no centro
- [ ] Bordas mais claras (onde so uma curva tem cobertura)

### AC-2: Reta Escopo como base inferior
- [ ] Escopo e a base inferior do plano de fundo
- [ ] Se Escopo nao e colinear ao eixo x (rotacao por traslado), a sombra acompanha
- [ ] A sombra e delimitada entre Escopo (abaixo) e max(f_p, f_c) (acima)

### AC-3: Borda da rebarba
- [ ] Quando A_rebarba > 0, contorno visual destacado (tracejado vermelho/rose) delimita a zona plastica
- [ ] A borda da rebarba = contorno externo da A_mancha que excede o triangulo TM
- [ ] Borda invisivel quando A_rebarba = 0 (campo dentro do TM)

### AC-4: Manometros mantidos
- [ ] Manometros angulares (alpha/omega/epsilon) continuam funcionais
- [ ] Valores angulares recalculados com novos lados escalenos
- [ ] Gauges SVG semicirculares preservados

---

## Notas Tecnicas (@aura-math)

A sombra e construida assim:
1. Normalizar f_p e f_c para [0,1] no eixo Y
2. Projetar ambas sobre a reta Escopo (base do triangulo)
3. A sombra de f_p vem do vertice EP (esquerda), a de f_c do vertice EC (direita)
4. Onde se encontram = A_intersecao (mais escuro)
5. O triangulo TM e sobreposto sobre este campo

```
         max(f_p, f_c)
        /            \
       /   A_mancha   \
      / (sombra campo) \
     /    [TM aqui]     \
    /                     \
   E ─────────────────── E
   (Escopo = base inferior)
```

---

## Scope

### IN
- `src/components/motor/TrianglePlotter.tsx` ou novo componente SVG
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`
- CSS/Tailwind para gradientes da sombra

### OUT
- Formula matematica (ESC-1)
- Rotulos (ESC-5)
- Mapeamento inverso (ESC-6)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 7d1f0a5 |
