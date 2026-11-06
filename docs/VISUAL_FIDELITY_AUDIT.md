# Visual Fidelity Audit

## Limite metodológico (leia primeiro)

Esta auditoria **não comparou frames lado a lado com as gravações de referência**. A pasta `reference/` contém apenas `README.md` (sem gravações nem screenshots), e o site público é WebGL, portanto não é legível por fetch de HTML. Sem referência observável, qualquer mudança visual seria gosto pessoal, o que o briefing proíbe ("isso aproxima da referência?").

Decisão desta rodada, portanto:

- **Nenhum valor visual foi alterado.** Todos os tokens em `src/experience/config/visual.ts` têm exatamente os números anteriores.
- Foram entregues as **ferramentas** para calibrar com evidência: tokens centralizados e HUD `?debug=1`.
- A coluna "Ajuste ainda necessário" lista o que deve ser medido contra a referência na próxima rodada.

Fluxo sugerido: colocar os frames em `reference/` (ver `reference/README.md`), capturar os equivalentes com `npm run test:visual` e `?debug=1&transition=0.5`, comparar, e só então alterar tokens.

## Ferramentas entregues

| Item | Onde |
| --- | --- |
| Tokens de calibragem | `src/experience/config/visual.ts` |
| HUD de debug (`?debug=1`): scene, homeProgress, transition, projectsOffset/Max, FPS, camera pos, FOV, sound | `src/experience/core/debugHud.ts`, estilo `.debug-hud` em `index.css` |

O HUD é atualizado a cada 250 ms dentro do loop existente (sem RAF próprio) e removido no cleanup.

## Tokens (valores atuais, inalterados)

| Token | Valor |
| --- | --- |
| `HOME_CAMERA_FOV` | 38 |
| `HOME_CAMERA_START` | (0, 2.1, 9) |
| `HOME_FOG_NEAR` / `HOME_FOG_FAR` | 22 / 58 |
| `HOME_PARALLAX_X` / `Y` | 0.55 / 0.28 |
| `TRANSITION_START` / `TRANSITION_END` | 0.36 / 0.58 (scroll global) |
| `PROJECTS_CAMERA_FOV` | 40 |
| `PROJECT_COLUMN_X` | ±2.6 |
| `PROJECT_ROW_GAP` | 4.6 |
| `PROJECT_WIDTH` | 3.9 (máx.) |
| `FOG_NEAR` / `FOG_FAR` (Projects) | 34 / 62 |
| `AUDIO_VALUES.submergedCutoff` | 1650 Hz |

Ainda inline (não tokenizados nesta rodada): lerps de câmera da Home e hold em `ExperienceCanvas.tsx`, câmera de Contact, cores/luzes da Home além do fog, números do shader de transição (`transitionFragment.ts`: amplitude de onda 0.011, linha 0.038→0.018, aberração 0.001, tint).

## Tabela de auditoria

| COMPONENTE | ESTADO | DIFERENÇA DA REFERÊNCIA | AJUSTE REALIZADO | AJUSTE AINDA NECESSÁRIO |
| --- | --- | --- | --- | --- |
| Home: enquadramento / FOV | Câmera 38°, path Catmull-Rom | Não medida (sem referência) | Token `HOME_CAMERA_*` | Comparar frame inicial com a gravação; ajustar FOV/posição |
| Home: arquitetura, água, horizonte | Geometria e shader próprios | Não medida | Nenhum | Comparar escala, linha do horizonte, cor/refração da água |
| Home: cores, iluminação, fog | `#c8b0bd` / fog `#d7c1c7` 22–58 | Não medida | Tokens `HOME_BACKGROUND/FOG_*` | Amostrar cores na referência |
| Home: vegetação, partículas | Instanciado, procedural | Não medida | Nenhum | Densidade e escala |
| Home: parallax / Click & Hold | 0.55/0.28; hold dolly e FOV | Não medida | Parallax tokenizado | Medir amplitude e timing; tokenizar hold |
| Transição: timing | 0.36→0.58 de scroll | Não medida | Tokens `TRANSITION_START/END` | Comparar duração/ease com a gravação |
| Transição: linha d'água, refração, aberração | Valores inline no shader | Não medida | Nenhum | Tokenizar via uniforms e calibrar |
| Transição: chegada em Projects | Câmera própria, sem zoom de scroll | Não medida | Nenhum | Conferir enquadramento do 1º frame |
| Projects: cards, espaçamento, 2 colunas | 20 itens, X ±2.6, gap 4.6, stagger ±0.5 | Não medida | Tokens `PROJECT_*` | Comparar proporção/tamanho a 1440×900 |
| Projects: background, fog, partículas | Off-white, fog 34–62, 150 partículas | Não medida | Tokens de fog | Contraste da arquitetura e fog |
| Projects: títulos, filtros, metadata | DOM sincronizado | Não medida | Nenhum | Tipografia/posições vs. referência |
| Projects: velocidade, início, fim | Damping 4, wheel 0.00055, end-section 1.15 vp | Não medida | Tokens de scroll | Ajustar sensibilidade de scroll |
| UI global: margens, tipografia, hover, cursor | CSS em `index.css` | Fonte paga não licenciada; não medida | Nenhum | Medir margens/peso/letter-spacing na referência |
| Áudio: volume, fade, filtro no mergulho | Master fade 0.48 s, cutoff 20 kHz→1.65 kHz | Referência sem áudio disponível | Tokens `AUDIO_VALUES` | Calibrar ouvindo contra a gravação |

## Próxima rodada

1. Adicionar frames em `reference/` (1440×900).
2. Capturar com `?debug=1` os mesmos estados e comparar.
3. Alterar apenas tokens com diferença medida e registrar nesta tabela.
