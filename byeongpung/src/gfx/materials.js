// 공용 재질. 모든 월드 재질에 "담채 복원(색 번짐)"·안개 낀 산자락·바람·번쩍임을 덧붙인다.
import * as THREE from 'three';

const MAX_SRC = 8;
export const U = {
  uTime: { value: 0 },
  uSat: { value: 0 },                 // 전체 채도(결말에서 1)
  uRestore: { value: Array.from({ length: MAX_SRC }, () => new THREE.Vector4(0, 0, 0, 0)) }, // x,z,반경,세기
  uMistY: { value: 0 },               // 발밑 높이(산자락 안개 기준)
  uWind: { value: 1 },
};

const V_PARS = /* glsl */`
varying vec3 vBpWorld;
uniform float uTime; uniform float uWind; uniform float uWindAmt; uniform float uWindK;`;
const V_WIND = /* glsl */`
#ifdef BP_WIND
{
  vec4 ww = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  ww = instanceMatrix * ww;
  #endif
  ww = modelMatrix * ww;
  float wk = clamp(position.y * uWindK, 0.0, 1.0); wk *= wk;
  float ph = uTime * 1.5 + ww.x * 0.27 + ww.z * 0.21;
  float sw = sin(ph) * 0.7 + sin(ph * 2.3 + ww.z * 0.5) * 0.3;
  transformed.x += sw * wk * uWindAmt * uWind;
  transformed.z += cos(ph * 0.83 + ww.x * 0.2) * wk * uWindAmt * uWind * 0.6;
}
#endif`;
const V_WORLD = /* glsl */`
{
  vec4 bw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  bw = instanceMatrix * bw;
  #endif
  bw = modelMatrix * bw;
  vBpWorld = bw.xyz;
}`;
const F_PARS = /* glsl */`
varying vec3 vBpWorld;
uniform float uSat; uniform vec4 uRestore[${MAX_SRC}]; uniform float uMistY; uniform float uFlash; uniform vec3 uFlashCol; uniform float uRim; uniform float uTime;
float bpHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;
// opaque_fragment 뒤: 번쩍임 → 테두리 빛 → 먹빛/담채
const F_MAIN = /* glsl */`
#ifdef BP_NEARFADE
{ float nd = distance(vBpWorld, cameraPosition); if (nd < 4.2 && bpHash(gl_FragCoord.xy) > (nd - 1.2) / 3.0) discard; }
#endif
#ifdef BP_RIM
{ float rm = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))); gl_FragColor.rgb += vec3(0.62, 0.6, 0.56) * pow(rm, 2.2) * uRim; }
#endif
gl_FragColor.rgb = mix(gl_FragColor.rgb, uFlashCol, uFlash);
#ifndef BP_KEEP
{
  float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  float wob = sin(vBpWorld.x * 0.23 + vBpWorld.z * 0.11) * 3.0 + sin(vBpWorld.z * 0.37 - vBpWorld.x * 0.19) * 2.0;
  float rs = uSat;
  for (int i = 0; i < ${MAX_SRC}; i++) { vec4 s = uRestore[i]; float d = distance(vBpWorld.xz, s.xy) + wob; rs = max(rs, s.w * (1.0 - smoothstep(s.z * 0.8, s.z, d))); }
  vec3 wash = lum * vec3(1.045, 0.99, 0.9);
  gl_FragColor.rgb = mix(wash, gl_FragColor.rgb, clamp(rs, 0.0, 1.0));
}
#endif`;
// 안개: 먼 곳은 여백으로. 산자락(낮은 곳)에는 안개가 더 낀다.
const F_FOG = /* glsl */`
#ifdef USE_FOG
{
  float ff = smoothstep(fogNear, fogFar, vFogDepth);
  float low = 1.0 - smoothstep(uMistY + 1.0, uMistY + 16.0, vBpWorld.y);
  ff = max(ff, low * smoothstep(34.0, 150.0, vFogDepth) * 0.72);
  #ifdef BP_FOGLESS
  ff *= 0.35;
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ff);
}
#endif`;

// o: { wind, windK, keep(색 유지), rim(먹 윤기), nearFade(카메라 가까이 흩어짐), fogless }
export function patch(mat, o = {}) {
  const defs = {};
  if (o.wind) defs.BP_WIND = '';
  if (o.keep) defs.BP_KEEP = '';
  if (o.rim) defs.BP_RIM = '';
  if (o.nearFade) defs.BP_NEARFADE = '';
  if (o.fogless) defs.BP_FOGLESS = '';
  mat.defines = Object.assign(mat.defines || {}, defs);
  mat.userData.uFlash = { value: 0 };
  mat.userData.uFlashCol = { value: new THREE.Color(0xfbf8f0) };
  mat.userData.uRim = { value: o.rim || 0 };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.uniforms.uWindAmt = { value: o.wind || 0 };
    sh.uniforms.uWindK = { value: o.windK || 1 };
    sh.uniforms.uFlash = mat.userData.uFlash;
    sh.uniforms.uFlashCol = mat.userData.uFlashCol;
    sh.uniforms.uRim = mat.userData.uRim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + V_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + V_WIND)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + V_WORLD);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + F_PARS)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n' + F_MAIN)
      .replace('#include <fog_fragment>', F_FOG);
  };
  const keyStr = `bp:${o.wind || 0}:${o.windK || 1}:${Object.keys(defs).join(',')}`;
  mat.customProgramCacheKey = () => keyStr;
  return mat;
}

const lam = (p = {}, o = {}) => patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...p }), o);

// 여러 곳에서 함께 쓰는 재질
export const MAT = {};
export function createMaterials() {
  Object.assign(MAT, {
    world: lam(),                                             // 지형·바위·건물
    keep: lam({}, { keep: true }),                            // 번져도 색을 잃지 않는 것(인주·금박)
    tree: lam({}, { wind: 0.22, windK: 0.14, nearFade: true }),
    leaf: lam({ side: THREE.DoubleSide }, { wind: 0.3, windK: 0.5, nearFade: true }),
    grass: lam({ side: THREE.DoubleSide }, { wind: 0.2, windK: 1.6 }),
    reed: lam({ side: THREE.DoubleSide }, { wind: 0.34, windK: 0.6, nearFade: true }),
    cloth: lam({ side: THREE.DoubleSide }, { wind: 0.07, windK: 1.2 }),
  });
  return MAT;
}
// 개체(주인공·적·NPC)마다 따로 번쩍일 수 있게 재질을 새로 만든다
export const entityMat = (o = {}) => lam({ side: o.double ? THREE.DoubleSide : THREE.FrontSide }, o);
export const basicMat = (p = {}, o = {}) => patch(new THREE.MeshBasicMaterial({ vertexColors: true, ...p }), o);

export function setRestore(i, x, z, radius, strength) { U.uRestore.value[i].set(x, z, radius, strength); }
