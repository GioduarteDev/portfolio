# Fase 4 — mergulho Home → Projects

A experiência continua controlada pelo scroll existente. Uma timeline local e reversível sincroniza câmera, waterline, ótica, bolhas, cursor e áudio. A Home aprovada e a geometria/conteúdo de Projects não foram alterados: os 11 arquivos congelados foram comparados por SHA-256 com o início da tarefa.

## Fases

| Faixa | Fase | Comportamento |
| --- | --- | --- |
| 0.00–0.18 | Approach | Aproximação da superfície; sem efeitos subaquáticos. |
| 0.18–0.30 | Contact | Compressão pequena de FOV/lente, ripple local, primeiras gotas/bolhas e impacto sonoro discreto. |
| 0.30–0.46 | Crossing | A câmera atravessa o nível y=0.16. A waterline ondulada separa ar e água no mesmo quadro. |
| 0.46–0.78 | Submerged | Deslocamento com drag, buoyancy mínima, volume mineral azulado, refração, bolhas e áudio abafado. |
| 0.78–1.00 | Arrival | Câmera de Projects estabiliza na posição original; ótica, bolhas e cursor molhado desaparecem suavemente. |

`DiveCamera` limita apenas o avanço local da viagem, preservando contato/crossing sob scroll rápido e frames lentos. O ScrollManager e seus handlers/configuração permanecem iguais. Limites numéricos muito próximos de 0/1 são normalizados para liberar os cards na chegada exata.

## Renderização e interação

- **Waterline:** calculada a partir da altura física dos olhos, com pequenas ondas coerentes. A parte acima usa raios no ar; abaixo usa Projects através de absorção/dispersão de luz. A câmera real continua abaixo da superfície. Não há fade para preto ou dupla imagem global das cenas.
- **Ótica subaquática:** compositor GLSL com refração, dispersão cromática mínima, scattering e suavidade subpixel por profundidade de Projects. A chegada desfaz essas alterações e restaura a câmera original. O pós-processamento aprovado fora do mergulho permanece igual.
- **Bolhas:** um draw call instanciado, buffers fixos e trajetórias GPU com velocidades, tamanhos, drift e camadas diferentes. O shader produz borda perolada, centro transparente e refração local. Mais bolhas no crossing; poucas após a submersão; quase nenhuma na chegada.
- **Wet cursor:** mantém os estados/identidade existentes. Adiciona halo pequeno, refração local no canvas, trail curto, microgotas e amortecimento moderado; seca durante arrival. Ponteiros touch continuam sem cursor artificial.
- **Áudio:** apenas após o gesto/botão já existente. Três fontes procedurais reutilizadas fornecem impacto, fluxo e pequenas bolhas. O low-pass da música acompanha a imersão e retorna progressivamente na chegada. Nenhum AudioContext é iniciado pelo scroll.
- **Reduced motion:** acompanha alterações da preferência em tempo real; remove sway/buoyancy e movimento temporal das partículas, reduz a refração principal a 22% e as partículas visíveis, desativa trail/gotas do cursor e preserva a waterline. LOW mantém uma bolha pequena durante a submersão nesse modo.
- **Navegação:** Contact e World continuam usando o shader anterior, separado em `navigationFragment.ts`.

## Quality modes

| Modo | Bolhas / micro partículas | Ótica |
| --- | --- | --- |
| HIGH | 40 / 22 | Waterline, lens film, refração do cursor, suavidade por profundidade e dispersão mínima. |
| MEDIUM | 24 / 10 | Waterline, lens film, cursor e refração; sem amostras adicionais de softness/dispersion. |
| LOW | 9 / 3 | Waterline e refração simples, cursor molhado básico e poucas bolhas. |

Não são criadas geometrias, materiais ou buffers por frame. Os novos render targets, DepthTexture, materiais e partículas são redimensionados e descartados no ciclo existente.

## Arquivos desta fase

- `src/experience/ExperienceCanvas.tsx`
- `src/experience/core/SceneTransition.ts`
- `src/experience/shaders/transitionFragment.ts`
- `src/experience/shaders/navigationFragment.ts` (novo; preserva o shader anterior)
- `src/experience/dive/diveTimeline.ts` (novo)
- `src/experience/dive/DiveCamera.ts` (novo)
- `src/experience/dive/DiveParticles.ts` (novo)
- `src/experience/dive/DiveAudio.ts` (novo)
- `src/experience/audio/AudioManager.ts`
- `src/experience/cursor/ExperienceCursor.tsx`
- `src/index.css`
- `playwright.config.ts` (permite testar o servidor já iniciado via `PLAYWRIGHT_BASE_URL`)
- `tests/visual/dive.spec.ts` (novo)
- `tests/visual/sanctuary-water.spec.ts` (atualiza o critério da câmera para uma travessia real)
- `docs/FASE4_MERGULHO.md`

As alterações anteriores do usuário em Home/backdrop/arquitetura foram preservadas, assim como `capture.cjs` e `references/`.

## Verificação

O servidor foi iniciado com `npm run dev -- --port 5174`. O navegador percorreu o mergulho completo várias vezes com input real:

- HIGH em 1920×1080 e 1366×768: passagens lentas e rápidas, retorno à Home, som desligado/ligado e waterline parcial observada nas quatro passagens.
- MEDIUM em 1920×1080 e LOW em 1366×768: percurso completo, com LOW respeitando reduced motion.
- LOW touch em 390×844: touchstart/move/end pela cadeia existente de input, cinco fases e chegada completa.
- Uma passagem LOW adicional confirmou a bolha persistente em reduced motion.

Os quadros de approach/contact/crossing/submerged/arrival foram inspecionados. Não houve erros de JavaScript/WebGL nos percursos. Os seis testes finais passaram: reversão e clique real nos cards, reduced motion, resize/dispose, autoplay/áudio, proteção contra frames lentos, preservação da câmera da Home antes do mergulho e lifecycle dos captures de água. `npm run build` passou.

Reproduzir os testes com o servidor da porta 5174 ativo (PowerShell):

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:5174'
$env:PLAYWRIGHT_GPU_BACKEND='d3d11'
npx playwright test tests/visual/dive.spec.ts tests/visual/sanctuary-water.spec.ts
```

Evidências locais em `artifacts/visual/fase4/`: `browser-report.json`, `additional-report.json`, capturas por fase/resolução e vídeos `mergulho-1920x1080.webm` / `mergulho-1366x768.webm`. Os vídeos foram gravados em 1280×720 para reduzir o custo da gravação; os viewports testados e PNGs têm as resoluções solicitadas. Os relatórios amostram o estado do navegador; as contagens não são um benchmark de FPS.
