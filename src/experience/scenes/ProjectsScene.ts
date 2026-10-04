import * as THREE from "three";

type ProjectConfig = {
  number: string;
  title: string;
  category: string;
  year: string;
  color: string;
};

class ProjectsScene {
  public readonly scene: THREE.Scene;

  private readonly projectsGroup: THREE.Group;

  private readonly particles: THREE.Points;

  private readonly geometries: THREE.BufferGeometry[] = [];

  private readonly materials: THREE.Material[] = [];

  private readonly textures: THREE.Texture[] = [];

  constructor() {
    // =====================================================
    // SCENE
    // =====================================================

    this.scene = new THREE.Scene();

    const backgroundColor =
      new THREE.Color("#071333");

    this.scene.background =
      backgroundColor;

    /*
     * FogExp2 cria uma névoa baseada em profundidade.
     *
     * Isso é importante porque queremos que
     * os projetos pareçam surgir de dentro
     * do espaço.
     */
    this.scene.fog =
      new THREE.FogExp2(
        backgroundColor,
        0.055,
      );

    // =====================================================
    // PROJECTS GROUP
    // =====================================================

    this.projectsGroup =
      new THREE.Group();

    this.scene.add(
      this.projectsGroup,
    );

    // =====================================================
    // PROJECT DATA
    //
    // Esses nomes ainda são placeholders.
    // Depois colocaremos os projetos corretos
    // observados na Unseen.
    // =====================================================

    const projects: ProjectConfig[] = [
      {
        number: "01",
        title: "Selected Project",
        category: "Digital",
        year: "2026",
        color: "#bd919e",
      },

      {
        number: "02",
        title: "Brand Experience",
        category: "Branding",
        year: "2026",
        color: "#7e8d9f",
      },

      {
        number: "03",
        title: "Digital World",
        category: "Digital",
        year: "2025",
        color: "#a9897f",
      },

      {
        number: "04",
        title: "Motion Study",
        category: "Motion",
        year: "2025",
        color: "#85829a",
      },

      {
        number: "05",
        title: "Experimental Work",
        category: "Experiment",
        year: "2025",
        color: "#968b7e",
      },

      {
        number: "06",
        title: "Visual Identity",
        category: "Branding",
        year: "2024",
        color: "#748e8d",
      },

      {
        number: "07",
        title: "Interactive Project",
        category: "Digital",
        year: "2024",
        color: "#a3777c",
      },

      {
        number: "08",
        title: "Unseen Project",
        category: "Motion",
        year: "2024",
        color: "#7e748d",
      },
    ];

    // =====================================================
    // SPATIAL POSITIONS
    //
    // Não usamos uma grade HTML.
    //
    // Cada projeto ocupa um ponto
    // diferente no espaço 3D.
    // =====================================================

    const positions = [
      {
        x: -1.75,
        y: 0.2,
        z: -7.5,
        scale: 1,
      },

      {
        x: 1.9,
        y: -0.55,
        z: -11.5,
        scale: 0.94,
      },

      {
        x: -1.45,
        y: 0.65,
        z: -15.5,
        scale: 1.02,
      },

      {
        x: 2.5,
        y: 0.15,
        z: -16.3,
        scale: 0.96,
      },

      {
        x: -2.25,
        y: -0.8,
        z: -20.4,
        scale: 1.04,
      },

      {
        x: 1.7,
        y: 0.85,
        z: -24.6,
        scale: 0.9,
      },

      {
        x: -1.8,
        y: 0,
        z: -28.8,
        scale: 1,
      },

      {
        x: 2.15,
        y: -0.55,
        z: -33,
        scale: 0.94,
      },
    ];

    // =====================================================
    // CREATE PROJECTS
    // =====================================================

    projects.forEach(
      (project, index) => {
        const texture =
          this.createProjectTexture(
            project,
          );

        this.textures.push(
          texture,
        );

        // -----------------------------------------------
        // CARD GEOMETRY
        // -----------------------------------------------

        const geometry =
          new THREE.PlaneGeometry(
            3.3,
            2.08,
            18,
            12,
          );

        this.geometries.push(
          geometry,
        );

        // -----------------------------------------------
        // MATERIAL
        // -----------------------------------------------

        const material =
          new THREE.MeshBasicMaterial({
            map: texture,

            transparent: true,

            opacity: 0,

            side:
              THREE.DoubleSide,

            /*
             * Importante para transparência
             * e neblina funcionarem melhor.
             */
            depthWrite: false,
          });

        this.materials.push(
          material,
        );

        // -----------------------------------------------
        // MESH
        // -----------------------------------------------

        const card =
          new THREE.Mesh(
            geometry,
            material,
          );

        const position =
          positions[index];

        card.position.set(
          position.x,
          position.y,
          position.z,
        );

        card.scale.setScalar(
          position.scale,
        );

        /*
         * Pequena rotação em direção
         * ao centro.
         */
        card.rotation.y =
          position.x < 0
            ? 0.09
            : -0.09;

        // -----------------------------------------------
        // DATA PARA ANIMAÇÃO
        // -----------------------------------------------

        card.userData.baseX =
          position.x;

        card.userData.baseY =
          position.y;

        card.userData.baseZ =
          position.z;

        card.userData.baseScale =
          position.scale;

        card.userData.phase =
          index * 0.73;

        card.userData.material =
          material;

        this.projectsGroup.add(
          card,
        );
      },
    );

    // =====================================================
    // PARTICLES / DEPTH DUST
    //
    // Ajuda muito a perceber que existe
    // espaço entre câmera e projetos.
    // =====================================================

    const particleCount = 500;

    const positionsArray =
      new Float32Array(
        particleCount * 3,
      );

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      const index = i * 3;

      positionsArray[index] =
        (Math.random() - 0.5) *
        13;

      positionsArray[index + 1] =
        (Math.random() - 0.5) *
        7;

      positionsArray[index + 2] =
        -Math.random() *
        40;
    }

    const particleGeometry =
      new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positionsArray,
        3,
      ),
    );

    this.geometries.push(
      particleGeometry,
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: "#b5bfd1",

        size: 0.025,

        transparent: true,

        opacity: 0.3,

        depthWrite: false,
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
  }

  // =====================================================
  // PROJECT TEXTURE
  //
  // Ainda é uma textura provisória.
  //
  // Mais tarde vamos substituir por
  // imagens reais / materiais muito
  // mais próximos da Unseen.
  // =====================================================

  private createProjectTexture(
    project: ProjectConfig,
  ) {
    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width = 1400;

    canvas.height = 880;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Não foi possível criar a textura do projeto.",
      );
    }

    // ===================================================
    // BACKGROUND
    // ===================================================

    context.fillStyle =
      project.color;

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // ===================================================
    // SUBTLE INNER FRAME
    // ===================================================

    context.strokeStyle =
      "rgba(255,255,255,0.14)";

    context.lineWidth = 2;

    context.strokeRect(
      34,
      34,
      canvas.width - 68,
      canvas.height - 68,
    );

    // ===================================================
    // PROJECT NUMBER
    // ===================================================

    context.fillStyle =
      "rgba(255,255,255,0.90)";

    context.font =
      "26px Arial";

    context.fillText(
      project.number,
      52,
      70,
    );

    // ===================================================
    // META — TOP RIGHT
    // ===================================================

    context.textAlign =
      "right";

    context.fillStyle =
      "rgba(255,255,255,0.65)";

    context.font =
      "22px Arial";

    context.fillText(
      project.category,
      canvas.width - 52,
      65,
    );

    context.fillText(
      project.year,
      canvas.width - 52,
      98,
    );

    // ===================================================
    // BIG TITLE
    // ===================================================

    context.textAlign =
      "left";

    context.fillStyle =
      "rgba(255,255,255,0.95)";

    context.font =
      "56px Arial";

    context.fillText(
      project.title,
      52,
      canvas.height - 100,
    );

    // ===================================================
    // UNSEEN MARK
    // ===================================================

    context.fillStyle =
      "rgba(255,255,255,0.5)";

    context.font =
      "19px Arial";

    context.fillText(
      "UNSEEN STUDIO®",
      52,
      canvas.height - 54,
    );

    // ===================================================
    // THREE TEXTURE
    // ===================================================

    const texture =
      new THREE.CanvasTexture(
        canvas,
      );

    texture.colorSpace =
      THREE.SRGBColorSpace;

    texture.minFilter =
      THREE.LinearFilter;

    texture.magFilter =
      THREE.LinearFilter;

    texture.needsUpdate = true;

    return texture;
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update(
    elapsed: number,
    progress: number,
    velocity: number,
  ) {
    /*
     * Representação aproximada da posição
     * da câmera durante Projects.
     *
     * Serve apenas para calcular
     * profundidade / visibilidade.
     */
    const virtualCameraZ =
      THREE.MathUtils.lerp(
        -4,
        -34,
        progress,
      );

    // ===================================================
    // PROJECTS
    // ===================================================

    this.projectsGroup.children.forEach(
      (child) => {
        const mesh =
          child as THREE.Mesh<
            THREE.PlaneGeometry,
            THREE.MeshBasicMaterial
          >;

        const baseX =
          mesh.userData
            .baseX as number;

        const baseY =
          mesh.userData
            .baseY as number;

        const baseZ =
          mesh.userData
            .baseZ as number;

        const baseScale =
          mesh.userData
            .baseScale as number;

        const phase =
          mesh.userData
            .phase as number;

        /*
         * Valor positivo:
         * card ainda está na frente.
         *
         * Valor negativo:
         * câmera já passou do card.
         */
        const ahead =
          virtualCameraZ -
          baseZ;

        // -----------------------------------------------
        // FADE QUANDO ESTÁ MUITO LONGE
        // -----------------------------------------------

      // Some quando ainda está muito longe.
const farFade =
  1 -
  THREE.MathUtils.smoothstep(
    ahead,
    10,
    14,
  );

// Some ANTES de a câmera encostar no card.
//
// Esse é o pedaço que impede aquele
// zoom gigantesco.
const nearFade =
  THREE.MathUtils.smoothstep(
    ahead,
    1.3,
    2.8,
  );

const visibility =
  THREE.MathUtils.clamp(
    farFade * nearFade,
    0,
    1,
  );

        // -----------------------------------------------
        // OPACITY
        // -----------------------------------------------

        mesh.material.opacity =
          visibility;

        // -----------------------------------------------
        // FLOAT
        // -----------------------------------------------

        mesh.position.x =
          baseX +
          Math.sin(
            elapsed * 0.18 +
              phase,
          ) *
            0.025;

        mesh.position.y =
          baseY +
          Math.sin(
            elapsed * 0.38 +
              phase,
          ) *
            0.055;

        // -----------------------------------------------
        // SCALE
        //
        // Fica sutilmente maior conforme
        // emerge da névoa.
        // -----------------------------------------------

        const animatedScale =
          baseScale *
          (
            0.95 +
            visibility *
              0.05
          );

        mesh.scale.setScalar(
          animatedScale,
        );

        // -----------------------------------------------
        // ROTATION
        // -----------------------------------------------

        const baseRotation =
          baseX < 0
            ? 0.09
            : -0.09;

        mesh.rotation.y =
          baseRotation +
          Math.sin(
            elapsed * 0.13 +
              phase,
          ) *
            0.012;

        mesh.rotation.z =
          Math.sin(
            elapsed * 0.21 +
              phase,
          ) *
          0.006;
      },
    );

    // ===================================================
    // SCROLL VELOCITY RESPONSE
    //
    // A galeria inclina minimamente quando
    // o usuário acelera o scroll.
    // ===================================================

    const targetRotation =
      THREE.MathUtils.clamp(
        velocity * 8,
        -0.028,
        0.028,
      );

    this.projectsGroup.rotation.z +=
      (
        targetRotation -
        this.projectsGroup.rotation.z
      ) *
      0.06;

    // ===================================================
    // PARTICLES
    // ===================================================

    this.particles.rotation.y =
      Math.sin(
        elapsed * 0.035,
      ) *
      0.025;

    this.particles.position.y =
      Math.sin(
        elapsed * 0.12,
      ) *
      0.04;
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

    const uniqueTextures =
      new Set(
        this.textures,
      );

    uniqueTextures.forEach(
      (texture) => {
        texture.dispose();
      },
    );
  }
}

export default ProjectsScene;