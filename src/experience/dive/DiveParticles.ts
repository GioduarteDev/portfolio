import * as THREE from "three";
import type { QualityMode } from "../core/quality";
import type { DiveState } from "./diveTimeline";

const vertexShader = `
  attribute vec4 aSeed;
  attribute float aKind;
  uniform vec2 uResolution;
  uniform float uTime, uProgress, uReduced, uEnvelope, uBubbles;
  varying vec2 vUv, vCenter;
  varying float vOpacity, vKind, vDepth;
  void main() {
    vUv = uv; vKind = aKind;
    float clock = uTime * (1.0 - uReduced);
    float phase = aSeed.w * 6.283185;
    float age = fract(aSeed.w + clock * (0.085 + aSeed.z * 0.10));
    float depth = aKind > 2.5 ? 0.9 + aSeed.z * 1.4 : 2.8 + aSeed.z * 14.0;
    depth = max(0.65, depth - uProgress * (aKind > 2.5 ? 0.3 : 2.0));
    float worldX = (aSeed.x - 0.5) * (aKind > 2.5 ? 2.1 : 12.0);
    float worldY = (aSeed.y - 0.5) * 7.5;
    worldX += sin(clock * 0.15 + phase) * (aKind < 0.5 ? 0.07 : 0.15);
    if (aKind < 0.5) {
      // Buoyancy is always upward in world space; camera descent adds parallax.
      worldY = -1.4 + age * 4.2 + uProgress * 0.75;
      depth = 1.8 + aSeed.z * 9.0;
    } else {
      worldY += sin(clock * 0.11 + phase) * 0.12 + uProgress * 0.65;
    }
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vCenter = vec2(0.5) + vec2(worldX / aspect, worldY) / (depth * 0.73);
    float radius = aKind < 0.5 ? 0.007 + pow(aSeed.y, 5.0) * 0.038
      : aKind < 1.5 ? 0.004 : aKind < 2.5 ? 0.012 : 0.035;
    float size = clamp(radius * uResolution.y / depth, 0.65, aKind > 2.5 ? 28.0 : 22.0);
    vec2 extent = vec2(size) / uResolution * 2.0;
    float life = aKind < 0.5 ? smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.88, 1.0, age)) : 1.0;
    vOpacity = (aKind < 0.5 ? uBubbles * 0.68 : uEnvelope * (aKind > 2.5 ? 0.12 : 0.28)) * life;
    vOpacity *= 0.78 + 0.22 * sin(phase + clock * 0.3);
    if (uReduced > 0.5 && (aSeed.x > 0.22 || aKind > 2.5)) vOpacity = 0.0;
    vDepth = aSeed.z;
    gl_Position = vec4(vCenter * 2.0 - 1.0 + position.xy * extent, 0.0, 1.0);
  }
`;
const fragmentShader = `
  precision highp float;
  uniform sampler2D uSceneTexture;
  uniform vec2 uResolution;
  uniform float uWaterline;
  varying vec2 vUv, vCenter;
  varying float vOpacity, vKind, vDepth;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0 || vOpacity < 0.001 || gl_FragCoord.y / uResolution.y > uWaterline + 0.015) discard;
    if (vKind > 0.5) {
      float soft = exp(-r * r * (vKind > 2.5 ? 3.0 : 5.0)) * (1.0 - smoothstep(0.55, 1.0, r));
      gl_FragColor = vec4(mix(vec3(0.68, 0.85, 0.89), vec3(0.91, 0.87, 0.94), vDepth), soft * vOpacity);
      return;
    }
    float rim = smoothstep(0.67, 0.85, r) * (1.0 - smoothstep(0.90, 1.0, r));
    float highlight = exp(-length(p - vec2(-0.35, 0.47)) * 9.0);
    vec2 refractedUv = gl_FragCoord.xy / uResolution + p / uResolution * (1.5 + vDepth * 2.0);
    vec3 refraction = texture2D(uSceneTexture, clamp(refractedUv, vec2(0.001), vec2(0.999))).rgb;
    vec3 color = mix(refraction, vec3(0.88, 0.95, 0.96), rim * 0.7 + highlight * 0.55);
    gl_FragColor = vec4(color, (rim * 0.50 + highlight * 0.7 + (1.0 - r) * 0.035) * vOpacity);
  }
`;
/** One instanced draw call, fixed buffers and GPU trajectories; no particle
 * meshes, canvas textures or allocations while scrolling. */
export class DiveParticles {
  readonly scene = new THREE.Scene();
  private readonly geometry = new THREE.InstancedBufferGeometry();
  private readonly material: THREE.ShaderMaterial;

  constructor(mode: QualityMode, texture: THREE.Texture, resolution: THREE.Vector2) {
    const bubbles = mode === "high" ? 48 : mode === "medium" ? 30 : 14;
    const micro = mode === "high" ? 180 : mode === "medium" ? 90 : 36;
    const medium = mode === "high" ? 52 : mode === "medium" ? 26 : 14;
    const foreground = mode === "high" ? 10 : mode === "medium" ? 6 : 3;
    const specks = micro + medium + foreground;
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
      kinds[i] = i < bubbles ? 0 : i < bubbles + micro ? 1 : i < bubbles + micro + medium ? 2 : 3;
      if (i < 6) {
        // Two small near-eye plumes bracket the descent, with upward-only buoyancy.
        seeds.set([0.42 + Math.floor(i / 3) * 0.16 + (random() - 0.5) * 0.025,
          0.83 + random() * 0.16, 0.03 + random() * 0.08, 0.09 + random() * 0.06], i * 4);
      }
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
        uBubbles: { value: 0 }, uWaterline: { value: 1.12 },
      },
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  update(state: DiveState, time: number, reducedMotion: boolean, waterline = 1.12) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uProgress.value = state.progress;
    this.material.uniforms.uEnvelope.value = (state.crossing + state.contact * 0.25) * (1 - state.arrival);
    this.material.uniforms.uBubbles.value = state.bubbles;
    this.material.uniforms.uWaterline.value = waterline;
    this.material.uniforms.uReduced.value = Number(reducedMotion);
  }

  dispose() { this.geometry.dispose(); this.material.dispose(); this.scene.clear(); }
}
