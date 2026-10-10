import * as THREE from "three";

/** A directional sky: usable by both the camera and the reflection pass. */
export function createDawnBackdrop() {
  const geometry = new THREE.SphereGeometry(80, 32, 20);
  const material = new THREE.ShaderMaterial({
    name: "procedural dawn", side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vSkyPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vSkyPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `varying vec3 vSkyPosition;
      void main() {
        vec3 ray = normalize(vSkyPosition - cameraPosition);
        float height = max(ray.y, 0.0);
        vec3 peach = vec3(0.82, 0.63, 0.57);
        vec3 pink = vec3(0.68, 0.57, 0.66);
        vec3 lilac = vec3(0.38, 0.43, 0.62);
        vec3 blue = vec3(0.12, 0.23, 0.43);
        vec3 sky = mix(peach, pink, smoothstep(0.01, 0.12, height));
        sky = mix(sky, lilac, smoothstep(0.08, 0.34, height));
        sky = mix(sky, blue, smoothstep(0.28, 0.85, height));
        float sunDistance = length(ray - normalize(vec3(0.08, 0.012, -1.0)));
        float glow = exp(-sunDistance * 12.0);
        float disk = 1.0 - smoothstep(0.008, 0.013, sunDistance);
        sky += vec3(0.22, 0.15, 0.085) * glow + vec3(1.4, 1.15, 0.8) * disk;
        float haze = exp(-abs(ray.y - 0.01) * 24.0);
        sky = mix(sky, vec3(0.94, 0.81, 0.74), haze * 0.18);
        // Very faint horizontal wisps; no stars or nebula field.
        float wisps = sin(ray.x * 18.0 + ray.y * 44.0) * sin(ray.y * 61.0 - ray.x * 7.0);
        sky += vec3(0.025, 0.019, 0.023) * wisps * smoothstep(0.04, 0.2, height);
        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = "dawnBackdrop";
  sky.frustumCulled = false;
  return sky;
}
