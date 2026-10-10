import { waterField } from "./waterField";

const waterFragmentShader = `
precision highp float;
uniform float uTime;
uniform vec2 uMouseUv;
uniform vec2 uPointerVelocity;
uniform float uHold;
uniform float uHoldTime;
uniform float uPointerValid;
uniform float uReflectionStrength;
uniform float uDistortionStrength;
uniform sampler2D uReflectionMap;
uniform sampler2D uRefractionMap;
uniform sampler2D uRefractionDepth;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uDeepColor;
uniform vec3 uSurfaceColor;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec4 vReflectionCoordinate;
varying vec4 vScreenCoordinate;
${waterField}
#include <packing>
void main() {
  vec2 p = vWorldPosition.xz;
  float h = waterHeight(p);
  vec2 slope = vec2(waterHeight(p + vec2(0.035, 0.0)) - h,
    waterHeight(p + vec2(0.0, 0.035)) - h) / 0.035;
  vec2 fine = vec2(
    waterNoise(p * 9.0 + uTime * 0.07),
    waterNoise(p * 9.0 + vec2(4.7, -uTime * 0.08))
  ) - 0.5;
  vec3 normal = normalize(vec3(-slope.x - fine.x * 0.018, 1.0, -slope.y - fine.y * 0.018));
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = 0.035 + 0.965 * pow(1.0 - max(dot(normal, viewDirection), 0.0), 5.0);
  vec2 screenUv = vScreenCoordinate.xy / vScreenCoordinate.w * 0.5 + 0.5;
  vec2 distortion = normal.xz * uDistortionStrength;
  vec2 refractedUv = clamp(screenUv + distortion * 0.65, vec2(0.002), vec2(0.998));
  float sceneDepth = texture2D(uRefractionDepth, refractedUv).x;
  // Prevent foreground steps/crystals being refracted into the water silhouette.
  if (sceneDepth < gl_FragCoord.z) {
    refractedUv = clamp(screenUv, vec2(0.002), vec2(0.998));
    sceneDepth = texture2D(uRefractionDepth, refractedUv).x;
  }
  float bottomDistance = -perspectiveDepthToViewZ(sceneDepth, uCameraNear, uCameraFar);
  float waterDistance = -perspectiveDepthToViewZ(gl_FragCoord.z, uCameraNear, uCameraFar);
  float opticalDepth = clamp(bottomDistance - waterDistance, 0.0, 12.0);
  vec3 transmission = exp(-vec3(0.19, 0.045, 0.018) * opticalDepth);
  vec3 refracted = texture2D(uRefractionMap, refractedUv).rgb;
  vec3 tint = mix(uSurfaceColor, uDeepColor, 1.0 - exp(-opticalDepth * 0.18));
  refracted = refracted * transmission + tint * (1.0 - transmission) * 0.55;
  vec2 reflectionUv = vReflectionCoordinate.xy / max(vReflectionCoordinate.w, 0.0001) * 0.5 + 0.5;
  vec3 reflected = texture2D(uReflectionMap,
    clamp(reflectionUv + distortion, vec2(0.002), vec2(0.998))).rgb;
  vec3 waterColor = mix(refracted, reflected, clamp(fresnel * uReflectionStrength, 0.0, 0.94));
  vec3 lightDirection = normalize(vec3(0.08, 0.16, -1.0));
  vec3 halfVector = normalize(lightDirection + viewDirection);
  float specular = pow(max(dot(normal, halfVector), 0.0), 170.0);
  waterColor += vec3(1.0, 0.76, 0.52) * specular * 0.36;
  // Opaque composition of two real scene passes avoids double alpha tinting.
  gl_FragColor = vec4(waterColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
export default waterFragmentShader;
