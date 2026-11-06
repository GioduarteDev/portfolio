# Fase 5 ? master pass final

Refer?ncia comparada: `references/sanctuary-target.png`, captura renderizada de 1920?1080 existente no projeto. A inten??o de caverna e os volumes de primeiro plano foram preservados. A ?gua principal mant?m seu shader, geometria, reflex?o/refra??o, cores e intera??o.

1. **Cinco diferen?as, por prioridade:** (1) termina??es do teto expostas dentro da abertura; (2) camadas laterais desenhadas sem profundidade no target final; (3) excesso de dobras congestionando o espa?o vazio e cruzando as escadas; (4) sol alto, halo amarelo e faixa do oceano distante interrompendo o horizonte; (5) minerais finos/saturados, sem o peso das funda??es da refer?ncia, e superf?cies com brilho excessivo. A inspe??o m?vel tamb?m revelou perda das paredes laterais e do sol.
2. **Dire??o de arte:** 14 ? 8 pain?is por lado; termina??es superiores deslocadas para fora do quadro; escada desobstru?da; pearl mais fosco; minerais existentes mais largos, baixos e discretos. Sol abaixado, halo suavizado e horizonte do backdrop alinhado ? ?gua principal. Em retrato, a fachada e a posi??o horizontal do sol acompanham a propor??o da tela.
3. **Bugs:** target final passa a ter depth buffer, igual aos captures da transi??o; removida a ordena??o manual que mascarava essa diferen?a. C?u usa o rel?gio da cena e respeita freezeTime. Pointer cancel/blur encerra hold e cancela in?cio de clique em card. Contato e filtros de Projects reposicionados no celular. Teste da galeria passa a aguardar scroll e endpoints f?sicos do mergulho, em vez de comparar c?meras ainda em movimento; removido `any` do harness de ?udio.
4. **Otimiza??es/auditoria:** removidos 12 meshes de pain?is e seus detalhes associados, material sem uso e loop de atualiza??o de nuvens inexistentes. Bounds do canvas reaproveitados no hover por frame e atualizados no resize. `THREE.Timer` com Page Visibility e dispose substitui Clock; PCFShadowMap substitui a constante obsoleta que j? ca?a nesse fallback. PMREM permanece gerado uma vez; captures de ?gua mant?m limita??o temporal existente. Geometrias, materiais, targets/depth textures, sombras, part?culas, timer, ?udio e listeners t?m descarte. N?o foram acrescentadas bibliotecas ou funcionalidades.
5. **HIGH/MEDIUM/LOW:** mesma composi??o e trajet?ria. Pain?is 80/56/32 segmentos; ?gua 112?224 / 80?160 / 56?112; reflexos limitados a 1024/768/512; sombras HIGH/MEDIUM, sem sombras LOW; part?culas do mergulho instanciadas e prealocadas 62/34/12. Movimento reduzido mant?m a passagem de meio com menos part?culas/oscila??o.

| Modo | Viewport | Meshes Home | Materiais Home | Luzes | Draw calls/quadro | Tri?ngulos/quadro | Geometrias GPU / texturas GPU |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HIGH | 1920?1080 | 54 | 11 | 8 | 99.2 | 191,867 | 56 / 9 |
| MEDIUM | 1366?768 | 49 | 11 | 8 | 89.5 | 127,121 | 51 / 9 |
| LOW | 390?844 | 40 | 9 | 8 | 43.1 | 46,252 | 42 / 7 |

Medi??o instrumentada no renderer real, DPR 1, Home parada com freezeTime, Chromium/D3D11. Calls e tri?ngulos incluem sombras/p?s-processamento; n?o s?o benchmark de FPS nem custo m?ximo do mergulho. Geometrias/texturas GPU representam recursos j? enviados ao renderer, n?o todos os objetos constru?dos em outras cenas. Uma luz da Home projeta sombras; as duas luzes locais n?o usam shadow maps.

6. **Build:** `npm run build` passou. JS ~1.071 MB minificado / 300.20 kB gzip; CSS 23.50 kB. Permanece o aviso do Vite para chunk acima de 500 kB.
7. **Lint/testes:** `npm run lint` passou. Su?te cobre loader, intro, Home, transi??o, Projects, Contact, World, filtros/fim da galeria, cursor, ?udio sem autoplay, revers?o, resize/descarte e frames lentos. Execu??o final completa: **17 passed (1.8m)**.
8. **Limita??es:** materiais, nuvens e minerais continuam procedurais; a imagem fotogr?fica original n?o foi reproduzida pixel a pixel. O teto de caverna conserva diferen?as deliberadas em rela??o ? captura renderizada de refer?ncia, que tem o topo mais aberto; os ganchos laterais ainda t?m oclus?o diferente. FPS depende da GPU e do DPR; n?o h? promessa de 60 FPS em todos os dispositivos. QA realizado em Chromium/Windows, com emula??o m?vel, sem aparelho iOS/Android f?sico ou Safari. ?udio validado por estado/contexto/mute/descarte, sem avalia??o auditiva humana. O HUD de debug cobre parte dos controles m?veis nas capturas, mas n?o aparece no modo normal.
9. **Percurso no navegador:** Home ? approach ? contact ? crossing ? submerged ? arrival/Projects ? Home executado com wheel em HIGH 1920?1080 e MEDIUM 1366?768; LOW 390?844 com touch, movimento reduzido e retorno. Todos registraram as cinco fases, respectivamente 3/4/3 amostras com waterline entre 0 e 1 e zero erros de console. Cursor molha na travessia e seca na chegada; card abre/fecha no teste de intera??o. Capturas finais inspecionadas, inclusive ?gua/bolhas/crossing/Projects m?vel, sem tela preta nos estados registrados.

Evid?ncias locais (ignoradas pelo Git):
- `artifacts/visual/fase5/final-{1920,1366,390}.png`
- `artifacts/visual/fase5/sequence-{home,approach,contact,crossing,submerged,arrival}.png`
- `artifacts/visual/fase5/projects-mobile-final.png`
- `artifacts/visual/fase5/arrival-*.png` e `return-*.png`
- `artifacts/visual/fase5/additional-report.json` (percurso com input real)
- `artifacts/visual/fase5/performance-report.json` (renderer real)
