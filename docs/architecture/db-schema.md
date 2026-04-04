# DB Schema — Aura 6.1
**Projeto Supabase:** `fuxkohwhuwdwawyscshb`
**Última atualização:** 2026-03-21 (Sprint DOC — Stories 8.12, 8.13)
**Migrations:** 27 arquivos em `supabase/migrations/`

> **Nota sobre tipos TypeScript:** `supabase gen types typescript` requer Docker Desktop (local) ou personal access token `sbp_*`. O arquivo `src/lib/database.types.ts` não existe ainda no repositório — gerar com: `npx supabase gen types typescript --project-id fuxkohwhuwdwawyscshb > src/lib/database.types.ts`

---

## Tabelas Principais

### `projetos`
Tabela central — um projeto por linha, com todo o contexto CDT/MATED.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| tenant_id | UUID | FK auth.users (owner) — RLS |
| nome | TEXT | Nome do projeto |
| justificativa | TEXT | |
| objetivo_smart | TEXT | |
| escopo_sintetizado | TEXT | Sprint: add_tap_summary |
| orcamento_total | NUMERIC | Sprint: add_tap_summary |
| prazo_total | INTEGER | Sprint: add_tap_summary |
| restricoes | TEXT | |
| lados_ta | JSONB | `{E, P, O}` — TA atual |
| lados_tm | JSONB | `{E, P, O}` — TM baseline |
| orcamento_operacional | NUMERIC | |
| percentual_contingencia | NUMERIC | |
| data_inicio | DATE | |
| data_inicio_real | DATE | |
| prazo_total_dias | INTEGER | |
| caminho_critico_baseline_dias | INTEGER | |
| modelo_burndown | TEXT | |
| sdo_score | FLOAT4 | Sprint: sdo_score_column |
| display_mode_clairaut | TEXT | Sprint: add_clairaut_display_mode |
| cdt_status | TEXT | |
| onboarding_completed | BOOLEAN | Sprint: onboarding_completed |
| criado_em | TIMESTAMPTZ | DEFAULT NOW() |
| atualizado_em | TIMESTAMPTZ | Trigger auto-update |

### `tarefas`
Tarefas do CPM — uma linha por tarefa.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| tenant_id | UUID | RLS |
| display_id | TEXT | Ex: "T-01" |
| nome | TEXT | |
| duracao_estimada | INTEGER | dias |
| folga_total | FLOAT | TF do CPM |
| es | FLOAT | Early Start |
| ef | FLOAT | Early Finish |
| ls | FLOAT | Late Start |
| lf | FLOAT | Late Finish |
| no_caminho_critico | BOOLEAN | |
| custo_estimado | NUMERIC | |
| progresso_percentual | FLOAT | Último progresso |
| criado_em | TIMESTAMPTZ | |
| atualizado_em | TIMESTAMPTZ | Trigger |

### `tarefas_predecessoras`
Relações de dependência entre tarefas — CPM edges.

| Coluna | Tipo | Notas |
|--------|------|-------|
| tarefa_id | UUID FK | → tarefas.id CASCADE |
| predecessora_id | UUID FK | → tarefas.id CASCADE |
| tenant_id | UUID | RLS |
| PRIMARY KEY | (tarefa_id, predecessora_id) | |

### `entradas_custos`
Registros de custos reais/planejados por projeto.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| tenant_id | UUID | RLS |
| descricao | TEXT | |
| valor | NUMERIC | |
| tipo | TEXT | 'real'/'planejado' |
| data | DATE | |
| criado_em | TIMESTAMPTZ | |

### `entradas_murphys`
Eventos Murphy — desvios imprevistos registrados.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| tenant_id | UUID | RLS |
| descricao | TEXT | |
| impacto_prazo | INTEGER | dias |
| impacto_custo | NUMERIC | |
| data | DATE | |
| tipo | TEXT | 'murphy'/'parada' |
| criado_em | TIMESTAMPTZ | |

---

## Tabelas de Execução (EP-05 / Sprint DB-EXEC)

### `triangulo_matriz_versoes`
Histórico de Pecados — cada revisão formal de baseline gera uma versão.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| versao | INTEGER | Incremental por projeto |
| area_baseline | FLOAT8 | Área do TM nessa versão |
| lados | JSONB | `{escopo, orcamento, prazo}` |
| motivo | TEXT | Motivo da revisão (obrigatório na UI) |
| criado_em | TIMESTAMPTZ | |
| UNIQUE | (projeto_id, versao) | |

### `progresso_tarefas`
Histórico de avanço real por tarefa — série temporal de %avanço.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| tarefa_id | UUID FK | → tarefas.id CASCADE |
| percentual_avanco | FLOAT4 | [0, 100] |
| registrado_em | TIMESTAMPTZ | |
| registrado_por | UUID | → auth.users.id SET NULL |

### `decisoes_mated`
Decisões MATED registradas com parâmetros numéricos e zona de resultado.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| tenant_id | UUID | RLS (= auth.uid()) |
| descricao | TEXT | |
| parametros_numericos | JSONB | `{E, P, O}` pre e post |
| zona_resultado | TEXT | 'VERDE'/'AMARELA'/'VERMELHA'/'CRISE' |
| impacto_area_percent | NUMERIC | % de variação da área |
| created_at | TIMESTAMPTZ | |

---

## Tabelas de Calibração (EP-03)

### `aura_calibration_events`
Eventos de calibração Bayesiana — um por conclusão de projeto.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id |
| tenant_id | UUID | RLS |
| setor | TEXT | Setor do projeto |
| desvio_prazo | FLOAT | prazo_real/prazo_planejado |
| desvio_custo | FLOAT | custo_real/custo_planejado |
| sigma | FLOAT | Estimativa σ calculada |
| created_at | TIMESTAMPTZ | |

### `setor_config`
Configuração de fatores por setor (priors Bayesianos).

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| setor | TEXT UNIQUE | Ex: 'construcao', 'ti', 'infraestrutura' |
| fator_prazo | NUMERIC | Fator regressão histórico |
| fator_custo | NUMERIC | |
| sigma_prazo | NUMERIC | σ Monte Carlo |
| sigma_custo | NUMERIC | |
| fonte_literature | TEXT | Referência bibliográfica |
| n_projetos | INTEGER | Projetos que embasam |
| atualizado_em | TIMESTAMPTZ | |

---

## Tabelas de Infraestrutura SaaS

### `project_members`
Membros por projeto — controle de acesso multi-tenant.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id |
| user_id | UUID | → auth.users.id |
| tenant_id | UUID | RLS |
| role | TEXT | 'admin'/'editor'/'viewer' |
| status | TEXT | 'pending'/'active'/'expired' |
| invited_by | UUID | → auth.users.id |
| created_at | TIMESTAMPTZ | |

> **Story 8.13:** `tenant_users` não existe como tabela física. A view `tenant_users` agrega `project_members` por tenant para retrocompatibilidade.

### `ratelimit_log`
Rate limiting por tenant, endpoint e janela temporal. (Story SaaS-6, 8.12)

| Coluna | Tipo | Notas |
|--------|------|-------|
| tenant_id | TEXT | auth.uid()::text — parte da PK |
| endpoint | TEXT | Ex: '/api/ai/klauss' — parte da PK |
| window_start | TIMESTAMPTZ | Início da janela — parte da PK |
| count | INTEGER | Incrementado atomicamente |
| created_at | TIMESTAMPTZ | Adicionado em Story 8.12 |
| PRIMARY KEY | (tenant_id, endpoint, window_start) | |

**Função:** `increment_ratelimit_count(p_tenant_id, p_endpoint, p_window_start)` → `INTEGER`

**Índices:**
- `idx_ratelimit_lookup` — (tenant_id, endpoint, window_start)
- `idx_ratelimit_tenant_endpoint_created` — (tenant_id, endpoint, created_at)

---

## Tabelas de Risco (EP-13)

### `riscos_projeto`
Riscos externos ao triângulo CDT por projeto. Score RC = w1·P + w2·I + w3·(P×I).

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | UUID PK | |
| projeto_id | UUID FK | → projetos.id CASCADE |
| tenant_id | UUID | RLS (= auth.uid()) |
| titulo | TEXT | |
| categoria | TEXT | 'escopo'/'prazo'/'custo'/'qualidade'/'externo' |
| probabilidade | NUMERIC(5,4) | [0, 1] |
| impacto | NUMERIC(5,4) | [0, 1] |
| score_rc | NUMERIC(5,4) | Calculado e armazenado |
| zona_cet | TEXT | |
| descricao | TEXT | |
| unlock_event_id | UUID | |
| criado_em | TIMESTAMPTZ | |
| atualizado_em | TIMESTAMPTZ | |

---

## Views

### `tenant_users` (VIEW — Story 8.13)
Alias de `project_members` agrupado por tenant. Não é tabela física.

```sql
SELECT DISTINCT pm.tenant_id, pm.user_id, pm.status,
       MIN(pm.role) AS min_role, COUNT(*) AS project_count
FROM public.project_members pm
GROUP BY pm.tenant_id, pm.user_id, pm.status
```

---

## Funções e Triggers

| Nome | Tipo | Descrição |
|------|------|-----------|
| `increment_ratelimit_count(tenant_id, endpoint, window_start)` | FUNCTION | Incremento atômico de rate limit |
| `auth.user_tenant_id()` | FUNCTION | Retorna tenant_id do usuário autenticado |
| `updated_at_trigger()` | TRIGGER FUNCTION | Auto-update `atualizado_em` em todas as tabelas |
| `calc_empirical_sigma_rpc()` | RPC | Calcula σ empírico por setor |
| `validate_predecessoras()` | TRIGGER | Valida referências de predecessoras |

---

## Estratégia RLS

Todas as tabelas usam `ENABLE ROW LEVEL SECURITY`. Padrão:
- **Projetos/Tarefas:** `tenant_id = auth.user_tenant_id()`
- **Membros:** `tenant_id = auth.uid()` OU membro ativo do projeto
- **Rate limit:** `tenant_id = (SELECT auth.uid()::text)`
- **Riscos:** `tenant_id = auth.uid()`

> ⚠️ Fix Story 8.5: todas as policies usam `(SELECT auth.uid())` em vez de `auth.uid()` para evitar re-avaliação por linha (performance).

---

## Histórico de Migrations

| Arquivo | Data | Conteúdo |
|---------|------|----------|
| 20260313141453 | 2026-03-13 | TAP summary fields (escopo_sintetizado, orcamento_total, prazo_total) |
| 20260313203000 | 2026-03-13 | Audit harmony fix |
| 20260313233000 | 2026-03-13 | Fix TAP metadata |
| 20260314000000 | 2026-03-14 | RLS policies + indices |
| 20260315000000 | 2026-03-15 | Plan tier server-side enforcement |
| 20260316000000 | 2026-03-16 | Fix regime/turnos indexes + m1_escopo_baseline |
| 20260316010000 | 2026-03-16 | c2_modelo_burndown |
| 20260317000001 | 2026-03-17 | ratelimit_log + increment_ratelimit_count() |
| 20260317100000 | 2026-03-17 | onboarding_completed column |
| 20260317200000 | 2026-03-17 | project_members + roles (SaaS-3) |
| 20260317300000 | 2026-03-17 | Enrich calibration schema |
| 20260317400000 | 2026-03-17 | Email alerts schema |
| 20260317500000 | 2026-03-17 | updated_at triggers missing tables |
| 20260317600000 | 2026-03-17 | Predecessoras validation trigger |
| 20260317700000 | 2026-03-17 | Calib priors literature |
| 20260317800000 | 2026-03-17 | setor_config table |
| 20260317900000 | 2026-03-17 | calc_empirical_sigma RPC |
| 20260317950000 | 2026-03-17 | sdo_score column |
| 20260318000000 | 2026-03-18 | setor_config.atualizado_em |
| 20260318100000 | 2026-03-18 | Clairaut display_mode column |
| 20260318200000 | 2026-03-18 | **3 novas tabelas:** triangulo_matriz_versoes, progresso_tarefas, decisoes_mated |
| 20260321100000 | 2026-03-21 | TAP CDT fields |
| 20260321200000 | 2026-03-21 | Recalibrate priors |
| 20260321300000 | 2026-03-21 | historico_zonas |
| 20260321400000 | 2026-03-21 | area_regime_obtuso column |
| 20260321500000 | 2026-03-21 | **riscos_projeto** (EP-13) |
| 20260321600000 | 2026-03-21 | **ratelimit_log** — created_at + índice + COMMENT (Story 8.12) |
| 20260321700000 | 2026-03-21 | **project_members** COMMENT formal + view tenant_users (Story 8.13) |
