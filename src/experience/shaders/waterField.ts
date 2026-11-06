// Shared displacement field: the fragment normal includes finer scales than the mesh.
export const waterField = `
const float WATER_PI = 3.14159265359;

float waterHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float waterNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);

  vec2 smoothLocal =
    local * local * (3.0 - 2.0 * local);

  float a = waterHash(cell);
  float b = waterHash(cell + vec2(1.0, 0.0));
  float c = waterHash(cell + vec2(0.0, 1.0));
  float d = waterHash(cell + vec2(1.0, 1.0));

  return mix(
    mix(a, b, smoothLocal.x),
    mix(c, d, smoothLocal.x),
    smoothLocal.y
  );
}

/*
 * Onda orgânica inspirada em "seascape",
 * mas MUITO mais suave para manter
 * a água etérea do santuário.
 */
float sanctuaryWave(vec2 uv, float choppy) {
  float n =
    (waterNoise(uv * 0.75) - 0.5) * 0.55;

  uv += n;

  vec2 sineShape = 1.0 - abs(sin(uv));
  vec2 cosineShape = abs(cos(uv));

  vec2 waveShape = mix(
    sineShape,
    cosineShape,
    sineShape
  );

  float wave =
    1.0 -
    pow(
      max(waveShape.x * waveShape.y, 0.0),
      0.68
    );

  return pow(max(wave, 0.0), choppy);
}

/*
 * Campo principal da superfície.
 *
 * Importante:
 * não queremos mar revolto.
 * Queremos água mística, translúcida,
 * com movimento orgânico.
 */
float sanctuarySea(vec2 position) {
  vec2 uv = position;
  uv.x *= 0.82;

  float frequency = 0.18;
  float amplitude = 0.15;
  float choppy = 3.5;

  float height = 0.0;
  float time = uTime * 0.52;

  mat2 octaveMatrix = mat2(
    1.55,  1.18,
   -1.18,  1.55
  );

  for (int octave = 0; octave < 4; octave++) {
    float forward = sanctuaryWave(
      (uv + vec2(time, time * 0.72)) * frequency,
      choppy
    );

    float backward = sanctuaryWave(
      (uv - vec2(time * 0.82, time)) * frequency,
      choppy
    );

    height += (forward + backward) * amplitude;

    uv = octaveMatrix * uv;
    frequency *= 1.86;
    amplitude *= 0.38;
    choppy = mix(choppy, 1.0, 0.25);
  }

  /*
   * Centraliza a superfície
   * ao redor do nível da água.
   */
  return height - 0.14;
}

float pointerWaterInteraction(vec2 worldPosition) {
  if (uPointerValid <= 0.001) {
    return 0.0;
  }

  vec2 pointerWorld = vec2(
    (uMouseUv.x - 0.5) * 16.4,
    11.0 - uMouseUv.y * 40.0
  );

  vec2 delta = worldPosition - pointerWorld;
  float distanceToPointer = length(delta);

  /*
   * Influência mais ampla e suave.
   */
  float influence =
    exp(-distanceToPointer * 1.15) * uPointerValid;

  /*
   * Ondulação base do cursor.
   */
  float ripple =
    sin(distanceToPointer * 7.5 - uTime * 1.65) * 0.0035;

  /*
   * Click & Hold:
   * cria anéis maiores e mais mágicos.
   */
  ripple +=
    uHold *
    (
      sin(distanceToPointer * 6.3 - uHoldTime * 1.85) * 0.0065 +
      sin(distanceToPointer * 3.8 - uHoldTime * 1.15) * 0.0025
    );

  /*
   * Wake: pequeno arrasto pela velocidade do mouse.
   */
  vec2 safeDelta =
    normalize(delta + vec2(0.0001));

  float wake =
    dot(uPointerVelocity, safeDelta) * 0.0014;

  return (ripple + wake) * influence;
}

float waterHeight(vec2 position) {
  float sea = sanctuarySea(position);

  /*
   * Micro irregularidade:
   * evita aparência artificial/perfeita demais.
   */
  float microNoise =
    (waterNoise(
      position * 1.75 +
      vec2(uTime * 0.035, -uTime * 0.027)
    ) - 0.5) * 0.004;

  float interaction =
    pointerWaterInteraction(position);

  return sea + microNoise + interaction;
}
`;