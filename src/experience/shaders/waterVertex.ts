const waterVertexShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uHold;

varying vec2 vUv;
varying float vWave;

void main() {
  vUv = uv;

  vec3 newPosition = position;

  float waveA =
    sin(
      newPosition.x * 1.6 +
      uTime * 0.65
    ) * 0.035;

  float waveB =
    sin(
      newPosition.y * 1.4 -
      uTime * 0.55
    ) * 0.025;

  vec2 mouseUv =
    uMouse * 0.5 + 0.5;

  float mouseDistance =
    distance(
      uv,
      mouseUv
    );

  float mouseRipple =
    exp(
      -mouseDistance * 7.5
    ) *
    sin(
      mouseDistance * 34.0 -
      uTime * 3.2
    );

  float interactionStrength =
    0.015 +
    uHold * 0.025;

  float elevation =
    waveA +
    waveB +
    mouseRipple *
      interactionStrength;

  newPosition.z += elevation;

  vWave = elevation;

  gl_Position =
    projectionMatrix *
    modelViewMatrix *
    vec4(
      newPosition,
      1.0
    );
}
`;

export default waterVertexShader;