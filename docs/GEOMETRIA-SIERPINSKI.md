# A MATRIZ DE SIERPINSKI NO CCPM DA AURA

*Documento de Diretriz Matemática para os Agentes de Construção Frontend.*

A arquitetura visual e matemática do motor TM na Aura não se baseia na fragmentação de um triângulo estático, mas sim no espelhamento do princípio da **Geometria Fractal de Sierpinski** aplicada à progressão de tempo (Cadeia Crítica).

## 1. A Regra de Crescimento e a Partilha de Sprints
O Triângulo de Sierpinski se expande através de uma divisão perfeita, criando uma progressão na base (Escopo):

- **Sierpinski Nível 1:** Acomoda **2 Sprints (triângulos-base)** orientados para cima. O miolo invertido é o buffer central.
- **Sierpinski Nível 2:** A base acomoda **exatamente 4 Sprints** apontados para cima. 
- **Sierpinski Nível 3:** A base acomoda **exatamente 8 Sprints**.

## 2. A Aplicação na Metodologia da Aura
O projeto idealizado com uma média de **4 a 6 Sprints** segue intrinsecamente a malha do Nível 2 ao Nível 3 de Sierpinski.

- **Alinhamento Vetorial e Tensão:** Todos os sub-triângulos na base guardam a *Mesma Orientação Geométrica* do Triângulo Mestre. Isso traduz graficamente que toda operação exerce pressão vetorial na mesma direção em direção à Entrega (Ponto de convergência superior).
- **Os Triângulos Invertidos como Buffers (TBZ):** Os "buracos" geométricos (triângulos de cabeça para baixo) que sobram naturalmente na malha da Matriz atuam nativamente como as nossas **Transition Buffer Zones (TBZ)**. Visualmente, o ponto de tensão negativa e as sobras de Hand-off entre as Sprints habitam aqui.

## 3. A Restrição "Acordeão" e o Backward Pass
O Triângulo Mestre é uma entidade viva e reativa.
- A duração do projeto dita o comprimento da Base. À medida que o tempo avança e a Cadeia Crítica aperta, toda a malha de Sprints repousando sobre a base espreme-se como um acordeão.
- Agindo pelo método do **Backward Pass** (calculando o avanço de trás para a frente), garantimos a rigidez da fronteira. Se a compressão temporal romper o limite da *Condição de Existência (CEt)* de apenas 1 fractal que rege o limite externo (Cadeia Crítica), toda a estrutura física de Sierpinski estilhaça. O projeto é invalidado e exige recálculo.
