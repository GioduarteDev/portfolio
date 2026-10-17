const transitionFragmentShader = `
precision highp float;
uniform sampler2D uHomeTexture;
uniform sampler2D uProjectsTexture;
uniform sampler2D uProjectsDepth;
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uProjectsClip;
uniform float uVelocity;
uniform float uDirection;
uniform vec4 uDive; // contact, immersion, arrival, wet
uniform float uWaterline;
uniform float uMotionScale;
uniform float uQuality;
uniform vec4 uPointer; // visual cursor UV and validity
varying vec2 vUv;
#include <packing>

vec2 safeUv(vec2 uv) { return clamp(uv, vec2(0.001), vec2(0.999)); }
float wave(vec2 uv) {
  return sin(uv.x * 9.1 + uv.y * 2.0 + uTime * 0.35) * 0.55
    + sin(uv.x * 16.7 - uv.y * 3.0 - uTime * 0.24) * 0.25
    + sin(uv.x * 4.3 + uv.y * 7.0 + uTime * 0.17) * 0.20;
}
void main() {
  float contact = uDive.x, immersed = uDive.y, arrival = uDive.z;
  float presence = smoothstep(0.18, 0.25, uProgress) * (1.0 - arrival);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float slowField = wave(vUv);
  // A moving interface between two media, driven by the actual eye height.
  float waveHeight = slowField * 0.014 * presence * mix(0.55, 1.0, uMotionScale);
  float line = uWaterline + waveHeight;
  float signedDistance = vUv.y - line;
  float waterMask = 1.0 - smoothstep(-0.004, 0.006, signedDistance);
  float band = exp(-abs(signedDistance) * 65.0) * presence;
  vec2 centered = vUv - 0.5;
  vec2 flow = vec2(slowField, sin(vUv.y * 8.0 + vUv.x * 3.0 - uTime * 0.22));
  vec2 refract = flow * (0.0035 * immersed + 0.012 * band) * uMotionScale;
  refract.x /= max(aspect, 0.7);
  refract.y += band * 0.007 * slowField * uMotionScale;

  // Contact compression and a local ring before the eye crosses the surface.
  vec2 hit = (vUv - vec2(0.5, 0.24)) * vec2(aspect, 1.0);
  float contactRadius = length(hit);
  float ripple = sin(contactRadius * 36.0 - uProgress * 31.0) *
    exp(-contactRadius * 7.0) * contact * 0.0018 * uMotionScale;
  refract += hit * ripple;
  vec2 airUv = vUv + refract * band + hit * ripple;
  airUv = 0.5 + (airUv - 0.5) * (1.0 - contact * 0.012 * uMotionScale);
  vec2 waterUv = vUv + refract;
  waterUv += centered * immersed * 0.008 * uMotionScale;

  // Tiny lens films, procedural and temporary; no image overlay.
  if (uQuality > 0.5) {
    vec2 film = (vUv - vec2(0.21, 0.72)) * vec2(aspect, 1.0);
    float filmRadius = length(film);
    float filmLife = smoothstep(0.28, 0.36, uProgress) * (1.0 - smoothstep(0.48, 0.64, uProgress));
    waterUv += film * exp(-filmRadius * filmRadius * 1800.0) * 0.10 * filmLife * uMotionScale;
  }

  // Refraction close to the wet cursor, using its damped visual position.
  vec2 cursorDelta = (vUv - uPointer.xy) * vec2(aspect, 1.0);
  float cursorDistance = length(cursorDelta);
  float cursorHalo = exp(-cursorDistance * cursorDistance * 4400.0);
  float cursorRing = sin(cursorDistance * 170.0 - uTime * 0.8) * cursorHalo;
  vec2 cursorWarp = cursorDelta * cursorRing * uDive.w * uPointer.z *
    mix(0.014, 0.045, uQuality / 2.0) * mix(0.5, 1.0, uMotionScale);
  waterUv += cursorWarp;
  airUv += cursorWarp * contact;

  vec3 airColor = texture2D(uHomeTexture, safeUv(airUv)).rgb;
  vec3 projects = texture2D(uProjectsTexture, safeUv(waterUv)).rgb;
  float depth = texture2D(uProjectsDepth, safeUv(waterUv)).x;
  float distanceToScene = -perspectiveDepthToViewZ(depth, uProjectsClip.x, uProjectsClip.y);
  float distanceHaze = smoothstep(7.0, 34.0, distanceToScene);
  if (uQuality > 1.5) {
    vec2 softness = vec2(0.65, 0.4) / uResolution * distanceHaze * immersed;
    projects = projects * 0.6
      + texture2D(uProjectsTexture, safeUv(waterUv + softness)).rgb * 0.2
      + texture2D(uProjectsTexture, safeUv(waterUv - softness)).rgb * 0.2;
    float dispersion = 0.00045 * (band + immersed * 0.2) * uMotionScale;
    projects.r = mix(projects.r, texture2D(uProjectsTexture, safeUv(waterUv + vec2(dispersion, 0.0))).r, 0.35);
    projects.b = mix(projects.b, texture2D(uProjectsTexture, safeUv(waterUv - vec2(dispersion, 0.0))).b, 0.35);
  }

  // The destination resolves through a lit water volume, never through black.
  vec3 mineralWater = vec3(0.62, 0.76, 0.79);
  // Only the air region contains Home. Underwater is a separate lit space;
  // distance scattering resolves the destination without ghosting two scenes.
  float settling = smoothstep(0.46, 0.78, uProgress);
  float opticalDepth = immersed * (0.24 + distanceHaze * 0.22) * mix(1.25, 0.8, settling);
  vec3 absorption = exp(-vec3(0.40, 0.15, 0.08) * opticalDepth);
  vec3 underwater = projects * absorption;
  underwater = mix(underwater, mineralWater, opticalDepth);
  underwater = mix(underwater, (underwater - 0.5) * 0.92 + 0.5, immersed);
  float caustic = pow(max(0.0, sin(vUv.x * 17.0 + wave(vUv * 0.6)) *
    sin(vUv.y * 11.0 - uTime * 0.12)), 8.0);
  underwater += vec3(0.008, 0.013, 0.014) * caustic * immersed * uMotionScale;
  float shaft = pow(max(0.0, sin(vUv.x * 7.0 + vUv.y * 0.9 + uTime * 0.05)), 12.0);
  underwater += vec3(0.014, 0.020, 0.022) * shaft * immersed * vUv.y;

  vec3 color = mix(airColor, underwater, waterMask);
  float edge = exp(-abs(signedDistance) * 180.0) * presence;
  color = mix(color, vec3(0.86, 0.92, 0.91), edge * 0.36);
  color += vec3(0.025, 0.031, 0.029) * band;
  gl_FragColor = vec4(color, 1.0);
}
`;
export default transitionFragmentShader;
