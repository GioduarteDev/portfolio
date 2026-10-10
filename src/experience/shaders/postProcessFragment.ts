const postProcessFragmentShader = `
precision highp float;

uniform sampler2D uInputTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uEffects;

varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 centered = vUv - 0.5;
  float radialDistance = length(centered);
  float chromaticAmount =
    uEffects.z * 0.00065 * smoothstep(0.12, 0.72, radialDistance);
  vec2 chromaticOffset =
    centered * chromaticAmount / max(radialDistance, 0.001);

  vec3 color;
  color.r = texture2D(
    uInputTexture,
    clamp(vUv + chromaticOffset, vec2(0.001), vec2(0.999))
  ).r;
  color.g = texture2D(uInputTexture, vUv).g;
  color.b = texture2D(
    uInputTexture,
    clamp(vUv - chromaticOffset, vec2(0.001), vec2(0.999))
  ).b;

  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(
    color,
    vec3(luminance) + (color - vec3(luminance)) * 1.015,
    uEffects.w
  );
  color = (color - 0.5) * (1.0 + 0.012 * uEffects.w) + 0.5;

  float vignette = smoothstep(0.18, 0.78, radialDistance);
  color *= 1.0 - vignette * 0.075 * uEffects.y;

  vec2 pixel = floor(vUv * uResolution);
  float grain = hash(pixel + floor(uTime * 24.0)) - 0.5;
  color += grain * 0.012 * uEffects.x;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default postProcessFragmentShader;
