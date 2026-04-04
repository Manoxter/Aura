# Relatorio de Debito Tecnico — Aura 6.1
## Brownfield Discovery Phase 9 — @analyst (Alex)
**Projeto:** Aura — Decision Intelligence para Engenharia de Projetos
**Data:** 2026-03-14
**Versao:** 1.0

---

## Executive Summary (1 pagina)

### Situacao Atual

O Aura possui um motor matematico inovador baseado em geometria euclidiana (triangulo CDT) que transforma dados de custo, prazo e escopo em um KPI visual de saude do projeto. **O conceito e solido e unico no mercado.** Porem, a implementacao atual tem **10 debitos criticos** que impedem o motor de funcionar corretamente — o pipeline de dados quebra entre a extracao da TAP e a geracao do triangulo, fazendo com que o KPI central do produto nunca seja renderizado.

Em termos de negocio: o principal diferencial do Aura (o triangulo de qualidade) **nao funciona end-to-end**. Usuarios que tentam usar o fluxo completo (TAP → EAP → CPM → Motor) encontram dados zerados, paginas que crasham, e um triangulo que nao aparece.

Adicionalmente, a matematica de normalizacao tem inconsistencias que comprometeriam a confiabilidade do KPI mesmo que o pipeline funcionasse — dois projetos identicos em proporcao mas diferentes em escala absoluta gerariam triangulos diferentes.

### Numeros Chave

| Metrica | Valor |
|---------|-------|
| Total de Debitos | 32 |
| Debitos Criticos (bloqueiam uso) | 10 |
| Debitos Altos (degradam qualidade) | 13 |
| Esforco Total Estimado | ~148 horas |
| Custo Estimado (R$150/h) | R$ 22.200 |
| Tempo de Resolucao | 2-3 semanas (1 dev) |
| Pages que crasham hoje | 2 (orcamento + funcoes) |

### Recomendacao

**Investir imediatamente em 3 sprints focados** para transformar o motor CDT de "prova de conceito com bugs" para "KPI dinamico confiavel". O custo de R$22.200 e insignificante comparado ao risco de lancar um SaaS cujo diferencial principal nao funciona. **ROI: evitar churn de 100% dos early adopters.**

---

## Analise de Custos

### Custo de RESOLVER

| Categoria | Horas | Custo (R$150/h) |
|-----------|-------|-----------------|
| Motor Matematico | 41h | R$ 6.150 |
| Pipeline de Dados | 22h | R$ 3.300 |
| Database/Seguranca | 24h | R$ 3.600 |
| Frontend/UX | 43.5h | R$ 6.525 |
| Testes | 18h | R$ 2.700 |
| **TOTAL** | **148.5h** | **R$ 22.275** |

### Custo de NAO RESOLVER (Risco Acumulado)

| Risco | Probabilidade | Impacto | Custo Potencial |
|-------|---------------|---------|-----------------|
| Churn de early adopters (KPI nao funciona) | ALTA (90%) | CRITICO | R$ 100.000+ (receita perdida) |
| Data leakage entre tenants (sem RLS) | MEDIA (40%) | CRITICO | R$ 500.000+ (LGPD multa) |
| Perda de credibilidade tecnica | ALTA (80%) | ALTO | Incalculavel |
| Retrabalho futuro (debt compounds) | CERTA (100%) | MEDIO | R$ 50.000+ |

**Custo potencial de nao agir: > R$ 650.000**

---

## Impacto no Negocio

### Motor CDT (Core Product)
- **Hoje:** Triangulo nao gera com dados reais — pipeline quebrada
- **Apos fix:** KPI dinamico funcional em < 3 segundos apos setup completo
- **Impacto:** Produto entregue conforme proposta de valor

### Seguranca
- **Hoje:** Qualquer usuario autenticado acessa dados de qualquer tenant
- **Apos fix:** Isolamento completo por RLS
- **Impacto:** Conformidade LGPD, confianca institucional

### Experiencia PM/PO
- **Hoje:** Metricas adimensionais (E=1.0, O=0.73) incompreensiveis
- **Apos fix:** "73% do orcamento consumido", "prazo 15% acima do baseline"
- **Impacto:** Adocao real por gestores de projeto

### Velocidade de Desenvolvimento
- **Hoje:** Cada feature nova quebra pipeline por `as any` e shape mismatch
- **Apos fix:** Tipos fortes, pipeline testada, sem regressoes
- **Impacto:** +50% velocidade de entrega de features

---

## Timeline Recomendado

### Sprint 0 — Quick Wins (1-2 dias)
- Fix crashes em orcamento e funcoes pages
- Eliminar `as any` casts
- Unificar campo duracao
- **Custo:** R$ 1.500
- **ROI:** Imediato — pages param de crashar

### Sprint 1 — Motor Core + Security (5 dias)
- Refatorar normalizacao CDT
- Corrigir CEt (pre-normalizacao)
- Tratar triangulo obtusangulo
- Implementar RLS
- **Custo:** R$ 7.500
- **ROI:** CDT funcional + dados seguros

### Sprint 2 — UX PM/PO (5 dias)
- MetricTranslator (adimensional → negocio)
- Labels semanticos no triangulo
- SetupStepper
- Reta tangente real (nao hardcoded)
- **Custo:** R$ 7.500
- **ROI:** PM/PO usa CDT sem suporte tecnico

---

## ROI da Resolucao

| Investimento | Retorno Esperado |
|--------------|------------------|
| R$ 22.200 (resolucao) | R$ 650.000+ (riscos evitados) |
| 148h (~3 semanas) | Produto lancavel com KPI funcional |
| 3 sprints focados | +50% velocidade de dev futura |

**ROI Estimado: 29:1**

---

## Proximos Passos

1. [x] Brownfield Discovery completo (este documento)
2. [ ] Aprovar investimento de ~R$ 22.200 / 148h
3. [ ] Iniciar Sprint 0 (crash fixes) — imediato
4. [ ] Iniciar Sprint 1 (motor core) — semana seguinte
5. [ ] Iniciar Sprint 2 (UX PM/PO) — semana seguinte
6. [ ] Deploy + validacao com early adopters

---

## Anexos

- [Assessment Tecnico Completo](../prd/technical-debt-assessment.md)
- [System Architecture](../architecture/system-architecture.md)
- [Database Schema](../../supabase/docs/SCHEMA.md)
- [Database Audit](../../supabase/docs/DB-AUDIT.md)
- [Frontend Spec](../frontend/frontend-spec.md)
- [DB Review](../reviews/db-specialist-review.md)
- [UX Review](../reviews/ux-specialist-review.md)
- [QA Review](../reviews/qa-review.md)

---

*Generated by @analyst (Alex) — Brownfield Discovery Phase 9 | 2026-03-14*
