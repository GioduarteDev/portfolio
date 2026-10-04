import * as THREE from "three";

class ProjectsScene {
  public readonly scene: THREE.Scene;

  private readonly projectsGroup: THREE.Group;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  constructor() {
    // =====================================================
    // SCENE
    // =====================================================

    this.scene = new THREE.Scene();

    const backgroundColor = new THREE.Color("#071333");

    this.scene.background = backgroundColor;

    this.scene.fog = new THREE.Fog(
      backgroundColor,
      4,
      24,
    );

    // =====================================================
    // PROJECTS GROUP
    // =====================================================

    this.projectsGroup = new THREE.Group();

    this.scene.add(this.projectsGroup);

    // =====================================================
    // LIGHT
    // =====================================================

    const ambientLight = new THREE.AmbientLight(
      "#7f9ecf",
      1.2,
    );

    this.scene.add(ambientLight);

    // =====================================================
    // TEMPORARY PROJECT DATA
    //
    // Isso ainda será substituído pelos projetos
    // visuais da Unseen.
    // =====================================================

    const projects = [
      {
        number: "01",
        title: "Selected Project",
        color: "#c9a1aa",
      },
      {
        number: "02",
        title: "Digital Experience",
        color: "#8792ae",
      },
      {
        number: "03",
        title: "Brand World",
        color: "#b98e83",
      },
      {
        number: "04",
        title: "Motion Project",
        color: "#9b8d9f",
      },
      {
        number: "05",
        title: "Experimental Work",
        color: "#af9b88",
      },
      {
        number: "06",
        title: "Unseen Project",
        color: "#8b9da0",
      },
    ];

    // =====================================================
    // CREATE PROJECT CARDS
    // =====================================================

    projects.forEach((project, index) => {
      const texture = this.createProjectTexture(
        project.number,
        project.title,
        project.color,
      );

      this.textures.push(texture);

      const geometry = new THREE.PlaneGeometry(
        3.6,
        2.3,
      );

      this.geometries.push(geometry);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      this.materials.push(material);

      const card = new THREE.Mesh(
        geometry,
        material,
      );

      const side = index % 2 === 0 ? -1 : 1;

      const baseY =
        -1 + (index % 3) * 0.18;

      card.position.set(
        side * 2.15,
        baseY,
        -4 - index * 4.2,
      );

      card.rotation.y =
        side * -0.12;

      card.userData.baseY = baseY;

      card.userData.phase =
        index * 0.8;

      this.projectsGroup.add(card);
    });
  }

  // =====================================================
  // CREATE PROJECT TEXTURE
  // =====================================================

  private createProjectTexture(
    number: string,
    title: string,
    color: string,
  ) {
    const canvas = document.createElement("canvas");

    canvas.width = 1200;
    canvas.height = 760;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Não foi possível criar o canvas do projeto.",
      );
    }

    // Fundo

    context.fillStyle = color;

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // Número

    context.fillStyle =
      "rgba(255,255,255,0.92)";

    context.font =
      "28px Arial";

    context.fillText(
      number,
      45,
      55,
    );

    // Título

    context.font =
      "56px Arial";

    context.fillText(
      title,
      45,
      665,
    );

    // Marca

    context.fillStyle =
      "rgba(255,255,255,0.55)";

    context.font =
      "22px Arial";

    context.fillText(
      "UNSEEN STUDIO",
      45,
      710,
    );

    // Transforma canvas em textura Three.js

    const texture = new THREE.CanvasTexture(
      canvas,
    );

    texture.colorSpace =
      THREE.SRGBColorSpace;

    texture.needsUpdate = true;

    return texture;
  }

  // =====================================================
  // UPDATE
  //
  // Executado a cada frame.
  // =====================================================

  update(
    elapsed: number,
    progress: number,
    velocity: number,
  ) {
    this.projectsGroup.children.forEach(
      (child) => {
        const mesh = child as THREE.Mesh;

        const baseY =
          mesh.userData.baseY as number;

        const phase =
          mesh.userData.phase as number;

        // Pequeno movimento flutuante

        mesh.position.y =
          baseY +
          Math.sin(
            elapsed * 0.45 +
              phase,
          ) *
            0.05;

        mesh.rotation.z =
          Math.sin(
            elapsed * 0.22 +
              phase,
          ) *
          0.008;
      },
    );

    // Reage levemente à velocidade do scroll

    this.projectsGroup.rotation.z +=
      (
        velocity * 0.9 -
        this.projectsGroup.rotation.z
      ) *
      0.04;

    // Movimento geral

    this.projectsGroup.position.y =
      -progress * 0.15;
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  dispose() {
    this.geometries.forEach(
      (geometry) => {
        geometry.dispose();
      },
    );

    this.materials.forEach(
      (material) => {
        material.dispose();
      },
    );

    this.textures.forEach(
      (texture) => {
        texture.dispose();
      },
    );
  }
}

export default ProjectsScene;