const waterVertexShader = `
uniform float uTime;
uniform vec2 uMouseUv;
uniform vec2 uPointerVelocity;
uniform float uPointerValid;
uniform float uHold;
uniform float uHoldTime;
uniform mat4 uReflectionMatrix;

varying vec2 vUv;
varying float vWave;
varying vec3 vWorldPosition;
varying vec4 vReflectionCoordinate;

void main() {
  vUv = uv;

  vec3 displacedPosition = position;
  float phaseA = position.x * 0.78 + uTime * 0.24;
  float phaseB = position.y * 0.92 - uTime * 0.19;
  float phaseC =
    position.x * 0.46 +
    position.y * 0.68 +
    uTime * 0.16;

  float waveA = sin(phaseA) * 0.022;
  float waveB = sin(phaseB) * 0.017;
  float waveC = sin(phaseC) * 0.009;

  vec2 pointerPosition = vec2(
    (uMouseUv.x - 0.5) * 16.4,
    (0.5 - uMouseUv.y) * 40.0
  );
  vec2 pointerDelta = position.xy - pointerPosition;
  float pointerDistance = length(pointerDelta);
  float pointerInfluence =
    exp(-pointerDistance * 0.72) * uPointerValid;
  vec2 pointerVelocityLocal =
    uPointerVelocity * vec2(16.4, -40.0);
  float pointerMotion = dot(
    pointerVelocityLocal,
    normalize(pointerDelta + vec2(0.0001))
  );

  float pointerRipple =
    sin(pointerDistance * 4.1 - uTime * 1.25) *
    exp(-pointerDistance * 0.82) *
    0.0035;
  float holdRipple =
    sin(pointerDistance * 4.6 - uHoldTime * 2.15) *
    exp(-pointerDistance * 0.46) *
    0.012 *
    uHold;

  float elevation =
    waveA +
    waveB +
    waveC +
    (pointerRipple + holdRipple + pointerMotion * 0.00025) *
      pointerInfluence;

  displacedPosition.z += elevation;
  vWave = elevation;

  vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vReflectionCoordinate = uReflectionMatrix * worldPosition;

  gl_Position =
    projectionMatrix *
    viewMatrix *
    worldPosition;
}
`;

export default waterVertexShader;
