# Story ADMIN-1 — ADMIN-SIDEBAR: Administração no menu avatar do rodapé
**Épico:** EP-05 Execução
**Sprint:** ADMIN-SIDEBAR
**Status:** Done
**Agentes:** @dev (Dex)

## User Story
Como PM, quero que os links de Administração (Conta e plano, Perfis de Acesso, Sair) fiquem em um menu avatar no RODAPÉ da sidebar — fora do grupo GOVERNANÇA — para que a sidebar seja mais limpa e o padrão de navegação corresponda a SaaS modernos (Linear, Notion).

## Acceptance Criteria
- [x] AC-1: "Meu Perfil & Plano" e "Perfis de Acesso" removidos do grupo GOVERNANÇA na sidebar
- [x] AC-2: Avatar button no rodapé da sidebar mostra iniciais do usuário (ou ícone fallback)
- [x] AC-3: Clicando no avatar abre dropdown com: Conta e plano, Perfis de Acesso, Sair
- [x] AC-4: "Sair" chama `supabase.auth.signOut()` e redireciona para `/`
- [x] AC-5: Menu fecha ao clicar fora (blur ou overlay)
- [x] AC-6: No modo collapsed (md: ícones apenas), avatar mostra apenas o ícone do botão
- [x] AC-7: TypeCheck: 0 erros

## Tasks
- [x] 1. Adicionar estado `user` (email) e dropdown ao Sidebar
- [x] 2. Remover "Meu Perfil & Plano" e "Perfis de Acesso" do grupo GOVERNANÇA
- [x] 3. Adicionar avatar button + dropdown no rodapé da sidebar

## File List
- `src/components/Sidebar.tsx` *(modificado)*

## Definition of Done
- [x] Admin items fora da sidebar GOVERNANÇA
- [x] Avatar dropdown funcional com Conta e plano, Perfis, Sair
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: ADMIN-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @dev (Dex) | Story criada e implementada — Sprint ADMIN-SIDEBAR |
