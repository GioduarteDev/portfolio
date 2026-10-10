const waterFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uHold;
uniform float uPointerValid;
uniform vec2 uPointerVelocity;
uniform float uReflectionStrength;
uniform float uDistortionStrength;
uniform sampler2D uReflectionMap;
uniform vec3 uDeepColor;
uniform vec3 uSurfaceColor;

varying vec2 vUv;
varying float vWave;
varying vec3 vWorldPosition;
varying vec4 vReflectionCoordinate;

void main() {
  float shoreDistance = min(vUv.x, 1.0 - vUv.x);
  float depth = smoothstep(0.015, 0.34, shoreDistance);
  vec3 waterColor = mix(
    uSurfaceColor,
    uDeepColor,
    depth * 0.82
  );

  vec3 normal = normalize(
    cross(dFdx(vWorldPosition), dFdy(vWorldPosition))
  );

  if (normal.y < 0.0) {
    normal = -normal;
  }

  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(
    1.0 - max(dot(normal, viewDirection), 0.0),
    4.0
  );

  vec2 reflectionUv =
    vReflectionCoordinate.xy /
    max(vReflectionCoordinate.w, 0.0001);
  reflectionUv = reflectionUv * 0.5 + 0.5;

  float fineRipple =
    sin(vUv.x * 82.0 + vUv.y * 58.0 + uTime * 0.48) *
    sin(vUv.y * 71.0 - uTime * 0.34);
  vec2 distortion = vec2(
    normal.x + fineRipple * 0.12,
    normal.z + fineRipple * 0.1
  ) * uDistortionStrength;
  distortion += uPointerVelocity * uPointerValid * 0.0015;

  vec2 sampleUv = clamp(
    reflectionUv + distortion,
    vec2(0.002),
    vec2(0.998)
  );
  vec3 reflection = texture2D(uReflectionMap, sampleUv).rgb;
  float reflectionAmount =
    uReflectionStrength * (0.32 + fresnel * 0.68);

  waterColor = mix(waterColor, reflection, reflectionAmount);

  float highlightWave =
    sin(vUv.x * 92.0 + vUv.y * 46.0 + uTime * 0.56) *
    sin(vUv.y * 63.0 - uTime * 0.39);
  float softHighlight = pow(max(highlightWave, 0.0), 8.0);
  vec3 lightDirection = normalize(vec3(-0.34, 0.84, 0.42));
  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float specular = pow(max(dot(normal, halfDirection), 0.0), 54.0);

  waterColor += vec3(0.075, 0.068, 0.07) *
    (softHighlight * 0.16 + specular * 0.24);
  waterColor += vec3(0.012, 0.009, 0.01) *
    clamp(vWave * 3.0, -0.6, 0.6);
  waterColor = mix(
    waterColor,
    vec3(0.82, 0.7, 0.74),
    uHold * 0.025
  );

  gl_FragColor = vec4(waterColor, 0.96);
}
`;

export default waterFragmentShader;
