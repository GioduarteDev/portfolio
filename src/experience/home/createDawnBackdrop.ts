import * as THREE from "three";
import type { QualityMode } from "../core/quality";

export function createDawnBackdrop(mode: QualityMode = "high") {
  const group = new THREE.Group();
  group.name = "dawnBackdropGroup";

  // 1. SKY DOME WITH DISTANT SEA & HORIZON
  const skyGeometry = new THREE.SphereGeometry(80, 48, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    name: "procedural extraordinary dawn sky and ocean",
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uCloudOpacity: { value: mode === "low" ? 0.75 : mode === "medium" ? 0.84 : 0.90 },
      // Sun position matching target reference: slightly right of center, natural dawn elevation
      uSunPosition: { value: new THREE.Vector3(7.5, 4.3, -78.0) },
    },
    vertexShader: `
      varying vec3 vSkyPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vSkyPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uCloudOpacity;
      uniform vec3 uSunPosition;
      varying vec3 vSkyPosition;

      // Deterministic hash & noise
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
        for(int i = 0; i < 5; i++) {
          val += amp * noise(p);
          p = rot * p + vec2(1.7, 9.2);
          amp *= 0.48;
        }
        return val;
      }

      // Sculpted organic cloud formation with natural volume and lighting
      float cloudFormation(vec2 p, vec2 center, vec2 size, float seed, out float lightVol) {
        vec2 q = (p - center) / size;
        vec2 drift = vec2(uTime * 0.0012, uTime * 0.0003);

        // Organic skyline profile
        float skyline = fbm(vec2(q.x * 1.6 + seed, seed * 0.7) + drift);
        float top = 0.08 + skyline * 0.92;
        float sideFade = 1.0 - smoothstep(0.42, 1.0, abs(q.x + (skyline - 0.5) * 0.28));
        top *= mix(0.55, 1.0, sideFade);

        // Flat stratified base characteristic of dawn marine stratocumulus
        float flatBase = smoothstep(-0.35, -0.08, q.y);
        float topFade = 1.0 - smoothstep(top - 0.28, top + 0.06, q.y);
        float macro = flatBase * topFade * sideFade;

        // Domain warping for billowing cumulus edges
        vec2 warp = vec2(
          fbm(q * 1.8 + seed + drift),
          fbm(q * 1.8 + seed * 1.6 + 4.8 - drift)
        );
        vec2 s = q * vec2(2.2, 3.4) + (warp - 0.5) * 1.6 + vec2(seed * 3.3, seed * 1.4) + drift;
        float large = fbm(s);
        float ridged = 1.0 - abs(fbm(s * 2.2 + 8.5) * 2.0 - 1.0);
        float fine = fbm(q * vec2(7.0, 10.5) + seed * 5.2 - drift * 2.0);

        float shape = macro * 1.1 + (large - 0.5) * 0.85 + (ridged - 0.5) * 0.32 - (1.0 - macro) * 0.18;
        shape -= (1.0 - fine) * (1.0 - macro * 0.82) * 0.36;

        float density = smoothstep(0.32, 0.82, shape);
        density *= smoothstep(0.0, 0.25, macro);

        // Internal volumetric lighting: sunlight from sun direction, top highlights, pearly lavender self-shadowing
        lightVol = clamp(
          0.52 + (q.y - top * 0.3) * 0.75 + (large - 0.5) * 0.85 + (ridged - 0.5) * 0.35,
          0.0, 1.0
        );

        return density;
      }

      void main() {
        vec3 ray = normalize(vSkyPosition - cameraPosition);

        // Water surface horizon at camera height (y=2.65 looking at y=1.2, z=-14)
        // Ray horizon line at infinity
        float horizonLine = -0.055;
        float h = ray.y - horizonLine;

        // ----------------------------------------------------
        // A. CÉU (h >= 0.0)
        // ----------------------------------------------------
        vec3 cZenith = vec3(0.28, 0.29, 0.46);
        vec3 cMidUpper = vec3(0.48, 0.42, 0.55);
        vec3 cMid = vec3(0.66, 0.52, 0.59);
        vec3 cMidWarm = vec3(0.88, 0.62, 0.52);
        vec3 cHorizon = vec3(0.97, 0.72, 0.54);

        vec3 skyColor = mix(cHorizon, cMidWarm, smoothstep(0.0, 0.07, max(h, 0.0)));
        skyColor = mix(skyColor, cMid, smoothstep(0.05, 0.22, max(h, 0.0)));
        skyColor = mix(skyColor, cMidUpper, smoothstep(0.18, 0.55, max(h, 0.0)));
        skyColor = mix(skyColor, cZenith, smoothstep(0.48, 0.95, max(h, 0.0)));

        // Sun calculation
        vec3 sunDir = normalize(uSunPosition - cameraPosition);
        float sunAngle = dot(ray, sunDir);
        float sunDist = length(ray - sunDir);

        // Sun disk with crisp solar limb and soft outer fringe
        float disk = 1.0 - smoothstep(0.0125, 0.0155, sunDist);
        float innerHalo = exp(-sunDist * 16.0);
        float broadGlow = exp(-sunDist * 4.2);
        float corona = pow(max(sunAngle, 0.0), 320.0);

        // Delicate, ethereal solar atmospheric diffusion
        skyColor += vec3(0.12, 0.08, 0.05) * broadGlow;
        skyColor += vec3(0.20, 0.13, 0.08) * innerHalo;
        skyColor += vec3(0.28, 0.20, 0.12) * corona;
        skyColor += vec3(1.4, 1.3, 1.1) * disk;

        // Cloud plane projection
        float forward = max(-ray.z, 0.15);
        vec2 cloudP = vec2(ray.x, ray.y) / forward;

        // Clouds positioned exactly as in reference
        float lightA, lightB, lightC, lightD;
        float cLeft = cloudFormation(cloudP, vec2(-0.16, 0.105), vec2(0.22, 0.085), 2.4, lightA) * 0.96;
        float cRight = cloudFormation(cloudP, vec2(0.22, 0.138), vec2(0.18, 0.072), 6.9, lightB) * 0.88;
        float cLow = cloudFormation(cloudP, vec2(-0.075, 0.042), vec2(0.11, 0.032), 12.1, lightC) * 0.82;
        float cFar = cloudFormation(cloudP, vec2(0.28, 0.065), vec2(0.08, 0.024), 17.5, lightD) * 0.58;

        float totalClouds = 1.0 - (1.0 - cLeft) * (1.0 - cRight) * (1.0 - cLow) * (1.0 - cFar);
        float totalLight = (lightA * cLeft + lightB * cRight + lightC * cLow + lightD * cFar) /
          max(cLeft + cRight + cLow + cFar, 0.001);

        float sunClear = smoothstep(0.035, 0.09, sunDist);
        float frontVis = smoothstep(0.1, 0.45, -ray.z);
        totalClouds *= sunClear * frontVis * smoothstep(0.0, 0.02, h);

        vec3 cloudShadow = vec3(0.72, 0.68, 0.77);
        vec3 cloudWhite = vec3(1.0, 0.985, 0.96);
        vec3 cloudColor = mix(cloudShadow, cloudWhite, smoothstep(0.15, 0.65, totalLight));
        float warmRim = exp(-sunDist * 5.0) * smoothstep(0.25, 0.85, totalLight);
        cloudColor = mix(cloudColor, vec3(1.0, 0.85, 0.72), warmRim * 0.22);
        cloudColor = mix(cloudColor, skyColor, (1.0 - smoothstep(0.0, 0.75, totalClouds)) * 0.24);

        skyColor = mix(skyColor, cloudColor, totalClouds * uCloudOpacity);

        // ----------------------------------------------------
        // B. OCEANO DISTANTE (h < 0.0)
        // ----------------------------------------------------
        float seaDist = max(0.035, abs(h));
        vec2 seaCoords = vec2(ray.x / seaDist, 1.0 / seaDist);

        // Animated ocean surface wave ripple
        float seaW1 = sin(seaCoords.y * 0.16 + uTime * 0.45 + sin(seaCoords.x * 0.10)) * 0.5 + 0.5;
        float seaW2 = sin(seaCoords.x * 0.14 - seaCoords.y * 0.12 + uTime * 0.32) * 0.5 + 0.5;
        float seaFine = noise(seaCoords * 0.35 + vec2(uTime * 0.12, -uTime * 0.08));

        vec3 seaNormal = normalize(vec3(
          (seaW2 - 0.5) * 0.06 + (seaFine - 0.5) * 0.03,
          1.0,
          (seaW1 - 0.5) * 0.09 + (seaFine - 0.5) * 0.03
        ));

        // Deep vibrant teal-azure tone matching target reference
        vec3 oceanDeep = vec3(0.15, 0.38, 0.49);
        vec3 oceanMid = vec3(0.24, 0.48, 0.58);
        vec3 seaColor = mix(oceanDeep, oceanMid, seaW1 * 0.5);

        // Sun glitter path across the distant water
        vec3 seaViewDir = -ray;
        vec3 seaHalf = normalize(sunDir + seaViewDir);
        float seaSpec = pow(max(dot(seaNormal, seaHalf), 0.0), 65.0);
        float sunColumn = exp(-abs(ray.x - sunDir.x) * 16.0);
        vec3 seaGlitter = vec3(1.0, 0.92, 0.82) * seaSpec * sunColumn * 0.38;

        // Gentle dawn sky reflection on sea
        float seaFresnel = 0.04 + 0.96 * pow(1.0 - max(dot(seaNormal, seaViewDir), 0.0), 3.5);
        vec3 seaSkyReflect = mix(cHorizon, cMidWarm, 0.30) * 0.40;
        seaColor = mix(seaColor, seaSkyReflect, seaFresnel * 0.42);
        seaColor += seaGlitter;

        // ----------------------------------------------------
        // C. TRANSIÇÃO ELEGANTE NO HORIZONTE / HAZE
        // ----------------------------------------------------
        float horizonAtmosphere = exp(-abs(h) * 65.0);
        vec3 horizonGlowColor = vec3(0.97, 0.74, 0.58);

        vec3 finalColor;
        if (h >= 0.0) {
          finalColor = mix(skyColor, horizonGlowColor, horizonAtmosphere * 0.18);
        } else {
          // Ocean transitions naturally to horizon haze at the distant waterline
          float oceanHorizonBlend = smoothstep(-0.018, 0.0, h);
          finalColor = mix(seaColor, horizonGlowColor, oceanHorizonBlend * 0.32 + horizonAtmosphere * 0.12);
        }

        gl_FragColor = vec4(finalColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
  skyMesh.name = "dawnSkySphere";
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -100;
  group.add(skyMesh);

  return group;
}