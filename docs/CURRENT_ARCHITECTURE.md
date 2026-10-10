# Auditoria técnica da arquitetura atual

**Escopo:** leitura estática do estado do repositório em 9 de outubro de 2026. Nenhum arquivo de aplicação foi alterado para esta auditoria. Os documentos de planejamento abaixo não afirmam equivalência visual com unseen.co: não foram fornecidos screenshots/gravações de referência nesta etapa e não foi executada uma comparação visual ao vivo.

## Resumo executivo

O projeto é uma aplicação Vite + React + TypeScript com uma experiência Three.js imperativa, controlada por um ciclo de animação próprio. Há cenas distintas para Home e Projects, câmeras distintas, um scroll global normalizado que deriva três progressos semânticos e uma composição GLSL baseada em dois `WebGLRenderTarget`s. A arquitetura já contém a separação básica de câmera necessária para impedir que a câmera da Home continue atravessando a galeria.

O maior defeito funcional encontrado está em `src/index.css`: o bloco mobile começa na linha 256 e só é fechado na linha 591, abrangendo também os estilos WebGL e a interface da experiência. Em viewports acima de 760 px, a maioria desses estilos não se aplica. Isso pode deixar o canvas no fluxo normal com dimensões intrínsecas, em vez de ocupar a tela, e desmontar o posicionamento da interface desktop.

O site ainda é um protótipo: geometria de Home provisória, arte sintética de Projects, áudio/menu/filtros sem comportamento, interações de arraste ausentes e sem telas/fluxos completos de World ou Contact.

## 1. Arquitetura atual

- `index.html` monta `src/main.tsx`; `main.tsx` cria a raiz React em `StrictMode` e carrega `index.css`.
- `App.tsx` controla as telas React `loader`, `intro` e `home`. Ao entrar em `home`, monta `ExperienceCanvas` e os overlays DOM.
- `ExperienceCanvas.tsx` possui o ciclo Three.js: cria `HomeScene`, `ProjectsScene`, duas `PerspectiveCamera`s, `WebGLRenderer`, `ScrollManager` e `SceneTransition`; atualiza input, câmeras, cenas e UI a cada frame.
- `HomeScene.ts` constrói cenário, água shader, partículas e luzes.
- `ProjectsScene.ts` constrói arquitetura de fundo, oito cards com texturas desenhadas em canvas e partículas.
- `ScrollManager.ts` captura wheel/touch e deriva `homeProgress`, `transitionProgress` e `projectsOffset` a partir de `current`, um valor global de 0 a 1.
- `SceneTransition.ts` renderiza cada cena com sua câmera para um target durante a travessia e mistura as imagens com um fullscreen shader.
- Os shaders são strings TypeScript importadas diretamente; não há arquivos GLSL carregados por URL.
- Dependências runtime: React, React DOM, Three.js e GSAP. Scripts disponíveis: `dev`, `build`, `lint` e `preview`; não há script de teste.
- `vite.config.ts` contém apenas o plugin React. `tsconfig.app.json` habilita `noUnusedLocals` e `noUnusedParameters`, mas não configura todas as opções de strict TypeScript.

## 2. Fluxo loader → intro → home

1. A aplicação inicia em `loader`. Um timeline GSAP anima as letras, mostra `(Loading)`, aguarda uma duração fixa e faz fade-out.
2. O `onComplete` do timeline troca o estado para `intro`. A sequência não observa carregamento real de modelos, imagens, fontes ou GPU; o loader é temporizado.
3. `intro` apresenta a marca e texto estático com dois botões. `Enter` chama `enterSite(true)` e `Enter without audio` chama `enterSite(false)`.
4. Ambos definem `screen = "home"`; React desmonta loader/intro e monta `ExperienceCanvas` e a interface da experiência.
5. A flag `audioEnabled` altera o texto do botão de som, mas não inicia, pausa ou controla qualquer áudio.
6. Não há transição de retorno para `intro` nem botão React implementado para retornar à Home; voltar de Projects é possível pelo scroll inverso.

## 3. Fluxo do scroll

- O `ScrollManager` registra listeners globais `wheel`, `touchstart` e `touchmove`. Wheel e touchmove chamam `preventDefault`; não existe scroll nativo da página.
- Wheel altera o alvo em `deltaY * 0.00055`; touch usa a diferença vertical multiplicada por `0.0025`.
- O alvo é limitado a `[0, 1]`. A cada frame, `current` interpola 6,5% da diferença até `target`; a suavização é por frame, não por tempo decorrido.
- A partir do `current` suavizado, o manager calcula:
  - `homeProgress = clamp(current / 0.58)`;
  - `transitionProgress = clamp((current - 0.36) / (0.58 - 0.36))`;
  - `projectsOffset = clamp((current - 0.58) / (1 - 0.58))`.
- `projectsVelocity` é a diferença por frame entre os offsets normalizados atuais e anteriores, e é usado para inclinação dos cards.
- `ExperienceCanvas` ainda usa o `current` global diretamente para fade da UI e para `data-scene`; esses limites (0.27, 0.46, 0.52, 0.68) não são centralizados junto às fases do manager.
- `ProjectsScene.update` converte `projectsOffset` em `scrollDistance = offset * 20`, desloca os cards no eixo Y e os reposiciona com módulo `loopHeight = 17`.
- O scroll retorna visualmente da Projects para Home porque o alvo aceita movimento nos dois sentidos; não há snap ou semântica de seção discreta.

## 4. Movimento das câmeras

- A Home tem uma `PerspectiveCamera` de FOV inicial 38 e near/far 0.1/100. Duas curvas Catmull-Rom definem posição e ponto de observação.
- O caminho da Home usa `homeProgress * 0.58`, de modo que acompanha o scroll absoluto até o limite de transição e fica estacionário depois.
- A posição aplica parallax do pointer, redução de parallax ao longo de `transitionProgress` e deslocamento temporário de Click & Hold. Posição, look-at e FOV são interpolados com fatores constantes por frame.
- A Projects usa outra `PerspectiveCamera`, FOV 43, posição `(0, 0, -17)` e look-at `(0, 0, -27)`. Ela não recebe atualizações por scroll nem parallax, portanto permanece fixa.
- Ambas as câmeras atualizam aspect/projection matrix no listener de `resize`.
- A câmera Projects não é calculada a partir do tamanho do viewport, aspect ratio ou bounding box da galeria; seus parâmetros e as dimensões dos cards são valores fixos de mundo.

## 5. Renderização da HomeScene

- `HomeScene` cria uma `THREE.Scene` com fundo azul e `Fog`.
- O grupo de mundo contém chão, quatro blocos de arquitetura e um arco feitos com geometrias básicas; o comentário do código identifica os edifícios como temporários.
- A água é um `PlaneGeometry(16, 12, 128, 128)` rotacionado para o plano horizontal, com `ShaderMaterial` transparente e `depthWrite: false`.
- O vertex shader deforma a malha com duas ondas senoidais e uma ondulação localizada no pointer, amplificada pelo hold. O fragment shader mistura cores, shimmer simples e o tom de hold; não implementa reflexão, refração, espuma ou captura de ambiente.
- Há 350 partículas `Points` e três luzes. A luz direcional projeta sombras com mapa 1024².
- `update` atualiza tempo, mouse, hold e animação das partículas a cada frame.

## 6. Renderização da ProjectsScene

- `ProjectsScene` usa fundo bege, `Fog`, um grupo de arquitetura (parede, três arcos, chão) e um grupo de galeria.
- Os oito projetos são dados locais de exemplo; cada um tem título, categoria, ano e duas cores arbitrárias.
- Cada textura é desenhada em um `canvas` 1400×1015 com gradiente, círculo/retângulo abstratos e texto, então convertida em `CanvasTexture`. Não há imagens autorizadas/reais de projetos carregadas.
- Cada card tem uma imagem 4.1×2.95 e uma placa de sombra 4.22×3.07. Cards ocupam duas colunas X fixas ±2.55, profundidade próxima de -26.5 e fileiras com intervalo 4.25.
- `update` mantém Z fixo, move Y pelo offset, aplica loop modular, pequenas rotações/flutuação, escala mínima em torno de 1 e fade pela distância vertical. A rolagem da galeria é independente da câmera.
- A lista de cards não implementa links, seleção, filtro por categoria ou carregamento de detalhe.

## 7. Funcionamento de SceneTransition

- A classe aloca dois `WebGLRenderTarget`s do tamanho físico calculado com `width * pixelRatio` e `height * pixelRatio`.
- Durante a faixa intermediária, renderiza `HomeScene + homeCamera` no target A e `ProjectsScene + projectsCamera` no target B; depois renderiza um quad de tela cheia com o material de transição.
- Com progresso até 0.001, desenha Home diretamente; a partir de 0.999, desenha Projects diretamente. Nesses extremos não usa a composição por targets.
- A resolução dos targets é atualizada em `resize`; `dispose` libera ambos, o material e a geometria do quad.
- A passagem por targets custa duas renderizações de cena mais a composição por frame durante a transição. Os targets são full-resolution, usam depth buffer e não têm MSAA configurado.
- A textura dos targets declara `SRGBColorSpace`, enquanto o renderer usa ACES tone mapping e o shader final não explicita chunks de conversão de cor. A igualdade de cor entre composição e render direto deve ser verificada visualmente.

## 8. Shaders

### `waterVertex.ts`

- Recebe `uTime`, `uMouse` e `uHold`; calcula duas ondas por seno em coordenadas do plano e uma onda radial com decaimento exponencial em torno do pointer.
- Soma a elevação ao Z local e envia a elevação em `vWave`; não calcula normais deformadas.

### `waterFragment.ts`

- Mistura `uDeepColor` e `uSurfaceColor` com gradiente vertical influenciado por `vWave`; adiciona shimmer senoidal, iluminação aproximada via elevação e mistura de cor de hold.
- Retorna alfa constante 0.90, compatível com o material transparente.

### `transitionVertex.ts`

- Passa UV do quad e escreve posição XY diretamente em clip space. É um shader de fullscreen pass, sem transformações de câmera convencionais.

### `transitionFragment.ts`

- Suaviza `uProgress`; calcula intensidade de pico com seno, ondulação de tela dependente de UV/tempo e pequenos deslocamentos UV para Home e Projects.
- Separa os canais RGB somente na amostra Home, mistura as texturas com uma máscara suavizada afetada por onda e altura, escurece e colore levemente de azul durante o pico.
- Não amostra profundidade ou geometria da água; trata-se de distorção 2D de duas imagens, não de uma travessia volumétrica ou refração física.

## 9. Progressos e controles incompatíveis

- A separação semântica está implementada no manager, mas ainda há um único estado-base `current` que define a posição no percurso e deriva os três valores. Não são três controles independentes nem três timelines autônomos.
- `current` também governa dois fades de UI e o `data-scene`; seus marcos não coincidem exatamente com o fim da transição visual (0.58). Por exemplo, o estado DOM continua `"transition"` depois que o progresso do shader já saturou em 1, até `current` chegar a 0.68.
- `homeProgress` é convertido novamente para a escala absoluta multiplicando por 0.58 no consumidor. É matematicamente consistente hoje, mas a semântica fica implícita e fácil de quebrar se os limites divergirem.
- `homeCameraEnd` e `transitionEnd` têm ambos 0.58, duplicando um mesmo limite em propriedades com significados distintos.
- O hold é suavizado em `ExperienceCanvas` e novamente em `HomeScene` usando estado próprio e constante igual; a câmera e a água podem divergir no comportamento se um dos filtros mudar.
- `projectsVelocity` e suavizações da câmera, pointer, hold e cards são diferenças/interpolações por frame, portanto a resposta muda com a taxa de atualização.
- Os números de fases e limites de interface estão espalhados entre `ScrollManager`, `ExperienceCanvas` e o shader (incluindo limiares de máscara); não há um único mapa de estados/timings.

## 10. Superzoom em Projects: causa e estado observado no código

**A câmera compartilhada não é mais uma causa ativa no estado auditado:** `ExperienceCanvas` cria e envia uma câmera própria para cada cena, e `ProjectsScene` mantém os cards em profundidade fixa. Portanto, não é correto atribuir um superzoom atual a uma câmera Home que continua viajando por dentro da Projects.

O modo de falha arquitetural que a separação evita é usar uma única câmera cujo caminho, ponto de observação e FOV eram interpolados a partir do mesmo progresso global enquanto a galeria já tinha cards em profundidades fixas. Nesse desenho, movimento/zoom da câmera e deslocamento da galeria se acumulam; um ajuste no trecho de Home altera diretamente o enquadramento de Projects.

Ainda existe risco de cards parecerem grandes/cortados por framing fixo. Com camera Z -17 e card Z -26.5, a distância é cerca de 9.5 unidades; FOV vertical 43° dá aproximadamente 7.45 unidades de altura visível no plano dos cards. Um card de 2.95 unidades ocupa cerca de 40% da altura do viewport. A extensão aproximada de duas colunas, 9.2 unidades, cabe em uma tela 16:9 (largura visível aproximada 13.2), mas excede a largura visível em aspect ratios estreitos. O projeto não adapta FOV, distância, escala ou disposição de colunas a esses ratios.

Sem screenshot/filmagem da falha atual, não é possível afirmar se a percepção residual de superzoom vem da câmera, da proporção do viewport, da composição dos cards ou do CSS desktop atualmente não aplicado. A primeira causa estrutural está corrigida no código; as outras precisam de reprodução visual por viewport.

## 11. Dispose e ciclo de vida

- `ScrollManager.dispose` remove os três listeners que registra.
- `ExperienceCanvas` cancela RAF, remove resize e pointer listeners, chama dispose nas cenas/transição/renderer e remove o canvas DOM. O padrão React cleanup também atende ao mount/unmount adicional de `StrictMode`.
- `HomeScene` libera geometrias e materiais usando `Set`; os materiais compartilhados são descartados uma vez. Não cria texturas externas.
- `ProjectsScene` libera geometrias, materiais e `CanvasTexture`s. As texturas são registradas antes do uso e não há carga assíncrona para cancelar.
- `SceneTransition` libera targets, material de composição e quad geometry.
- Riscos restantes: listeners de `pointerup` não cobrem `pointercancel` nem perda de foco; uma exceção durante a construção do efeito antes de retornar cleanup pode deixar recursos/listeners parciais alocados; o canvas de origem da `CanvasTexture` não é explicitamente limpo (normalmente fica elegível para GC quando a textura e a cena deixam de ser referenciadas).
- `renderer.dispose()` é chamado, mas não há rotina específica de pausa/resume ao esconder a página, nem teste de ciclos repetidos de entrada/saída e resize.

## 12. Imports

- Os imports relativos usados pelos módulos auditados resolvem para arquivos existentes; os imports de Three, React e GSAP correspondem às dependências em `package.json`.
- `index.css` é importado tanto por `main.tsx` quanto por `App.tsx`. É redundante; o bundler normalmente deduplica o asset CSS, mas o ponto de entrada deveria ser único.
- `App.css` não é importado. `src/assets/hero.png`, `react.svg` e `vite.svg` também não são referenciados pelo código verificado.
- `index.html` ainda carrega favicon genérico `/favicon.svg`, título `unseen-rebuild` e idioma `en`; isso é conteúdo de shell/template, não uma falha de import.
- Não foi encontrado import de shader apontando para módulo incorreto ou import de placeholder dentro de arquivo errado.

## 13. Código duplicado

- `index.css` importado por dois pontos de entrada.
- A captura de progresso e suavização de `holding` ocorre separadamente no controlador/cena (com constantes atualmente iguais).
- Lógica semelhante de coleta e `dispose` de geometria/material aparece nas duas cenas e no compositor, embora os conjuntos pertençam a donos distintos e não indiquem dupla liberação no caminho normal.
- Há definições antigas de layout em `index.css` para `.header`, `.home-placeholder__drag` e `.home-placeholder__controls`, enquanto React usa `.experience-header`, `.projects-interface__drag` e `.experience-controls`.
- Os caminhos de posição/look-at têm listas de pontos paralelas, não duplicação exata, mas dependência manual: número e intenção de pontos precisam permanecer sincronizados.

## 14. Código morto ou sem efeito observável

- `src/App.css` contém CSS de template Vite/React e não participa do grafo de imports.
- `.header`, `.home-placeholder__drag` e `.home-placeholder__controls` em `index.css` não correspondem às classes efetivamente renderizadas.
- `hero.png`, `react.svg` e `vite.svg` em `src/assets` não são usados.
- Loader usa texto de carregamento, mas não representa progresso real de carregamento.
- `Toggle Menu` não possui handler/estado; os botões de filtro não têm handlers; não há implementação de menu nem filtragem da galeria.
- O texto “Drag to explore our world” não corresponde a input de drag/gesto; o pointer atual só controla parallax/hold. Não há fluxo de World.
- `audioEnabled` só altera estado e rótulo; não há áudio, Web Audio, elemento de mídia ou asset.
- Os cards não têm links/eventos de clique nem navegação de projeto.

## 15. Inconsistências entre CSS e React

- **Defeito crítico de escopo CSS:** `@media (max-width: 760px)` começa em `src/index.css:256` e só fecha em `:591`. Regras de `.experience-canvas`, canvas, toda a interface global/Home/Projects e estados de pointer estão dentro desse media query. Assim, essas regras não alcançam desktop (>760 px); o nome e a abrangência do breakpoint indicam que o fechamento foi colocado tarde demais.
- Classes antigas `.header`, `.home-placeholder__drag` e `.home-placeholder__controls` não são as classes do JSX atual.
- A classe `.home-placeholder` é usada mesmo quando a experiência contém Home e Projects; o nome sugere um placeholder, coerente com estágio temporário mas não com arquitetura final.
- Fades usam `current` diretamente; estado `data-scene` muda em 0.46/0.68, enquanto shader transition termina em 0.58. A interação DOM pode não alinhar com a cena desenhada.
- Os filtros exibem um botão “All” ativo por classe estática, sem estado React para sincronizar seleção.
- “Sound On” pode aparecer sem existir saída de áudio, e clicar no toggle muda só o texto.

## 16. Responsividade

- O único breakpoint de layout do stylesheet da experiência é 760 px, e o escopo incorreto desse breakpoint também desativa as regras de desktop.
- A câmera Projects, FOV, profundidade, escala e coordenadas X dos cards são fixos; em retrato/viewport estreito, os cards laterais podem sair do quadro.
- A interface Projects usa cabeçalho flex, contato com largura fixa 230 px e filtros em linha com espaçamento fixo 18 px; não há regra própria para wrap/colapso.
- O intro tem adaptação mobile básica (uma coluna e ações empilhadas), mas cabeçalho do loader e controles têm regras legadas apontando para classes antigas.
- O tamanho é acompanhado por `window.resize`, não `ResizeObserver`; mudanças de dimensão do container que não disparem resize da janela não recalculam câmera/targets.
- `height`/`width` não são guardados contra zero antes de formar aspect ratio e dimensão dos targets.
- Não há detecção de orientação, safe areas, controles touch dedicados nem adaptação específica para telas de alta densidade além do limite de DPR.

## 17. Performance

- `devicePixelRatio` é limitado a 2, porém cada target da transição usa resolução física cheia; durante o crossfade são desenhadas duas cenas completas e o quad. O custo e uso de VRAM crescem aproximadamente com o quadrado da resolução.
- O `WebGLRenderer` habilita antialiasing e shadow mapping 1024²; a composição offscreen não define multisampling.
- A malha de água contém 128×128 segmentos e atualiza por shader, apropriado para deslocamento GPU, mas executa deformação e dupla renderização da Home no trecho da transição.
- As 8 texturas canvas de 1400×1015 (e os respectivos uploads) são geradas síncronamente durante a construção; estimativa de armazenamento RGBA não comprimido é ~43 MiB, sem contar targets, overhead e cópias de CPU/GPU.
- As cenas, inclusive Projects fora da transição, são atualizadas em todo frame; não há pausa por `document.visibilityState`/IntersectionObserver.
- Suavização por frame e `getElapsedTime` evitam delta para várias animações; o comportamento interativo varia com 60/120/144 Hz.
- O build previamente executado passou, mas reportou bundle JS minificado de aproximadamente 869 kB (241 kB gzip), acima do alerta padrão de 500 kB. Não há divisão de código/dynamic import.

## 18. Incompletudes e placeholders

- Home: arquitetura de caixas/arco explicitamente temporária; cenário não usa modelo/asset de produção.
- Projects: oito trabalhos fictícios e arte abstrata procedural gerada por canvas; comentários marcam dados como temporários. Não há imagens originais autorizadas, pipeline de conteúdo ou rotas de detalhes.
- UX ainda não implementada: áudio, menu, filtro funcional, arraste, cursor customizado, seleção de projeto, tela World, tela Contact completa e navegação/retorno dedicada.
- Não há tratamento/fallback quando WebGL/WebGL2 ou alocação de render target falha.
- `README.md`, `App.css`, favicon e título ainda refletem o scaffold inicial Vite/React, não a arquitetura do produto.
- Não há suíte de testes, snapshots visuais, testes de scroll, navegação reversa, resize, perda de contexto WebGL ou validação mobile.

## Estado da árvore e validações existentes

No início da auditoria, a árvore já tinha alterações locais em `src/App.tsx`, `src/experience/ExperienceCanvas.tsx`, `src/experience/core/SceneTransition.ts`, `src/experience/core/ScrollManager.ts` e `src/experience/scenes/ProjectsScene.ts`. Foram lidos como estão e não foram revertidos nem modificados durante esta auditoria.

Na etapa de implementação imediatamente anterior, `npm run build` (inclui `tsc -b`) e `npm run lint` passaram. O build emitiu o aviso de bundle acima de 500 kB. Esta auditoria não executou validação adicional de código nem testes visuais.
