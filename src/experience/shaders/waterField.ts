// Shared displacement field: the fragment normal includes finer scales than the mesh.
export const waterField = `
float waterHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float waterNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(waterHash(cell), waterHash(cell + vec2(1.0, 0.0)), f.x),
    mix(waterHash(cell + vec2(0.0, 1.0)), waterHash(cell + vec2(1.0)), f.x), f.y);
}
float waterHeight(vec2 p) {
  float broad = sin(dot(p, vec2(0.36, 0.22)) + uTime * 0.19) * 0.012;
  float medium = sin(dot(p, vec2(0.82, -0.63)) - uTime * 0.27) * 0.007;
  medium += sin(dot(p, vec2(1.35, 0.94)) + uTime * 0.21) * 0.004;
  float detail = (waterNoise(p * 2.4 + vec2(uTime * 0.06, -uTime * 0.04)) - 0.5) * 0.007;
  float interaction = 0.0;
  if (uPointerValid > 0.001) {
  vec2 pointerWorld = vec2((uMouseUv.x - 0.5) * 16.4, 11.0 - uMouseUv.y * 40.0);
  vec2 delta = p - pointerWorld;
  float distanceToPointer = length(delta);
  float local = exp(-distanceToPointer * 1.7) * uPointerValid;
  float ripple = sin(distanceToPointer * 12.0 - uTime * 2.1) * 0.004;
  ripple += uHold * (sin(distanceToPointer * 9.5 - uHoldTime * 2.4) * 0.009
    + sin(distanceToPointer * 6.2 - uHoldTime * 1.6) * 0.003);
  float wake = dot(uPointerVelocity, normalize(delta + vec2(0.001))) * 0.002;
  interaction = (ripple + wake) * local;
  }
  return broad + medium + detail + interaction;
}
`;
