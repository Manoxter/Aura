# Aura-6.1 — Especificação de Renderização de Triângulos Diagnósticos

**Data:** 2026-04-01 | **Autoridade:** Criador do MetodoAura
**Status:** CANÔNICA v2.0 — Sessão 29: Âncora Semântica + Sombras Invariantes
**Substitui:** v1.0 (2026-03-30, transforms SVG ad-hoc)

---

## Convenções de Coordenadas

- **Eixo X:** Tempo (dias corridos, crescente esquerda→direita)
- **Eixo Y:** Valor financeiro acumulado (R$, crescente baixo→cima)
- **Origem:** (0,0) = início do projeto

## As 3 Retas Fundamentais

| Reta | Cor | Comportamento | Direção |
|------|-----|--------------|---------|
| Escopo (E) | Verde (#34d399) | Valor total contratado — horizontal fixa | Constante (En=1.0) |
| Prazo (P) | Amarelo (#f59e0b) | Burndown regressivo — conta do prazo total até zero | Decrescente (↘) |
| Custo (C) | Azul (#60a5fa) | Custo acumulado — cresce com avanço | Crescente (↗) |

## Construção do Triângulo — Âncora Semântica (D-S29-01)

**Fórmula ÚNICA** para todos os protocolos. O switch seleciona quais lados são (a, b, c):

```
V0 = (0, 0)                              // âncora (origem)
V1 = (a, 0)                              // lado 'a' na base
V2 = (b·cos(θ), signY·b·sin(θ))          // lado 'b' pelo ângulo θ

θ = arccos((a² + b² - c²) / (2·a·b))     // lei dos cossenos
```

| Protocolo | Âncora | a (base) | b (angular) | c (oposto) | flipY | Orientação |
|-----------|--------|----------|-------------|------------|:---:|-----------|
| **α (agudo)** | ε | C | P | E | Não | Abre para cima |
| **β (obtuso custo)** | ω | E | C | P | **Sim** | Abre para baixo |
| **γ (obtuso prazo)** | α | E | P | C | Não | Abre para cima |
| **singular** | ε | C | P | E | Não | Herda de α |

**Congruência SSS garantida:** {a, b, c} é sempre permutação de {E, C, P}. Validada com 788 testes.

## Sombras (A_mancha) — INVARIANTES ao protocolo (D-S29-02)

As sombras representam o **campo real** do projeto — as integrais normalizadas das curvas de custo e prazo. NÃO mudam entre protocolos.

| Sombra | Cor | Comportamento | Significado |
|--------|-----|--------------|------------|
| f_p | Indigo (rgba(99,102,241)) | Decrescente 1→0 | Burndown: trabalho restante |
| f_c | Âmbar (rgba(245,158,11)) | Crescente 0→1 | Custo acumulado normalizado |
| Interseção | Violeta (rgba(139,92,246)) | min(f_p, f_c) | Zona de máxima densidade |
| Envelope | Contorno violeta | max(f_p, f_c) | Exposição máxima combinada |
| Rebarba | Rosa tracejado | A_mancha > A_TM | Zona plástica (deformação) |

**Coerência automática:** f_c↗ (direita) coincide com lado C. f_p↘ (esquerda) coincide com lado P. Sem inversão em nenhum protocolo.

## NVO — Hierarquia Simplificada (D-S29-07)

| Nível | Quando | Ponto | Justificativa |
|:---:|--------|-------|--------------|
| 1 | Acutângulo | Baricentro do triângulo órtico | ZRE interior, convergência de altitudes |
| 2 | Obtuso / Singular / Fallback | Centróide do TM | Sempre interior, sensibilidade 1/3 por vértice |

Incentro **eliminado** — redundante (re-pondera ângulos), amplifica erro 8× em obtuso extremo.

## Estados do Sistema

### ALFA — Retas em posição natural
- Âncora: ε (entre P e C, oposto a E)
- Custo: parte de (0,0) subindo para direita (↗)
- Prazo: parte do valor máximo, descendo até zero (↘)
- Escopo: horizontal no topo
- ZRE visível (triângulo órtico)

### BETA — Custo em colapso (obtuso em ω)
- Âncora: ω (entre E e C, oposto a P)
- Escopo na BASE (horizontal)
- Custo = lado dominante (maior), angular
- Triângulo abre para BAIXO (flipY=true)
- Ângulo obtuso identificado e marcado
- NVO = centróide do TM

### GAMMA — Prazo em colapso (obtuso em α)
- Âncora: α (entre E e P, oposto a C)
- Escopo na BASE (horizontal)
- Prazo = lado dominante (maior), angular
- Triângulo abre para CIMA
- Vértice naturalmente posicionado
- NVO = centróide do TM

### SINGULAR — Triângulo reto com alerta
- Herda configuração de α (último instante antes do obtuso)
- Identificar qual vértice = 90° (prazo ou custo)
- Símbolo de esquadro (□) em laranja (#f97316) no vértice reto
- Modal bloqueante: "Prosseguir ciente do risco" ou "Rever TAP/WBS"
- Justificativa obrigatória para prosseguir (min 10 caracteres)
- Mostrar folga restante e margem de custo

### CRISE — Triângulo que não fecha
- CEt violada: |P-C| ≥ E
- Segmento real (prazo disponível): amarelo
- Segmento faltante: vermelho tracejado
- Canvas do TM oculto, painel de crise exibido
- Relatório de crise com 3 rotas de escape

## Pipeline Dual TM + TA (D-S29-04)

| | TM (Baseline) | TA (Atual) |
|---|---|---|
| Curvas | Planejadas (dia 0) | Reais (execução) |
| Mutabilidade | Imutável | Recalculado |
| Visual | Tracejado cinza, opacidade 0.25 | Sólido colorido por zona |
| Sombras | Não renderiza | A_mancha do TA |
| Protocolo | Pode diferir do TA | Governa a renderização |

## Pré-classificação via Slopes (D-S29-03)

```
mc² - mp² > 1  →  custo domina  →  β
mp² - mc² > 1  →  prazo domina  →  γ
|mc² - mp²| ≤ 1  →  equilibrado  →  α
```

Algebricamente equivalente ao Clairaut (E²+P²<C²), executada ANTES de construir o triângulo.

## Painel de Compensação TM↔TA

Exibe deltas por lado (% acima/abaixo do baseline), lado prioritário, e texto prescritivo:
- "Dentro da tolerância (±5%)" → sem ação
- "Custo está X% acima do baseline" → sugestão de ajuste
- "ALERTA: protocolo mudou" → ação urgente

## Transição de Protocolo como Evento

Transições (α→β, α→singular, β→α remissão) são eventos datáveis com:
- Trigger: "ω > 90° — custo dominou"
- Severidade: positiva (remissão), alerta (singular), crítica (obtuso)
- Registro para auditoria e alimentação do Prometeu Intrínseco

---

*Referência canônica para @fermat e @dev*
*Sessão 29 — 2026-04-01*
