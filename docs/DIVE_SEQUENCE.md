# Sequência de mergulho

A navegação continua controlada pelo scroll existente. O percurso é reversível;
as faixas abaixo são proporções da transição Home → Projects, não segundos fixos.

| Capítulo | Progresso | Leitura |
| --- | --- | --- |
| Contemplação | Home inicial / 0 | Santuário, amanhecer e movimento ambiente |
| Chamado | Scroll da Home e 0–0,12 | Avanço, parallax e maior presença das partículas |
| Aproximação | 0,12–0,22 | Superfície cresce; olhar aproxima-se da água |
| Contato | 0,22–0,34 | Compressão óptica, início do filtro sonoro |
| Atravessamento | 0,34–0,48 | Membrana, refração e mudança de meio; olho cruza y=0,16 em 0,38 |
| Descida | 0,48–0,78 | Água acima, névoa, bolhas e revelação parcial dos objetos |
| Revelação | 0,78–1 | Galeria resolve; frequências e legibilidade retornam |

`DiveState.chapter` identifica esses capítulos. `phase` mantém os cinco estados
anteriores para preservar os consumidores e controles existentes.

## Câmera e composição

`DiveCamera` usa Hermite monotônica entre alturas e profundidades: velocidade
contínua nos pontos, sem overshoot. A posição de origem vem do fim do percurso da
Home; a passagem entre os rigs conserva o movimento inicial. A câmera desce até
y=-1,50 e avança 4,40 unidades durante o mergulho. Drift e roll são mínimos.

O intervalo de superfície 0,18–0,48 limita o avanço a 0,48 unidades de progresso
por segundo e 0,022 por frame. Scroll brusco e frames lentos continuam passando
pelo contato. A câmera dos projetos aproxima e estabiliza durante a revelação.

## Água, atmosfera e fio narrativo

`transitionFragment` combina uma fronteira de dois meios com menisco, refração,
dispersão sutil, pequena suavização, exposição, absorção e haze por profundidade.
Os objetos resolvem através do volume iluminado; a superfície permanece visível
acima durante parte da descida. A distorção diminui com movimento reduzido.

`DiveParticles` usa um lote instanciado, sem substituir buffers por frame:

| Qualidade | Bolhas | Micro | Médias | Foreground | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baixa | 14 | 36 | 14 | 3 | 67 |
| Média | 30 | 90 | 26 | 6 | 152 |
| Alta | 48 | 180 | 52 | 10 | 290 |

As trajetórias usam profundidade perspectiva. Bolhas têm subida em espaço local,
duas pequenas plumas próximas, refração e brilho de borda; poeira próxima tem
bordas difusas. Uma máscara evita partículas aquáticas na região de ar.

`createShellThread` coloca um fio perolado no santuário e entre os projetos.
Uma espiral refratada aparece discretamente durante a passagem submersa.

## Áudio

Som continua dependendo do gesto e controle existentes. O contato inicia o
low-pass; a imersão leva o corte de 20 kHz a 1,65 kHz em curva perceptual, reduz
ligeiramente a música e acrescenta reverberação curta de 0,85 s com envio máximo
de 0,10. A revelação recupera frequências e volume. Ruído aquático filtrado,
contato e bolhas reutilizam três fontes; não há criação de nós por frame.

## Mundo dos projetos e acessibilidade

Os projetos mantêm conteúdo, filtros, raycast e detalhes existentes. Cada imagem
recebe uma cápsula mineral chanfrada, com iluminação, cáusticas e opacidade
sincronizada ao filtro. Teto aquático, feixes discretos, arquitetura fria e fio
de luz continuam presentes após o pós-processamento da transição terminar.

Movimento reduzido desliga drift/roll e animação do volume da galeria, reduz a
distorção, elimina partículas grandes próximas e mantém cerca de um quinto da
população restante. Não remove os sinais essenciais de mudança de meio.

## Arquivos desta passagem

- `src/experience/dive/{diveTimeline,DiveCamera,DiveParticles,DiveAudio,createShellThread,createProjectWaterVolume}.ts`
- `src/experience/shaders/transitionFragment.ts`
- `src/experience/core/SceneTransition.ts`
- `src/experience/audio/AudioManager.ts`
- `src/experience/ExperienceCanvas.tsx`
- `src/experience/scenes/{HomeScene,ProjectsScene}.ts`
- `src/experience/home/{createShellArchitecture,createHomeAtmosphere,createAquaticVegetation,createCaustics}.ts`
- `src/experience/config/visual.ts` e `src/index.css`
- `tests/visual/{dive,dive-cinematic}.spec.ts`

As capturas de todos os capítulos ficam em `artifacts/visual/dive/`.
