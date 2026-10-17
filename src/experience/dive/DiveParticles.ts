import * as THREE from "three";
import type { QualityMode } from "../core/quality";
import type { DiveState } from "./diveTimeline";

const vertexShader = `
  attribute vec4 aSeed;
  attribute float aKind;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;
  uniform float uReduced;
  uniform float uEnvelope;
  varying vec2 vUv;
  varying vec2 vCenter;
  varying float vOpacity;
  varying float vKind;
  varying float vDepth;
  void main() {
    vUv = uv; vKind = aKind; vDepth = aSeed.z;
    float age = fract(aSeed.w + uTime * (0.025 + aSeed.z * 0.035) * (1.0 - uReduced)
      + uProgress * (0.55 + aSeed.z * 0.45));
    float burst = 1.0 - smoothstep(0.46, 0.65, uProgress);
    float settled = aSeed.z > 0.66 ? 1.0 : burst;
    float spread = smoothstep(0.24, 0.50, uProgress);
    float x = mix(0.5 + (aSeed.x - 0.5) * 0.4, aSeed.x, spread);
    x += sin(age * 5.0 + aSeed.w * 6.28) * (0.008 + aSeed.z * 0.016) * (1.0 - uReduced);
    float y = mix(0.16 + aSeed.y * 0.20, -0.12 + age * 1.32, spread);
    y += sin(age * 4.0 + aSeed.x * 7.0) * 0.008 * (1.0 - uReduced);
    float bubbleSize = 2.6 + pow(aSeed.y, 6.0) * 15.0;
    float size = mix(bubbleSize, 0.75 + aSeed.y, aKind) * mix(0.8, 1.0, spread);
    vec2 extent = vec2(size) / uResolution * 2.0;
    vCenter = vec2(x, y);
    vOpacity = uEnvelope * settled * smoothstep(0.0, 0.12, age) *
      (1.0 - smoothstep(0.85, 1.0, age)) * mix(0.64, 0.16, aKind);
    if (uReduced > 0.5 && aSeed.x > 0.25) vOpacity = 0.0;
    gl_Position = vec4(vCenter * 2.0 - 1.0 + position.xy * extent, 0.0, 1.0);
  }
`;
const fragmentShader = `
  precision highp float;
  uniform sampler2D uSceneTexture;
  uniform vec2 uResolution;
  varying vec2 vUv;
  varying vec2 vCenter;
  varying float vOpacity;
  varying float vKind;
  varying float vDepth;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0 || vOpacity < 0.001) discard;
    if (vKind > 0.5) {
      gl_FragColor = vec4(vec3(0.79, 0.87, 0.87), exp(-r * r * 4.0) * vOpacity);
      return;
    }
    float rim = smoothstep(0.67, 0.85, r) * (1.0 - smoothstep(0.90, 1.0, r));
    float highlight = exp(-length(p - vec2(-0.35, 0.47)) * 9.0);
    vec2 refractedUv = gl_FragCoord.xy / uResolution + p / uResolution * (1.5 + vDepth * 2.0);
    vec3 refraction = texture2D(uSceneTexture, clamp(refractedUv, vec2(0.001), vec2(0.999))).rgb;
    vec3 pearl = vec3(0.88, 0.95, 0.96);
    vec3 color = mix(refraction, pearl, rim * 0.7 + highlight * 0.55);
    float alpha = (rim * 0.50 + highlight * 0.7 + (1.0 - r) * 0.035) * vOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** One instanced draw call, fixed buffers and GPU trajectories; no particle
 * meshes, canvas textures or allocations while scrolling. */
export class DiveParticles {
  readonly scene = new THREE.Scene();
  private readonly geometry = new THREE.InstancedBufferGeometry();
  private readonly material: THREE.ShaderMaterial;

  constructor(mode: QualityMode, texture: THREE.Texture, resolution: THREE.Vector2) {
    const bubbles = mode === "high" ? 40 : mode === "medium" ? 24 : 9;
    const specks = mode === "high" ? 22 : mode === "medium" ? 10 : 3;
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0,
    ], 3));
    this.geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const seeds = new Float32Array((bubbles + specks) * 4);
    const kinds = new Float32Array(bubbles + specks);
    let state = 48371;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 0; i < kinds.length; i++) {
      seeds.set([random(), random(), random(), random()], i * 4);
      kinds[i] = i < bubbles ? 0 : 1;
    }
    // Keep one small rising bubble in LOW even when reduced motion removes
    // three quarters of the particles; the change of medium remains readable.
    if (mode === "low") seeds.set([0.18, 0.65, 0.82, 0.22], 0);
    this.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    this.geometry.setAttribute("aKind", new THREE.InstancedBufferAttribute(kinds, 1));
    this.geometry.instanceCount = bubbles + specks;
    this.material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthTest: false,
      depthWrite: false, toneMapped: false,
      uniforms: {
        uSceneTexture: { value: texture }, uResolution: { value: resolution },
        uTime: { value: 0 }, uProgress: { value: 0 },
        uEnvelope: { value: 0 }, uReduced: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  update(state: DiveState, time: number, reducedMotion: boolean) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uProgress.value = state.progress;
    this.material.uniforms.uEnvelope.value = state.bubbles;
    this.material.uniforms.uReduced.value = Number(reducedMotion);
  }

  dispose() { this.geometry.dispose(); this.material.dispose(); this.scene.clear(); }
}
