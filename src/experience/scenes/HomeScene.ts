import * as THREE from "three";

import { createShellArchitecture } from "../home/createShellArchitecture";
import { createDawnBackdrop } from "../home/createDawnBackdrop";

import waterVertexShader from "../shaders/waterVertex";
import waterFragmentShader from "../shaders/waterFragment";

import type { QualitySettings } from "../core/quality";

import {
  HOME_BACKGROUND,
  HOME_FOG_COLOR,
  HOME_FOG_NEAR,
  HOME_FOG_FAR,
} from "../config/visual";

const createSeededRandom = (
  seed: number,
) => {
  let state = seed >>> 0;

  return () => {
    state =
      (
        state * 1664525 +
        1013904223
      ) >>> 0;

    return state / 4294967296;
  };
};

class HomeScene {
  public readonly scene: THREE.Scene;

  private readonly water: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial
  >;

  private readonly waterMaterial:
    THREE.ShaderMaterial;

  private readonly reflectionTarget =
    new THREE.WebGLRenderTarget(
      256,
      256,
      {
        minFilter:
          THREE.LinearFilter,

        magFilter:
          THREE.LinearFilter,

        format:
          THREE.RGBAFormat,

        depthBuffer: true,

        stencilBuffer: false,

        generateMipmaps: false,
      },
    );

  private readonly reflectionCamera =
    new THREE.PerspectiveCamera();

  private readonly reflectionViewProjection =
    new THREE.Matrix4();

  private readonly reflectionPosition =
    new THREE.Vector3();

  private readonly reflectionDirection =
    new THREE.Vector3();

  private readonly reflectionTargetPosition =
    new THREE.Vector3();

  private readonly reflectionUp =
    new THREE.Vector3();
      private readonly pointerRaycaster =
    new THREE.Raycaster();

  private readonly pointerIntersection =
    new THREE.Vector3();

  private readonly waterPlane =
    new THREE.Plane(
      new THREE.Vector3(
        0,
        1,
        0,
      ),
      -0.16,
    );

  private readonly pointerUv =
    new THREE.Vector2(
      0.5,
      0.5,
    );

  private readonly targetPointerUv =
    new THREE.Vector2(
      0.5,
      0.5,
    );

  private readonly pointerNdc =
    new THREE.Vector2();

  private readonly pointerUvVelocity =
    new THREE.Vector2();

  private readonly previousPointerUv =
    new THREE.Vector2(
      0.5,
      0.5,
    );

  private pointerValid = 0;

  private previousPointerValid = 0;

  private lastUpdateTime = 0;

  private holdStartTime = 0;

  private wasHolding = false;

  private particlesInitialized = false;

  private readonly particles:
    THREE.Points<
      THREE.BufferGeometry,
      THREE.PointsMaterial
    >;

  private readonly geometries:
    THREE.BufferGeometry[] = [];

  private readonly materials:
    THREE.Material[] = [];

  private readonly textures:
    THREE.Texture[] = [];

  private readonly time = {
    value: 0,
  };

  private readonly captureMaterials:
    Array<{
      mesh: THREE.Mesh;

      primary:
        THREE.MeshPhysicalMaterial;

      capture:
        THREE.MeshPhysicalMaterial;
    }> = [];

  private readonly capturedCameraMatrix =
    new THREE.Matrix4();

  private readonly capturedProjection =
    new THREE.Matrix4();

  private capturedTime = -1;

  private capturesDirty = true;

  private readonly dawn: THREE.Mesh;

  private environmentTarget:
    THREE.WebGLRenderTarget | null =
      null;
        private readonly refractionTarget =
    new THREE.WebGLRenderTarget(
      256,
      256,
      {
        minFilter:
          THREE.LinearFilter,

        magFilter:
          THREE.LinearFilter,

        type:
          THREE.HalfFloatType,

        depthBuffer: true,

        stencilBuffer: false,

        generateMipmaps: false,

        depthTexture:
          new THREE.DepthTexture(
            256,
            256,
            THREE.UnsignedIntType,
          ),
      },
    );

  private readonly quality:
    QualitySettings;

  private holdProgress = 0;

  constructor(
    quality: QualitySettings,
  ) {
    this.quality = quality;
    this.dawn = createDawnBackdrop(quality.mode);

    this.scene =
      new THREE.Scene();

    this.scene.background =
      new THREE.Color(
        HOME_BACKGROUND,
      );

    this.scene.fog =
      new THREE.Fog(
        HOME_FOG_COLOR,
        HOME_FOG_NEAR,
        HOME_FOG_FAR,
      );

    this.scene.add(
      this.dawn,
    );

    /*
     * O backdrop agora contém
     * céu + nuvens 3D.
     *
     * Registramos tudo para
     * descarte correto depois.
     */
    this.dawn.traverse(
      (object) => {
        if (
          !(
            object instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        this.geometries.push(
          object.geometry,
        );

        if (
          Array.isArray(
            object.material,
          )
        ) {
          this.materials.push(
            ...object.material,
          );
        } else {
          this.materials.push(
            object.material,
          );
        }
      },
    );

    const world =
      new THREE.Group();

    this.scene.add(world);

    world.name = "home";

    world.add(
      createShellArchitecture(
        this.quality,
        this.geometries,
        this.materials,
        this.time,
      ),
    );
        const waterGeometry =
      new THREE.PlaneGeometry(
        16.4,
        40,
        ...this.quality
          .waterSegments,
      );

    this.geometries.push(
      waterGeometry,
    );

    this.waterMaterial =
      new THREE.ShaderMaterial({
        vertexShader:
          waterVertexShader,

        fragmentShader:
          waterFragmentShader,

        transparent: false,

        side:
          THREE.DoubleSide,

        depthWrite: false,

        uniforms: {
          uTime: {
            value: 0,
          },

          uMouseUv: {
            value:
              new THREE.Vector2(
                0.5,
                0.5,
              ),
          },

          uPointerVelocity: {
            value:
              new THREE.Vector2(),
          },

          uPointerValid: {
            value: 0,
          },

          uHold: {
            value: 0,
          },

          uHoldTime: {
            value: 0,
          },

          uDeepColor: {
            value:
              new THREE.Color(
                "#789eaf",
              ),
          },

          uSurfaceColor: {
            value:
              new THREE.Color(
                "#d3e8e7",
              ),
          },

          uRefractionMap: {
            value:
              this
                .refractionTarget
                .texture,
          },

          uRefractionDepth: {
            value:
              this
                .refractionTarget
                .depthTexture,
          },

          uCameraNear: {
            value: 0.1,
          },

          uCameraFar: {
            value: 100,
          },

          uReflectionMap: {
            value:
              this
                .reflectionTarget
                .texture,
          },

          uReflectionMatrix: {
            value:
              this
                .reflectionViewProjection,
          },

          uReflectionStrength: {
            value: 0.82,
          },

          uDistortionStrength: {
            value: 0.032,
          },
        },
      });

    this.materials.push(
      this.waterMaterial,
    );
        this.water =
      new THREE.Mesh(
        waterGeometry,
        this.waterMaterial,
      );

    this.water.rotation.x =
      -Math.PI / 2;

    this.water.position.set(
      0,
      0.16,
      -9,
    );

    this.water.renderOrder = 2;

    world.add(
      this.water,
    );

    const dustCount =
      Math.round(
        this.quality.dustCount *
          0.65,
      );

    const dustPositions =
      new Float32Array(
        dustCount * 3,
      );

    const dustRandom =
      createSeededRandom(
        18291,
      );

    for (
      let index = 0;
      index < dustCount;
      index++
    ) {
      const offset =
        index * 3;

      dustPositions[offset] =
        (
          dustRandom() -
          0.5
        ) * 22;

      dustPositions[
        offset + 1
      ] =
        0.45 +
        dustRandom() * 6.5;

      dustPositions[
        offset + 2
      ] =
        7 -
        dustRandom() * 39;
    }

    const dustGeometry =
      new THREE.BufferGeometry();

    dustGeometry.setAttribute(
      "position",

      new THREE.BufferAttribute(
        dustPositions,
        3,
      ),
    );

    this.geometries.push(
      dustGeometry,
    );

    const dustMaterial =
      new THREE.PointsMaterial({
        color: "#f4e1d5",

        size: 0.025,

        transparent: true,

        opacity: 0.3,

        depthWrite: false,

        sizeAttenuation: true,
      });

    const pointPixels =
      new Uint8Array(
        32 * 32 * 4,
      );
          for (
      let y = 0;
      y < 32;
      y++
    ) {
      for (
        let x = 0;
        x < 32;
        x++
      ) {
        const distance =
          Math.hypot(
            (
              x - 15.5
            ) / 15.5,

            (
              y - 15.5
            ) / 15.5,
          );

        const offset =
          (
            y * 32 +
            x
          ) * 4;

        pointPixels.set(
          [
            255,
            255,
            255,

            Math.round(
              Math.max(
                0,
                1 - distance,
              ) **
                2 *
                255,
            ),
          ],

          offset,
        );
      }
    }

    const pointTexture =
      new THREE.DataTexture(
        pointPixels,
        32,
        32,
      );

    pointTexture.needsUpdate =
      true;

    dustMaterial.map =
      pointTexture;

    this.textures.push(
      pointTexture,
    );

    this.materials.push(
      dustMaterial,
    );

    this.particles =
      new THREE.Points(
        dustGeometry,
        dustMaterial,
      );

    this.scene.add(
      this.particles,
    );

    const hemisphere =
      new THREE.HemisphereLight(
        "#cad8f6",
        "#badbdc",
        0.75,
      );

    this.scene.add(
      hemisphere,
    );

    const ambientLight =
      new THREE.AmbientLight(
        "#e6dff4",
        0.14,
      );

    this.scene.add(
      ambientLight,
    );

    const sun =
      new THREE.DirectionalLight(
        "#FFE3CE",
        1.45,
      );

    sun.position.set(
      1.5,
      5,
      -16,
    );

    sun.target.position.set(
      0,
      0.5,
      -2,
    );

    this.scene.add(
      sun.target,
    );

    sun.castShadow =
      this.quality.shadows;
          sun.shadow.mapSize.set(
      this.quality
        .shadowMapSize,

      this.quality
        .shadowMapSize,
    );

    sun.shadow.camera.left =
      -22;

    sun.shadow.camera.right =
      22;

    sun.shadow.camera.top =
      18;

    sun.shadow.camera.bottom =
      -28;

    sun.shadow.camera.near =
      0.5;

    sun.shadow.camera.far =
      62;

    sun.shadow.bias =
      -0.00025;

    sun.shadow.radius = 3;

    this.scene.add(sun);

    const skyFill =
      new THREE.DirectionalLight(
        "#CED7E5",
        0.55,
      );

    skyFill.position.set(
      1,
      4,
      8,
    );

    this.scene.add(
      skyFill,
    );

    const waterBounce =
      new THREE.HemisphereLight(
        "#DDEDEC",
        "#CDE6E5",
        0.24,
      );

    waterBounce.position.set(
      0,
      -1,
      0,
    );

    this.scene.add(
      waterBounce,
    );

    const rim =
      new THREE.DirectionalLight(
        "#fff0e4",
        0.65,
      );

    rim.position.set(
      5,
      5,
      -24,
    );

    rim.target.position.set(
      -4,
      4,
      -4,
    );

    this.scene.add(
      rim,
      rim.target,
    );

    const captureVariants =
      new Map<
        THREE.MeshPhysicalMaterial,
        THREE.MeshPhysicalMaterial
      >();

    this.scene.traverse(
      (object) => {
        if (
          !(
            object instanceof
            THREE.Mesh
          ) ||
          !(
            object.material instanceof
            THREE.MeshPhysicalMaterial
          ) ||
          object.material
            .transmission === 0
        ) {
          return;
        }

        const primary =
          object.material;

        let capture =
          captureVariants.get(
            primary,
          );

        if (!capture) {
          capture =
            primary.clone();

          capture.name =
            `${primary.name} auxiliary capture`;

          capture.transmission = 0;

          capture.onBeforeCompile =
            primary.onBeforeCompile;

          capture.customProgramCacheKey =
            primary.customProgramCacheKey;

          captureVariants.set(
            primary,
            capture,
          );

          this.materials.push(
            capture,
          );
        }

        this.captureMaterials.push({
          mesh: object,
          primary,
          capture,
        });
      },
    );
  }
    private updateDawnClouds(
    elapsed: number,
  ) {
    for (
      const child
      of this.dawn.children
    ) {
      if (
        child.userData.kind !==
        "dawn-cloud"
      ) {
        continue;
      }

      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        child.material.uniforms.uTime.value = elapsed;
      }

      const baseX =
        child.userData
          .baseX as number;

      const baseY =
        child.userData
          .baseY as number;

      const drift =
        child.userData
          .drift as number;

      const bob =
        child.userData
          .bob as number;

      const speed =
        child.userData
          .speed as number;

      const phase =
        child.userData
          .phase as number;

      child.position.x =
        baseX +
        Math.sin(
          elapsed *
            speed +
            phase,
        ) *
          drift;

      child.position.y =
        baseY +
        Math.cos(
          elapsed *
            speed *
            0.72 +
            phase,
        ) *
          bob;
    }
  }

  update(
    elapsed: number,
    pointerX: number,
    pointerY: number,
    holding: boolean,
    camera:
      THREE.PerspectiveCamera,
    freezeParticles = false,
  ) {
    const delta =
      THREE.MathUtils.clamp(
        elapsed -
          this.lastUpdateTime,
        0,
        0.1,
      );

    const smoothing =
      1 -
      Math.exp(
        -delta * 8,
      );

    const pointerSmoothing =
      1 -
      Math.exp(
        -delta * 16,
      );

    if (
      holding &&
      !this.wasHolding
    ) {
      this.holdStartTime =
        elapsed;
    }

    this.wasHolding =
      holding;

    this.holdProgress =
      THREE.MathUtils.damp(
        this.holdProgress,
        holding ? 1 : 0,
        7,
        delta,
      );

    this.pointerNdc.set(
      pointerX,
      -pointerY,
    );

    this.pointerRaycaster
      .setFromCamera(
        this.pointerNdc,
        camera,
      );

    const intersection =
      this.pointerRaycaster
        .ray
        .intersectPlane(
          this.waterPlane,
          this.pointerIntersection,
        );
            this.pointerValid =
      intersection &&
      intersection.x >= -8.2 &&
      intersection.x <= 8.2 &&
      intersection.z >= -29 &&
      intersection.z <= 11
        ? 1
        : 0;

    if (
      this.pointerValid > 0
    ) {
      this.targetPointerUv.set(
        this.pointerIntersection.x /
          16.4 +
          0.5,

        (
          11 -
          this.pointerIntersection.z
        ) / 40,
      );
    }

    this.pointerUv.lerp(
      this.targetPointerUv,
      pointerSmoothing,
    );

    if (delta > 0) {
      this.pointerUvVelocity
        .subVectors(
          this.pointerUv,
          this.previousPointerUv,
        )
        .multiplyScalar(
          1 / delta,
        );
    } else {
      this.pointerUvVelocity.set(
        0,
        0,
      );
    }

    this.pointerUvVelocity
      .clampLength(
        0,
        0.8,
      );

    this.previousPointerUv
      .copy(
        this.pointerUv,
      );

    this.previousPointerValid +=
      (
        this.pointerValid -
        this.previousPointerValid
      ) *
      smoothing;

    this.lastUpdateTime =
      elapsed;

    this.time.value =
      elapsed;

    this.waterMaterial
      .uniforms
      .uTime
      .value =
        elapsed;

    this.waterMaterial
      .uniforms
      .uMouseUv
      .value
      .copy(
        this.pointerUv,
      );

    this.waterMaterial
      .uniforms
      .uPointerVelocity
      .value
      .copy(
        this.pointerUvVelocity,
      );

    this.waterMaterial
      .uniforms
      .uPointerValid
      .value =
        this.previousPointerValid;

    this.waterMaterial
      .uniforms
      .uHold
      .value =
        this.holdProgress;

    this.waterMaterial
      .uniforms
      .uHoldTime
      .value =
        Math.max(
          0,
          elapsed -
            this.holdStartTime,
        );

    if (
      !freezeParticles ||
      !this.particlesInitialized
    ) {
      this.particles.rotation.y =
        Math.sin(
          elapsed * 0.035,
        ) * 0.012;

      this.particles.position.y =
        Math.sin(
          elapsed * 0.09,
        ) * 0.025;

      this.updateDawnClouds(
        elapsed,
      );

      this.particlesInitialized =
        true;
    }
  }

  resizeReflection(
    width: number,
    height: number,
    pixelRatio: number,
  ) {
    const reflectionPixelRatio =
      Math.min(
        pixelRatio,
        this.quality
          .maxPixelRatio,
      );

    const scale =
      Math.min(
        reflectionPixelRatio *
          this.quality
            .reflectionScale,

        this.quality
          .maxReflectionSize /
          Math.max(
            width,
            height,
          ),
      );

    const targetWidth =
      Math.max(
        1,
        Math.round(
          width * scale,
        ),
      );

    const targetHeight =
      Math.max(
        1,
        Math.round(
          height * scale,
        ),
      );

    this.reflectionTarget
      .setSize(
        targetWidth,
        targetHeight,
      );

    this.refractionTarget
      .setSize(
        targetWidth,
        targetHeight,
      );

    this.capturesDirty =
      true;
  }

  renderReflection(
    renderer:
      THREE.WebGLRenderer,

    camera:
      THREE.PerspectiveCamera,
  ) {
    if (
      !this.environmentTarget
    ) {
      const environmentScene =
        new THREE.Scene();

      environmentScene.add(
        this.dawn.clone(),
      );

      const generator =
        new THREE.PMREMGenerator(
          renderer,
        );

      try {
        this.environmentTarget =
          generator.fromScene(
            environmentScene,
            0.04,
            0.1,
            100,
            {
              size:
                this.quality
                  .mode ===
                "high"
                  ? 128
                  : 64,
            },
          );

        this.scene.environment =
          this
            .environmentTarget
            .texture;

        this.scene
          .environmentIntensity =
            0.45;
      } finally {
        generator.dispose();

        environmentScene.clear();
      }
    }

    camera.updateMatrixWorld(
      true,
    );

    const sameCamera =
      camera.matrixWorld.equals(
        this.capturedCameraMatrix,
      ) &&
      camera.projectionMatrix.equals(
        this.capturedProjection,
      );

    const captureInterval =
      this.quality.mode ===
      "low"
        ? 1 / 15
        : 1 / 30;

    if (
      !this.capturesDirty &&
      sameCamera &&
      this.time.value -
        this.capturedTime <
        captureInterval
    ) {
      return;
    }

    const waterVisible =
      this.water.visible;

    const previousRenderTarget =
      renderer.getRenderTarget();

    const previousAutoClear =
      renderer.autoClear;

    const previousTransmissionScale =
      renderer
        .transmissionResolutionScale;

    const previousShadowMapEnabled =
      renderer.shadowMap.enabled;

    camera.updateMatrixWorld(
      true,
    );

    camera.getWorldPosition(
      this.reflectionPosition,
    );

    this.reflectionPosition.y =
      2 *
        this.water.position.y -
      this.reflectionPosition.y;

    camera.getWorldDirection(
      this.reflectionDirection,
    );

    this.reflectionDirection.y *=
      -1;

    this.reflectionTargetPosition
      .copy(
        this.reflectionPosition,
      )
      .add(
        this.reflectionDirection,
      );

    this.reflectionUp.copy(
      camera.up,
    );

    this.reflectionUp.y *=
      -1;

    this.reflectionCamera
      .position
      .copy(
        this.reflectionPosition,
      );

    this.reflectionCamera
      .up
      .copy(
        this.reflectionUp,
      );

    this.reflectionCamera.near =
      camera.near;

    this.reflectionCamera.far =
      camera.far;

    this.reflectionCamera.fov =
      camera.fov;

    this.reflectionCamera.zoom =
      camera.zoom;

    this.reflectionCamera.aspect =
      camera.aspect;

    this.reflectionCamera
      .updateProjectionMatrix();

    this.reflectionCamera
      .lookAt(
        this.reflectionTargetPosition,
      );

    this.reflectionCamera
      .updateMatrixWorld(
        true,
      );

    this.reflectionViewProjection
      .multiplyMatrices(
        this.reflectionCamera
          .projectionMatrix,

        this.reflectionCamera
          .matrixWorldInverse,
      );

    this.water.visible =
      false;

    try {
      for (
        const {
          mesh,
          capture,
        }
        of this.captureMaterials
      ) {
        mesh.material =
          capture;
      }

      renderer.autoClear =
        true;

      renderer.transmissionResolutionScale =
        this.quality.mode ===
        "high"
          ? 0.5
          : 0.35;

      renderer.shadowMap.enabled =
        false;

      renderer.setRenderTarget(
        this.reflectionTarget,
      );

      renderer.clear();

      renderer.render(
        this.scene,
        this.reflectionCamera,
      );

      this.waterMaterial
        .uniforms
        .uCameraNear
        .value =
          camera.near;

      this.waterMaterial
        .uniforms
        .uCameraFar
        .value =
          camera.far;

      renderer.setRenderTarget(
        this.refractionTarget,
      );

      renderer.clear();

      renderer.render(
        this.scene,
        camera,
      );

      this.capturedCameraMatrix
        .copy(
          camera.matrixWorld,
        );

      this.capturedProjection
        .copy(
          camera
            .projectionMatrix,
        );

      this.capturedTime =
        this.time.value;

      this.capturesDirty =
        false;
    } finally {
      for (
        const {
          mesh,
          primary,
        }
        of this.captureMaterials
      ) {
        mesh.material =
          primary;
      }

      this.water.visible =
        waterVisible;

      renderer.shadowMap.enabled =
        previousShadowMapEnabled;

      renderer.setRenderTarget(
        previousRenderTarget,
      );

      renderer.autoClear =
        previousAutoClear;

      renderer.transmissionResolutionScale =
        previousTransmissionScale;
    }
  }

  dispose() {
    new Set(
      this.geometries,
    ).forEach(
      (geometry) =>
        geometry.dispose(),
    );

    new Set(
      this.materials,
    ).forEach(
      (material) =>
        material.dispose(),
    );

    new Set(
      this.textures,
    ).forEach(
      (texture) =>
        texture.dispose(),
    );

    this.reflectionTarget
      .dispose();

    this.refractionTarget
      .depthTexture
      ?.dispose();

    this.refractionTarget
      .dispose();

    this.scene.environment =
      null;

    this.environmentTarget
      ?.dispose();

    this.environmentTarget =
      null;

    this.scene.traverse(
      (object) => {
        if (
          object instanceof
            THREE.DirectionalLight ||
          object instanceof
            THREE.PointLight ||
          object instanceof
            THREE.SpotLight
        ) {
          object.shadow
            .dispose();
        }
      },
    );

    this.scene.clear();
  }
}

export default HomeScene;