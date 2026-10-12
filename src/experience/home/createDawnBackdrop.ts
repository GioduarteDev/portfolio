import * as THREE from "three";

import type {
  QualityMode,
} from "../core/quality";

export function createDawnBackdrop(
  mode: QualityMode = "high",
) {
  const geometry =
    new THREE.SphereGeometry(
      80,
      32,
      20,
    );

  const material =
    new THREE.ShaderMaterial({
      name: "procedural dawn",

      side: THREE.BackSide,

      depthWrite: false,

      fog: false,

      uniforms: {
        uTime: {
          value: 0,
        },

        uCloudOpacity: {
          value:
            mode === "low"
              ? 0.68
              : 0.80,
        },
      },

      vertexShader: `
        varying vec3 vSkyPosition;

        void main() {
          vec4 world =
            modelMatrix *
            vec4(
              position,
              1.0
            );

          vSkyPosition =
            world.xyz;

          gl_Position =
            projectionMatrix *
            viewMatrix *
            world;
        }
      `,

      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uCloudOpacity;

        varying vec3 vSkyPosition;

        float cloudHash(
          vec2 p
        ) {
          vec3 p3 =
            fract(
              vec3(p.xyx) *
              0.1031
            );

          p3 +=
            dot(
              p3,
              p3.yzx + 33.33
            );

          return fract(
            (
              p3.x +
              p3.y
            ) *
            p3.z
          );
        }

        float cloudNoise(
          vec2 p
        ) {
          vec2 i =
            floor(p);

          vec2 f =
            fract(p);

          f =
            f *
            f *
            (
              3.0 -
              2.0 * f
            );

          float a =
            cloudHash(i);

          float b =
            cloudHash(
              i +
              vec2(1.0, 0.0)
            );

          float c =
            cloudHash(
              i +
              vec2(0.0, 1.0)
            );

          float d =
            cloudHash(
              i +
              vec2(1.0, 1.0)
            );
                      return mix(
            mix(a, b, f.x),
            mix(c, d, f.x),
            f.y
          );
        }

        float cloudFbm(
          vec2 p
        ) {
          float value = 0.0;
          float amplitude = 0.5;

          mat2 rotation =
            mat2(
              1.62,
              1.18,
              -1.18,
              1.62
            );

          for (
            int i = 0;
            i < 5;
            i++
          ) {
            value +=
              cloudNoise(p) *
              amplitude;

            p =
              rotation *
              p +
              vec2(
                1.73,
                2.41
              );

            amplitude *=
              0.48;
          }

          return value;
        }

        /*
         * Formação de nuvem integrada ao céu.
         * Macro silhueta horizontal com topo
         * irregular e base achatada, esculpida
         * por FBM deformado, ridged e erosão.
         * "light" retorna iluminação (0 = sombra).
         */
        float cloudFormation(
          vec2 point,
          vec2 center,
          vec2 size,
          float seed,
          out float light
        ) {
          vec2 q =
            (point - center) / size;

          vec2 drift =
            vec2(
              uTime * 0.0016,
              uTime * 0.0004
            );

          // Perfil do topo: elevações assimétricas por coluna.
          float skyline =
            cloudFbm(
              vec2(
                q.x * 1.7 + seed,
                seed * 0.61
              ) +
              drift
            );

          float top =
            0.05 +
            skyline * 0.95;

          float sideFade =
            1.0 -
            smoothstep(
              0.45,
              1.0,
              abs(q.x + (skyline - 0.5) * 0.25)
            );

          top *=
            mix(0.55, 1.0, sideFade);

          float flatBase =
            smoothstep(-0.34, -0.10, q.y);

          float topFade =
            1.0 -
            smoothstep(
              top - 0.30,
              top + 0.06,
              q.y
            );

          float macro =
            flatBase *
            topFade *
            sideFade;

          // Deformação de domínio para quebrar formas redondas.
          vec2 w =
            vec2(
              cloudFbm(q * 1.9 + seed + drift),
              cloudFbm(q * 1.9 + seed * 1.7 + 5.2 - drift)
            );

          vec2 s =
            q * vec2(2.3, 3.6) +
            (w - 0.5) * 1.5 +
            vec2(seed * 3.1, seed * 1.3) +
            drift;

          float large =
            cloudFbm(s);

          float ridged =
            1.0 -
            abs(
              cloudFbm(s * 2.1 + 9.7) * 2.0 - 1.0
            );

          float fine =
            cloudFbm(
              q * vec2(7.5, 11.0) +
              seed * 5.0 -
              drift * 2.0
            );

          float shape =
            macro * 1.05 +
            (large - 0.5) * 0.85 +
            (ridged - 0.5) * 0.30 -
            (1.0 - macro) * 0.15;

          // Erosão forte nas bordas, fraca no corpo.
          shape -=
            (1.0 - fine) *
            (1.0 - macro * 0.8) *
            0.38;

          float density =
            smoothstep(0.30, 0.82, shape);

          density *=
            smoothstep(0.0, 0.25, macro);

          // Topo iluminado, base mais fria, textura interna.
          light =
            clamp(
              0.55 +
              (q.y - top * 0.35) * 0.75 +
              (large - 0.5) * 0.9 +
              (ridged - 0.5) * 0.35,
              0.0,
              1.0
            );

          return density;
        }

        void main() {
          vec3 ray =
            normalize(
              vSkyPosition -
              cameraPosition
            );

          float height =
            max(
              ray.y,
              0.0
            );

          vec3 peach =
            vec3(
              0.86,
              0.64,
              0.53
            );

          vec3 pink =
            vec3(
              0.68,
              0.57,
              0.66
            );

          vec3 lilac =
            vec3(
              0.38,
              0.43,
              0.62
            );

          vec3 blue =
            vec3(
              0.12,
              0.23,
              0.43
            );

          vec3 sky =
            mix(
              peach,
              pink,
              smoothstep(
                0.01,
                0.12,
                height
              )
            );

          sky =
            mix(
              sky,
              lilac,
              smoothstep(
                0.08,
                0.34,
                height
              )
            );

          sky =
            mix(
              sky,
              blue,
              smoothstep(
                0.28,
                0.85,
                height
              )
            );
                      vec3 sunDirection =
            normalize(
              vec3(
                0.08,
                0.012,
                -1.0
              )
            );

          float sunDistance =
            length(
              ray -
              sunDirection
            );

          float glow =
            exp(
              -sunDistance *
              11.2
            );

          float disk =
            1.0 -
            smoothstep(
              0.008,
              0.013,
              sunDistance
            );

          sky +=
            vec3(
              0.25,
              0.16,
              0.085
            ) *
            glow;

          sky +=
            vec3(
              1.4,
              1.15,
              0.8
            ) *
            disk;

          float warmHorizon =
            exp(
              -abs(
                ray.y -
                0.015
              ) *
              25.0
            );

          sky +=
            vec3(
              0.045,
              0.015,
              0.002
            ) *
            warmHorizon;

          float haze =
            exp(
              -abs(
                ray.y -
                0.01
              ) *
              24.0
            );

          sky =
            mix(
              sky,
              vec3(
                0.94,
                0.81,
                0.74
              ),
              haze * 0.18
            );

          /*
           * Projeta o céu distante
           * em um plano virtual.
           */
          float forward =
            max(
              -ray.z,
              0.18
            );

          vec2 cloudPoint =
            vec2(
              ray.x,
              ray.y
            ) /
            forward;

          /*
           * Quatro formações perto do sol,
           * afastadas das laterais.
           */
          float lightA;
          float lightB;
          float lightC;
          float lightD;

          float cloudLeft =
            cloudFormation(
              cloudPoint,
              vec2(-0.17, 0.095),
              vec2(0.22, 0.085),
              2.3,
              lightA
            ) * 0.95;

          float cloudRight =
            cloudFormation(
              cloudPoint,
              vec2(0.225, 0.145),
              vec2(0.19, 0.075),
              7.1,
              lightB
            ) * 0.88;

          float cloudLow =
            cloudFormation(
              cloudPoint,
              vec2(-0.085, 0.035),
              vec2(0.12, 0.034),
              11.8,
              lightC
            ) * 0.80;

          float cloudFar =
            cloudFormation(
              cloudPoint,
              vec2(0.30, 0.068),
              vec2(0.075, 0.024),
              16.4,
              lightD
            ) * 0.55;

          float clouds =
            1.0 -
            (1.0 - cloudLeft) *
            (1.0 - cloudRight) *
            (1.0 - cloudLow) *
            (1.0 - cloudFar);

          float cloudLight =
            (
              lightA * cloudLeft +
              lightB * cloudRight +
              lightC * cloudLow +
              lightD * cloudFar
            ) /
            max(
              cloudLeft + cloudRight + cloudLow + cloudFar,
              0.001
            );

          /*
           * Não deixa as nuvens
           * cobrirem o disco solar.
           */
          float sunClear =
            smoothstep(
              0.055,
              0.125,
              sunDistance
            );

          float frontVisibility =
            smoothstep(
              0.12,
              0.50,
              -ray.z
            );

          clouds *=
            sunClear *
            frontVisibility;

          /*
           * Branco quente na luz, sombra
           * cinza-lavanda sutil, pêssego
           * mínimo voltado ao sol.
           */
          vec3 cloudShadow =
            vec3(0.78, 0.76, 0.83);

          vec3 cloudWhite =
            vec3(1.0, 0.99, 0.972);

          vec3 cloudColor =
            mix(
              cloudShadow,
              cloudWhite,
              smoothstep(0.12, 0.62, cloudLight)
            );

          float warmCloud =
            exp(
              -sunDistance *
              6.0
            ) *
            smoothstep(0.35, 0.8, cloudLight);

          cloudColor =
            mix(
              cloudColor,
              vec3(1.0, 0.835, 0.737),
              warmCloud * 0.16
            );

          // Regiões finas assumem um pouco do céu.
          cloudColor =
            mix(
              cloudColor,
              sky,
              (1.0 - smoothstep(0.0, 0.7, clouds)) * 0.28
            );

          sky =
            mix(
              sky,
              cloudColor,
              clouds *
              uCloudOpacity
            );

          gl_FragColor =
            vec4(
              sky,
              1.0
            );

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

  const sky =
    new THREE.Mesh(
      geometry,
      material,
    );

  sky.name =
    "dawnBackdrop";

  sky.frustumCulled =
    false;

  sky.renderOrder =
    -100;

  /*
   * Movimento extremamente lento.
   * Não precisamos alterar HomeScene.
   */
  sky.onBeforeRender =
    () => {
      material.uniforms
        .uTime
        .value =
          performance.now() *
          0.001;
    };

  return sky;
}