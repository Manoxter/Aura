# Story DS-6 — Design System: Labels Semânticos CDT (E/P/O → Nomes Completos)
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex), @aura-pm (Dr. Kenji)
**Pré-requisito:** DS-1 (tokens documentados), Story 5.7 (MetricTranslator — se disponível)
**UX:** UX3, UX9 — Siglas E/P/O sem contexto confundem usuários não familiarizados com o MetodoAura

---

## User Story
Como usuário do Aura que não conhece o MetodoAura profundamente,
quero que as dimensões CDT sejam exibidas com nomes completos e contexto semântico,
para que eu entenda imediatamente o que estou olhando sem consultar documentação.

## Background
Em toda a interface, as dimensões CDT (Custo/Dimensão/Tempo do triângulo) aparecem como:
- `E` → Escopo
- `P` → Prazo
- `O` → Orçamento (às vezes "C" para Custo)

Variações inconsistentes:
- Dashboard CDT usa "E", "P", "O" nos vértices
- Tabelas de tarefas usam "Custo" e "Tempo" (sem Escopo)
- Klauss usa "escopo/custo/prazo" em minúsculas
- Tooltips ausentes em quase todos os lugares

A Story 5.7 (MetricTranslator) cuida da tradução de valores numéricos. Esta story cuida dos labels textuais e identidade visual.

## Acceptance Criteria
- [x] AC-1: Constante global `CDT_LABELS` criada: `{ escopo: 'Escopo (E)', custo: 'Custo/Orçamento (O)', prazo: 'Prazo (P)' }` com versões curta, longa e símbolo
- [x] AC-2: Dashboard CDT: vértices mostram símbolo + nome curto (E · Escopo) com cor token `cdt.escopo/custo/prazo`
- [x] AC-3: Tooltip em cada vértice CDT: descrição de uma linha do que significa aquela dimensão no MetodoAura
- [x] AC-4: Tabelas e formulários: padronizar para nomenclatura curta (Escopo, Prazo, Orçamento) — eliminar "Custo" isolado sem contexto
- [x] AC-5: Klauss: respostas sobre CDT usam nomenclatura consistente com `CDT_LABELS`
- [x] AC-6: Badge MATED (zona-otimo/seguro/risco/crise): exibe nome da zona por extenso + ícone semântico
- [x] AC-7: Compatível com Story 5.7 (MetricTranslator): se Story 5.7 implementada, usar `MetricTranslator` como fonte; se não, usar `CDT_LABELS` diretamente
- [x] AC-8: Sem string hardcoded de dimensão CDT fora de `CDT_LABELS` após a story

## Tasks
- [x] 1. Criar `src/lib/constants/cdt-labels.ts` com `CDT_LABELS` e tipos TypeScript
- [x] 2. Atualizar Dashboard CDT: vértices com símbolo + nome curto + tooltips
- [x] 3. Atualizar badge MATED em todos os componentes: nome por extenso + ícone
- [x] 4. Varredura por `"E"`, `"P"`, `"O"`, `"Custo"` em JSX — substituir por `CDT_LABELS.*`
- [x]  Verificar Klauss system prompt: garantir nomenclatura CDT consistente com constante
- [x] 6. Se Story 5.7 existir: importar `MetricTranslator` e delegarle a resolução; criar adaptador de fallback se ausente
- [x] 7. Testar: Dashboard CDT mostra tooltips, badges MATED têm nome por extenso

## File List
- `src/lib/constants/cdt-labels.ts` (criado)
- `src/components/ui/MATEDBadge.tsx` (criado)
- `src/components/aura/CDTCanvas.tsx` (modificado — ZONE_COLORS.label via ZONA_LABELS)
- `src/components/aura/ZoneAlert.tsx` (modificado — labels via ZONA_LABELS)
- `src/components/aura/AlertaBanner.tsx` (modificado — labels via ZONA_LABELS)
- `src/components/aura/TMHistorico.tsx` (modificado — ZonaBadge via ZONA_LABELS)
- `src/app/(dashboard)/[projetoId]/motor/cdt/page.tsx` (modificado — MATEDBadge)
- `src/app/(dashboard)/[projetoId]/decisao/war-room/page.tsx` (modificado — MATEDBadge + ZONA_LABELS.nome)

## Definition of Done
- [x] `CDT_LABELS` é fonte única de verdade para nomenclatura CDT
- [x] 0 strings hardcoded de dimensão CDT fora da constante
- [x] Tooltips nos vértices do triângulo CDT
- [x] Badges MATED com nome por extenso
- [x] TypeCheck 0 erros, Lint 0 warnings (erros pré-existentes em arquivos fora do escopo desta story)

## Escopo
**IN:** Constante `CDT_LABELS`, padronização de todos os labels CDT na UI, tooltips nos vértices do triângulo, badges MATED com nome por extenso, verificação do Klauss system prompt, integração condicional com Story 5.7.
**OUT:** Não inclui tradução para outros idiomas (português é canônico), não muda o cálculo matemático CDT, não cria documentação externa, não cobre labels de outras dimensões fora de CDT (ex: NVO, MATED).

## Estimativa
**Esforço:** 3h | **Complexidade:** P

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Varredura de strings hardcoded pode ser incompleta — existem strings concatenadas ou computadas dinamicamente | Média | Baixo | Usar `grep -r '"E"\|"P"\|"O"'` para encontrar candidatos; revisar resultado manualmente antes de substituir |
| Integração com Story 5.7 (MetricTranslator) pode causar conflito se ambas forem implementadas em sprints diferentes | Média | Médio | Criar interface `ILabelResolver` com implementação padrão (`CDT_LABELS`) e extensão via `MetricTranslator` — design adapter pattern |

## QA Results
<!-- @qa preenche após implementação -->
```yaml
storyId: DS-6
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa DS-6 — CDT_LABELS, ZONA_LABELS, MATEDBadge, padronização 6 componentes — 254/254 testes passando |
