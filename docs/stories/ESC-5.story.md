# Story ESC-5 — Rotulos Geometricos + Reconfiguracao Traslado

**Epic:** EP-ESCALENO
**Sprint:** G2 — Diagrama Geometrico + Visualizacao
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @dev (Dex), @aura-math
**Complexidade:** M | **Prioridade:** ALTA
**Dependencia:** ESC-4

---

## Acceptance Criteria

### AC-1: Rotulos nos lados
- [ ] Label "E" abaixo da reta Escopo (base do triangulo)
- [ ] Label "P" ao lado da reta Prazo
- [ ] Label "C" ao lado da reta Custo
- [ ] Labels acompanham rotacao/traslado do triangulo

### AC-2: Letras gregas nos angulos
- [ ] Angulo alpha (α) entre E e C (vertice inferior esquerdo)
- [ ] Angulo beta (β) entre E e P (vertice inferior direito)
- [ ] Angulo gamma (γ) no vertice superior (entre C e P)
- [ ] Posicao dos labels ajusta automaticamente para nao sobrepor o triangulo

### AC-3: Reconfiguracao no traslado
- [ ] Quando protocolo beta/gamma ativa traslado por paralelismo, o triangulo invertido flutuante exibe rotulos corretos
- [ ] Labels E/P/C e alpha/beta/gamma acompanham a nova configuracao
- [ ] A sombra A_mancha se reconfigura com o traslado
- [ ] Manometros atualizam com os novos angulos pos-traslado

### AC-4: Reconfiguracao por decisao (TA)
- [ ] Quando uma decisao altera o triangulo (TA vs TM), os rotulos refletem o estado atual
- [ ] Transicao acutangulo→obtusangulo atualiza visual e rotulos

---

## Scope

### IN
- `src/components/motor/TrianglePlotter.tsx`
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`

### OUT
- Formula matematica (ESC-1)
- Mapeamento inverso (ESC-6)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 7d1f0a5 |
