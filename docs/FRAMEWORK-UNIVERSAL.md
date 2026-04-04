# FRAMEWORK Aura — NÚCLEO UNIVERSAL (CORE)

**Documento:** Fundamentos Matemáticos e Visuais (Motor CDT e Renderização)
**Abrangência:** Aplica-se a TODOS OS PRODUTOS da Família Aura (Corporate/CPM e Tech/CCPM).
**Data da Revisão:** Abril de 2026

Este documento guarda as premissas matemáticas que são **inegociáveis e universais**, não importando o framework de gestão utilizado por cima.

---

## 1. GEOMETRIA E RENDERIZAÇÃO CANÔNICA DO TM

O Triângulo Matemático (TM) é uma entidade estritamente geométrica relacional, gerado pela Lei dos Cossenos.

### 1.1 Convenção Cartesiana (D35)
- O eixo visual é sempre `L→R` (esquerda para direita positivo) e `B→T` (baixo para cima positivo).
- O Lado Escopo (`E`) DEVE ser sempre a base perfeitamente horizontal na parte inferior.
- O vértice `V` (onde Prazo e Custo se encontram) está sempre voltado para cima. Nunca há triângulos invertidos.

### 1.2 Geometria Natural sem Traslado (D34, D39)
- Foram banidas representações com "gambiarras" visuais (`flipY`, multiplicação de coeficiente por -1).
- O triângulo é renderizado 100% como é revelado na álgebra bruta associada à síntese de Clairaut.
- O TM não possui eixos cartesianos ou linhas de grade desenhadas. 

### 1.3 Ângulo Reto e Posição Natural (D41)
- O triângulo singular com de 90° graus em vértices da base obedece regras vitais:
- **Reto em Custo (vértice Esquerdo/A):** O Cateto que forma o 90° graus é P, sua hipotenusa é decrescente(↘).
- **Reto em Prazo (vértice Direito/B):** O Cateto que forma o 90° graus é C, hipotenusa crescente(↗).
- A Restrição é sempre exibida onde a "Sombra" (área sob a curva) se forma no único lado agudo.

---

## 2. REGRAS DE SINGULARIDADE (ZONA PLÁSTICA)

O ângulo reto de exatos 90.000° é um limite inalcançável (singularidade absoluta onde a derivada temporal tangencia o infinito — tarefas feitas com tempo/custo zero).

### 2.1 A Faixa da Zona Plástica (D42)
Sendo 90° inalcançável numericamente, o Aura opera com uma **Zona Plástica** restrita pela faixa **`[85°, 105°]`**.

### 2.2 Eventos Operacionais (D36, D37)
- **Até 80°:** Normalidade.
- **80° a 84.99°:** Nível Atenção.
- **85° a 94.99°:** Entra oficialmente na "Zona Plástica". O Aura emite Modais de restrição. Decisões têm caráter irreversível sob esta pressão sem aporte excepcional.
- **95° a 105°:** Transição Confirmada.
- **> 105°:** Regime Obtuso Estável.

### 2.3 Setup/Pecado Original (D43)
Se ao iniciar/cadastrar as estimativas totais de um projeto novo ele, nativamente, explodir a angulação para um valor dentro de `[85°, 105°]`, o assistente Klauss bloqueia a emissão da Baseline:
- A UI alerta que o escopo orçado não condiz operacionalmente com o prazo imposto e sugere paralelismo, fast-tracking ou crashing.
- Permite-se ignorar o alerta por meio da assinatura do **Pecado Inicial no TM** (registro eterno da decisão errônea no Histórico).

---

## 3. PROTOCOLOS ADAPTATIVOS DAS RETAS E SWAP (D40)

Visando resolver a aversão visual dos lados P e C decaindo contrários à função dashboard ("Manche de avião"), a relação Esquerda-Direita segue um Switch de Orientação de acordo com o regime (Protocolo):

| Protocolo TM | Lado Esquerdo (Left) | Lado Direito (Right) | Justificativa Visual (Slopes) |
|-------------|-----------------------|----------------------|--------------------------------|
| **Protocolo α (Acutângulo)** | **Custo** → F. Acumulada Crescente(↗) | **Prazo** → F. Burndown(↘) | P sobe, C desce → Convergem para o Vértice `V`. |
| **Protocolo β (Obtuso em C)** | **Prazo** → F. Earned Schedule(↗) | **Custo** → F. Acumulada(↗) | Swap OBRIGATÓRIO de Lados. Função de Prazo passa a refletir ritmo (ES) para combinar com vértice que varou o offset. |
| **Protocolo γ (Obtuso em P)** | **Prazo** → F. Burndown(↘) | **Custo** → F. Burndown Orçamento(↘) | Swap de lados (se necessário). Custo passa a operar como queima de reserva para manter coerência visual descendente. |

A matemática por trás do limite CDT e verificação da CEt é ABSOLUTAMENTE INALTERADA, preservando o valor quadrático da hipotenusa, alterando-se apenas a assinatura de qual lado desenha a reta com qual leitura paramétrica explícita e texturizada.

---

## 4. RELAÇÃO DE DECISÕES UNIVERSAIS

| Código | Decisão Matemática Universal |
|--------|------------------------------|
| **D34** | Fim absoluto do Traslado Visual (sem modificação de -1 em slopes). |
| **D35** | Adoção canônica da Convenção Cartesiana (Origem inferior à esquerda). |
| **D36** | Mapeamento Angular e Triggers Ativados via Eventos de Zona. |
| **D37** | Criação do Modal de Singularidade da Zona Plástica (85°). |
| **D39** | Supressão de Eixos do Quadro visual (é um diagrama relacional, não um gráfico estatístico estrito). |
| **D40** | Swaps adaptativos. Adaptação Dinâmica do Earned Schedule e Burndown Orçamentário. |
| **D41** | Ângulo Reto desenhado na posição Natural de origem cartesiana. |
| **D42** | Tratamento de Singularidades Não por `=== 90°` e sim por `faixa 85-105`. |
| **D43** | Mecanismo restritivo e Log de Pecado Origem (Baseline de Zona Plástica). |
