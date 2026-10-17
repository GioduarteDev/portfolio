import * as THREE from "three";

import transitionVertexShader from "../shaders/transitionVertex";
import transitionFragmentShader from "../shaders/transitionFragment";
import postProcessVertexShader from "../shaders/postProcessVertex";
import postProcessFragmentShader from "../shaders/postProcessFragment";
import navigationFragmentShader from "../shaders/navigationFragment";
import { DiveParticles } from "../dive/DiveParticles";
import type { DiveState } from "../dive/diveTimeline";
import type { QualityMode } from "./quality";

export const DEBUG_POST_PROCESSING = {
  grain: true,
  vignette: true,
  chromaticAberration: true,
  colorGrading: true,
};

class SceneTransition {
  private readonly homeTarget: THREE.WebGLRenderTarget;

  private readonly projectsTarget: THREE.WebGLRenderTarget;

  private readonly finalTarget: THREE.WebGLRenderTarget;

  private readonly transitionScene: THREE.Scene;

  private readonly transitionCamera: THREE.OrthographicCamera;

  private readonly transitionMaterial: THREE.ShaderMaterial;
  private readonly navigationMaterial: THREE.ShaderMaterial;
  private readonly transitionQuad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly diveParticles: DiveParticles;
  private diveState: DiveState | null = null;
  private reducedMotion = false;

  private readonly postProcessScene: THREE.Scene;

  private readonly postProcessMaterial: THREE.ShaderMaterial;

  private readonly quadGeometry: THREE.PlaneGeometry;

  private readonly resolution = new THREE.Vector2();

  constructor(
    width: number,
    height: number,
    pixelRatio: number,
    qualityMode: QualityMode = "high",
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
    this.resolution.set(targetWidth, targetHeight);

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
          depthTexture: new THREE.DepthTexture(targetWidth, targetHeight, THREE.UnsignedIntType),
        },
      );

    this.projectsTarget.texture.colorSpace =
      THREE.SRGBColorSpace;

    this.finalTarget = new THREE.WebGLRenderTarget(
      targetWidth,
      targetHeight,
      {
        depthBuffer: true,
      },
    );
    this.finalTarget.texture.colorSpace = THREE.SRGBColorSpace;

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

          uResolution: {
            value: this.resolution,
          },

          uVelocity: {
            value: 0,
          },

          uDirection: {
            value: 0,
          },
          uProjectsDepth: { value: this.projectsTarget.depthTexture },
          uProjectsClip: { value: new THREE.Vector2(0.1, 100) },
          uDive: { value: new THREE.Vector4() },
          uWaterline: { value: -0.12 },
          uMotionScale: { value: 1 },
          uQuality: { value: qualityMode === "high" ? 2 : qualityMode === "medium" ? 1 : 0 },
          uPointer: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
        },
      });
    // Keep Contact/World navigation on its approved shader and timeline.
    this.navigationMaterial = new THREE.ShaderMaterial({
      vertexShader: transitionVertexShader, fragmentShader: navigationFragmentShader,
      depthTest: false, depthWrite: false,
      uniforms: this.transitionMaterial.uniforms,
    });
    this.diveParticles = new DiveParticles(qualityMode, this.finalTarget.texture, this.resolution);

    this.postProcessScene = new THREE.Scene();
    this.postProcessMaterial = new THREE.ShaderMaterial({
      vertexShader: postProcessVertexShader,
      fragmentShader: postProcessFragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uInputTexture: {
          value: this.finalTarget.texture,
        },
        uResolution: {
          value: this.resolution,
        },
        uTime: {
          value: 0,
        },
        uEffects: {
          value: new THREE.Vector4(
            Number(DEBUG_POST_PROCESSING.grain),
            Number(DEBUG_POST_PROCESSING.vignette),
            Number(DEBUG_POST_PROCESSING.chromaticAberration),
            Number(DEBUG_POST_PROCESSING.colorGrading),
          ),
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
    this.transitionQuad = quad;

    this.transitionScene.add(quad);
    const postProcessQuad = new THREE.Mesh(
      this.quadGeometry,
      this.postProcessMaterial,
    );
    this.postProcessScene.add(postProcessQuad);
  }

  setDiveState(state: DiveState, waterline: number, pointer: THREE.Vector4, reducedMotion: boolean) {
    this.diveState = state;
    this.reducedMotion = reducedMotion;
    this.transitionMaterial.uniforms.uDive.value.set(state.contact, state.immersion, state.arrival, state.wet);
    this.transitionMaterial.uniforms.uWaterline.value = waterline;
    this.transitionMaterial.uniforms.uMotionScale.value = reducedMotion ? 0.22 : 1;
    this.transitionMaterial.uniforms.uPointer.value.copy(pointer);
  }

  // =====================================================
  // RENDER
  // =====================================================

  render(
    renderer: THREE.WebGLRenderer,
    homeScene: THREE.Scene,
    homeCamera: THREE.Camera,
    projectsScene: THREE.Scene,
    projectsCamera: THREE.Camera,
    progress: number,
    elapsed: number,
    velocity: number,
    direction: -1 | 0 | 1,
    dive = false,
  ) {
    // ===================================================
    // ANTES DO MERGULHO
    //
    // Não precisamos renderizar as duas cenas.
    // Renderizamos apenas Home antes do pós-processamento final.
    // ===================================================

    if (progress <= 0.001) {
      renderer.setRenderTarget(this.finalTarget);
      renderer.clear();
      renderer.render(homeScene, homeCamera);
    } else if (progress >= 0.999) {
      renderer.setRenderTarget(this.finalTarget);
      renderer.clear();
      renderer.render(projectsScene, projectsCamera);
    } else {
      this.transitionQuad.material = dive ? this.transitionMaterial : this.navigationMaterial;
      renderer.setRenderTarget(this.homeTarget);
      renderer.clear();
      renderer.render(homeScene, homeCamera);

      renderer.setRenderTarget(this.projectsTarget);
      renderer.clear();
      renderer.render(projectsScene, projectsCamera);
      if (projectsCamera instanceof THREE.PerspectiveCamera) {
        this.transitionMaterial.uniforms.uProjectsClip.value.set(projectsCamera.near, projectsCamera.far);
      }

      this.transitionMaterial.uniforms.uProgress.value = progress;
      this.transitionMaterial.uniforms.uTime.value = elapsed;
      this.transitionMaterial.uniforms.uVelocity.value =
        THREE.MathUtils.clamp(Math.abs(velocity), 0, 2);
      this.transitionMaterial.uniforms.uDirection.value = direction;

      renderer.setRenderTarget(this.finalTarget);
      renderer.clear();
      renderer.render(this.transitionScene, this.transitionCamera);
    }

    this.postProcessMaterial.uniforms.uTime.value = elapsed;
    renderer.setRenderTarget(null);
    renderer.render(this.postProcessScene, this.transitionCamera);
    if (dive && this.diveState && progress > 0 && progress < 1) {
      this.diveParticles.update(this.diveState, elapsed, this.reducedMotion);
      const autoClear = renderer.autoClear;
      try {
        renderer.autoClear = false;
        renderer.render(this.diveParticles.scene, this.transitionCamera);
      } finally {
        renderer.autoClear = autoClear;
      }
    }
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

    this.finalTarget.setSize(targetWidth, targetHeight);

    this.resolution.set(
      targetWidth,
      targetHeight,
    );
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  dispose() {
    this.homeTarget.dispose();
    this.homeTarget.depthTexture?.dispose();

    this.projectsTarget.dispose();
    this.projectsTarget.depthTexture?.dispose();
    this.finalTarget.dispose();

    this.transitionMaterial.dispose();
    this.navigationMaterial.dispose();
    this.diveParticles.dispose();
    this.postProcessMaterial.dispose();

    this.quadGeometry.dispose();
  }
}

export default SceneTransition;
