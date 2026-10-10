import * as THREE from "three";
import {
  PROJECT_ITEMS,
  type ProjectItem,
} from "../data/projects";
import type { QualitySettings } from "../core/quality";

export type WorldSelection = Pick<
  ProjectItem,
  "id" | "slug" | "title" | "categories" | "year"
>;

export const WORLD_SCENE_CONFIG = {
  background: "#e8e7e0",
  cameraFov: 42,
  cameraZ: 25,
  cameraNear: 0.1,
  cameraFar: 180,
  wrapWidth: 72,
  wrapHeight: 48,
  gridSize: 120,
  gridStep: 2,
  dragSensitivity: 1,
  dampingRate: 8,
} as const;

const wrapAround = (value: number, length: number) =>
  THREE.MathUtils.euclideanModulo(value + length / 2, length) -
  length / 2;

class WorldScene {
  readonly scene: THREE.Scene;

  readonly items: WorldSelection[];

  readonly pickTargets: THREE.Object3D[] = [];

  private readonly grid: THREE.LineSegments;

  private readonly nodes: Array<{
    group: THREE.Group;
    pickTarget: THREE.Object3D;
    baseX: number;
    baseY: number;
  }> = [];

  private readonly raycaster = new THREE.Raycaster();

  private readonly raycastPointer = new THREE.Vector2();

  private readonly geometries = new Set<THREE.BufferGeometry>();

  private readonly materials = new Set<THREE.Material>();

  private readonly textures = new Set<THREE.Texture>();

  private readonly quality: QualitySettings;

  constructor(quality: QualitySettings) {
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(WORLD_SCENE_CONFIG.background);
    this.items = PROJECT_ITEMS.slice(0, this.quality.worldProjectCount)
      .map(({ id, slug, title, categories, year }) => ({
        id,
        slug,
        title,
        categories,
        year,
      }));

    const ambient = new THREE.HemisphereLight(0xffffff, 0xb2b0a6, 1.65);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfffcf2, 1.4);
    key.position.set(-7, 10, 18);
    this.scene.add(key);

    this.grid = this.createGrid();
    this.scene.add(this.grid);
    this.createNodes();
  }

  private createGrid() {
    const positions: number[] = [];
    const halfSize = WORLD_SCENE_CONFIG.gridSize / 2;
    const step = WORLD_SCENE_CONFIG.gridStep;

    for (let coordinate = -halfSize; coordinate <= halfSize; coordinate += step) {
      positions.push(
        coordinate, -halfSize, -1.1,
        coordinate, halfSize, -1.1,
        -halfSize, coordinate, -1.1,
        halfSize, coordinate, -1.1,
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0x89877f,
      transparent: true,
      opacity: 0.16,
    });
    this.geometries.add(geometry);
    this.materials.add(material);

    return new THREE.LineSegments(geometry, material);
  }

  private makeLabel(title: string) {
    const canvas = document.createElement("canvas");
    canvas.width = this.quality.labelTextureSize;
    canvas.height = Math.round(this.quality.labelTextureSize * 0.1875);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create a World label canvas.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(248, 247, 241, 0.94)";
    context.beginPath();
    context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 9);
    context.fill();
    context.fillStyle = "#292a27";
    context.font = `${Math.round(canvas.height * 0.42)}px Arial, Helvetica, sans-serif`;
    context.textBaseline = "middle";
    context.fillText(title, 24, canvas.height / 2, canvas.width - 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.textures.add(texture);
    this.materials.add(material);

    const label = new THREE.Sprite(material);
    label.scale.set(3.3, 0.64, 1);
    label.position.set(0, -1.08, 0.1);
    return label;
  }

  private createNodes() {
    const itemCount = this.items.length;
    const columns = 4;
    const rows = Math.ceil(itemCount / columns);
    const colors = [0xc9a79d, 0xa9b8ad, 0xd2c6aa, 0x9daab7];
    const sphereGeometry = new THREE.SphereGeometry(1.15, 20, 14);
    const torusGeometry = new THREE.TorusGeometry(1, 0.055, 8, 56);
    const octahedronGeometry = new THREE.OctahedronGeometry(0.85, 0);
    const boxGeometry = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    this.geometries.add(sphereGeometry);
    this.geometries.add(torusGeometry);
    this.geometries.add(octahedronGeometry);
    this.geometries.add(boxGeometry);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x555b58,
      wireframe: true,
      transparent: true,
      opacity: 0.78,
    });
    this.materials.add(wireMaterial);

    this.items.forEach((item, index) => {
      const group = new THREE.Group();
      const gridIndex = index === 0 ? -1 : index - 1;
      const row = gridIndex < 0
        ? Math.floor(rows / 2)
        : Math.floor(gridIndex / columns);
      const column = gridIndex < 0
        ? (columns - 1) / 2
        : gridIndex % columns;
      const baseX = gridIndex < 0
        ? 0
        : (column - (columns - 1) / 2) * 9.2;
      const baseY = gridIndex < 0
        ? 0
        : ((rows - 1) / 2 - row) * 6.2;

      let pickTarget: THREE.Object3D;
      if (index === 0) {
        const globe = new THREE.Mesh(sphereGeometry, wireMaterial);
        globe.scale.setScalar(1.12);
        group.add(globe);
        pickTarget = globe;

        const equator = new THREE.Mesh(torusGeometry, wireMaterial);
        equator.rotation.x = Math.PI / 2;
        equator.scale.setScalar(1.12);
        group.add(equator);

        const meridian = new THREE.Mesh(torusGeometry, wireMaterial);
        meridian.rotation.y = Math.PI / 2;
        meridian.scale.setScalar(1.12);
        group.add(meridian);
      } else {
        const material = new THREE.MeshStandardMaterial({
          color: colors[index % colors.length],
          roughness: 0.62,
          metalness: 0.04,
        });
        this.materials.add(material);
        const shape = index % 3 === 0
          ? new THREE.Mesh(torusGeometry, material)
          : index % 3 === 1
            ? new THREE.Mesh(octahedronGeometry, material)
            : new THREE.Mesh(boxGeometry, material);
        shape.rotation.set(
          index * 0.17,
          index * 0.29,
          index * 0.11,
        );
        shape.castShadow = true;
        group.add(shape);
        pickTarget = shape;
      }

      pickTarget.userData.worldSelection = item;
      group.add(this.makeLabel(item.title));
      group.position.set(baseX, baseY, -2);
      this.scene.add(group);
      this.nodes.push({ group, pickTarget, baseX, baseY });
      this.pickTargets.push(pickTarget);
    });
  }

  update(elapsed: number, offsetX: number, offsetY: number) {
    const step = WORLD_SCENE_CONFIG.gridStep;
    this.grid.position.set(
      Math.round(offsetX / step) * step,
      Math.round(offsetY / step) * step,
      0,
    );

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      if (!node) continue;

      const x = offsetX + wrapAround(
        node.baseX - offsetX,
        WORLD_SCENE_CONFIG.wrapWidth,
      );
      const y = offsetY + wrapAround(
        node.baseY - offsetY,
        WORLD_SCENE_CONFIG.wrapHeight,
      );

      node.group.position.set(x, y, -2);
      node.group.rotation.z =
        Math.sin(elapsed * 0.18 + index) * 0.025;
      node.pickTarget.scale.setScalar(
        1 + Math.sin(elapsed * 0.35 + index * 0.8) * 0.035,
      );
    }
  }

  getSelectionAt(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    bounds: DOMRect,
  ): WorldSelection | null {
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    this.raycastPointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.raycastPointer, camera);
    const hit = this.raycaster.intersectObjects(this.pickTargets, false)[0];
    return (
      hit?.object.userData.worldSelection as WorldSelection | undefined
    ) ?? null;
  }

  dispose() {
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.textures.clear();
    this.materials.clear();
    this.geometries.clear();
    this.pickTargets.length = 0;
    this.nodes.length = 0;
    this.scene.clear();
  }
}

export default WorldScene;
