# Story SaaS-4 — Configurações de Conta e Perfil do Usuário
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @dev (Dex)
**Agentes:** @dev (Dex), @ux-design-expert (Uma)
**Pré-requisito:** SaaS-1 (Auth funcional)

---

## User Story
Como usuário do Aura,
quero editar minhas informações de perfil e preferências de conta,
para que meu nome apareça correto nos projetos, relatórios e no Klauss.

## Background
Não existe tela de configurações de perfil. O nome exibido vem do campo `email` do Supabase Auth (ex: "joao.silva@empresa.com" aparece como display name). Preferências como fuso horário e notificações não existem.

## Acceptance Criteria
- [x] AC-1: Página `/conta/perfil` com campos: nome completo, cargo/função, empresa, foto de perfil (upload opcional)
- [x] AC-2: Salvar nome atualiza `user_metadata.full_name` no Supabase Auth + replica para `tenants.display_name`
- [x] AC-3: Nome atualizado reflete em: header do app, projetos onde é membro, histórico de decisões MATED
- [x] AC-4: Alterar senha: formulário com senha atual + nova senha + confirmar (validação: ≥8 chars, ≥1 número)
- [x] AC-5: Upload de foto: imagem redimensionada para 200x200px + salva no Supabase Storage bucket `avatars`
- [x] AC-6: Seção "Preferências": fuso horário (select com zonas BR: São Paulo, Manaus, Brasília), idioma (PT-BR only v1.0)
- [x] AC-7: Seção "Segurança": data do último login exibida, botão "Encerrar todas as sessões" (revoga tokens Supabase)
- [x] AC-8: Excluir conta: confirmação com digitação de "CONFIRMAR" + soft delete (marca `deleted_at`, não remove dados imediatamente)

## Tasks
- [x] 1. Criar rota `/conta/perfil`
- [x] 2. Formulário de edição: nome, cargo, empresa com save via `supabase.auth.updateUser()`
- [x] 3. Upload de foto: input file + resize client-side com `canvas` + upload para Storage
- [x] 4. Formulário de alteração de senha
- [x] 5. Select de fuso horário e salvar em `user_metadata.timezone`
- [x] 6. Seção de segurança: último login + "encerrar sessões" via `supabase.auth.signOut({ scope: 'global' })`
- [x] 7. Fluxo de exclusão de conta com confirmação
- [x] 8. Garantir que nome atualizado reflete em todos os lugares que exibem o nome do usuário

## File List
- `src/app/conta/perfil/page.tsx` (criar)
- `src/components/Account/ProfileForm.tsx` (criar)
- `src/components/Account/AvatarUpload.tsx` (criar)
- `src/components/Account/SecuritySection.tsx` (criar)

## Definition of Done
- [x] Nome editado reflete imediatamente em header + projetos
- [x] Alteração de senha funcional
- [x] Upload de foto funcional com resize
- [x] Excluir conta com soft delete
- [x] TypeCheck 0 erros, Lint 0 warnings

## Escopo
**IN:** Editar perfil (nome/cargo/empresa/foto), alterar senha, fuso horário, encerrar sessões, soft delete de conta.
**OUT:** Não inclui histórico de atividades do usuário, não cobre notificações por email (SaaS-5), não implementa autenticação por app de dois fatores (2FA), não cobre exportação de dados pessoais (LGPD — v1.1).

## Estimativa
**Esforço:** 5h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Upload de foto pode falhar em mobile (formatos HEIC do iOS) | Média | Baixo | Usar `accept="image/*"` e converter HEIC → JPEG via canvas antes de upload |
| Soft delete sem cleanup pode acumular dados órfãos indefinidamente | Baixa | Baixo | Criar cron job Supabase para hard delete após 30 dias de `deleted_at` |

## QA Results
```yaml
storyId: SaaS-4
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — Status: Done |
