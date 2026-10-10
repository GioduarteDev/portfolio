import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CONTACT_SCENE_CONFIG = {
  background: "#e9e8e1",
  fogNear: 24,
  fogFar: 62,
  floorSize: 120,
  floorZ: -25,
  architectureZ: -8,
  modelScale: 1,
} as const;

class ContactScene {
  readonly scene: THREE.Scene;

  private readonly ownedMaterials = new Set<THREE.Material>();

  private readonly ownedGeometries = new Set<THREE.BufferGeometry>();

  private readonly keyLight: THREE.DirectionalLight;

  private loadedModel: THREE.Group | null = null;

  private disposed = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONTACT_SCENE_CONFIG.background);
    this.scene.fog = new THREE.Fog(
      CONTACT_SCENE_CONFIG.background,
      CONTACT_SCENE_CONFIG.fogNear,
      CONTACT_SCENE_CONFIG.fogFar,
    );

    const hemisphere = new THREE.HemisphereLight(
      0xf8f5eb,
      0xb8b6a9,
      1.45,
    );
    this.scene.add(hemisphere);

    this.keyLight = new THREE.DirectionalLight(0xfff6e9, 2.2);
    this.keyLight.position.set(-5, 9, 5);
    this.scene.add(this.keyLight);

    const fillLight = new THREE.DirectionalLight(0xc8d9d2, 0.65);
    fillLight.position.set(6, 3, -10);
    this.scene.add(fillLight);

    this.addArchitecture();
  }

  private addArchitecture() {
    const paleStone = new THREE.MeshStandardMaterial({
      color: 0xd6d4ca,
      roughness: 0.88,
    });
    const warmStone = new THREE.MeshStandardMaterial({
      color: 0xe5e1d7,
      roughness: 0.82,
    });
    this.ownedMaterials.add(paleStone);
    this.ownedMaterials.add(warmStone);

    const floorGeometry = new THREE.PlaneGeometry(
      CONTACT_SCENE_CONFIG.floorSize,
      CONTACT_SCENE_CONFIG.floorSize,
    );
    floorGeometry.rotateX(-Math.PI / 2);
    this.ownedGeometries.add(floorGeometry);

    const floor = new THREE.Mesh(floorGeometry, warmStone);
    floor.position.set(0, -2.2, CONTACT_SCENE_CONFIG.floorZ);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallGeometry = new THREE.BoxGeometry(30, 12, 1.4);
    this.ownedGeometries.add(wallGeometry);
    const rearWall = new THREE.Mesh(wallGeometry, paleStone);
    rearWall.position.set(0, 3.8, CONTACT_SCENE_CONFIG.architectureZ - 13);
    rearWall.receiveShadow = true;
    this.scene.add(rearWall);

    const columnGeometry = new THREE.CylinderGeometry(0.42, 0.58, 9, 20, 1);
    this.ownedGeometries.add(columnGeometry);
    for (const x of [-7.5, -3.8, 3.8, 7.5]) {
      const column = new THREE.Mesh(columnGeometry, warmStone);
      column.position.set(x, 2.3, CONTACT_SCENE_CONFIG.architectureZ);
      column.castShadow = true;
      column.receiveShadow = true;
      this.scene.add(column);
    }

    const lintelGeometry = new THREE.BoxGeometry(16.5, 0.75, 1.5);
    this.ownedGeometries.add(lintelGeometry);
    const lintel = new THREE.Mesh(lintelGeometry, paleStone);
    lintel.position.set(0, 7, CONTACT_SCENE_CONFIG.architectureZ);
    lintel.castShadow = true;
    this.scene.add(lintel);

    const plinthGeometry = new THREE.BoxGeometry(5.8, 0.28, 3.1);
    this.ownedGeometries.add(plinthGeometry);
    const plinth = new THREE.Mesh(plinthGeometry, paleStone);
    plinth.position.set(-5.1, -1.98, -3.5);
    plinth.castShadow = true;
    this.scene.add(plinth);

    const sculptureGeometry = new THREE.TorusGeometry(1.15, 0.19, 14, 64);
    this.ownedGeometries.add(sculptureGeometry);
    const sculpture = new THREE.Mesh(sculptureGeometry, warmStone);
    sculpture.position.set(-5.1, -0.5, -3.5);
    sculpture.rotation.set(0.3, 0.1, 0.25);
    sculpture.castShadow = true;
    this.scene.add(sculpture);
  }

  update(elapsed: number) {
    if (this.loadedModel) {
      this.loadedModel.rotation.y =
        Math.sin(elapsed * 0.12) * 0.018;
    }

    this.keyLight.position.x = -5 + Math.sin(elapsed * 0.08) * 0.35;
  }

  async loadAuthorizedModel(url: string): Promise<void> {
    if (this.disposed) {
      throw new Error("Cannot load a model into a disposed ContactScene.");
    }

    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;

    if (this.disposed) {
      this.disposeObject(model);
      return;
    }

    model.scale.setScalar(CONTACT_SCENE_CONFIG.modelScale);
    this.scene.add(model);
    this.loadedModel = model;
  }

  private disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      geometries.add(object.geometry);
      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of meshMaterials) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) {
            textures.add(value);
          }
        }
      }
    });

    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    if (this.loadedModel) {
      this.scene.remove(this.loadedModel);
      this.disposeObject(this.loadedModel);
      this.loadedModel = null;
    }

    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
    this.scene.clear();
  }
}

export default ContactScene;
