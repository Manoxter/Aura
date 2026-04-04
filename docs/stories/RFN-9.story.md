# Story RFN-9 — Jitsi Meet: Videochamada no Gabinete de Crise
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-4
**Status:** Draft
**Agentes:** @dev (Dex), @ux-design-expert (Uma)
**Prioridade:** MEDIA

---

## User Story
Como PM em situação de crise,
quero iniciar uma videochamada diretamente no Gabinete de Crise do Aura,
sem sair da plataforma, usando uma solução gratuita,
para coordenar a equipe com contexto visual do triângulo em tempo real.

## Acceptance Criteria

- [ ] AC1: Botão "Iniciar Reunião" no `GabineteDeCrise.tsx` — ao clicar, abre embed Jitsi dentro de um modal/drawer
- [ ] AC2: Room name gerado automaticamente: `aura-crisis-{projetoId.slice(0,8)}-{Date.now()}`
- [ ] AC3: Embed via `<iframe src="https://meet.jit.si/{roomName}" allow="camera; microphone; fullscreen" />` — sem API key necessária (Jitsi público)
- [ ] AC4: Botão "Copiar Link" copia a URL da sala para colar no chat/email
- [ ] AC5: Reunião iniciada registra evento em `eventos_atipicos` com tipo `reuniao_crise` e timestamp
- [ ] AC6: Aviso legal: "Reunião via Jitsi Meet (serviço externo). Dados transmitidos fora do Aura."
- [ ] AC7: Modal de reunião tem botão "Encerrar" que fecha o iframe e registra duração aproximada

## Scope
**IN:** Embed Jitsi no GabineteDeCrise, geração de room name, cópia de link, registro de evento
**OUT:** Gravação de reunião, transcrição, integração Google Calendar/Meet (pago)

## Dependencies
- Nenhuma (Jitsi é público, sem auth)

## Estimativa
M (3–5h)

## Definition of Done
- [ ] Videochamada inicia em < 5 segundos após clicar
- [ ] Funciona em Chrome/Edge/Firefox
- [ ] Evento registrado no banco
- [ ] 0 erros TypeScript/ESLint
