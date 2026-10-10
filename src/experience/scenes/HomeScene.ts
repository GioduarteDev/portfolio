import * as THREE from "three";

import waterVertexShader from "../shaders/waterVertex";
import waterFragmentShader from "../shaders/waterFragment";
import type { QualitySettings } from "../core/quality";
import {
  HOME_BACKGROUND,
  HOME_FOG_COLOR,
  HOME_FOG_FAR,
  HOME_FOG_NEAR,
} from "../config/visual";

interface PetalState {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  phase: number;
  spin: number;
}

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const getTerrainHeight = (x: number, worldZ: number) => {
  const bankRise = Math.max(0, Math.abs(x) - 7.2);

  return (
    Math.sin(x * 0.34 - worldZ * 0.12) * 0.075 +
    Math.cos(worldZ * 0.29 + x * 0.08) * 0.06 +
    Math.min(bankRise * 0.045, 0.42)
  );
};

const createGrassGeometry = () => {
  const positions: number[] = [];
  const indices: number[] = [];
  const bladeCount = 3;
  const segments = 3;

  for (let blade = 0; blade < bladeCount; blade++) {
    const angle = (blade / bladeCount) * Math.PI;
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    const sideX = -directionZ;
    const sideZ = directionX;
    const height = 0.34 + (blade % 2) * 0.08;
    const width = 0.07;
    const start = positions.length / 3;

    for (let segment = 0; segment <= segments; segment++) {
      const t = segment / segments;
      const widthAtHeight = width * (1 - t) * 0.58;
      const bend = t * t * 0.09;
      const centerX = directionX * bend;
      const centerZ = directionZ * bend;
      const heightAtSegment = t * height;

      positions.push(
        centerX - sideX * widthAtHeight,
        heightAtSegment,
        centerZ - sideZ * widthAtHeight,
        centerX + sideX * widthAtHeight,
        heightAtSegment,
        centerZ + sideZ * widthAtHeight,
      );

      if (segment > 0) {
        const previous = start + (segment - 1) * 2;
        const current = start + segment * 2;

        indices.push(
          previous,
          current,
          previous + 1,
          previous + 1,
          current,
          current + 1,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

class HomeScene {
  public readonly scene: THREE.Scene;

  private readonly water: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial
  >;

  private readonly waterMaterial: THREE.ShaderMaterial;

  private readonly reflectionTarget =
    new THREE.WebGLRenderTarget(256, 256, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });

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
      new THREE.Vector3(0, 1, 0),
      -0.16,
    );

  private readonly pointerUv =
    new THREE.Vector2(0.5, 0.5);

  private readonly targetPointerUv =
    new THREE.Vector2(0.5, 0.5);

  private readonly pointerNdc =
    new THREE.Vector2();

  private readonly pointerUvVelocity =
    new THREE.Vector2();

  private readonly previousPointerUv =
    new THREE.Vector2(0.5, 0.5);

  private pointerValid = 0;

  private previousPointerValid = 0;

  private lastUpdateTime = 0;

  private holdStartTime = 0;

  private wasHolding = false;

  private particlesInitialized = false;

  private readonly particles: THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;

  private readonly petals: THREE.InstancedMesh<
    THREE.BufferGeometry,
    THREE.MeshPhysicalMaterial
  >;

  private readonly petalStates: PetalState[] = [];

  private readonly geometries: THREE.BufferGeometry[] = [];

  private readonly materials: THREE.Material[] = [];

  private readonly textures: THREE.Texture[] = [];

  private readonly instanceTransform = new THREE.Object3D();

  private readonly quality: QualitySettings;

  private holdProgress = 0;

  constructor(quality: QualitySettings) {
    this.quality = quality;
    this.scene = new THREE.Scene();

    const backgroundColor = new THREE.Color(HOME_BACKGROUND);

    this.scene.background = backgroundColor;
    this.scene.fog = new THREE.Fog(HOME_FOG_COLOR, HOME_FOG_NEAR, HOME_FOG_FAR);

    const world = new THREE.Group();
    this.scene.add(world);

    const roseStoneMaterial = new THREE.MeshPhysicalMaterial({
      color: "#d9a2ab",
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.78,
    });
    const paleStoneMaterial = new THREE.MeshPhysicalMaterial({
      color: "#ead0c6",
      roughness: 0.78,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.82,
    });
    const mauveStoneMaterial = new THREE.MeshPhysicalMaterial({
      color: "#b77f91",
      roughness: 0.76,
      metalness: 0,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8,
    });
    const landMaterial = new THREE.MeshStandardMaterial({
      color: "#92967a",
      roughness: 0.98,
    });
    const hillMaterial = new THREE.MeshStandardMaterial({
      color: "#a8a68b",
      roughness: 0.96,
    });

    this.materials.push(
      roseStoneMaterial,
      paleStoneMaterial,
      mauveStoneMaterial,
      landMaterial,
      hillMaterial,
    );

    const groundGeometry = new THREE.PlaneGeometry(
      72,
      72,
      this.quality.terrainSegments,
      this.quality.terrainSegments,
    );
    const groundPositions = groundGeometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;

    for (let index = 0; index < groundPositions.count; index++) {
      const x = groundPositions.getX(index);
      const worldZ = -groundPositions.getY(index);
      groundPositions.setZ(index, getTerrainHeight(x, worldZ));
    }

    groundPositions.needsUpdate = true;
    groundGeometry.computeVertexNormals();
    this.geometries.push(groundGeometry);

    const ground = new THREE.Mesh(groundGeometry, landMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    world.add(ground);

    const addSculpturalBuilding = (
      width: number,
      height: number,
      depth: number,
      x: number,
      z: number,
      material: THREE.Material,
      crownOffset: number,
    ) => {
      const profile = new THREE.SplineCurve([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(width * 0.38, 0),
        new THREE.Vector2(width * 0.44, height * 0.08),
        new THREE.Vector2(width * 0.48, height * 0.2),
        new THREE.Vector2(width * 0.49, height * 0.38),
        new THREE.Vector2(width * 0.46, height * 0.54),
        new THREE.Vector2(width * 0.41, height * 0.68),
        new THREE.Vector2(width * 0.35, height * 0.78),
        new THREE.Vector2(width * 0.26, height * 0.88),
        new THREE.Vector2(width * 0.14, height * 0.96),
        new THREE.Vector2(
          width * (0.04 + crownOffset * 0.1),
          height * 0.99,
        ),
        new THREE.Vector2(0, height),
      ]);
      const geometry = new THREE.LatheGeometry(
        profile.getPoints(64),
        64,
      );
      geometry.scale(1, 1, depth / width);
      this.geometries.push(geometry);

      const building = new THREE.Mesh(geometry, material);
      building.position.set(x, getTerrainHeight(x, z) + 0.04, z);
      building.castShadow = true;
      building.receiveShadow = true;
      world.add(building);
    };

    const addArch = (
      x: number,
      z: number,
      radius: number,
      height: number,
      material: THREE.Material,
    ) => {
      const pillarRadius = radius * 0.14;
      const pillarHeight = height * 0.56;
      const pillarGeometry = new THREE.CylinderGeometry(
        pillarRadius * 0.88,
        pillarRadius * 1.12,
        pillarHeight,
        24,
        1,
      );
      const archGeometry = new THREE.TorusGeometry(
        radius,
        pillarRadius,
        18,
        64,
        Math.PI,
      );

      this.geometries.push(pillarGeometry, archGeometry);

      const leftPillar = new THREE.Mesh(pillarGeometry, material);
      leftPillar.position.set(
        x - radius,
        getTerrainHeight(x - radius, z) + pillarHeight * 0.5,
        z,
      );
      leftPillar.castShadow = true;
      leftPillar.receiveShadow = true;

      const rightPillar = new THREE.Mesh(pillarGeometry, material);
      rightPillar.position.set(
        x + radius,
        getTerrainHeight(x + radius, z) + pillarHeight * 0.5,
        z,
      );
      rightPillar.castShadow = true;
      rightPillar.receiveShadow = true;

      const crown = new THREE.Mesh(archGeometry, material);
      crown.position.set(
        x,
        getTerrainHeight(x, z) + pillarHeight,
        z,
      );
      crown.castShadow = true;
      crown.receiveShadow = true;

      world.add(leftPillar, rightPillar, crown);
    };

    addSculpturalBuilding(
      3.9,
      4.2,
      2.3,
      -5.4,
      -2.6,
      roseStoneMaterial,
      0.06,
    );
    addSculpturalBuilding(
      3.1,
      3.4,
      2.1,
      5.2,
      -11.8,
      paleStoneMaterial,
      0.12,
    );
    addSculpturalBuilding(
      2.5,
      2.7,
      1.8,
      -4.8,
      -19.2,
      mauveStoneMaterial,
      -0.02,
    );
    addArch(0, -6.2, 1.8, 5.1, paleStoneMaterial);
    addArch(3.6, -22, 1.35, 3.9, roseStoneMaterial);

    const plinthGeometry = new THREE.CylinderGeometry(
      1.55,
      1.8,
      0.38,
      48,
      1,
    );
    this.geometries.push(plinthGeometry);

    const plinth = new THREE.Mesh(plinthGeometry, mauveStoneMaterial);
    plinth.position.set(
      0.1,
      getTerrainHeight(0.1, -8.8) + 0.2,
      -8.8,
    );
    plinth.scale.set(1, 1, 0.76);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    world.add(plinth);

    const hillGeometry = new THREE.IcosahedronGeometry(1, 4);
    this.geometries.push(hillGeometry);

    const farHills: Array<{
      position: [number, number, number];
      scale: [number, number, number];
    }> = [
      { position: [-10.5, 0.15, -29], scale: [5.6, 2.5, 8] },
      { position: [10.2, 0.12, -31], scale: [6.4, 2.8, 7] },
      { position: [0, 0.05, -38], scale: [11, 3.3, 5.5] },
    ];

    for (const hillData of farHills) {
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(...hillData.position);
      hill.scale.set(...hillData.scale);
      hill.receiveShadow = true;
      world.add(hill);
    }

    const waterGeometry = new THREE.PlaneGeometry(
      16.4,
      40,
      ...this.quality.waterSegments,
    );
    this.geometries.push(waterGeometry);

    this.waterMaterial = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouseUv: { value: new THREE.Vector2(0.5, 0.5) },
        uPointerVelocity: { value: new THREE.Vector2() },
        uPointerValid: { value: 0 },
        uHold: { value: 0 },
        uHoldTime: { value: 0 },
        uDeepColor: { value: new THREE.Color("#597a83") },
        uSurfaceColor: { value: new THREE.Color("#b7b8a5") },
        uReflectionMap: { value: this.reflectionTarget.texture },
        uReflectionMatrix: { value: this.reflectionViewProjection },
        uReflectionStrength: { value: 0.24 },
        uDistortionStrength: { value: 0.012 },
      },
    });
    this.materials.push(this.waterMaterial);

    this.water = new THREE.Mesh(waterGeometry, this.waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, 0.16, -9);
    this.water.renderOrder = 2;
    world.add(this.water);

    const grassGeometry = createGrassGeometry();
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#263225",
      emissiveIntensity: 0.22,
      roughness: 0.94,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
    const grassCount = this.quality.grassCount;
    const grass = new THREE.InstancedMesh(
      grassGeometry,
      grassMaterial,
      grassCount,
    );
    const grassRandom = createSeededRandom(87431);
    const grassColors = [
      new THREE.Color("#83916f"),
      new THREE.Color("#a0a47e"),
      new THREE.Color("#b3a887"),
      new THREE.Color("#73866f"),
    ];

    this.geometries.push(grassGeometry);
    this.materials.push(grassMaterial);

    for (let index = 0; index < grassCount; index++) {
      const side = grassRandom() < 0.5 ? -1 : 1;
      const x = side * (8.2 + grassRandom() * 7.6);
      const z = 8 - grassRandom() * 39;
      const scale = 0.55 + grassRandom() * 1.25;

      this.instanceTransform.position.set(
        x,
        getTerrainHeight(x, z) + 0.025,
        z,
      );
      this.instanceTransform.rotation.set(
        0,
        grassRandom() * Math.PI * 2,
        (grassRandom() - 0.5) * 0.1,
      );
      this.instanceTransform.scale.set(
        scale,
        scale,
        scale,
      );
      this.instanceTransform.updateMatrix();
      grass.setMatrixAt(index, this.instanceTransform.matrix);
      grass.setColorAt(
        index,
        grassColors[Math.floor(grassRandom() * grassColors.length)],
      );
    }

    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) {
      grass.instanceColor.needsUpdate = true;
    }
    grass.computeBoundingSphere();
    world.add(grass);

    const dustCount = this.quality.dustCount;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustRandom = createSeededRandom(18291);

    for (let index = 0; index < dustCount; index++) {
      const offset = index * 3;
      dustPositions[offset] = (dustRandom() - 0.5) * 22;
      dustPositions[offset + 1] = 0.45 + dustRandom() * 6.5;
      dustPositions[offset + 2] = 7 - dustRandom() * 39;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    this.geometries.push(dustGeometry);

    const dustMaterial = new THREE.PointsMaterial({
      color: "#f4e1d5",
      size: 0.045,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.materials.push(dustMaterial);
    this.particles = new THREE.Points(dustGeometry, dustMaterial);
    this.scene.add(this.particles);

    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-0.12, 0.2, -0.08, 0.42, 0, 0.52);
    petalShape.bezierCurveTo(0.08, 0.42, 0.12, 0.2, 0, 0);
    const petalGeometry = new THREE.ShapeGeometry(petalShape, 10);
    const petalMaterial = new THREE.MeshPhysicalMaterial({
      color: "#f2c4c1",
      roughness: 0.72,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    });
    const petalCount = this.quality.petalCount;

    this.geometries.push(petalGeometry);
    this.materials.push(petalMaterial);
    this.petals = new THREE.InstancedMesh(
      petalGeometry,
      petalMaterial,
      petalCount,
    );

    const petalRandom = createSeededRandom(7712);

    for (let index = 0; index < petalCount; index++) {
      this.petalStates.push({
        x: (petalRandom() - 0.5) * 19,
        y: 0.7 + petalRandom() * 5.8,
        z: 5 - petalRandom() * 35,
        size: 0.35 + petalRandom() * 0.7,
        speed: 0.12 + petalRandom() * 0.24,
        phase: petalRandom() * Math.PI * 2,
        spin: (petalRandom() - 0.5) * 1.4,
      });
    }

    this.scene.add(this.petals);

    const hemisphere = new THREE.HemisphereLight(
      "#f2dce0",
      "#626b59",
      1.35,
    );
    this.scene.add(hemisphere);

    const ambientLight = new THREE.AmbientLight("#f4d9d4", 0.34);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight("#ffe0ce", 2.05);
    sun.position.set(-7, 11, 7);
    sun.castShadow = this.quality.shadows;
    sun.shadow.mapSize.set(
      this.quality.shadowMapSize,
      this.quality.shadowMapSize,
    );
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 62;
    sun.shadow.bias = -0.00025;
    sun.shadow.radius = 3;
    this.scene.add(sun);

    const skyFill = new THREE.DirectionalLight("#d0c3ea", 0.5);
    skyFill.position.set(6, 5, -11);
    this.scene.add(skyFill);
  }

  update(
    elapsed: number,
    pointerX: number,
    pointerY: number,
    holding: boolean,
    camera: THREE.PerspectiveCamera,
    freezeParticles = false,
  ) {
    const delta = THREE.MathUtils.clamp(
      elapsed - this.lastUpdateTime,
      0,
      0.1,
    );
    const smoothing = 1 - Math.exp(-delta * 8);
    const pointerSmoothing = 1 - Math.exp(-delta * 16);

    if (holding && !this.wasHolding) {
      this.holdStartTime = elapsed;
    }

    this.wasHolding = holding;
    this.holdProgress = THREE.MathUtils.damp(
      this.holdProgress,
      holding ? 1 : 0,
      7,
      delta,
    );

    this.pointerNdc.set(pointerX, pointerY);
    this.pointerRaycaster.setFromCamera(this.pointerNdc, camera);
    const intersection = this.pointerRaycaster.ray.intersectPlane(
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

    if (this.pointerValid > 0) {
      this.targetPointerUv.set(
        this.pointerIntersection.x / 16.4 + 0.5,
        (11 - this.pointerIntersection.z) / 40,
      );
    }

    this.pointerUv.lerp(this.targetPointerUv, pointerSmoothing);

    if (delta > 0) {
      this.pointerUvVelocity
        .subVectors(this.pointerUv, this.previousPointerUv)
        .multiplyScalar(1 / delta);
    } else {
      this.pointerUvVelocity.set(0, 0);
    }

    this.pointerUvVelocity.clampLength(0, 0.8);
    this.previousPointerUv.copy(this.pointerUv);
    this.previousPointerValid +=
      (this.pointerValid - this.previousPointerValid) * smoothing;
    this.lastUpdateTime = elapsed;

    this.waterMaterial.uniforms.uTime.value = elapsed;
    this.waterMaterial.uniforms.uMouseUv.value.copy(this.pointerUv);
    this.waterMaterial.uniforms.uPointerVelocity.value.copy(
      this.pointerUvVelocity,
    );
    this.waterMaterial.uniforms.uPointerValid.value =
      this.previousPointerValid;
    this.waterMaterial.uniforms.uHold.value = this.holdProgress;
    this.waterMaterial.uniforms.uHoldTime.value = Math.max(
      0,
      elapsed - this.holdStartTime,
    );

    if (!freezeParticles || !this.particlesInitialized) {
      this.particles.rotation.y = Math.sin(elapsed * 0.06) * 0.025;
      this.particles.position.y = Math.sin(elapsed * 0.15) * 0.045;

      for (let index = 0; index < this.petalStates.length; index++) {
        const petal = this.petalStates[index];
        const drift = elapsed * petal.speed + petal.phase;

        this.instanceTransform.position.set(
          petal.x + Math.sin(drift * 0.7) * 0.32,
          petal.y + Math.sin(drift) * 0.22,
          petal.z + Math.cos(drift * 0.45) * 0.24,
        );
        this.instanceTransform.rotation.set(
          Math.sin(drift * 0.6) * 0.45,
          drift * petal.spin,
          Math.cos(drift * 0.8) * 0.5,
        );
        this.instanceTransform.scale.setScalar(petal.size);
        this.instanceTransform.updateMatrix();
        this.petals.setMatrixAt(index, this.instanceTransform.matrix);
      }

      this.petals.instanceMatrix.needsUpdate = true;
      this.particlesInitialized = true;
    }
  }

  resizeReflection(
    width: number,
    height: number,
    pixelRatio: number,
  ) {
    const reflectionPixelRatio = Math.min(
      pixelRatio,
      this.quality.maxPixelRatio,
    );
    const targetWidth = THREE.MathUtils.clamp(
      Math.round(width * reflectionPixelRatio * this.quality.reflectionScale),
      64,
      this.quality.maxReflectionSize,
    );
    const targetHeight = THREE.MathUtils.clamp(
      Math.round(height * reflectionPixelRatio * this.quality.reflectionScale),
      64,
      this.quality.maxReflectionSize,
    );

    this.reflectionTarget.setSize(targetWidth, targetHeight);
  }

  renderReflection(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
  ) {
    const waterVisible = this.water.visible;
    const previousRenderTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousShadowMapEnabled =
      renderer.shadowMap.enabled;

    camera.updateMatrixWorld(true);
    camera.getWorldPosition(this.reflectionPosition);
    this.reflectionPosition.y =
      2 * this.water.position.y - this.reflectionPosition.y;

    camera.getWorldDirection(this.reflectionDirection);
    this.reflectionDirection.y *= -1;
    this.reflectionTargetPosition
      .copy(this.reflectionPosition)
      .add(this.reflectionDirection);
    this.reflectionUp.copy(camera.up);
    this.reflectionUp.y *= -1;

    this.reflectionCamera.position.copy(this.reflectionPosition);
    this.reflectionCamera.up.copy(this.reflectionUp);
    this.reflectionCamera.near = camera.near;
    this.reflectionCamera.far = camera.far;
    this.reflectionCamera.fov = camera.fov;
    this.reflectionCamera.zoom = camera.zoom;
    this.reflectionCamera.aspect =
      this.reflectionTarget.width /
      this.reflectionTarget.height;
    this.reflectionCamera.updateProjectionMatrix();
    this.reflectionCamera.lookAt(this.reflectionTargetPosition);
    this.reflectionCamera.updateMatrixWorld(true);

    this.reflectionViewProjection.multiplyMatrices(
      this.reflectionCamera.projectionMatrix,
      this.reflectionCamera.matrixWorldInverse,
    );

    this.water.visible = false;

    try {
      renderer.autoClear = true;
      renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(this.reflectionTarget);
      renderer.clear();
      renderer.render(this.scene, this.reflectionCamera);
    } finally {
      this.water.visible = waterVisible;
      renderer.shadowMap.enabled =
        previousShadowMapEnabled;
      renderer.setRenderTarget(previousRenderTarget);
      renderer.autoClear = previousAutoClear;
    }
  }

  dispose() {
    new Set(this.geometries).forEach((geometry) => geometry.dispose());
    new Set(this.materials).forEach((material) => material.dispose());
    new Set(this.textures).forEach((texture) => texture.dispose());
    this.reflectionTarget.dispose();
  }
}

export default HomeScene;
