# Plano técnico de reconstrução

Este plano ordena a reconstrução em camadas para reduzir retrabalho: primeiro tornar a aplicação observável e estável, depois firmar controles/câmeras/composição, em seguida fidelizar conteúdo e interação, e por fim otimizar e validar. Nenhum item deste documento implementa as mudanças.

## Princípios de execução

- Tratar gravações/screenshots do usuário e observação pública documentada como evidência; registrar viewport, estado, input e resultado esperado. Marcar inferências como hipóteses.
- Fazer uma etapa por vez, revisar a captura após cada etapa e aguardar aprovação do usuário antes de seguir.
- Manter React + TypeScript + Three.js direto, GSAP e CSS; não introduzir React Three Fiber nem Tailwind.
- Usar arte provisória somente quando necessária para calibrar composição; preservar uma interface de dados/asset que permita substituição por conteúdo autorizado.
- Toda cena/câmera/controlador deve ter responsabilidade, estado de progresso e cleanup explícitos.

## Ordem técnica recomendada

### 0. Congelar a linha de base observável

1. Capturar Home, transição, Projects, retorno por scroll, loader e intro em desktop, tablet e mobile.
2. Registrar resolução, aspect ratio, DPR, scroll input, pointer/hold, conteúdo visível, tempos de transição e estados da interface.
3. Para qualquer detalhe do site público que não possa ser observado, identificar a decisão como inferida e obter confirmação antes de codificar comportamento perceptual importante.
4. Separar assets próprios, assets com licença/autorização e placeholders. Não copiar fonte/código/assets proprietários.

**Saída:** matriz de evidência e viewport que guiará todos os ajustes visuais; nenhuma alteração de cena ainda.

### 1. Corrigir o shell CSS e estabelecer referências de layout

1. Fechar o media query mobile no local correto em `src/index.css`, separar explicitamente estilos base/desktop de overrides mobile e eliminar o bloco órfão de regras dentro do breakpoint.
2. Alinhar seletores com classes reais do JSX; remover ou migrar regras temporárias sem correspondência.
3. Definir comportamento desktop e mobile do canvas/interface antes de calibrar câmera; ajustar container por dimensões reais e garantir layout estável durante entrada/saída.
4. Consolidar o carregamento de CSS em um único entrypoint e decidir o destino de `App.css`/recursos de template.

**Critério de saída:** canvas cobre o viewport e overlays ocupam posições corretas em todos os tamanhos-alvo; CSS não depende do breakpoint mobile para existir.

### 2. Formalizar o modelo de navegação e input

1. Especificar estados e limites nomeados de Home, transição, Projects e retorno, com fonte única de verdade para boundaries.
2. Manter `homeProgress`, `transitionProgress` e `projectsOffset` como valores semânticos independentes de suas escalas; remover conversões duplicadas/escalas implícitas.
3. Definir quem controla fades e `data-scene`; sincronizar os limites DOM com os limites visuais e com a semântica de interação.
4. Definir comportamento em wheel, trackpad, touch, teclado, pointer drag, cancelamento e perda de foco; garantir navegação reversa.
5. Tornar suavização independente da taxa de frames (delta time ou função temporal equivalente) e documentar o perfil de aceleração/atrito.

**Critério de saída:** cada interação altera apenas a variável semântica pretendida e os estados avançam/revertem sem divergência.

### 3. Fixar composição de câmera e layout por cena

1. Preservar câmeras independentes: caminho/look-at/FOV da Home pertencem à Home; ProjectsCamera é estável e não deriva do progresso Home.
2. Calibrar a Home com capturas de referência, corrigindo curva e parallax sem alterar framing de Projects.
3. Calibrar Projects pela composição alvo: aspect ratio, bounding box dos cards, número de colunas, distâncias e margem segura. Definir variantes responsivas de framing em vez de coordenadas cegamente fixas.
4. Separar movimento de câmera, offset da galeria e feedback de velocidade/tilt.
5. Verificar matematicamente a área visível em cada viewport e validar visualmente; não tratar uma FOV ou distância como correta sem evidência.

**Critério de saída:** a câmera Projects permanece fixa durante todo o scroll de galeria; cards importantes cabem no quadro nos ratios suportados; voltar a Home restaura o percurso.

### 4. Tornar SceneTransition determinística

1. Definir contrato explícito: cena/câmera de origem e destino, progresso 0–1, tempo, dimensões físicas e renderer.
2. Validar composição em ambos os extremos, ida e reversão; comparar o caminho direto com o caminho via targets para detectar saltos de cor/exposição.
3. Padronizar color space, tone mapping, clear color e alpha entre render direto, targets e fullscreen pass.
4. Garantir restauração de render target/viewport/estado do renderer mesmo se uma passagem falhar; lidar com zero-size, resize e falha de alocação.
5. Definir se o custo de renderizar as duas cenas em todo frame intermediário é aceitável; considerar redução de resolução dos targets apenas se o resultado visual continuar aprovado.

**Critério de saída:** transição reproduzível, reversível e sem discrepância perceptível nas fronteiras; recursos e estado do renderer são liberados/restaurados corretamente.

### 5. Reconstruir o mundo Home e o comportamento da água

1. Trocar blocos/arco provisórios por geometria, cena, material ou asset autorizado que corresponda às referências.
2. Ajustar escala, profundidade, névoa, paleta, luz e composição a partir dos frames capturados.
3. Calibrar shader de água como movimento de superfície, highlight, resposta ao pointer/hold e transparência; confirmar o comportamento real antes de adicionar refração/reflexo.
4. Validar deformação/normais, aliasing, blending e custo em diferentes GPUs/DPRs.
5. Preservar fallback e limpeza de materiais, geometrias e texturas.

**Critério de saída:** Home bate com referências aprovadas em composição, iluminação, paleta e resposta interativa, sem custo excessivo.

### 6. Implementar a galeria Projects com conteúdo autorizado

1. Definir schema tipado de projeto (id, título, categoria, ano, mídia, proporção, destino/link e metadados necessários).
2. Substituir os dados e texturas sintéticas por assets próprios/autorizados; manter placeholders marcados e facilmente substituíveis até a aprovação.
3. Recalibrar card size, espaçamento, arquitetura e loop com ProjectsCamera já estável.
4. Fazer filtros alterarem conteúdo/visibilidade de forma definida; definir scroll e velocidade ao trocar filtros.
5. Definir interação de selecionar/abrir projeto e estado de retorno, sem conflitar com scroll e drag.

**Critério de saída:** conteúdo, filtro, navegação de card e movimento da galeria são reais e testáveis; nenhum placeholder se apresenta como trabalho real.

### 7. Integrar UI e controles de produto

1. Implementar Toggle Menu e estados de navegação necessários.
2. Implementar Toggle Sound somente com áudio autorizado; iniciar áudio apenas após gesto explícito, refletir estado real e tratar browser restrictions.
3. Ligar instruções de drag aos gestos reais e decidir como convivem com Click & Hold.
4. Implementar cursor e microinterações somente a partir de evidência de referência.
5. Harmonizar transições CSS/GSAP com visibilidade das cenas e áreas realmente clicáveis.

**Critério de saída:** nenhum controle anunciado é inerte ou comunica estado falso; pointer/touch/teclado têm comportamento previsível.

### 8. Completar as áreas World e Contact

1. Confirmar a navegação e conteúdo observáveis de World e Contact.
2. Definir seus estados/rotas e como cada um entra/sai da experiência principal.
3. Reutilizar o modelo de câmera/composição somente quando apropriado; não presumir que cada seção seja continuação da mesma cena.
4. Validar links, informações de contato e retorno à galeria/Home.

**Critério de saída:** todas as áreas acordadas são acessíveis e a navegação de ida/volta está fechada.

### 9. Responsividade, acessibilidade e robustez de runtime

1. Cobrir breakpoints, orientação e safe areas com screenshots de regressão; observar dimensões reais do container (ResizeObserver se necessário).
2. Adicionar guards para dimensões zero, perda de contexto WebGL e dispositivo sem suporte; disponibilizar conteúdo alternativo essencial.
3. Implementar teclado/foco, semântica acessível, contraste e respeito a `prefers-reduced-motion`; garantir que controles não fiquem atrás do canvas.
4. Completar ciclo de pointer com `pointercancel`, `blur`, visibilidade da aba e unmount.
5. Centralizar ownership de recursos e validar mount/unmount repetido, troca de estado e resize sem vazamento.

### 10. Otimizar após fidelidade visual

1. Medir tempo de frame, GPU, memória de targets/texturas e bundle em dispositivos representativos.
2. Reduzir DPR/targets dinamicamente apenas quando a medição demonstrar necessidade e a inspeção aprovar o resultado.
3. Rever tamanhos/formatos de imagem, carregamento assíncrono, memoização de geometria/material e draw calls.
4. Pausar animações fora de viewport/aba quando não alterarem o comportamento observável.
5. Avaliar code splitting e remover dependências/artefatos de template que comprovadamente não são usados.

### 11. Validação final e aceite

1. Executar TypeScript/build/lint e testes adicionados de controles, scroll, navegação, filtros e lifecycle.
2. Comparar capturas por viewport/estado com as referências aprovadas; registrar divergências em vez de mascará-las com inferências.
3. Validar transição progressiva e reversa, scroll rápido/lento, touch, pointer cancel, resize, baixa resolução e reduced motion.
4. Confirmar licenças/origem de todos os assets e ausência de conteúdo protegido não autorizado.
5. Não iniciar uma nova etapa de implementação sem revisão/aceite do usuário da etapa anterior.
