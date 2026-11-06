import * as THREE from "three";

/** A persistent water canopy and restrained light shafts establish the gallery
 * as a submerged space after the transition post-process has fully resolved. */
export function createProjectWaterVolume(
  geometries: THREE.BufferGeometry[], materials: THREE.Material[], time: { value: number },
) {
  const group = new THREE.Group();
  group.name = "submerged portfolio water volume";
  const ceilingGeometry = new THREE.PlaneGeometry(65, 70);
  const ceilingMaterial = new THREE.ShaderMaterial({
    name: "underside of the sanctuary sea", transparent: true, depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: time },
    vertexShader: `varying vec3 vWaterWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWaterWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `uniform float uTime; varying vec3 vWaterWorld;
      void main() {
        vec2 p = vWaterWorld.xz * 0.55;
        float fold = sin(p.x + sin(p.y + uTime * 0.08))
          + cos(p.y * 1.3 - sin(p.x - uTime * 0.06));
        float caustic = pow(max(0.0, 1.0 - abs(fold) * 0.7), 8.0);
        gl_FragColor = vec4(mix(vec3(0.39, 0.65, 0.70), vec3(0.85, 0.88, 0.83), caustic), 0.22);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.name = "water surface above the revealed projects";
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.set(0, 6.5, -32);
  group.add(ceiling);
  const shaftGeometry = new THREE.PlaneGeometry(1.8, 17);
  const shaftMaterial = new THREE.ShaderMaterial({
    name: "submerged soft light shafts", transparent: true, depthWrite: false,
    side: THREE.DoubleSide, uniforms: { uTime: time },
    vertexShader: `varying vec2 vUv; void main() {
      vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main() {
        float edge = pow(max(0.0, sin(vUv.x * 3.14159)), 3.0);
        float fade = sin(vUv.y * 3.14159) * (0.8 + 0.2 * sin(uTime * 0.12 + vUv.y * 3.0));
        gl_FragColor = vec4(vec3(0.70, 0.84, 0.87), edge * fade * 0.038);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  for (const x of [-7, -0.5, 7.5]) {
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.set(x, 0, -30.5);
    shaft.rotation.z = -0.12;
    group.add(shaft);
  }
  geometries.push(ceilingGeometry, shaftGeometry);
  materials.push(ceilingMaterial, shaftMaterial);
  return group;
}

export function createMineralPanelGeometry(width: number, height: number) {
  const x = width / 2 + 0.09, y = height / 2 + 0.09, r = 0.11;
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r); shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y); shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14, bevelEnabled: true, bevelThickness: 0.025,
    bevelSize: 0.025, bevelSegments: 2, curveSegments: 8,
  });
  geometry.translate(0, 0, -0.18);
  return geometry;
}
