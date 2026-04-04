# PARECER TECNICO DE VIABILIDADE — Aura 6.1

**Emissor:** Dr. Kenji (@pm-engineer)
**Data:** 2026-03-15
**Veredicto:** VIAVEL COM RESSALVAS

## Fundacao Matematica: SOLIDA

- Desigualdade triangular (CEt): implementacao impecavel do Proposicao I.20 de Euclides
- Area de Heron como KPI: numericamente estavel, monotonicidade preservada
- Triangulo ortico + NVO: construcao classica com fallback correto (incentro para obtusangulos)
- Risco residual: tangente pontual com poucos dados tem erro O(h^2) — aceitavel para dados diarios

## Aplicabilidade Pratica

| Contexto | Viabilidade |
|----------|------------|
| Infraestrutura/construcao | MUITO ALTA |
| Software waterfall/hibrido | ALTA |
| Projetos com Curva S | ALTA |
| Projetos ageis puros | BAIXA |

## Diferencial Competitivo

O Aura oferece acoplamento geometrico — alterar custo NECESSARIAMENTE altera prazo e escopo geometricamente. Isso e mais fiel a realidade que o EVM (CPI/SPI independentes). Nenhuma ferramenta comercial oferece CEt, MATED ou area como KPI.

## Market Fit

- Grandes projetos (>$100M): FIT ALTO, barreira de integracao
- Medios ($1M-$100M): FIT MUITO ALTO — sweet spot
- Pequenos (<$1M): FIT BAIXO — sem inputs necessarios

## Caveats

1. Educacao do usuario e CRITICA
2. Posicionar como "camada analitica", nao substituto de MS Project
3. Expandir validacao alem do Big Dig (Channel Tunnel, Sydney Opera House)
4. Completar KPIs no frontend

## Validacao Big Dig

96 testes passando. Timeline confirmada: RISCO em 1993, 8 anos antes do reconhecimento publico (2001). Dados estimados (nao diarios reais) — afirmacao plausivel mas nao cientificamente demonstrada.
