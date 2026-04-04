# EPIC: Resolucao de Debitos Tecnicos — Motor CDT & Pipeline
## Brownfield Discovery Phase 10 — @pm (Morgan)
**Data:** 2026-03-14
**Epic ID:** Aura-BD-01

---

## Objetivo

Transformar o Motor CDT de "prova de conceito com bugs criticos" em um **KPI dinamico confiavel** para gestao preditiva de projetos, corrigindo toda a cadeia TAP → EAP → CPM → Orcamento → Motor → CDT → MATED.

## Escopo

- 32 debitos tecnicos identificados no Brownfield Discovery
- Foco em: consistencia matematica, pipeline de dados, seguranca, UX para PM/PO
- **Fora de escopo:** novas features, mobile-first (adiado para Sprint 3+)

## Criterios de Sucesso

1. CDT renderiza triangulo valido para 100% dos projetos com setup completo
2. CEt detecta crise geometrica corretamente
3. MATED distancia coerente (NVO dentro do triangulo)
4. PM/PO interpreta CDT sem jargao tecnico
5. Pipeline sem `NaN`, `undefined` ou `as any`
6. RLS impede cross-tenant em 100% das tabelas
7. Cobertura de testes motor >= 90%

## Timeline

| Sprint | Duracao | Foco | Stories |
|--------|---------|------|---------|
| Sprint 0 | 1-2 dias | Crash fixes + Shape alignment | S0.1, S0.2 |
| Sprint 1 | 5 dias | Motor Core + Security | S1.1 — S1.5 |
| Sprint 2 | 5 dias | UX PM/PO + Refinamento | S2.1 — S2.4 |

## Budget

- **Horas:** ~148h
- **Custo:** ~R$ 22.200 (base R$150/h)
- **ROI:** 29:1 (riscos evitados)

---

## Stories

### Sprint 0 — Quick Wins

**S0.1 — Fix page crashes (orcamento + funcoes)**
- Remover `projecaoFinanceira` duplicada em orcamento/page.tsx
- Declarar `modeloCurva` state em funcoes/page.tsx
- Importar `dataInicio` em orcamento/page.tsx
- Remover debug markers da EAP
- **AC:** Pages compilam e renderizam sem erro
- **Est:** 3h

**S0.2 — Alinhar shape TAP→Context (eliminar `as any`)**
- Criar mapper `toTarefaData()` em ProjectContext ou utils
- Unificar campo: `duracao` → `duracao_estimada` como canonico
- Atualizar `TarefaData` type, `ProjectContext.tsx`, `math.ts`, todas as pages
- **AC:** Zero `as any` no pipeline TAP→Motor, `prazoBase` calcula corretamente
- **Est:** 7h

### Sprint 1 — Motor Core + Security

**S1.1 — Refatorar normalizacao CDT (M1)**
- O = custo_acumulado_real / BAC (ratio 0-1)
- P = prazo_consumido_real / prazo_total (ratio 0-1)
- E = 1.0 (fixo, referencia)
- Atualizar `gerarTrianguloCDT` e todos os consumers
- Versionar: `cdt_version: 2` em orcamentos
- **AC:** Dois projetos com mesma proporcao geram CDT identico independente de escala
- **Est:** 8h

**S1.2 — Corrigir CEt + tratar obtusangulo (M4/M5)**
- Chamar `checkCDTExistence(E, O, P)` ANTES da normalizacao em `gerarTrianguloCDT`
- Retornar `{isValid, crisisReport}` junto com o triangulo
- Detectar obtusangulo (qualquer angulo > 90°): usar incentro como NVO
- **AC:** CEt detecta crise com valores pre-normalizacao; MATED coerente para todos os tipos
- **Est:** 11h

**S1.3 — Desbloquear pipeline custosTarefas (M7)**
- Quando `orcamento_total > 0` e `custosTarefas = {}`, distribuir proporcional por duracao
- Permitir override manual na aba "Custos por Tarefa"
- **AC:** Projecao financeira nao-zerada para qualquer projeto com orcamento
- **Est:** 6h

**S1.4 — Corrigir extractors e EAP save (P1/P4/P6)**
- WBS extractor: filtrar linhas que matcham patterns de orcamento/prazo/restricao
- WBS extractor: limpar prefixo numerico do campo `nome`
- EAP save: buscar duracao_estimada existente antes de sobrescrever com default
- Padronizar IDs para UUID em todo o pipeline
- **AC:** WBS gera apenas nos de trabalho; duracao preservada; IDs consistentes
- **Est:** 10h

**S1.5 — Implementar RLS + indices (DB1/DB5)**
- Criar policies para todas as tabelas com tenant_id
- Criar indices em projeto_id para 5 tabelas
- Testar: usuario A nao ve dados do usuario B
- **AC:** Cross-tenant access impossivel; queries < 100ms
- **Est:** 10h

### Sprint 2 — UX PM/PO + Refinamento

**S2.1 — MetricTranslator para linguagem PM/PO (UX9)**
- Componente que traduz E/O/P para frases de negocio
- HealthBadge (semaforo verde/amarelo/vermelho) baseado em MATED distance
- Cards com metricas traduzidas: "73% do orcamento", "prazo 15% acima"
- Frases prescritivas: "Para restaurar, reduza escopo em X%..."
- **AC:** PM/PO entende CDT sem explicacao tecnica
- **Est:** 12h

**S2.2 — Labels semanticos + tangente real (M2/UX3/UX6)**
- Labels "Escopo", "Custo", "Prazo" nos lados do triangulo SVG
- Substituir reta tangente hardcoded por `tangentePontual()` calculada
- Tooltips nos vertices com valores reais (R$, dias)
- **AC:** Cada lado do triangulo e identificavel; tangente reflete dados reais
- **Est:** 8h

**S2.3 — SetupStepper + empty states (UX1/UX12)**
- Componente SetupStepper com 7 etapas (TAP→EAP→Cal→CPM→Orc→Fun→Motor)
- Indicadores: cinza/amarelo/verde/vermelho
- Empty states diferenciados por etapa faltante
- **AC:** Usuario sabe exatamente onde esta e o que falta
- **Est:** 10h

**S2.4 — Unificar ortico + OLS pontual + Monte Carlo (M3/M6/M8)**
- Remover `peAltitude()` de math.ts — usar apenas `triangle-logic.ts`
- Motor CDT: usar `tangentePontual()` em vez de `regressaoOLS()` para burn rate
- Monte Carlo: usar Box-Muller de math-tools.ts
- **AC:** Um unico caminho para calculo geometrico; burn rate instantaneo; distribuicao normal
- **Est:** 12h

---

## Dependencias

```
S0.1 (crashes) → independente
S0.2 (shape) → bloqueia S1.1, S1.2, S1.3
S1.1 (normalizacao) → bloqueia S1.2, S2.1, S2.2, S2.4
S1.2 (CEt/ortico) → bloqueia S2.4
S1.3 (custosTarefas) → bloqueia S2.2
S1.4 (extractors) → independente (pode ir em paralelo)
S1.5 (RLS) → independente (pode ir em paralelo)
S2.1 (MetricTranslator) → depende de S1.1
S2.2 (labels/tangente) → depende de S1.1, S1.3
S2.3 (stepper) → independente
S2.4 (unificar motor) → depende de S1.1, S1.2
```

---

*Generated by @pm (Morgan) — Brownfield Discovery Phase 10 | 2026-03-14*
