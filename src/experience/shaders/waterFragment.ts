const waterFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uHold;

uniform vec3 uDeepColor;
uniform vec3 uSurfaceColor;

varying vec2 vUv;
varying float vWave;

void main() {
  float verticalGradient =
    clamp(
      vUv.y * 0.55 +
      0.25 +
      vWave * 5.0,
      0.0,
      1.0
    );

  vec3 waterColor =
    mix(
      uDeepColor,
      uSurfaceColor,
      verticalGradient
    );

  float shimmer =
    sin(
      (
        vUv.x +
        vUv.y
      ) *
      38.0 +
      uTime * 1.3
    ) *
    0.5 +
    0.5;

  waterColor +=
    shimmer * 0.012;

  waterColor +=
    vWave * 0.8;

  waterColor =
    mix(
      waterColor,
      vec3(
        0.78,
        0.68,
        0.72
      ),
      uHold * 0.035
    );

  gl_FragColor =
    vec4(
      waterColor,
      0.90
    );
}
`;

export default waterFragmentShader;