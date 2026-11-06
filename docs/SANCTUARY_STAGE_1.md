# Santuário Espiral — etapa 1

## Entrega

Substituição da composição externa por duas massas arquitetônicas contínuas e assimétricas, costelas estruturais, escadarias curvas laterais e fundo mineral da lâmina de água. A abertura central permanece livre. Esta etapa é um estudo volumétrico, não a direção de arte final do mockup.

Arquivos: `src/experience/scenes/HomeScene.ts` e `src/experience/home/createShellArchitecture.ts`.

Removidos terreno ondulado, grama, colinas, edifícios de revolução, arcos isolados e pedestal central. Preservados shaders/uniforms de água, reflection target, raycasting, hold, câmera, scroll, áudio, transição, resize e dispose. Alterações preexistentes de App.tsx, index.css e index.html não fazem parte desta entrega.

## Decisões

- Shape + ExtrudeGeometry para paredes e degraus; CatmullRomCurve3 + TubeGeometry para costelas.
- Geometria determinística, sem novos assets ou dependências.
- Dois materiais compartilhados; todos os recursos registrados nas listas de ownership de HomeScene.
- Segmentação e quantidade de costelas respondem ao quality existente.
- Arquitetura: high 73.058 triângulos / medium 42.658 / low 20.690. Inclui degraus e piso; exclui água e partículas.

## Verificação

- `npm run build`: passou; aviso de bundle acima de 500 kB.
- `npm run lint`: passou.
- `npm run test:visual`: 10 passaram, 1 timeout na captura Projects entry enquanto uma captura adicional executava em paralelo. A mesma captura passou isoladamente (9,4 segundos). Não é uma execução completa com 11 passes.
- Captura Home em 1440×900 inspecionada: recinto e abertura central visíveis, água em foreground e degraus nas laterais.
- Captura before-dive inspecionada: câmera existente abaixo da água antes do início da transição. Recalibrar na etapa 2; não considerar mergulho validado visualmente.
- Avisos existentes: THREE.Clock depreciado e PCFSoftShadowMap substituído internamente por PCFShadowMap. Nenhuma alteração desses sistemas nesta etapa.

## Próxima revisão

A iluminação atual deixa o interior escuro e o céu permanece uniforme. Costelas ainda têm ritmo repetitivo e precisam de refinamento para se aproximar do mockup. Câmera/enquadramento são a etapa 2; materiais finais, cristais, amanhecer, evolução da água/refração e substituição das pétalas pertencem às etapas seguintes. Medir desempenho com GPU real antes de concluir sobre FPS: capturas usam SwiftShader.
