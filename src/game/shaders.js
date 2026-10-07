/**
 * GLSL sources for the water effects. Phaser 4 Shader conventions:
 * `outTexCoord` is 0..1 across the quad with y = 0 at the BOTTOM.
 */

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`

export const SPRING_COUNT = 32

/**
 * Rising water seen from the side, drawn together with the backdrop it
 * floods (so it can refract it).
 *
 * iChannel0  backdrop (cover-mapped via uBgRect)
 * iChannel1  tiling water normal map
 * uLevel     water height 0..1 (from the bottom of the quad)
 * uSprings   per-column surface displacement from the spring simulation
 * uFreeze    0..1 ice amount
 * uAspect    quad width / height
 * uPx        size of one screen pixel in quad uv (y), for anti-aliasing
 */
export const WATER_FRAG = `${PRECISION}
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float uTime;
uniform float uLevel;
uniform float uSprings[${SPRING_COUNT}];
uniform float uFreeze;
uniform float uAspect;
uniform float uPx;
uniform float uWave;
uniform vec4 uBgRect;
uniform vec3 uDeep;
uniform vec3 uShallow;
varying vec2 outTexCoord;

float springAt(float x) {
  float fx = clamp(x, 0.0, 1.0) * ${SPRING_COUNT - 1}.0;
  float i0 = floor(fx);
  float f = fx - i0;
  float a = 0.0;
  float b = 0.0;
  for (int i = 0; i < ${SPRING_COUNT}; i++) {
    float fi = float(i);
    if (fi == i0) a = uSprings[i];
    if (fi == i0 + 1.0) b = uSprings[i];
  }
  if (i0 >= ${SPRING_COUNT - 1}.0) b = a;
  return mix(a, b, f * f * (3.0 - 2.0 * f));
}

float surfaceAt(float x) {
  float t = uTime;
  float w = sin(x * 11.0 * uAspect + t * 1.6) * 0.0045
          + sin(x * 23.0 * uAspect - t * 2.3) * 0.0025
          + sin(x * 4.0 * uAspect + t * 0.7) * 0.0035;
  return uLevel + springAt(x) + w * uWave;
}

vec3 bg(vec2 uv) {
  vec2 tuv = uBgRect.xy + clamp(uv, 0.001, 0.999) * uBgRect.zw;
  return texture2D(iChannel0, tuv).rgb;
}

float caustics(vec2 p, float t) {
  vec2 q = p;
  float c = 0.0;
  c += sin(q.x * 7.0 + t * 1.3 + sin(q.y * 5.0 + t * 0.9) * 1.7);
  c += sin(q.y * 9.0 - t * 1.1 + sin(q.x * 6.0 - t * 1.2) * 1.5);
  c += sin((q.x + q.y) * 6.0 + t * 0.8);
  c = abs(c) / 3.0;
  return pow(1.0 - c, 6.0);
}

void main() {
  vec2 p = outTexCoord;
  float t = uTime;
  float surf = surfaceAt(p.x);
  float d = surf - p.y;
  vec3 above = bg(p);

  // Fast path: dry pixels.
  if (d < -uPx * 2.0) {
    gl_FragColor = vec4(above, 1.0);
    return;
  }

  float depth = max(d, 0.0);
  vec2 np = vec2(p.x * uAspect, p.y);
  vec2 n1 = texture2D(iChannel1, fract(np * 1.3 + vec2(t * 0.035, t * 0.022))).rg * 2.0 - 1.0;
  vec2 n2 = texture2D(iChannel1, fract(np * 2.1 - vec2(t * 0.027, -t * 0.031))).rg * 2.0 - 1.0;
  vec2 n = (n1 + n2) * 0.5 * (1.0 - uFreeze * 0.85);

  // Refracted backdrop, absorbed with depth (red goes first, like real water).
  float refr = 0.010 + 0.012 * min(depth * 5.0, 1.0);
  vec3 under = bg(p + n * refr);
  vec3 absorb = exp(-vec3(3.4, 1.25, 0.85) * (depth * 1.6 + 0.25));
  float scatter = 1.0 - exp(-depth * 2.6 - 0.35);
  vec3 waterCol = mix(uShallow, uDeep, clamp(depth * 1.5, 0.0, 1.0));
  vec3 col = under * absorb + waterCol * scatter;

  // Caustics + light shafts fading with depth.
  float ca = caustics(np * 7.0 + n * 0.6, t * 1.2);
  col += vec3(0.55, 0.85, 1.0) * ca * 0.28 * exp(-depth * 3.0) * (1.0 - uFreeze);
  float shafts = sin((p.x * uAspect + p.y * 0.35) * 14.0 + sin(t * 0.4) * 2.0) * 0.5 + 0.5;
  shafts *= sin((p.x * uAspect - p.y * 0.2) * 5.0 - t * 0.3) * 0.5 + 0.5;
  col += vec3(0.7, 0.9, 1.0) * pow(shafts, 3.0) * 0.10 * exp(-depth * 2.2);

  // Floor shadow so the deep end reads as volume.
  col *= mix(0.62, 1.0, smoothstep(0.0, 0.45, p.y + (1.0 - uLevel) * 0.2));

  // Surface: bright foam band + specular glints from the normal map.
  float band = uPx * 3.0 + 0.004;
  float foamNoise = texture2D(iChannel1, fract(vec2(p.x * uAspect * 3.0 + t * 0.06, t * 0.05))).b;
  float foam = smoothstep(band + 0.012 * foamNoise, 0.0, depth);
  col = mix(col, vec3(0.93, 0.98, 1.0), foam * 0.75);
  float glint = pow(max(0.0, n.x * 0.7 + n.y * 0.7), 6.0) * smoothstep(0.08, 0.0, depth);
  col += vec3(1.0) * glint * 0.45 * (1.0 - uFreeze);

  // Ice.
  if (uFreeze > 0.001) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 ice = mix(vec3(lum), vec3(0.78, 0.92, 1.0), 0.55) + 0.12;
    vec2 cp = np * 9.0;
    float cracks = abs(sin(cp.x + sin(cp.y * 1.7) * 1.3)) * abs(sin(cp.y * 1.3 + sin(cp.x * 0.9) * 1.6));
    ice += vec3(0.25) * smoothstep(0.05, 0.0, cracks) * 0.6;
    ice += vec3(0.35) * smoothstep(0.06, 0.0, depth);
    col = mix(col, ice, uFreeze);
  }

  // Anti-aliased waterline.
  float a = smoothstep(-uPx * 1.5, uPx * 0.5, d);
  gl_FragColor = vec4(mix(above, col, a), 1.0);
}
`

/**
 * Animated ocean for the adventure map: gentle refraction of the sea
 * texture plus moving sun glitter.
 */
export const OCEAN_FRAG = `${PRECISION}
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float uTime;
uniform vec4 uBgRect;
uniform float uAspect;
varying vec2 outTexCoord;

void main() {
  vec2 p = outTexCoord;
  float t = uTime;
  vec2 np = vec2(p.x * uAspect, p.y);
  vec2 n1 = texture2D(iChannel1, fract(np * 1.6 + vec2(t * 0.012, t * 0.008))).rg * 2.0 - 1.0;
  vec2 n2 = texture2D(iChannel1, fract(np * 2.7 - vec2(t * 0.010, -t * 0.013))).rg * 2.0 - 1.0;
  vec2 n = (n1 + n2) * 0.5;
  vec2 uv = uBgRect.xy + clamp(p + n * 0.006, 0.0, 1.0) * uBgRect.zw;
  vec3 col = texture2D(iChannel0, uv).rgb;
  float glitter = pow(max(0.0, n.x * 0.6 + n.y * 0.8), 10.0);
  col += vec3(1.0, 0.98, 0.9) * glitter * 0.55;
  float waves = sin((np.x + np.y * 0.6) * 30.0 + t * 1.1 + n.x * 3.0) * 0.5 + 0.5;
  col += vec3(0.6, 0.85, 1.0) * pow(waves, 18.0) * 0.12;
  gl_FragColor = vec4(col, 1.0);
}
`
