import * as THREE from "three";
import type { QualitySettings } from "../core/quality";

/** Three depth populations in a single draw call. The submerged population is
 * captured through the real water refraction pass, never a screen overlay. */
export function createHomeAtmosphere(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  time: { value: number },
  immersion: { value: number },
) {
  const count = Math.round(quality.dustCount * 1.8);
  const positions: number[] = [], seeds: number[] = [], layers: number[] = [];
  let state = 18291;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const layer = i % 3;
    positions.push((random() - 0.5) * (layer === 0 ? 15 : 22),
      layer === 2 ? -0.19 - random() * 0.045 : layer === 1 ? 0.3 + random() * 0.7 : 0.7 + random() * 6,
      layer === 0 ? 5 - random() * 23 : 2 - random() * 30);
    seeds.push(random());
    layers.push(layer);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layers, 1));
  geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    name: "suspended pearl and liquid dust", transparent: true, depthWrite: false,
    uniforms: { uTime: time, uImmersion: immersion, uCall: { value: 0 }, uPixelHeight: { value: 900 },
      uWaterCapture: { value: 0 } },
    vertexShader: `
      uniform float uTime, uPixelHeight;
      attribute float aSeed, aLayer;
      varying float vSeed, vLayer, vFade;
      void main() {
        vSeed = aSeed; vLayer = aLayer;
        vec3 p = position;
        float phase = aSeed * 6.283185;
        p.x += sin(uTime * 0.12 + phase + p.z * 0.15) * 0.17;
        p.y += sin(uTime * 0.17 + phase) * (aLayer > 1.5 ? 0.055 : 0.12);
        p.z += cos(uTime * 0.09 + phase) * 0.12;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        float size = mix(0.016, 0.035, aSeed) * (aLayer > 1.5 ? 1.35 : 1.0);
        gl_PointSize = clamp(size * uPixelHeight / max(1.0, -view.z), 1.0, 5.0);
        vFade = smoothstep(0.8, 3.0, -view.z) * (1.0 - smoothstep(25.0, 42.0, -view.z));
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float uTime, uImmersion, uWaterCapture, uCall;
      varying float vSeed, vLayer, vFade;
      void main() {
        // Below-surface dust enters the air view through refraction only.
        if (vLayer > 1.5 && uWaterCapture < 0.5 && cameraPosition.y > 0.16) discard;
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float pearl = exp(-radius * radius * 5.0) * (1.0 - smoothstep(0.65, 1.0, radius));
        float shimmer = 0.72 + 0.28 * sin(uTime * 0.55 + vSeed * 25.0);
        vec3 color = mix(vec3(1.0, 0.88, 0.77), vec3(0.64, 0.89, 1.0), vLayer * 0.5);
        float visibility = vLayer > 1.5 ? 0.33 : (0.25 + uCall * 0.12) * (1.0 - uImmersion * 0.85);
        gl_FragColor = vec4(color, pearl * shimmer * vFade * visibility);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  geometries.push(geometry);
  materials.push(material);
  const particles = new THREE.Points(geometry, material);
  particles.name = "layered sanctuary atmosphere";
  // Animated bounds extend slightly outside the seeded static geometry.
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.4;
  return particles;
}
