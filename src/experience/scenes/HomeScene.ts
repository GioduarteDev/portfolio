import * as THREE from "three";

import waterVertexShader from "../shaders/waterVertex";
import waterFragmentShader from "../shaders/waterFragment";

class HomeScene {
  public readonly scene: THREE.Scene;

  private readonly water:
    THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >;

  private readonly waterMaterial:
    THREE.ShaderMaterial;

  private readonly particles:
    THREE.Points<
      THREE.BufferGeometry,
      THREE.PointsMaterial
    >;

  private holdProgress = 0;

  private readonly geometries:
    THREE.BufferGeometry[] = [];

  private readonly materials:
    THREE.Material[] = [];

  constructor() {
    // =====================================================
    // SCENE
    // =====================================================

    this.scene =
      new THREE.Scene();

    const backgroundColor =
      new THREE.Color(
        "#0b1844",
      );

    this.scene.background =
      backgroundColor;

    this.scene.fog =
      new THREE.Fog(
        backgroundColor,
        8,
        25,
      );

    // =====================================================
    // WORLD
    // =====================================================

    const world =
      new THREE.Group();

    this.scene.add(world);

    // =====================================================
    // MATERIALS
    // =====================================================

    const architectureMaterial =
      new THREE.MeshStandardMaterial({
        color: "#d99ca7",
        roughness: 0.82,
        metalness: 0,
      });

    const darkArchitectureMaterial =
      new THREE.MeshStandardMaterial({
        color: "#915f74",
        roughness: 0.9,
        metalness: 0,
      });

    const groundMaterial =
      new THREE.MeshStandardMaterial({
        color: "#af7887",
        roughness: 1,
      });

    this.materials.push(
      architectureMaterial,
      darkArchitectureMaterial,
      groundMaterial,
    );

    // =====================================================
    // GROUND
    // =====================================================

    const groundGeometry =
      new THREE.PlaneGeometry(
        40,
        40,
      );

    this.geometries.push(
      groundGeometry,
    );

    const ground =
      new THREE.Mesh(
        groundGeometry,
        groundMaterial,
      );

    ground.rotation.x =
      -Math.PI / 2;

    ground.position.y = 0;

    ground.receiveShadow = true;

    world.add(ground);

    // =====================================================
    // TEMPORARY BUILDINGS
    // =====================================================

    const createBuilding = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
    ) => {
      const geometry =
        new THREE.BoxGeometry(
          width,
          height,
          depth,
        );

      this.geometries.push(
        geometry,
      );

      const mesh =
        new THREE.Mesh(
          geometry,
          architectureMaterial,
        );

      mesh.position.set(
        x,
        y,
        z,
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      world.add(mesh);
    };

    createBuilding(
      3.2,
      2.6,
      2,
      -4.4,
      1.3,
      -2,
    );

    createBuilding(
      2.4,
      4.2,
      2.2,
      4,
      2.1,
      -5,
    );

    createBuilding(
      2,
      1.7,
      2,
      -1.6,
      0.85,
      -8,
    );

    createBuilding(
      3.4,
      3,
      2,
      3,
      1.5,
      -12,
    );

    // =====================================================
    // ARCH
    // =====================================================

    const arch =
      new THREE.Group();

    const pillarGeometry =
      new THREE.BoxGeometry(
        0.75,
        4,
        1,
      );

    this.geometries.push(
      pillarGeometry,
    );

    const leftPillar =
      new THREE.Mesh(
        pillarGeometry,
        darkArchitectureMaterial,
      );

    leftPillar.position.set(
      -1.8,
      2,
      -3,
    );

    const rightPillar =
      new THREE.Mesh(
        pillarGeometry,
        darkArchitectureMaterial,
      );

    rightPillar.position.set(
      1.8,
      2,
      -3,
    );

    const topGeometry =
      new THREE.BoxGeometry(
        4.35,
        0.7,
        1,
      );

    this.geometries.push(
      topGeometry,
    );

    const top =
      new THREE.Mesh(
        topGeometry,
        darkArchitectureMaterial,
      );

    top.position.set(
      0,
      3.65,
      -3,
    );

    arch.add(
      leftPillar,
      rightPillar,
      top,
    );

    world.add(arch);

    // =====================================================
    // WATER SHADER
    // =====================================================

    const waterGeometry =
      new THREE.PlaneGeometry(
        16,
        12,
        128,
        128,
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

        transparent: true,

        side:
          THREE.DoubleSide,

        depthWrite: false,

        uniforms: {
          uTime: {
            value: 0,
          },

          uMouse: {
            value:
              new THREE.Vector2(
                0,
                0,
              ),
          },

          uHold: {
            value: 0,
          },

          uDeepColor: {
            value:
              new THREE.Color(
                "#183b63",
              ),
          },

          uSurfaceColor: {
            value:
              new THREE.Color(
                "#7891a9",
              ),
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
      0.15,
      0,
    );

    this.water.renderOrder = 2;

    world.add(
      this.water,
    );

    // =====================================================
    // PARTICLES
    // =====================================================

    const particleCount = 350;

    const positions =
      new Float32Array(
        particleCount * 3,
      );

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      const index = i * 3;

      positions[index] =
        (Math.random() - 0.5) *
        18;

      positions[index + 1] =
        Math.random() * 8;

      positions[index + 2] =
        -Math.random() * 22 +
        6;
    }

    const particleGeometry =
      new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3,
      ),
    );

    this.geometries.push(
      particleGeometry,
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: "#ead2d2",
        size: 0.035,
        transparent: true,
        opacity: 0.65,
      });

    this.materials.push(
      particleMaterial,
    );

    this.particles =
      new THREE.Points(
        particleGeometry,
        particleMaterial,
      );

    this.scene.add(
      this.particles,
    );

    // =====================================================
    // LIGHTS
    // =====================================================

    const ambientLight =
      new THREE.AmbientLight(
        "#b8c9ff",
        1.1,
      );

    this.scene.add(
      ambientLight,
    );

    const sun =
      new THREE.DirectionalLight(
        "#ffd6c4",
        4.3,
      );

    sun.position.set(
      -4,
      8,
      5,
    );

    sun.castShadow = true;

    sun.shadow.mapSize.set(
      1024,
      1024,
    );

    this.scene.add(
      sun,
    );

    const blueFill =
      new THREE.DirectionalLight(
        "#708dff",
        2,
      );

    blueFill.position.set(
      4,
      3,
      -4,
    );

    this.scene.add(
      blueFill,
    );
  }

  // =====================================================
  // UPDATE
  // Executado em todos os frames.
  // =====================================================

  update(
    elapsed: number,
    pointerX: number,
    pointerY: number,
    holding: boolean,
  ) {
    this.holdProgress +=
      (
        (holding ? 1 : 0) -
        this.holdProgress
      ) * 0.055;

    this.waterMaterial.uniforms
      .uTime.value =
      elapsed;

    this.waterMaterial.uniforms
      .uMouse.value.set(
        pointerX,
        -pointerY,
      );

    this.waterMaterial.uniforms
      .uHold.value =
      this.holdProgress;

    this.particles.rotation.y =
      Math.sin(
        elapsed * 0.06,
      ) * 0.03;

    this.particles.position.y =
      Math.sin(
        elapsed * 0.15,
      ) * 0.05;
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  dispose() {
    const uniqueGeometries =
      new Set(
        this.geometries,
      );

    uniqueGeometries.forEach(
      (geometry) => {
        geometry.dispose();
      },
    );

    const uniqueMaterials =
      new Set(
        this.materials,
      );

    uniqueMaterials.forEach(
      (material) => {
        material.dispose();
      },
    );
  }
}

export default HomeScene;