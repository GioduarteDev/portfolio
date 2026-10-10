const transitionFragmentShader = `
precision highp float;

uniform sampler2D uHomeTexture;
uniform sampler2D uProjectsTexture;
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;
uniform float uVelocity;
uniform float uDirection;

varying vec2 vUv;

float waterField(vec2 uv, float time) {
  float broad =
    sin(uv.x * 8.4 + uv.y * 2.1 + time * 0.36) * 0.46 +
    sin(uv.x * 15.2 - uv.y * 3.7 - time * 0.24) * 0.22 +
    sin(uv.x * 4.1 + uv.y * 8.0 + time * 0.18) * 0.32;

  return broad;
}

void main() {
  float progress = smoothstep(0.0, 1.0, uProgress);
  float envelope = sin(progress * 3.14159265);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 centered = vUv - 0.5;

  float field = waterField(vUv, uTime);
  float waveAmplitude = 0.011 + min(uVelocity, 2.0) * 0.002;
  float directionLag =
    uDirection * min(uVelocity, 2.0) * 0.0025;
  float waterline =
    mix(-0.08, 1.08, progress) +
    field * waveAmplitude * envelope +
    directionLag * envelope;

  float signedDistance = vUv.y - waterline;
  float lineDistance = abs(signedDistance);
  float lineWidth = mix(0.038, 0.018, envelope);
  float projectsMask = smoothstep(
    -lineWidth,
    lineWidth,
    -signedDistance
  );

  float refractionBand =
    exp(-lineDistance * (18.0 + envelope * 8.0)) *
    envelope;
  float broadDistortion = envelope * (
    sin(vUv.y * 7.0 + progress * 4.2 + uTime * 0.18) * 0.006 +
    field * 0.006
  );
  float horizontalRefraction =
    (broadDistortion + refractionBand * field * 0.018) *
    (1.0 + 0.4 / max(aspect, 0.5));
  float verticalRefraction =
    refractionBand * field * 0.009;

  vec2 homeUv = vUv;
  homeUv.x += horizontalRefraction;
  homeUv.y += verticalRefraction;
  homeUv.y = 0.5 + (homeUv.y - 0.5) * (1.0 - envelope * 0.045);
  homeUv += centered * envelope * vec2(0.012, 0.018);

  vec2 projectsUv = vUv;
  projectsUv.x -= horizontalRefraction * 0.46;
  projectsUv.y -= envelope * 0.012;
  projectsUv.y += refractionBand * field * 0.006;

  vec3 homeColor = texture2D(
    uHomeTexture,
    clamp(homeUv, vec2(0.001), vec2(0.999))
  ).rgb;
  vec3 projectColor = texture2D(
    uProjectsTexture,
    clamp(projectsUv, vec2(0.001), vec2(0.999))
  ).rgb;

  float chromaticAmount =
    refractionBand * envelope * (0.001 + min(uVelocity, 2.0) * 0.00035);
  float red = texture2D(
    uHomeTexture,
    clamp(homeUv + vec2(chromaticAmount, 0.0), vec2(0.001), vec2(0.999))
  ).r;
  float blue = texture2D(
    uHomeTexture,
    clamp(homeUv - vec2(chromaticAmount, 0.0), vec2(0.001), vec2(0.999))
  ).b;
  homeColor = vec3(red, homeColor.g, blue);

  float waterTint = refractionBand * 0.12;
  homeColor = mix(
    homeColor,
    vec3(0.42, 0.56, 0.57),
    waterTint
  );

  float waterEdge = exp(-lineDistance * 105.0) * envelope;
  float softGlint = exp(-lineDistance * 30.0) * envelope;
  vec3 transitionColor = mix(homeColor, projectColor, projectsMask);
  transitionColor = mix(
    transitionColor,
    vec3(0.76, 0.82, 0.78),
    waterEdge * 0.28
  );
  transitionColor += vec3(0.035, 0.034, 0.028) * softGlint;

  float tonalShift = envelope * 0.045;
  transitionColor = mix(
    transitionColor,
    transitionColor * vec3(0.94, 1.0, 0.98),
    tonalShift
  );

  gl_FragColor = vec4(transitionColor, 1.0);
}
`;

export default transitionFragmentShader;
