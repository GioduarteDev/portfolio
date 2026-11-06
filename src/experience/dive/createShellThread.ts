import * as THREE from "three";

/** The same fine inlay appears in the sanctuary and the submerged gallery.
 * Its geometry belongs to each scene; only a shared clock changes per frame. */
export function createShellThread(
  points: THREE.Vector3[], geometries: THREE.BufferGeometry[], materials: THREE.Material[],
  time: { value: number }, radius = 0.008,
) {
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
    Math.min(320, points.length * 12), radius, 5, false);
  const material = new THREE.MeshBasicMaterial({
    name: "pearl shell spiral narrative inlay", color: "#F5E4CC", transparent: true,
    opacity: 0.38, depthWrite: false, toneMapped: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThreadTime = time;
    shader.vertexShader = `varying float vThreadLength;\n${shader.vertexShader}`
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvThreadLength = uv.x;`);
    shader.fragmentShader = `uniform float uThreadTime; varying float vThreadLength;\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        diffuseColor.a *= 0.72 + 0.28 * sin(vThreadLength * 22.0 - uThreadTime * 0.3);`);
  };
  material.customProgramCacheKey = () => "shell-narrative-inlay-v1";
  geometries.push(geometry);
  materials.push(material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "shell spiral narrative thread";
  return mesh;
}
