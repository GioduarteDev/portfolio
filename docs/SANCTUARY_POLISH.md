# Santuário Espiral — polimento visual

## Entrega e escopo

A passagem conserva o blockout aprovado: duas massas curvas, abertura central, costelas e escadarias laterais. O polimento reduz repetição, integra os relevos ao perfil das paredes e acrescenta materialidade mineral, um leque arquitetônico, três áreas de cristais e amanhecer procedural.

A água agora compõe reflexão e refração reais da Home com profundidade, absorção por cor, Fresnel, ondas em várias escalas, normais finas, specular e interação circular. O fundo mineral e as superfícies próximas recebem cáusticas lentas. Pétalas foram removidas e substituídas por pontos opalinos pequenos, com textura radial e movimento discreto.

A câmera permanece acima da água enquanto a Home está visível. A waterline substitui a Home por Projects em uma faixa curta de progresso, com refração horizontal, compressão e separação cromática discreta. Foram inspecionadas as capturas antes, no meio e após a passagem; as faixas pretas e o fundo rosa vazio anteriores não aparecem nessas capturas.

ScrollManager, roteamento, ProjectsScene, WorldScene, ContactScene, UI e textos não foram editados. As alterações anteriores em App.tsx, index.css e index.html permanecem fora desta entrega.

## Arquivos alterados / criados

- `src/experience/home/createShellArchitecture.ts`: refinamento do blockout, costelas assimétricas, degraus, leque e posicionamento dos clusters.
- `src/experience/home/sanctuaryMaterials.ts`: materiais pearl, moonstone, sapphire, amethyst e opal; gerador aleatório determinístico.
- `src/experience/home/createCrystalCluster.ts`: prismas fechados e facetados, com dimensões e inclinações variadas.
- `src/experience/home/createDawnBackdrop.ts`: céu direcional procedural, glow e haze.
- `src/experience/home/createCaustics.ts`: padrões de luz animados no fundo e nas superfícies adjacentes.
- `src/experience/scenes/HomeScene.ts`: iluminação, partículas, envmap, refraction target e depth texture, cache dos passes, resize/dispose e correção do eixo Y do raycasting.
- `src/experience/shaders/waterField.ts`: campo compartilhado de ondas, noise e interação.
- `src/experience/shaders/waterVertex.ts`: deslocamento em coordenadas do mundo e coordenadas projetadas.
- `src/experience/shaders/waterFragment.ts`: normal detalhada, absorção por profundidade, refração/reflexão via Fresnel e highlights.
- `src/experience/shaders/transitionFragment.ts`: passagem concentrada e waterline mais estreita.
- `src/experience/ExperienceCanvas.tsx`: somente pontos de cameraPath/lookAtPath.
- `src/experience/config/visual.ts`: altura inicial da câmera.
- `tests/visual/sanctuary-water.spec.ts`: altura da câmera, resize, restauração do renderer, descarte, raycast e inércia do hold.
- `playwright.config.ts`: opção explícita D3D11; SwiftShader continua como padrão.
- `docs/SANCTUARY_POLISH.md`: este relatório.

## Principais valores

| Elemento | Calibração |
| --- | --- |
| Costelas principais high/medium | 8 à esquerda, 6 à direita; antes eram 13 por lado |
| Costelas principais low | 5 à esquerda, 4 à direita |
| Pearl | `#f1e5df`; roughness 0,43; clearcoat 0,18; IOR 1,46; iridescence 0,07 |
| Moonstone | `#e7e9f6`; transmission 0,14; thickness 0,22; IOR 1,42 |
| Sapphire / amethyst | transmission 0,46; roughness 0,19; thickness 0,75; IOR 1,62 |
| Opal | transmission 0,28; roughness 0,24; iridescence 0,16 |
| Warm dawn key / cool fill / rim | intensidades 1,45 / 0,55 / 0,65 |
| Hemisphere / aqua bounce / crystal accents | 0,75 / 0,18 / 0,24; accents com alcance 4 |
| Água / fundo mineral | Y = 0,16 / -0,28; profundidade geométrica de 0,44 unidades |
| Água rasa / profunda | `#d3e8e7` / `#789eaf` |
| Reflection strength / distortion | 0,82 / 0,032 |
| Absorção RGB | 0,19 / 0,045 / 0,018, aplicada à profundidade óptica |
| Ondas principais | amplitudes 0,012 / 0,007 / 0,004; noise fino adicional |
| Pointer / hold | ripple 0,004; hold acrescenta 0,009 + 0,003; amortecimento 7 |
| Cáusticas | strength 0,075 nas massas, 0,05 em moonstone, 0,12 no fundo; desligadas em low |
| Câmera inicial | `(0, 2.65, 9)`; FOV 38 preservado |
| Crossing no shader | `smoothstep(0.18, 0.78, uProgress)`; duração percebida depende do scroll |

Em low, os materiais físicos mantêm facetas e reflexão, mas transmission = 0. A refração da água permanece ativa.

## Performance e lifecycle

Triângulos totais da Home, incluindo água e céu: high **106.598**, medium **62.462**, low **32.978**. São 60 meshes em high/medium e 45 em low. A menor quantidade de costelas e de segmentos longitudinais das paredes compensa parte da geometria acrescentada.

Existe um novo pass de cor/profundidade da cena. Seu target segue os limites da reflexão: scale 0,5 / 0,4 / 0,3 e dimensão máxima 1024 / 768 / 512, conservando a proporção do viewport. A cor é HalfFloat e a profundidade usa DepthTexture. Em 1440×900 com DPR 1 e high, o target é 720×450: cerca de 3,7 MiB adicionais para cor e profundidade, sem contar o envmap e buffers internos de transmission.

O envmap é pré-filtrado uma vez: resolução base 128 em high, 64 nos outros modos. Passes estáticos são reutilizados; animação com câmera parada atualiza até 30 Hz em high/medium e 15 Hz em low. Movimento de câmera invalida imediatamente. Os passes auxiliares reduzem a resolução interna de transmission e restauram seu valor, shadowMap, autoClear, target e visibilidade da água em finally.

Geometries, materials, textures, reflection/refraction targets, DepthTexture, envmap e shadow maps são descartados. Targets são redimensionados no lifecycle existente, sem alocação por frame. Os modos freezeTime/freezeParticles continuam determinísticos.

## Validação

- `npm run build`: passou.
- `npm run lint`: passou.
- `npm run test:visual` com SwiftShader: ocorreram timeouts de 30 s em capturas e na criação de um segundo contexto WebGL; execução interrompida após essas falhas. Não é um passe completo do backend padrão.
- `PLAYWRIGHT_GPU_BACKEND=d3d11` + `npm run test:visual`: **13 passaram**, em aproximadamente 1 minuto.
- Nova verificação: câmera acima da água nos pontos amostrados de Home/crossing; tamanho low limitado a 512×288 em viewport 1920×1080; estado do renderer restaurado; todos os recursos rastreados descartados; ponteiro atinge a água; hold mantém inércia após soltar.
- Capturas inspecionadas em 1440×900, 1920×1080 e 1366×768, cobrindo high/medium/low. Fases adicionais do crossing: 0,1 / 0,25 / 0,7 / 0,9. Nenhum erro de console ou de execução nessas capturas com D3D11.
- Capturas estão em `artifacts/visual/` e são ignoradas pelo Git. A suíte captura estados e verifica navegação; não constitui comparação pixel a pixel com o mockup.

Para reproduzir no PowerShell:

```powershell
$env:PLAYWRIGHT_GPU_BACKEND = 'd3d11'
npm run test:visual
```

## Limites e pendências

A resposta em software continua pesada, sobretudo na compilação inicial dos materiais físicos. O opt-in D3D11 torna a revisão local viável, mas não resolve a performance de SwiftShader nem substitui uma avaliação em celulares e GPUs integradas.

O resultado continua procedural e estilizado: o mockup possui riqueza de textura, detalhe mineral e iluminação que não foi reproduzida integralmente. Cristais ainda têm silhuetas simples e os highlights das plataformas permanecem fortes em certos ângulos. Essa diferença de fidelidade requer revisão visual, não declaração de equivalência.

Avisos existentes registrados: bundle acima de 500 kB, THREE.Clock depreciado e substituição interna de PCFSoftShadowMap por PCFShadowMap. Não foram feitas mudanças globais desses sistemas nesta passagem.

Esta entrega termina no polimento da Home/água/crossing.
