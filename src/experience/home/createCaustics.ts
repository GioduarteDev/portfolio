import * as THREE from "three";

/** Local, slow light patterns; shared clock follows freezeTime/debug. */
export function addSubtleCaustics(
  material: THREE.MeshPhysicalMaterial,
  time: { value: number },
  strength: number,
) {
  if (strength === 0) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCausticTime = time;
    shader.uniforms.uCausticStrength = { value: strength };
    shader.vertexShader = `varying vec3 vCausticPosition;\n${shader.vertexShader}`
      .replace("#include <project_vertex>", `#include <project_vertex>
        vCausticPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `uniform float uCausticTime;
      uniform float uCausticStrength;
      varying vec3 vCausticPosition;\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec2 cp = vCausticPosition.xz * 2.1;
        float ca = sin(cp.x + sin(cp.y * 1.3 + uCausticTime * 0.15));
        float cb = cos(cp.y * 1.4 - sin(cp.x * 0.9 - uCausticTime * 0.12));
        float caustic = pow(max(1.0 - abs(ca + cb) * 0.65, 0.0), 9.0);
        float nearWater = 1.0 - smoothstep(0.25, 1.25, vCausticPosition.y);
        diffuseColor.rgb += vec3(0.48, 0.74, 0.8) * caustic * nearWater * uCausticStrength;`);
  };
  material.customProgramCacheKey = () => `sanctuary-caustics-${strength}`;
}
