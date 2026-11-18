// 하늘: 여백(종이), 붉은 해, 겹겹이 옅어지는 먼 산, 산허리 운무, 빛.
import * as THREE from 'three';
import { HEX } from '../gfx/palette.js';
import { canvas, canvasTexture } from '../gfx/textures.js';
import { fbm2, mulberry32 } from '../core/util.js';

export function buildSky(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc6b2, 2.35);
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.55);
  sun.position.set(0.5, 0.75, -0.45).normalize();
  scene.add(hemi, sun);

  const group = new THREE.Group(); group.name = 'sky';
  const paper = new THREE.Color(HEX.paper), wash = new THREE.Color(0x4a5566);
  const R = mulberry32(5);
  // 먼 산 세 겹
  [[460, 95, 0.36, 1.3], [610, 150, 0.24, 4.1], [800, 215, 0.14, 7.7]].forEach(([rad, H, a, seed]) => {
    const N = 150, pos = [], col = [], idx = [];
    const top = paper.clone().lerp(wash, a), bot = paper.clone().lerp(wash, a * 0.12);
    for (let i = 0; i <= N; i++) {
      const ang = (i / N) * Math.PI * 2;
      const n = fbm2(Math.cos(ang) * 2.6 + seed, Math.sin(ang) * 2.6 + seed * 1.3, 4);
      const h = H * (0.25 + Math.pow(n, 1.6) * 1.9) * (0.75 + R() * 0.5);
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad - 20;
      pos.push(x, -30, z, x, h, z);
      col.push(bot.r, bot.g, bot.b, top.r, top.g, top.b);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; group.add(m);
  });
  // 붉은 해(일월오봉도의 해)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(74, 40), new THREE.MeshBasicMaterial({ color: HEX.red, fog: false }));
  disc.position.set(520, 430, -1300); disc.lookAt(0, 0, 0); group.add(disc);

  // 운무: 산허리를 가로지르는 여백의 띠
  const cv = canvas(256, 64), g2 = cv.getContext('2d');
  const grd = g2.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 256, 64);
  const hg = g2.createLinearGradient(0, 0, 256, 0);
  hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.25, 'rgba(0,0,0,0)'); hg.addColorStop(0.75, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
  g2.globalCompositeOperation = 'destination-out'; g2.fillStyle = hg; g2.fillRect(0, 0, 256, 64);
  const mistTex = canvasTexture(cv, { clamp: true });
  const mists = [];
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: HEX.paper, transparent: true, opacity: 0.5 + R() * 0.35, depthWrite: false, fog: false }));
    const ang = R() * Math.PI * 2, rad = 120 + R() * 330;
    sp.position.set(Math.cos(ang) * rad, 14 + R() * 46, Math.sin(ang) * rad - 20);
    sp.scale.set(260 + R() * 320, 16 + R() * 26, 1);
    sp.userData.v = (R() - 0.5) * 1.2; sp.renderOrder = 2;
    mists.push(sp); group.add(sp);
  }
  scene.add(group);
  return {
    group, hemi, sun, disc,
    update(dt) { for (const m of mists) { m.position.x += m.userData.v * dt; if (m.position.x > 480) m.position.x = -480; if (m.position.x < -480) m.position.x = 480; } },
  };
}
