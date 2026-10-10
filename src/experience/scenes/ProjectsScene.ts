import * as THREE from "three";
import {
  PROJECT_ITEMS,
  type ProjectFilter,
  type ProjectItem,
} from "../data/projects";
import type { QualitySettings } from "../core/quality";

export {
  PROJECT_FILTERS,
  type ProjectCategory,
  type ProjectFilter,
  type ProjectItem,
} from "../data/projects";

export const PROJECT_SCENE_CONFIG = {
  background: "#f0eeea",
  fogNear: 34,
  fogFar: 62,
  cameraFov: 43,
  cameraNear: 0.1,
  cameraFar: 100,
  cameraZ: -17,
  cameraTargetZ: -27,
  planeZ: -26.5,
  architectureZ: -36,
  floorY: -5.2,
  columnX: [-2.55, 2.55] as const,
  rowGap: 5.25,
  firstRowY: 4.1,
  columnYStagger: [0.18, -0.16] as const,
  imageMaxWidth: 3.75,
  imageMaxHeight: 3.45,
  shadowOffset: [0.055, -0.075, -0.035] as const,
  scrollDistancePerOffset: 20,
  endSectionViewports: 1.15,
  visibleRange: 5.7,
  fadeRange: 1.7,
  minimumResponsiveScale: 0.34,
  responsiveReferenceAspect: 1.48,
  maximumResponsiveScale: 1,
  filterTransitionDuration: 0.48,
  swayAmplitude: 0.012,
  swayFrequency: 0.16,
  columnYaw: 0.009,
  scrollTiltScale: 0.0025,
  maximumScrollTilt: 0.014,
  particles: 150,
  particleWidth: 17,
  particleHeight: 12,
  particleNearZ: -27,
  particleDepth: 13,
  reflectionDepthOffset: 0.035,
} as const;

type ProjectCard = {
  item: ProjectItem;
  group: THREE.Group;
  image: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >;
  shadowMaterial: THREE.MeshBasicMaterial;
  readonly baseY: number;
  targetBaseY: number;
  targetColumn: 0 | 1;
  currentColumn: number;
  transitionFromColumn: number;
  filterOpacity: number;
  currentFilterOpacity: number;
  transitionFromY: number;
  transitionFromOpacity: number;
  phase: number;
  raycastEnabled: boolean;
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

class ProjectsScene {
  public readonly scene: THREE.Scene;

  private readonly gallery = new THREE.Group();

  private readonly architecture = new THREE.Group();

  private readonly projectCards: ProjectCard[] = [];

  private readonly projectRaycastTargets: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >[] = [];

  private readonly projectRaycaster = new THREE.Raycaster();

  private readonly projectPointer = new THREE.Vector2();

  private readonly geometries: THREE.BufferGeometry[] = [];

  private readonly materials: THREE.Material[] = [];

  private readonly textures = new Set<THREE.Texture>();

  private readonly loadedTextures = new Map<string, THREE.Texture>();

  private readonly loadingTextures = new Set<string>();

  private readonly failedTextures = new Set<string>();

  private readonly textureLoader = new THREE.TextureLoader();

  private readonly quality: QualitySettings;

  private readonly particles: THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;

  private transitionStartedAt = 0;

  private transitionStartedScrollDistance = 0;

  private currentFilter: ProjectFilter = "All";

  private lastScrollDistance = 0;

  private disposed = false;

  private viewportAspect: number =
    PROJECT_SCENE_CONFIG.responsiveReferenceAspect;

  private viewportHeightWorld =
    this.calculateViewportHeightWorld();

  constructor(quality: QualitySettings) {
    this.quality = quality;
    const background = new THREE.Color(
      PROJECT_SCENE_CONFIG.background,
    );

    this.scene = new THREE.Scene();
    this.scene.background = background;
    this.scene.fog = new THREE.Fog(
      background,
      PROJECT_SCENE_CONFIG.fogNear,
      PROJECT_SCENE_CONFIG.fogFar,
    );

    this.scene.add(this.architecture, this.gallery);
    this.createArchitecture();
    this.createProjects(PROJECT_ITEMS);

    this.particles = this.createParticles();
    this.scene.add(this.particles);
  }

  private createArchitecture() {
    const wallGeometry = new THREE.PlaneGeometry(38, 28);
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: "#e8e5e0",
      side: THREE.DoubleSide,
    });

    this.geometries.push(wallGeometry);
    this.materials.push(wallMaterial);

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(
      0,
      0.7,
      PROJECT_SCENE_CONFIG.architectureZ - 1,
    );
    this.architecture.add(wall);

    const archMaterial = new THREE.MeshBasicMaterial({
      color: "#dedbd5",
      side: THREE.DoubleSide,
    });
    this.materials.push(archMaterial);

    const archPositions = [
      { x: -8.7, y: -0.45, scale: 1.05, depth: -0.1 },
      { x: 0, y: -0.25, scale: 1.4, depth: 0.32 },
      { x: 8.7, y: -0.5, scale: 0.98, depth: 0.04 },
    ] as const;

    for (const archPosition of archPositions) {
      const geometry = this.createArchGeometry();
      this.geometries.push(geometry);

      const arch = new THREE.Mesh(geometry, archMaterial);
      arch.position.set(
        archPosition.x,
        archPosition.y,
        PROJECT_SCENE_CONFIG.architectureZ + archPosition.depth,
      );
      arch.scale.setScalar(archPosition.scale);
      this.architecture.add(arch);
    }

    const columnGeometry = new THREE.CylinderGeometry(
      0.16,
      0.19,
      9.2,
      20,
      1,
    );
    const columnPositions = [-11.1, -5.4, 5.4, 11.1] as const;
    this.geometries.push(columnGeometry);

    for (const x of columnPositions) {
      const column = new THREE.Mesh(columnGeometry, archMaterial);
      column.position.set(
        x,
        -0.45,
        PROJECT_SCENE_CONFIG.architectureZ + 0.55,
      );
      this.architecture.add(column);
    }

    const floorGeometry = new THREE.PlaneGeometry(42, 40);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: "#e9e6e1",
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    this.geometries.push(floorGeometry);
    this.materials.push(floorMaterial);

    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      0,
      PROJECT_SCENE_CONFIG.floorY,
      PROJECT_SCENE_CONFIG.architectureZ + 5,
    );
    this.architecture.add(floor);
  }

  private createArchGeometry() {
    const width = 5.6;
    const height = 7.2;
    const springY = height * 0.47;
    const outerRadius = width * 0.5;
    const innerWidth = width * 0.58;
    const innerRadius = innerWidth * 0.5;
    const shape = new THREE.Shape();

    shape.moveTo(-width * 0.5, -height * 0.5);
    shape.lineTo(-width * 0.5, springY);
    shape.absarc(0, springY, outerRadius, Math.PI, 0, false);
    shape.lineTo(width * 0.5, -height * 0.5);
    shape.closePath();

    const opening = new THREE.Path();
    opening.moveTo(-innerWidth * 0.5, -height * 0.5);
    opening.lineTo(-innerWidth * 0.5, springY);
    opening.absarc(0, springY, innerRadius, Math.PI, 0, false);
    opening.lineTo(innerWidth * 0.5, -height * 0.5);
    opening.closePath();
    shape.holes.push(opening);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      curveSegments: 24,
    });

    geometry.translate(0, 0, -0.16);
    return geometry;
  }

  private createProjects(projects: ProjectItem[]) {
    for (let index = 0; index < projects.length; index++) {
      const item = projects[index];
      const row = Math.floor(index / 2);
      const baseY =
        PROJECT_SCENE_CONFIG.firstRowY -
        row * PROJECT_SCENE_CONFIG.rowGap +
        PROJECT_SCENE_CONFIG.columnYStagger[item.column];

      const width = Math.min(
        PROJECT_SCENE_CONFIG.imageMaxWidth,
        PROJECT_SCENE_CONFIG.imageMaxHeight * item.aspectRatio,
      );
      const height = width / item.aspectRatio;
      const imageGeometry = new THREE.PlaneGeometry(width, height);
      const imageMaterial = new THREE.MeshBasicMaterial({
        color: "#d8d5d0",
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      const image = new THREE.Mesh(imageGeometry, imageMaterial);
      image.position.z = PROJECT_SCENE_CONFIG.reflectionDepthOffset;

      const shadowGeometry = new THREE.PlaneGeometry(
        width + 0.1,
        height + 0.1,
      );
      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: "#706b65",
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.position.set(
        ...PROJECT_SCENE_CONFIG.shadowOffset,
      );

      const group = new THREE.Group();
      group.position.set(
        PROJECT_SCENE_CONFIG.columnX[item.column],
        baseY,
        PROJECT_SCENE_CONFIG.planeZ,
      );
      group.add(shadow, image);
      this.gallery.add(group);

      this.geometries.push(imageGeometry, shadowGeometry);
      this.materials.push(imageMaterial, shadowMaterial);
      this.projectCards.push({
        item,
        group,
        image,
        shadowMaterial,
        baseY,
        targetBaseY: baseY,
        targetColumn: item.column,
        currentColumn: item.column,
        transitionFromColumn: item.column,
        filterOpacity: 1,
        currentFilterOpacity: 1,
        transitionFromY: baseY,
        transitionFromOpacity: 1,
        phase: index * 0.61,
        raycastEnabled: false,
      });
    }
  }

  private requestProjectTexture(path: string) {
    const loadedTexture = this.loadedTextures.get(path);
    if (loadedTexture) {
      this.applyProjectTexture(path, loadedTexture);
      return;
    }
    if (
      this.loadingTextures.has(path) ||
      this.failedTextures.has(path)
    ) return;
    this.loadingTextures.add(path);
    this.loadingTextures.add(path);
    const texture = this.textureLoader.load(
      path,
      (completedTexture) => {
        this.loadingTextures.delete(path);
        if (this.disposed) {
          completedTexture.dispose();
          return;
        }

        completedTexture.colorSpace = THREE.SRGBColorSpace;
        completedTexture.minFilter = THREE.LinearFilter;
        completedTexture.magFilter = THREE.LinearFilter;
        completedTexture.generateMipmaps = false;
        this.loadedTextures.set(path, completedTexture);
        this.applyProjectTexture(path, completedTexture);
      },
      undefined,
      (error) => {
        this.loadingTextures.delete(path);
        if (!this.disposed) {
          this.failedTextures.add(path);
          console.error(
            `Unable to load project placeholder "${path}".`,
            error,
          );
        }
      },
    );
    this.textures.add(texture);
  }

  private applyProjectTexture(path: string, texture: THREE.Texture) {
    for (const card of this.projectCards) {
      if (card.item.media === path && card.image.material.map !== texture) {
        card.image.material.map = texture;
        card.image.material.needsUpdate = true;
      }
    }
  }

  private createParticles() {
    const count = this.quality.projectParticles;
    const positions = new Float32Array(count * 3);
    const random = createSeededRandom(41827);

    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      positions[offset] =
        (random() - 0.5) * PROJECT_SCENE_CONFIG.particleWidth;
      positions[offset + 1] =
        (random() - 0.5) * PROJECT_SCENE_CONFIG.particleHeight;
      positions[offset + 2] =
        PROJECT_SCENE_CONFIG.particleNearZ -
        random() * PROJECT_SCENE_CONFIG.particleDepth;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    const material = new THREE.PointsMaterial({
      color: "#a9a49e",
      size: 0.018,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.geometries.push(geometry);
    this.materials.push(material);

    return new THREE.Points(geometry, material);
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      return;
    }

    this.viewportAspect = width / height;
  }

  private calculateViewportHeightWorld() {
    const viewDepth = Math.abs(
      PROJECT_SCENE_CONFIG.cameraZ -
        PROJECT_SCENE_CONFIG.planeZ,
    );
    return (
      2 *
      viewDepth *
      Math.tan(
        THREE.MathUtils.degToRad(
          PROJECT_SCENE_CONFIG.cameraFov / 2,
        ),
      )
    );
  }

  getProjectsMaxOffset(filter = this.currentFilter): number {
    const filteredCards = this.projectCards.filter(
      ({ item }) =>
        filter === "All" ||
        item.categories.includes(filter),
    );
    if (filteredCards.length === 0) return 0;

    const rows = Math.ceil(filteredCards.length / 2);
    const lastRowCards = filteredCards.slice(-2);
    const firstLastRowIndex =
      filteredCards.length - lastRowCards.length;
    const responsiveScale = THREE.MathUtils.clamp(
      this.viewportAspect /
        PROJECT_SCENE_CONFIG.responsiveReferenceAspect,
      PROJECT_SCENE_CONFIG.minimumResponsiveScale,
      PROJECT_SCENE_CONFIG.maximumResponsiveScale,
    );
    const lastRowCardExtent = Math.max(
      ...lastRowCards.map(({ item }, index) => {
        const column =
          filter === "All"
            ? item.column
            : ((firstLastRowIndex + index) & 1) as 0 | 1;
        const width = Math.min(
          PROJECT_SCENE_CONFIG.imageMaxWidth,
          PROJECT_SCENE_CONFIG.imageMaxHeight * item.aspectRatio,
        );
        const halfHeight =
          (width / item.aspectRatio) * responsiveScale * 0.5;
        return (
          halfHeight -
          PROJECT_SCENE_CONFIG.columnYStagger[column]
        );
      }),
    );
    const lastRowY =
      PROJECT_SCENE_CONFIG.firstRowY -
      (rows - 1) * PROJECT_SCENE_CONFIG.rowGap;
    const finalCardExitDistance =
      this.viewportHeightWorld / 2 +
      lastRowCardExtent -
      lastRowY;
    const reservedEndSectionDistance =
      this.viewportHeightWorld *
      PROJECT_SCENE_CONFIG.endSectionViewports;

    return (
      (finalCardExitDistance + reservedEndSectionDistance) /
      PROJECT_SCENE_CONFIG.scrollDistancePerOffset
    );
  }

  getProjectCount() {
    return this.projectCards.length;
  }

  getProjectRowCount(filter = this.currentFilter) {
    const visibleCount = this.projectCards.filter(
      ({ item }) =>
        filter === "All" ||
        item.categories.includes(filter),
    ).length;
    return Math.ceil(visibleCount / 2);
  }

  getEndSectionProgress(projectsOffset: number): number {
    const maxOffset = this.getProjectsMaxOffset();
    const totalDistance =
      maxOffset * PROJECT_SCENE_CONFIG.scrollDistancePerOffset;
    const reservedEndSectionDistance =
      this.viewportHeightWorld *
      PROJECT_SCENE_CONFIG.endSectionViewports;
    const endSectionStartDistance =
      totalDistance - reservedEndSectionDistance;
    const distance =
      projectsOffset * PROJECT_SCENE_CONFIG.scrollDistancePerOffset;

    return THREE.MathUtils.smoothstep(
      distance,
      endSectionStartDistance,
      totalDistance,
    );
  }

  isProjectAt(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    viewport: DOMRect,
  ): boolean {
    return this.getProjectAt(clientX, clientY, camera, viewport) !== null;
  }

  getProjectAt(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    viewport: DOMRect,
  ): ProjectItem | null {
    if (
      viewport.width <= 0 ||
      viewport.height <= 0
    ) {
      return null;
    }

    this.projectPointer.set(
      ((clientX - viewport.left) / viewport.width) * 2 - 1,
      -((clientY - viewport.top) / viewport.height) * 2 + 1,
    );
    this.projectRaycaster.setFromCamera(
      this.projectPointer,
      camera,
    );

    const intersections = this.projectRaycaster.intersectObjects(
      this.projectRaycastTargets,
      false,
    );
    const hitImage = intersections[0]?.object;
    if (!hitImage) return null;
    for (const card of this.projectCards) {
      if (card.image === hitImage) return card.item;
    }
    return null;
  }

  setFilter(filter: ProjectFilter, elapsed: number) {
    if (filter === this.currentFilter) {
      return;
    }

    this.currentFilter = filter;
    this.transitionStartedAt = elapsed;
    this.transitionStartedScrollDistance =
      this.lastScrollDistance;

    const filteredCards = this.projectCards.filter(
      ({ item }) =>
        filter === "All" ||
        item.categories.includes(filter),
    );
    for (const card of this.projectCards) {
      card.transitionFromY = card.group.position.y;
      card.transitionFromOpacity =
        card.currentFilterOpacity;
      card.transitionFromColumn = card.currentColumn;
      card.targetBaseY =
        filter === "All"
          ? card.baseY
          : card.targetBaseY;
      card.targetColumn =
        filter === "All"
          ? card.item.column
          : card.targetColumn;
      card.filterOpacity = 0;
    }

    filteredCards.forEach((card, index) => {
      const column = (index & 1) as 0 | 1;
      const row = Math.floor(index / 2);

      card.targetColumn = column;
      card.targetBaseY =
        PROJECT_SCENE_CONFIG.firstRowY -
        row * PROJECT_SCENE_CONFIG.rowGap +
        PROJECT_SCENE_CONFIG.columnYStagger[column];
      card.filterOpacity = 1;
    });
  }

  update(
    elapsed: number,
    projectsOffset: number,
    scrollVelocity: number,
    freezeParticles = false,
  ) {
    const responsiveScale = THREE.MathUtils.clamp(
      this.viewportAspect /
        PROJECT_SCENE_CONFIG.responsiveReferenceAspect,
      PROJECT_SCENE_CONFIG.minimumResponsiveScale,
      PROJECT_SCENE_CONFIG.maximumResponsiveScale,
    );
    const scrollDistance =
      projectsOffset *
      PROJECT_SCENE_CONFIG.scrollDistancePerOffset;
    this.lastScrollDistance = scrollDistance;

    const transitionProgress = THREE.MathUtils.clamp(
      (elapsed - this.transitionStartedAt) /
        PROJECT_SCENE_CONFIG.filterTransitionDuration,
      0,
      1,
    );
    const transitionEase = THREE.MathUtils.smoothstep(
      transitionProgress,
      0,
      1,
    );

    const edgeFadeStart = PROJECT_SCENE_CONFIG.visibleRange;
    const edgeFadeEnd =
      edgeFadeStart + PROJECT_SCENE_CONFIG.fadeRange;
    const scrollTilt = THREE.MathUtils.clamp(
      scrollVelocity * PROJECT_SCENE_CONFIG.scrollTiltScale,
      -PROJECT_SCENE_CONFIG.maximumScrollTilt,
      PROJECT_SCENE_CONFIG.maximumScrollTilt,
    );

    for (const card of this.projectCards) {
      const targetY = card.targetBaseY + scrollDistance;
      const scrollDelta =
        scrollDistance -
        this.transitionStartedScrollDistance;
      const fromY = card.transitionFromY + scrollDelta;
      const y = THREE.MathUtils.lerp(
        fromY,
        targetY,
        transitionEase,
      );
      const filterOpacity = THREE.MathUtils.lerp(
        card.transitionFromOpacity,
        card.filterOpacity,
        transitionEase,
      );
      const column = THREE.MathUtils.lerp(
        card.transitionFromColumn,
        card.targetColumn,
        transitionEase,
      );
      const x = THREE.MathUtils.lerp(
        PROJECT_SCENE_CONFIG.columnX[0],
        PROJECT_SCENE_CONFIG.columnX[1],
        column,
      );
      card.currentColumn = column;
      card.currentFilterOpacity = filterOpacity;
      const distanceFromCenter = Math.abs(y);
      const edgeOpacity =
      1 -
      THREE.MathUtils.smoothstep(
        distanceFromCenter,
        edgeFadeStart,
        edgeFadeEnd,
      );
      const opacity = edgeOpacity * filterOpacity;
      card.group.visible = opacity > 0.001;

      const shouldRaycast = opacity > 0.2;
      if (shouldRaycast !== card.raycastEnabled) {
        card.raycastEnabled = shouldRaycast;
        const targetIndex = this.projectRaycastTargets.indexOf(card.image);
        if (shouldRaycast && targetIndex === -1) {
          this.projectRaycastTargets.push(card.image);
        } else if (!shouldRaycast && targetIndex !== -1) {
          this.projectRaycastTargets.splice(targetIndex, 1);
        }
      }
      if (
        Math.abs(y) <=
        PROJECT_SCENE_CONFIG.visibleRange +
          PROJECT_SCENE_CONFIG.fadeRange &&
        !this.loadedTextures.has(card.item.media)
      ) {
        this.requestProjectTexture(card.item.media);
      }

      card.group.position.set(
        x * responsiveScale +
          Math.sin(
            elapsed * PROJECT_SCENE_CONFIG.swayFrequency +
              card.phase,
          ) *
            PROJECT_SCENE_CONFIG.swayAmplitude,
        y,
        PROJECT_SCENE_CONFIG.planeZ,
      );
      card.group.scale.setScalar(responsiveScale);
      card.group.rotation.set(
        THREE.MathUtils.clamp(
          -y * 0.0012,
          -0.009,
          0.009,
        ),
        card.item.column === 0
          ? PROJECT_SCENE_CONFIG.columnYaw
          : -PROJECT_SCENE_CONFIG.columnYaw,
        scrollTilt,
      );

      card.image.material.opacity = opacity;
      card.shadowMaterial.opacity = 0.075 * opacity;
      card.image.position.y =
        Math.sin(elapsed * 0.22 + card.phase) * 0.008;
    }

    this.architecture.position.y = Math.sin(elapsed * 0.055) * 0.012;
    if (!freezeParticles) {
      this.particles.rotation.y = Math.sin(elapsed * 0.03) * 0.009;
      this.particles.position.y = Math.sin(elapsed * 0.12) * 0.025;
    }
  }

  dispose() {
    this.disposed = true;

    new Set(this.geometries).forEach((geometry) => geometry.dispose());
    new Set(this.materials).forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
    this.loadedTextures.clear();
    this.loadingTextures.clear();
    this.failedTextures.clear();
    this.projectRaycastTargets.length = 0;
  }
}

export default ProjectsScene;
