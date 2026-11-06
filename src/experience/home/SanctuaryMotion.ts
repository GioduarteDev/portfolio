import * as THREE from "three";

/** Shared uniforms survive the material clones used by the water captures.
 * No geometry moves: crystals stay rooted and architecture stays monumental. */
export class SanctuaryMotion {
  readonly time = { value: 0 };
  readonly immersion = { value: 0 };
  private readonly presence = { value: 0 };
  private readonly origin = { value: new THREE.Vector3() };
  private readonly direction = { value: new THREE.Vector3(0, 0, -1) };
  private initialized = false;

  constructor(root: THREE.Object3D) {
    const visited = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const material: THREE.Material = object.material;
      const crystal = /crystal shell|luminous heart/.test(material.name);
      const seam = material.name === "recessed dawn light";
      const pearl = material.name === "carved ivory pearl";
      if ((!crystal && !seam && !pearl) || visited.has(material)) return;
      visited.add(material);
      const previousCompile = material.onBeforeCompile;
      const previousKey = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile.call(material, shader, renderer);
        Object.assign(shader.uniforms, {
          uSanctuaryTime: this.time, uSanctuaryImmersion: this.immersion,
          uSanctuaryPresence: this.presence,
          uPresenceOrigin: this.origin, uPresenceDirection: this.direction,
        });
        shader.vertexShader = `varying vec3 vLivingWorld;\n${shader.vertexShader}`
          .replace("#include <project_vertex>", `#include <project_vertex>
            vec4 livingLocal = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              livingLocal = instanceMatrix * livingLocal;
            #endif
            vLivingWorld = (modelMatrix * livingLocal).xyz;`);
        shader.fragmentShader = `
          varying vec3 vLivingWorld;
          uniform float uSanctuaryTime, uSanctuaryImmersion, uSanctuaryPresence;
          uniform vec3 uPresenceOrigin, uPresenceDirection;
          ${shader.fragmentShader}`.replace("#include <emissivemap_fragment>", `
            #include <emissivemap_fragment>
            float livingBreath = sin(uSanctuaryTime * 0.46 + vLivingWorld.x * 0.21 + vLivingWorld.z * 0.13);
            float livingSweep = pow(0.5 + 0.5 * sin(vLivingWorld.y * 1.5 - uSanctuaryTime * 0.28
              + vLivingWorld.z * 0.2), 8.0);
            vec3 presenceOffset = vLivingWorld - uPresenceOrigin;
            float presenceDistance = length(cross(presenceOffset, uPresenceDirection));
            float presenceGlow = exp(-presenceDistance * presenceDistance * 1.6)
              * step(0.0, dot(presenceOffset, uPresenceDirection)) * uSanctuaryPresence;
            float livingVisibility = 1.0 - uSanctuaryImmersion * 0.75;
            totalEmissiveRadiance *= 1.0 + livingBreath * ${crystal ? "0.10" : "0.035"};
            totalEmissiveRadiance += vec3(0.68, 0.86, 1.0) * livingVisibility
              * (${crystal ? "0.065 * livingSweep + 0.20 * presenceGlow" : seam ? "0.035 * livingSweep" : "0.012 * livingSweep"});
          `);
      };
      material.customProgramCacheKey = () => `${previousKey}-living-sanctuary-${crystal}-${seam}`;
    });
  }

  update(elapsed: number, delta: number, ray: THREE.Ray, active: boolean,
    frozen: boolean, reducedMotion: boolean, immersion: number) {
    const previousPresence = this.presence.value;
    const rayChanged = this.direction.value.distanceToSquared(ray.direction) > 0.000001
      || this.origin.value.distanceToSquared(ray.origin) > 0.0001;
    if (!this.initialized || (!frozen && !reducedMotion)) this.time.value = reducedMotion ? 0 : elapsed;
    this.initialized = true;
    this.immersion.value = THREE.MathUtils.clamp(immersion, 0, 1);
    const easing = 1 - Math.exp(-delta * 4);
    this.origin.value.lerp(ray.origin, easing);
    this.direction.value.lerp(ray.direction, easing).normalize();
    this.presence.value = THREE.MathUtils.damp(this.presence.value,
      active && !frozen ? (reducedMotion ? 0.3 : 1) * (1 - this.immersion.value) : 0, 4, delta);
    return Math.abs(previousPresence - this.presence.value) > 0.002
      || (rayChanged && this.presence.value > 0.01);
  }
}
