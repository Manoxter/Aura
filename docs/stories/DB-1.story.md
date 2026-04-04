# Story DB-1 — DB-EXEC: 3 Novas Tabelas de Execução
**Épico:** EP-05 Execução
**Sprint:** DB-EXEC
**Status:** Done
**Agentes:** @data-engineer (Dara)

## User Story
Como PM em fase de execução do projeto, preciso que o sistema persista o progresso real das tarefas, as versões do Triângulo Matriz (histórico de revisões de baseline) e as decisões MATED registradas, para que o Aura acompanhe o projeto durante a execução e não apenas no setup.

## Acceptance Criteria
- [x] AC-1: Tabela `triangulo_matriz_versoes` criada com colunas: id, projeto_id, versao (int), area_baseline (float8), lados (jsonb), motivo (text), criado_em
- [x] AC-2: Tabela `progresso_tarefas` criada com colunas: id, tarefa_id, percentual_avanco (float4, 0–100), registrado_em, registrado_por (uuid)
- [x] AC-3: Tabela `decisoes_mated` criada com colunas: id, projeto_id, descricao (text), parametros_numericos (jsonb), distancia_nvo (float8), zona_resultado (text), impacto_area_percent (float8), criado_em
- [x] AC-4: RLS habilitado nas 3 tabelas — acesso restrito ao tenant do projeto
- [x] AC-5: Índices nas colunas de filtro frequente (projeto_id, tarefa_id)
- [x] AC-6: Migration em arquivo `supabase/migrations/20260318200000_exec_tables.sql`

## Tasks
- [x] 1. Criar migration SQL com as 3 tabelas + RLS + índices
- [x] 2. Validar TypeScript types gerados pelo schema (sem erros)

## File List
- `supabase/migrations/20260318200000_exec_tables.sql` *(novo)*

## Definition of Done
- [x] 3 tabelas no arquivo de migration
- [x] RLS em todas as 3
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: DB-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @sm (River) | Story criada — Sprint DB-EXEC |
