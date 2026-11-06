import { waterField } from "./waterField";

const waterVertexShader = `
uniform float uTime;
uniform vec2 uMouseUv;
uniform vec2 uPointerVelocity;
uniform float uPointerValid;
uniform float uHold;
uniform float uHoldTime;
uniform mat4 uReflectionMatrix;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec4 vReflectionCoordinate;
varying vec4 vScreenCoordinate;
${waterField}
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  worldPosition.y += waterHeight(worldPosition.xz);
  vWorldPosition = worldPosition.xyz;
  vReflectionCoordinate = uReflectionMatrix * worldPosition;
  vScreenCoordinate = projectionMatrix * viewMatrix * worldPosition;
  gl_Position = vScreenCoordinate;
}
`;
export default waterVertexShader;
