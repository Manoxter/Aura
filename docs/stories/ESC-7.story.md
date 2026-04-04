# Story ESC-7 — Historico Geometrico + Monte Carlo/Bayesiano + Calibracao

**Epic:** EP-ESCALENO
**Sprint:** G3 — Calibracao + Registro + Documentacao
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @aura-math, @data-engineer (Dara), @dev (Dex)
**Complexidade:** XL | **Prioridade:** ALTA
**Dependencias:** ESC-6

---

## Contexto

Cada estado TM ao longo do projeto e um vetor (E, C, P, area, alpha, beta, gamma, data, fase). Com historico, o Monte Carlo amostra distribuicoes aprendidas da forma geometrica real e o Bayesiano atualiza priors a cada nova medicao.

---

## Acceptance Criteria

### AC-1: Registro de estados geometricos
- [ ] A cada recalculo do CDT (mudanca de dia, decisao, atualizacao de tarefa), um snapshot e salvo
- [ ] Snapshot: `{ data, E, C, P, area, alpha, beta, gamma, zona, forma, a_mancha, a_rebarba }`
- [ ] Armazenado em `projetos.historico_geometrico` (JSONB array) ou tabela dedicada
- [ ] Relatorio exibe trilha de estados como timeline geometrica

### AC-2: Monte Carlo com distribuicoes aprendidas
- [ ] Monte Carlo nao usa mais distribuicao generica (normal centrada em 0)
- [ ] Usa historico geometrico do projeto para estimar distribuicao de C e P
- [ ] Se historico < 5 pontos, fallback para distribuicao generica (comportamento atual)
- [ ] Se historico >= 5 pontos, ajusta normal a media e desvio padrao observados

### AC-3: Bayesiano
- [ ] Prior: distribuicao generica por setor (construcao_civil, software, etc.)
- [ ] Likelihood: observacao mais recente do CDT
- [ ] Posterior: distribuicao atualizada que informa a proxima predicao
- [ ] Implementado em `src/lib/engine/bayesian.ts`

### AC-4: Calibracao progressiva
- [ ] O sistema registra acertos/erros das predicoes anteriores
- [ ] Predicoes que acertaram zona correta ganham peso
- [ ] Predicoes que erraram sao ajustadas
- [ ] Resultado: "para projetos deste setor, angulo alpha < 55° na fase 2 antecede CRISE em X%"

### AC-5: Migration de banco
- [ ] Nova coluna/tabela para historico geometrico
- [ ] Novos campos em `tm_versoes` para angulos
- [ ] Migration aplicada sem perda de dados existentes

---

## Scope

### IN
- `src/lib/engine/math.ts`: Monte Carlo atualizado
- `src/lib/engine/bayesian.ts`: NOVO — motor Bayesiano
- `src/context/ProjectContext.tsx`: carregar historico geometrico
- `supabase/migrations/`: nova migration
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`: exibir timeline

### OUT
- Documentacao formal (ESC-8)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit a958b52 |
