const transitionFragmentShader = `
precision highp float;

uniform sampler2D uHomeTexture;
uniform sampler2D uProjectsTexture;

uniform float uProgress;
uniform float uTime;

varying vec2 vUv;

void main() {
  // ==========================================
  // PROGRESSO DA TRANSIÇÃO
  //
  // 0.0 = Home
  // 1.0 = Projects
  // ==========================================

  float progress = smoothstep(
    0.0,
    1.0,
    uProgress
  );

  // Fica mais forte no meio do mergulho
  // e volta a zero no começo/fim.

  float transitionStrength =
    sin(
      progress *
      3.14159265
    );

  // ==========================================
  // POSIÇÃO DA TELA
  // ==========================================

  vec2 centeredUv =
    vUv - 0.5;

  float distanceFromCenter =
    length(
      centeredUv
    );

  // ==========================================
  // ONDULAÇÃO / ÁGUA
  // ==========================================

  float waterWave =
    sin(
      vUv.y * 28.0 -
      uTime * 2.0 +
      distanceFromCenter * 12.0
    );

  waterWave *=
    0.009 *
    transitionStrength;

  // ==========================================
  // SENSAÇÃO DE MERGULHO VERTICAL
  // ==========================================

  float verticalPull =
    (
      progress -
      0.5
    ) *
    0.028 *
    transitionStrength;

  // ==========================================
  // DISTORÇÃO DA HOME
  // ==========================================

  vec2 homeUv =
    vUv +
    vec2(
      waterWave *
      (
        1.0 +
        distanceFromCenter
      ),
      verticalPull
    );

  // ==========================================
  // DISTORÇÃO DE PROJECTS
  // ==========================================

  vec2 projectsUv =
    vUv -
    vec2(
      waterWave * 0.75,
      verticalPull * 0.6
    );

  // ==========================================
  // ABERRAÇÃO CROMÁTICA
  //
  // Separa levemente R/G/B no meio
  // da transição.
  // ==========================================

  float chromaticOffset =
    0.0035 *
    transitionStrength;

  float homeRed =
    texture2D(
      uHomeTexture,
      homeUv +
      vec2(
        chromaticOffset,
        0.0
      )
    ).r;

  float homeGreen =
    texture2D(
      uHomeTexture,
      homeUv
    ).g;

  float homeBlue =
    texture2D(
      uHomeTexture,
      homeUv -
      vec2(
        chromaticOffset,
        0.0
      )
    ).b;

  vec3 homeColor =
    vec3(
      homeRed,
      homeGreen,
      homeBlue
    );

  // ==========================================
  // PROJECTS
  // ==========================================

  vec3 projectColor =
    texture2D(
      uProjectsTexture,
      projectsUv
    ).rgb;

  // ==========================================
  // MÁSCARA DA TRANSIÇÃO
  // ==========================================

  float transitionMask =
    smoothstep(
      0.18,
      0.84,
      progress +
      waterWave * 7.0 +
      (
        0.5 -
        vUv.y
      ) * 0.07
    );

  // Mistura Home e Projects

  vec3 finalColor =
    mix(
      homeColor,
      projectColor,
      transitionMask
    );

  // ==========================================
  // ESCURECIMENTO DO MERGULHO
  // ==========================================

  finalColor *=
    1.0 -
    transitionStrength *
    0.12;

  // ==========================================
  // TOM AZUL DURANTE A TRAVESSIA
  // ==========================================

  finalColor =
    mix(
      finalColor,
      vec3(
        0.04,
        0.10,
        0.22
      ),
      transitionStrength *
      0.08
    );

  // ==========================================
  // RESULTADO FINAL
  // ==========================================

  gl_FragColor =
    vec4(
      finalColor,
      1.0
    );
}
`;

export default transitionFragmentShader;