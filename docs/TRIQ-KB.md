# Auranical Knowledge Base (KB)

Este documento condensa o aprendizado profundo sobre os mecanismos internos do Aura-6.1 para servir de referência para agentes e desenvolvedores.

## 1. O Motor Geométrico (`src/lib/engine`)
O coração do Aura é o cálculo de **Qualidade Geométrica**.
*   **Triangle Logic**: Implementa Geometria Euclidiana para calcular distâncias, áreas e baricentros.
*   **Orthic Triangle**: Utilizado para determinar o "triângulo pedal", essencial para métricas de envelope de cenários extremos.
*   **Ponto de Atenção**: Atualmente não há validação para triângulos degenerados (pontos colineares), o que pode causar divisões por zero ou áreas nulas inesperadas.

## 2. Orquestração de Inteligência Artificial
As rotas de IA (`src/app/api/ai`) utilizam o SDK da **Groq** com o modelo `llama-3.3-70b-versatile`.
*   **TAP (Project Charter)**: Extrai nome, justificativa, objetivos SMART e restrições de textos desestruturados.
*   **CPM & Proactive Setup**: Automatizam a criação de cronogramas e configurações iniciais.
*   **Fallback**: O sistema possui lógica de fallback local (`console.warn`) para quando a chave da API está ausente, garantindo resiliência básica.

## 3. Estado e Persistência
*   **Supabase**: Utilizado para persistência de dados do projeto.
*   **ProjectContext**: Gerenciamento de estado global no React para sincronizar o Dashboard com as configurações de setup.

## 4. Filosofia de Desenvolvimento Sugerida
Para o Aura, a integração AIOS deve focar em:
1.  **Precisão Matemática**: Qualquer mudança no `engine` exige validação via `@aura-math`.
2.  **Elicitação Ativa**: A IA não deve apenas extrair dados, mas questionar inconsistências ortogonais entre prazo e custo.

---
> [!NOTE]
> Este KB deve ser atualizado sempre que um novo componente crítico ou padrão arquitetural for introduzido.
