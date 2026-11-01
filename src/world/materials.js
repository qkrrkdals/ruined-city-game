// Shared materials. Every world material is patched for height fog and (optionally) wind sway.
import * as THREE from 'three';

export const U = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uFogDensity: { value: 0.007 },
  uFogHeight: { value: 0.055 },
  uFogBase: { value: 0 },
  uFogMinH: { value: 0.22 },
};

const PARS_V = /* glsl */`
#ifdef USE_FOG
varying float vFogDepth; varying vec3 vFogWorld;
#endif
uniform float uTime; uniform float uWind; uniform float uWindAmt; uniform float uWindK;`;

const FOG_V = /* glsl */`
#ifdef USE_FOG
vec4 fogW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
fogW = instanceMatrix * fogW;
#endif
fogW = modelMatrix * fogW;
vFogWorld = fogW.xyz;
vFogDepth = -mvPosition.z;
#endif`;

const WIND_V = /* glsl */`
{
  vec4 ww = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  ww = instanceMatrix * ww;
  #endif
  ww = modelMatrix * ww;
  float wk = clamp(position.y * uWindK, 0.0, 1.0); wk *= wk;
  float ph = uTime * 1.7 + ww.x * 0.31 + ww.z * 0.23;
  float sw = sin(ph) * 0.7 + sin(ph * 2.3 + ww.z * 0.5) * 0.3;
  transformed.x += sw * wk * uWindAmt * uWind;
  transformed.z += cos(ph * 0.83 + ww.x * 0.2) * wk * uWindAmt * uWind * 0.6;
}`;

const PARS_F = /* glsl */`
#ifdef USE_FOG
uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
uniform float uFogDensity; uniform float uFogHeight; uniform float uFogBase; uniform float uFogMinH;
#endif`;

const FOG_F = /* glsl */`
#ifdef USE_FOG
float fdd = vFogDepth * uFogDensity;
float fogF = 1.0 - exp(-fdd * fdd);
float fgh = max(vFogWorld.y - uFogBase, 0.0);
fogF *= mix(uFogMinH, 1.0, exp(-fgh * uFogHeight));
#ifdef FOG_SOFT
fogF *= 0.4;
#endif
#ifdef FOG_FAR
fogF = max(fogF, 0.62);
#endif
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fogF, 0.0, 1.0));
#endif`;

export function patch(mat, o = {}) {
  const wind = o.wind || 0, wk = o.windK || 1, soft = !!o.soft, far = !!o.far;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.uniforms.uWindAmt = { value: wind };
    sh.uniforms.uWindK = { value: wk };
    sh.vertexShader = sh.vertexShader
      .replace('#include <fog_pars_vertex>', PARS_V)
      .replace('#include <fog_vertex>', FOG_V);
    if (wind) sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <fog_pars_fragment>', PARS_F)
      .replace('#include <fog_fragment>', FOG_F);
  };
  if (soft) mat.defines = Object.assign(mat.defines || {}, { FOG_SOFT: '' });
  if (far) mat.defines = Object.assign(mat.defines || {}, { FOG_FAR: '' });
  mat.customProgramCacheKey = () => `w${wind}k${wk}s${soft}f${far}`;
  return mat;
}

export function createMaterials() {
  const lam = (o = {}, p = {}) => patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...o }), p);
  const basic = (o = {}, p = {}) => patch(new THREE.MeshBasicMaterial({ vertexColors: true, ...o }), p);
  return {
    world: lam(),
    tower: lam({}, { soft: true }),
    veg: lam({ side: THREE.DoubleSide }, { wind: 0.16, windK: 1.6 }),
    tall: lam({ side: THREE.DoubleSide }, { wind: 0.2, windK: 0.9 }),
    leaf: lam({ side: THREE.DoubleSide }, { wind: 0.045, windK: 3 }),
    tree: lam({}, { wind: 0.2, windK: 0.13 }),
    cloth: lam({ side: THREE.DoubleSide }, { wind: 0.06, windK: 1 }),
    glow: basic(),
    glowSoft: basic({}, { soft: true }),
  };
}
