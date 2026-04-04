# Technical Debt Assessment — FINAL (v2)
## Brownfield Discovery Phase 8 — @architect (Aria)
## Consolidado com inputs de @data-engineer, @ux-design-expert, @qa
## REVISADO com auditoria profunda do Squad Aura (@aura-math, @aura-production, @aura-klauss, @aura-qa-auditor)
**Data:** 2026-03-14
**Revisao:** v2 — incorpora gaps de metodo (G1-G7) + correcoes da auditoria v1
**Documento complementar:** [math-deep-audit-v2.md](../reviews/math-deep-audit-v2.md)

---

## Executive Summary

- **Total de Debitos:** 39 (32 bugs/debt + 7 gaps de metodo)
- **Criticos:** 14 | **Altos:** 15 | **Medios:** 8 | **Baixos:** 2
- **Esforco Total Estimado:** ~190 horas
- **Foco Principal:** Fidelidade ao MetodoAura + consistencia matematica do Motor CDT como KPI dinamico
- **Achado v2:** O KPI primario do metodo (Desvio de Qualidade = Area_atual/Area_original × 100) NAO EXISTE no produto. Os lados do triangulo usam media global (OLS) em vez de tangente instantanea. Estes sao gaps de METODO, nao de codigo.

---

## Inventario Completo de Debitos

### Motor Matematico (validado por @architect + @qa)

| ID | Debito | Sev. | Horas | Prio |
|----|--------|------|-------|------|
| M1 | Normalizacao CDT dependente de escala absoluta — E,O,P nao sao verdadeiramente adimensionais. O deveria ser ratio custo_real/BAC; P deveria ser ratio prazo_real/prazo_total | CRIT | 8h | P2 |
| M2 | Mapeamento lado-vertice sem documentacao — PM/PO nao sabe qual lado = qual metrica | ALTO | 4h | P5 |
| M3 | Implementacao duplicada: `peAltitude()` (number[]) vs `projectPointToLine()` (Point) — tipos incompativeis | ALTO | 6h | P6 |
| M4 | CEt avaliada pos-normalizacao sempre retorna true — deveria ser PRE-normalizacao | CRIT | 3h | P2 |
| M5 | Triangulo ortico invalido para obtusangulos — baricentro pode cair fora do triangulo viavel. Fallback: usar incentro | CRIT | 8h | P2 |
| M6 | OLS global (media historica) alimenta CDT em vez de tangente pontual (burn rate instantaneo) | ALTO | 4h | P6 |
| M7 | Dependencia circular: custosTarefas vazio → projecao zerada → OLS invalida → CDT impossivel | CRIT | 6h | P1 |
| M8 | Monte Carlo usa distribuicao uniforme; Box-Muller implementado em math-tools.ts mas nao usado | MEDIO | 2h | P6 |

### Pipeline de Dados (validado por @architect + @qa)

| ID | Debito | Sev. | Horas | Prio |
|----|--------|------|-------|------|
| P1 | WBS extractor parseia TODAS as linhas da TAP como WBS nodes (incluindo orcamento, prazo, restricoes) | ALTO | 4h | P3 |
| P2 | `setTarefas(tasksToInsert as any)` — shape {duracao_estimada, status} vs {duracao, es, ef, ls, lf, folga, critica} | CRIT | 3h | P1 |
| P3 | EAP cascata re-parse loop quando context carrega tarefas antes do DB retornar | MEDIO | 3h | P3 |
| P4 | EAP save sobrescreve duracao de TODAS as tarefas com hardcoded `5` | ALTO | 2h | P3 |
| P5 | Campo `duracao` (context) vs `duracao_estimada` (DB/math) inconsistente globalmente | CRIT | 6h | P1 |
| P6 | CPM Sync WBS gera IDs T01/T02 vs UUID do extractor — JOIN quebra | ALTO | 4h | P3 |

### Database (validado por @data-engineer)

| ID | Debito | Sev. | Horas | Prio |
|----|--------|------|-------|------|
| DB1 | RLS policies nao aplicadas — apenas ENABLE sem policies | CRIT | 8h | P4 |
| DB2 | ID misto (UUID vs WBS-xxx vs T01) em eap_nodes e tarefas | ALTO | 6h | P3 |
| DB5 | Indices faltantes em projeto_id (5 tabelas) | ALTO | 2h | P4 |
| DB9 | predecessoras JSONB sem validacao de existencia | ALTO | 3h | P3 |
| DB11 | Sem ON DELETE CASCADE eap_nodes→projetos | MEDIO | 2h | P4 |
| DB12 | custos_tarefas JSONB sem schema validation | MEDIO | 3h | P4 |
| DB13 | Sem trigger updated_at automatico | BAIXO | 1h | P6 |

### Frontend/UX (validado por @ux-design-expert)

| ID | Debito | Sev. | Horas | Prio |
|----|--------|------|-------|------|
| UX4 | `projecaoFinanceira` declarada 2x em orcamento/page.tsx — BUILD BREAK | CRIT | 1h | P0 |
| UX5 | `modeloCurva` referenciada sem declaracao em funcoes/page.tsx — CRASH | CRIT | 1h | P0 |
| UX7 | `dataInicio` referenciada sem import em orcamento/page.tsx | ALTO | 1h | P0 |
| UX9 | Sem traducao metricas adimensionais → linguagem PM/PO (MetricTranslator) | CRIT | 12h | P5 |
| UX6 | Reta tangente hardcoded (nao calculada) no SVG do orcamento | ALTO | 4h | P5 |
| UX1 | Sem stepper/progress no pipeline setup | ALTO | 6h | P5 |
| UX3 | Labels CDT sem semantica (Escopo/Custo/Prazo) | ALTO | 4h | P5 |
| UX11 | Debug markers visiveis (EAP-V3, border-red) | BAIXO | 0.5h | P6 |
| UX12 | Empty states genericos ("Aguardando TAP" em todas as paginas) | MEDIO | 4h | P5 |
| UX13 | Sem confirmacao em "Limpar Tudo" na EAP | MEDIO | 1h | P6 |
| UX14 | Mobile nao otimizado (tabelas overflow) | ALTO | 8h | P6 |

---

## Plano de Resolucao — 3 Sprints

### Sprint 0 — Quick Wins (1-2 dias, ~10h)

**Objetivo:** Eliminar crashes e desbloquear pipeline

| # | Fix | Arquivo | Horas |
|---|-----|---------|-------|
| 1 | Remover `projecaoFinanceira` duplicada | orcamento/page.tsx | 0.5h |
| 2 | Declarar `modeloCurva` state | funcoes/page.tsx | 0.5h |
| 3 | Importar/usar `dataInicio` corretamente | orcamento/page.tsx | 0.5h |
| 4 | Eliminar `as any` — criar mapper `toTarefaData()` | tap/page.tsx, ProjectContext.tsx | 3h |
| 5 | Unificar campo: `duracao` → `duracao_estimada` canonico | types.ts, ProjectContext.tsx, math.ts | 4h |
| 6 | Remover debug markers | eap/page.tsx | 0.5h |

**Teste:** Compilacao sem erros + TAP→CPM sem NaN

### Sprint 1 — Motor Core + Security (1 semana, ~50h)

**Objetivo:** CDT confiavel como KPI + dados seguros

| # | Fix | Horas |
|---|-----|-------|
| 1 | M1: Refatorar normalizacao CDT — E=1, O=custo_real/BAC, P=prazo_real/total | 8h |
| 2 | M4: Chamar `checkCDTExistence` ANTES da normalizacao em `gerarTrianguloCDT` | 3h |
| 3 | M5: Detectar obtusangulo e usar incentro como fallback | 8h |
| 4 | M7: Seed `custosTarefas` proporcional por duracao quando orcamento_total > 0 | 6h |
| 5 | P1: Filtrar linhas nao-WBS no extractor (budget/deadline/restricao patterns) | 4h |
| 6 | P4: EAP save preserva duracao existente em vez de hardcoded 5 | 2h |
| 7 | P6: Padronizar IDs para UUID em todo o pipeline | 4h |
| 8 | DB1: Implementar RLS policies por tenant_id | 8h |
| 9 | DB5: Criar indices em projeto_id | 2h |
| 10 | Testes: T1-T5 (unit + integration) | 5h |

**Teste:** CDT gera triangulo valido com dados reais + RLS impede cross-tenant

### Sprint 2 — UX PM/PO + Refinamento (1 semana, ~50h)

**Objetivo:** CDT como KPI legivel para gestores

| # | Fix | Horas |
|---|-----|-------|
| 1 | UX9: Criar MetricTranslator (adimensional → "73% do orcamento") | 12h |
| 2 | M2 + UX3: Labels semanticos nos lados do triangulo SVG | 4h |
| 3 | UX6: Substituir reta tangente hardcoded por tangentePontual() real | 4h |
| 4 | UX1: SetupStepper component com 7 etapas | 6h |
| 5 | M3: Unificar implementacao ortico — usar apenas triangle-logic.ts (Point type) | 6h |
| 6 | M6: Usar tangentePontual para alimentar CDT em vez de OLS global | 4h |
| 7 | M8: Trocar uniforme por Box-Muller no Monte Carlo do CDT | 2h |
| 8 | UX12: Empty states diferenciados por etapa faltante | 4h |
| 9 | UX14: Responsividade mobile (tabelas scrollaveis) | 8h |

**Teste:** T6 (E2E) + PM/PO consegue interpretar CDT sem explicacao tecnica

---

## Riscos e Mitigacoes

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Fix M1 muda significado de triangulos historicos | Alta | Alto | Versionar: `cdt_version: 2` no orcamentos |
| Fix DB2 (IDs) requer migration de dados existentes | Alta | Alto | Script de migration + backup |
| Fix M5 (incentro) muda posicao do NVO | Media | Alto | Comunicar ao PM/PO com changelog visual |
| RLS bloqueia queries existentes sem WHERE tenant_id | Media | Alto | Testar em staging primeiro |

## Criterios de Sucesso

1. CDT gera triangulo valido para 100% dos projetos com TAP + CPM + Orcamento preenchidos
2. CEt detecta crise geometrica ANTES da normalizacao
3. MATED distance e coerente (NVO dentro do triangulo) para todos os tipos de triangulo
4. PM/PO consegue interpretar CDT sem jargao matematico
5. Pipeline TAP→Motor completa sem `NaN`, `undefined` ou `as any`
6. RLS impede acesso cross-tenant em 100% das tabelas
7. Cobertura de testes do motor >= 90%

---

*Generated by @architect (Aria) — Brownfield Discovery Phase 8 | 2026-03-14*
*Validated by: @data-engineer (Dara), @ux-design-expert (Uma), @qa (Quinn)*
