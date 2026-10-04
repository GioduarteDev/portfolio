import * as THREE from "three";

import transitionVertexShader from "../shaders/transitionVertex";
import transitionFragmentShader from "../shaders/transitionFragment";

class SceneTransition {
  private readonly homeTarget: THREE.WebGLRenderTarget;

  private readonly projectsTarget: THREE.WebGLRenderTarget;

  private readonly transitionScene: THREE.Scene;

  private readonly transitionCamera: THREE.OrthographicCamera;

  private readonly transitionMaterial: THREE.ShaderMaterial;

  private readonly quadGeometry: THREE.PlaneGeometry;

  constructor(
    width: number,
    height: number,
    pixelRatio: number,
  ) {
    // =====================================================
    // TAMANHO DOS RENDER TARGETS
    // =====================================================

    const targetWidth = Math.max(
      1,
      Math.floor(width * pixelRatio),
    );

    const targetHeight = Math.max(
      1,
      Math.floor(height * pixelRatio),
    );

    // =====================================================
    // RENDER TARGET — HOME
    // =====================================================

    this.homeTarget = new THREE.WebGLRenderTarget(
      targetWidth,
      targetHeight,
      {
        depthBuffer: true,
      },
    );

    this.homeTarget.texture.colorSpace =
      THREE.SRGBColorSpace;

    // =====================================================
    // RENDER TARGET — PROJECTS
    // =====================================================

    this.projectsTarget =
      new THREE.WebGLRenderTarget(
        targetWidth,
        targetHeight,
        {
          depthBuffer: true,
        },
      );

    this.projectsTarget.texture.colorSpace =
      THREE.SRGBColorSpace;

    // =====================================================
    // TRANSITION SCENE
    //
    // Esta é uma terceira cena.
    // Ela não contém o mundo 3D.
    // Ela contém apenas um plano de tela cheia
    // usado para misturar Home + Projects.
    // =====================================================

    this.transitionScene = new THREE.Scene();

    // =====================================================
    // ORTHOGRAPHIC CAMERA
    //
    // Usada para desenhar o shader diretamente
    // na tela inteira.
    // =====================================================

    this.transitionCamera =
      new THREE.OrthographicCamera(
        -1,
        1,
        1,
        -1,
        0,
        1,
      );

    // =====================================================
    // TRANSITION MATERIAL
    // =====================================================

    this.transitionMaterial =
      new THREE.ShaderMaterial({
        vertexShader: transitionVertexShader,

        fragmentShader: transitionFragmentShader,

        depthTest: false,

        depthWrite: false,

        uniforms: {
          // Imagem renderizada da Home
          uHomeTexture: {
            value: this.homeTarget.texture,
          },

          // Imagem renderizada de Projects
          uProjectsTexture: {
            value: this.projectsTarget.texture,
          },

          // 0 = Home
          // 1 = Projects
          uProgress: {
            value: 0,
          },

          // Tempo para ondas/distorções
          uTime: {
            value: 0,
          },
        },
      });

    // =====================================================
    // FULLSCREEN QUAD
    // =====================================================

    this.quadGeometry =
      new THREE.PlaneGeometry(2, 2);

    const quad = new THREE.Mesh(
      this.quadGeometry,
      this.transitionMaterial,
    );

    this.transitionScene.add(quad);
  }

  // =====================================================
  // RENDER
  // =====================================================

  render(
    renderer: THREE.WebGLRenderer,
    homeScene: THREE.Scene,
    projectsScene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    progress: number,
    elapsed: number,
  ) {
    // ===================================================
    // ANTES DO MERGULHO
    //
    // Não precisamos renderizar as duas cenas.
    // Mostramos apenas Home.
    // ===================================================

    if (progress <= 0.001) {
      renderer.setRenderTarget(null);

      renderer.render(
        homeScene,
        camera,
      );

      return;
    }

    // ===================================================
    // DEPOIS DO MERGULHO
    //
    // Mostramos apenas Projects.
    // ===================================================

    if (progress >= 0.999) {
      renderer.setRenderTarget(null);

      renderer.render(
        projectsScene,
        camera,
      );

      return;
    }

    // ===================================================
    // 1. RENDERIZA HOME NUMA TEXTURA
    // ===================================================

    renderer.setRenderTarget(
      this.homeTarget,
    );

    renderer.clear();

    renderer.render(
      homeScene,
      camera,
    );

    // ===================================================
    // 2. RENDERIZA PROJECTS NUMA OUTRA TEXTURA
    // ===================================================

    renderer.setRenderTarget(
      this.projectsTarget,
    );

    renderer.clear();

    renderer.render(
      projectsScene,
      camera,
    );

    // ===================================================
    // 3. ATUALIZA O SHADER DA TRANSIÇÃO
    // ===================================================

    this.transitionMaterial.uniforms.uProgress.value =
      progress;

    this.transitionMaterial.uniforms.uTime.value =
      elapsed;

    // ===================================================
    // 4. VOLTA PARA A TELA REAL
    // ===================================================

    renderer.setRenderTarget(null);

    // ===================================================
    // 5. MISTURA AS DUAS CENAS
    // ===================================================

    renderer.render(
      this.transitionScene,
      this.transitionCamera,
    );
  }

  // =====================================================
  // RESIZE
  //
  // Quando a janela muda de tamanho,
  // os render targets também precisam mudar.
  // =====================================================

  resize(
    width: number,
    height: number,
    pixelRatio: number,
  ) {
    const targetWidth = Math.max(
      1,
      Math.floor(width * pixelRatio),
    );

    const targetHeight = Math.max(
      1,
      Math.floor(height * pixelRatio),
    );

    this.homeTarget.setSize(
      targetWidth,
      targetHeight,
    );

    this.projectsTarget.setSize(
      targetWidth,
      targetHeight,
    );
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  dispose() {
    this.homeTarget.dispose();

    this.projectsTarget.dispose();

    this.transitionMaterial.dispose();

    this.quadGeometry.dispose();
  }
}

export default SceneTransition;