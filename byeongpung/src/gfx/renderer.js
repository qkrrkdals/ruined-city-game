// 렌더러 + 수묵 후처리(깊이 기반 먹선, 한지 결, 여백/먹 번짐 효과).
import * as THREE from 'three';
import { HEX } from './palette.js';
import { paperTexture } from './textures.js';

export const QUALITY = {
  low: { pr: 0.7, msaa: 0, density: 0.45 },
  medium: { pr: 1, msaa: 0, density: 0.75 },
  high: { pr: 1.5, msaa: 4, density: 1 },
};

const POST_V = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_F = /* glsl */`
#include <common>
#include <packing>
uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tPaper;
uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uTime;
uniform float uBlank; uniform float uHurt; uniform float uLow; uniform float uFade; uniform vec3 uFadeCol;
uniform float uLine; uniform vec3 uPaper; uniform vec3 uInk; uniform float uBars; uniform float uGold;
varying vec2 vUv;
float invZ(vec2 uv) { return -1.0 / perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
void main() {
  vec2 px = 1.0 / uRes;
  vec2 puv = gl_FragCoord.xy / 512.0;
  vec3 pap = texture2D(tPaper, puv).rgb;
  vec2 wob = (texture2D(tPaper, puv * 0.37 + 0.11).gb - 0.5) * 2.6 * px;
  vec3 col = texture2D(tColor, vUv).rgb;
  // 여백: 색이 빠지고 선만 남는다(붉은색·쪽빛은 남긴다)
  float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  col = mix(col, mix(uPaper, col, smoothstep(0.2, 0.5, sat)), uBlank);
  // 먹선: 1/z 의 2차 미분(평면에서는 0)
  vec2 e = vUv + wob;
  vec2 o = px * max(uLine * (0.7 + pap.g) * (uRes.y / 900.0), 1.0);
  float c = invZ(e);
  float lap = abs(invZ(e + vec2(o.x, 0.0)) + invZ(e - vec2(o.x, 0.0)) - 2.0 * c) + abs(invZ(e + vec2(0.0, o.y)) + invZ(e - vec2(0.0, o.y)) - 2.0 * c);
  float zc = 1.0 / c;
  float edge = smoothstep(0.01, 0.04, lap * zc);
  edge *= mix(1.0, 0.2, smoothstep(30.0, 380.0, zc)) * (0.72 + pap.b * 0.5);
  col = mix(col, uInk, clamp(edge, 0.0, 1.0) * 0.88);
  // 한지 결
  col *= mix(1.0, pap.r * 1.09, 0.6);
  // 오래된 종이 가장자리
  vec2 q = vUv - 0.5;
  float vg = smoothstep(0.42, 0.98, length(q * vec2(1.0, 1.15)));
  col = mix(col, col * vec3(0.84, 0.78, 0.66), vg * 0.7);
  col = mix(col, vec3(0.42, 0.05, 0.03), vg * uLow * (0.55 + 0.45 * sin(uTime * 5.0)) * 0.55);
  col += vec3(0.25, 0.18, 0.04) * uGold * (1.0 - vg);
  // 맞았을 때 가장자리에서 번져 드는 먹
  float nb = texture2D(tPaper, vUv * vec2(1.7, 0.95) + 0.3).b;
  float blot = smoothstep(1.02 - uHurt * 0.7, 1.24 - uHurt * 0.7, length(q * vec2(1.0, 1.2)) * 1.6 + (nb - 0.5) * 0.55);
  col = mix(col, uInk, blot * 0.93 * step(0.001, uHurt));
  // 연출용 위아래 먹 띠
  float by = min(vUv.y, 1.0 - vUv.y) + (pap.g - 0.5) * 0.014;
  col = mix(col, uInk, (1.0 - smoothstep(uBars * 0.11 - 0.004, uBars * 0.11 + 0.004, by)) * step(0.001, uBars));
  col = mix(col, uFadeCol, uFade);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function createGfx(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = true;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HEX.paper);
  scene.fog = new THREE.Fog(HEX.paper, 70, 330);
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.25, 1800);
  scene.add(camera);

  let rt = null;
  const post = new THREE.ShaderMaterial({
    vertexShader: POST_V, fragmentShader: POST_F, depthTest: false, depthWrite: false,
    uniforms: {
      tColor: { value: null }, tDepth: { value: null }, tPaper: { value: paperTexture() },
      uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: camera.near }, uFar: { value: camera.far }, uTime: { value: 0 },
      uBlank: { value: 0 }, uHurt: { value: 0 }, uLow: { value: 0 }, uFade: { value: 1 }, uFadeCol: { value: new THREE.Color(HEX.paper) },
      uLine: { value: 1.25 }, uPaper: { value: new THREE.Color(HEX.white) }, uInk: { value: new THREE.Color(HEX.ink) }, uBars: { value: 0 }, uGold: { value: 0 },
    },
  });
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const postMesh = new THREE.Mesh(tri, post); postMesh.frustumCulled = false;
  const postScene = new THREE.Scene(); postScene.add(postMesh);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const gfx = {
    renderer, scene, camera, pu: post.uniforms, qName: 'medium', q: QUALITY.medium, w: 1, h: 1,
    makeTarget() {
      if (rt) { rt.depthTexture.dispose(); rt.dispose(); }
      const half = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
      rt = new THREE.WebGLRenderTarget(4, 4, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: this.q.msaa, depthBuffer: true });
      rt.depthTexture = new THREE.DepthTexture(4, 4);
      rt.depthTexture.type = THREE.UnsignedIntType;
      rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
      post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture;
    },
    resize() {
      const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight);
      const pr = Math.min(window.devicePixelRatio || 1, 2) * (this.qName === 'high' ? 1 : this.q.pr);
      const ppr = this.qName === 'high' ? Math.min(pr, 1.5) : Math.min(pr, 1.25);
      renderer.setPixelRatio(ppr); renderer.setSize(w, h, false);
      canvas.style.width = '100%'; canvas.style.height = '100%';
      const bw = Math.round(w * ppr), bh = Math.round(h * ppr);
      rt.setSize(bw, bh);
      post.uniforms.uRes.value.set(bw, bh);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      this.w = w; this.h = h;
    },
    setQuality(name) {
      this.qName = QUALITY[name] ? name : 'medium'; this.q = QUALITY[this.qName];
      this.makeTarget(); this.resize();
    },
    render() {
      renderer.info.reset();
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
    // 미리 셰이더를 컴파일(첫 등장 때 끊기지 않게)
    warm() { try { renderer.compile(scene, camera); } catch (e) { /* 무시 */ } },
  };
  gfx.makeTarget(); gfx.resize();
  window.addEventListener('resize', () => gfx.resize());
  return gfx;
}
