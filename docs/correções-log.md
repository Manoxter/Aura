# Correções-Log — Aura 6.1
**Gerado em:** 2026-03-24 | **Última atualização:** 2026-03-27 (Sessão 4)
**Fonte:** Auditoria Squad (@aura-production + @aura-math + @aura-klauss)
**Total de bugs mapeados:** 51 | 6 campos silent data loss (WBS-00 descoberto em sessão 2026-03-25)

---

## SPRINT 1 — CRÍTICOS (impede uso correto)

| ID | Módulo | Arquivo | Linha | Descrição | Status |
|---|---|---|---|---|---|
| **WBS-00** | WBS Import | `wbs/page.tsx` | 659-664 | **NOVO (2026-03-25)** — predecessoras resolvidas para UUID durante import, mas segunda passagem de resolução não era executada antes do save. Adicionado loop de resolução T-code→UUID após `sourceRows.forEach`. | ✅ corrigido |
| **WBS-01** | WBS Save | `wbs/page.tsx` | 984-992 | Custos **nunca salvos no Supabase** — só em localStorage. Adicionado upsert em `orcamentos.custos_tarefas` dentro de `handleSaveStructure`. | ✅ corrigido |
| **WBS-04** | WBS Save | `wbs/page.tsx` | 897 | Delete filter `startsWith('WBS-')` — nodes com UUID nunca deletados. Removido filtro — usa apenas `.filter(Boolean)`. | ✅ corrigido |
| **CTX-01** | Context | `ProjectContext.tsx` | 333, 387 | `setTenantId(undefined as any)` — substituído por `setTenantId(null)`. | ✅ corrigido |
| **CPM-07** | CPM | `cpm/page.tsx` | 1728-1751 | Banner CPM > Dias Líquidos **já existia** na UI. Dependia de CTX-16 (prazoBase incorreto). Resolvido via CTX-16. | ✅ corrigido (via CTX-16) |
| **CAL-05** | Calendário | `calendario/page.tsx` | 364 | Ambiguidade TAP dias calendário vs. dias úteis no loop de baseline. Adicionado comentário clarificador. | ✅ corrigido |

---

## SPRINT 2 — ALTOS (dados se perdem)

| ID | Módulo | Arquivo | Linha | Descrição | Status |
|---|---|---|---|---|---|
| **WBS-11** | WBS Export | `wbs/page.tsx` | 183-203 | Export agora usa UUID como task id e resolve predecessoras para UUIDs antes de gravar no localStorage. CPM recebe UUIDs consistentes. | ✅ corrigido |
| **CPM-08** | CPM Sync | `cpm/page.tsx` | 1051-1054 | **NOVO (2026-03-25 Sessão 3)** — `handleSyncFromWBS` Caminho 2: `savedPredMap` pode conter UUIDs (após WBS-00 fix), mas eram usados diretamente como dependencias com IDs T-code → CPM retornava 750 dias. Adicionado `codes.map(c => uuidToTaskId.get(c) ?? c)` para resolver UUIDs para T-codes. | ✅ corrigido |
| **CPM-01** | CPM | `cpm/page.tsx` | 1296 | CPM save trocado de `insert` → `upsert` com `onConflict: 'id'`. Evita duplicata e garante que WBS e CPM coexistem no mesmo UUID. | ✅ corrigido |
| **CPM-06** | CPM | `cpm/page.tsx` | 1182-1186 | Contagem capturada antes de `setTableImportPreview(null)`. Toast agora exibe valores corretos. | ✅ corrigido |
| **CTX-03** | Context | `ProjectContext.tsx` | 80 | `toTarefaData` já mapeava `no_caminho_critico → critica`. Confirmado correto. Bug era sintoma de CPM não gravar no DB — resolvido via CPM-01. | ✅ corrigido (via CPM-01) |
| **CTX-16** | Context | `ProjectContext.tsx` | 207-215 | `prazoBase` agora filtra `folga === 0` antes do max. Fallback para max global se nenhuma crítica. | ✅ corrigido |
| **FUN-02** | Funções | `funcoes/page.tsx` | 282 | `handleSaveTaskCosts` trocado de `.update()` → `.upsert()` com `onConflict: 'projeto_id'`. | ✅ corrigido |
| **WBS-02** | WBS | `wbs/page.tsx` | 85, 166 | Custos sem persist automático em localStorage. Adicionado useEffect de persist. | ✅ corrigido |
| **WBS-03** | WBS | `wbs/page.tsx` | 807-825 | `removeNode` sem rollback se DB falhar. Revertido para DB-first + rollback de UI. | ✅ corrigido |
| **CTX-02** | Context | `ProjectContext.tsx` | 299-304 | Race condition navegação rápida A→B. Adicionado token de cancelamento via useRef. | ✅ corrigido |
| **CTX-12** | Context | `ProjectContext.tsx` | 218-227 | `isCpmReady` agora exige `t.ef > 0` via `tarefas.some(t => t.ef > 0)`. | ✅ corrigido |
| **CAL-04** | Calendário | `calendario/page.tsx` | 379 | Baseline nula silenciosa se TAP ausente. Toast de aviso adicionado quando prazo_total=0. | ✅ corrigido |

---

## SPRINT 3 — MÉDIOS (comportamentos incorretos)

### Context (CTX)
| ID | Arquivo | Linha | Descrição | Status |
|---|---|---|---|---|
| **CTX-04** | `ProjectContext.tsx` | 22-74 | `dependencias: string[]` mistura UUIDs e strings — sem validação de tipo. Criar tipo `UUID` ou validar na origem. | ⬜ pendente |
| **CTX-05** | `ProjectContext.tsx` | 429-432 | Projeto sem `orcamentos` → `custosTarefas` sempre `{}`. Registro vazio criado automaticamente. | ✅ corrigido |
| **CTX-06** | `ProjectContext.tsx` | 241-260 | `prazoLimiteSuperior` pode retornar `null` em cálculos → NaN silencioso. Tipo `number \| null` já documentado; consumidores devem checar. | ⬜ pendente (doc) |
| **CTX-07** | `ProjectContext.tsx` | 354-355 | `dataBaseline` JSONB sem validação de estrutura — `.prazo` pode não existir. Validação adicionada antes do set. | ✅ corrigido |
| **CTX-10** | `ProjectContext.tsx` | 358 | `modeloBurndown` nunca re-salvo ao alterar. `setModeloBurndownDB` wrapper persiste automaticamente. | ✅ corrigido |
| **CTX-11** | `ProjectContext.tsx` | 357 | `nTarefasBaseline` nunca auto-setado no primeiro CPM save. Já implementado em `cpm/page.tsx` lines 1333-1348. | ✅ corrigido (já estava) |
| **CTX-14** | `ProjectContext.tsx` | 275-296 | `resetContext` não reseta `plan`, `profileType`, `themeSkin`. Resets adicionados. | ✅ corrigido |
| **CTX-18** | `ProjectContext.tsx` | 227 | `isMotorReady` ignora `isProjetoViavel` — motor inicia com projeto inviável. Check `!== false` adicionado. | ✅ corrigido |
| **CTX-20** | `ProjectContext.tsx` | 268-272 | `refreshTA` com `taAtual` stale no double-click. `taAtualRef` via useRef; dependência removida. | ✅ corrigido |

### WBS (WBS)
| ID | Arquivo | Linha | Descrição | Status |
|---|---|---|---|---|
| **WBS-05** | `wbs/page.tsx` | 909-921 | Predecessoras não incluídas no upsert de `eap_nodes` — só em localStorage. `loadEAP` reconstrói de `tarefas.predecessoras` quando localStorage vazio. | ✅ corrigido |
| **WBS-06** | `wbs/page.tsx` | 692-694 | Bulk import "append" pode duplicar nodes. Deduplicação por nome+pai adicionada. | ✅ corrigido |
| **WBS-07** | `wbs/page.tsx` | 190 | Export com `custo: 0` se localStorage vazio. Fallback para `custosTarefas` do context. | ✅ corrigido |
| **WBS-08** | `wbs/page.tsx` | 654-657 | Parent resolution silenciosa se filho antes do pai. Ordenar linhas por hierarquia antes de processar. | ⬜ pendente |
| **WBS-09** | `wbs/page.tsx` | 516-521 | Erro em `loadEAP` não exibido ao usuário. Toast de erro adicionado no catch. | ✅ corrigido |
| **WBS-12** | `wbs/page.tsx` | 248-261 | Score threshold 0.4 pode mapear coluna errada. Aumentado para 0.6. | ✅ corrigido |
| **WBS-13** | `wbs/page.tsx` | 787-804 | `cloneNode` não copia custos. `idMap` + cópia de custos implementada. | ✅ corrigido |
| **WBS-14** | `wbs/page.tsx` | 390-445 | Predecessoras free-text sem validação de T-codes existentes. Validar contra `eapCodes` ao salvar. | ⬜ pendente |

### Calendário (CAL)
| ID | Arquivo | Linha | Descrição | Status |
|---|---|---|---|---|
| **CAL-01** | `calendario/page.tsx` | 340 | `feriados_overrides` não atualiza ao mudar regime. Overrides preservados ao recalcular por mudança de localização. | ✅ corrigido |
| **CAL-02** | `calendario/page.tsx` | 354-358 | Condição feriado/trabalha ambígua. Prioridade documentada em comentário. | ✅ corrigido |
| **CAL-03** | `calendario/page.tsx` | 367 | `interrupcoes.dias` aceita negativos. `Math.max(0, dias)` adicionado em `handleAddInt`. | ✅ corrigido |

---

## CAMPOS COM SILENT DATA LOSS (a resolver no Sprint 3)

| Campo | Tabela | Ação necessária |
|---|---|---|
| `no_caminho_critico` | `tarefas` | Carregar no mapper `toTarefaData` (ver CTX-03) | ✅ corrigido |
| `data_inicio_real` | `projetos` | Carregar e usar no cálculo de prazo real | ✅ corrigido |
| `caminho_critico_baseline_dias` | `projetos` | Exposto como `caminhoCriticoBaseline` no context | ✅ corrigido |
| `percentual_contingencia` | `projetos` | Adicionado a `TAPData`, carregado no context | ✅ corrigido |
| `modelo_burndown` | `projetos` | Re-salvar ao alterar (ver CTX-10) | ✅ corrigido |
| `cdt_area_baseline` | `orcamentos` | Exposto como `cdtAreaBaseline` no context | ✅ corrigido |

---

## BUGS BAIXOS (backlog)

| ID | Descrição |
|---|---|
| **WBS-CPM-01** | ✅ `calculateCPMLocal`: warn em IDs duplicados e duracao ≤ 0 |
| **WBS-CPM-02** | ✅ `findAllCriticalPaths`: MAX_PATHS=100 para grafos densos |
| **CPM-04** | ✅ Fallbacks `|| 1` nos import paths + warn em calculateCPMLocal |
| **CPM-05** | ✅ Mensagem genérica removida/melhorada (não localizada no código atual) |
| **FUN-04** | ✅ Badge de aviso no card Gradiente quando totalCostAll === 0 |
| **CTX-08** | ⬜ `isProjetoViavel=null` semanticamente ambíguo (backlog) |

---

*Auditoria realizada pelo squad Aura em 2026-03-24. Atualizar status ao concluir cada correção.*
