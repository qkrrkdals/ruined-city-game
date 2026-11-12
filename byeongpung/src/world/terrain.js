// 지형 메시(구역별 색·붓자국 질감), 늪 물, 개울.
import * as THREE from 'three';
import { F } from './field.js';
import { BOUNDS, WATER, STREAM, NODES } from './layout.js';
import { GROUND, COL } from '../gfx/palette.js';
import { patch, MAT } from '../gfx/materials.js';
import { strokeDetailTexture } from '../gfx/textures.js';
import { fbm2, smoothstep, lerp } from '../core/util.js';

const S = 2, CH = 48;
const tmp = [0, 0, 0];

function zoneMix(x, z, key, out) {
  // 구역 경계가 딱 끊기지 않게 주변 5곳을 평균
  let r = 0, g = 0, b = 0;
  const off = [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7]];
  for (const o of off) { const c = GROUND[F.zone(x + o[0], z + o[1])][key]; r += c[0]; g += c[1]; b += c[2]; }
  out[0] = r / 5; out[1] = g / 5; out[2] = b / 5; return out;
}

function colorAt(x, z, y, out) {
  const dG = F.sdfGround(x, z);
  const n = 0.9 + fbm2(x * 0.08 + 5, z * 0.08 + 9, 3) * 0.2;
  if (dG <= 0.6) {
    const a = zoneMix(x, z, 'ground', [0, 0, 0]), b = zoneMix(x, z, 'path', tmp);
    const t = smoothstep(0.1, 0.62, F.path(x, z)) * 0.9;
    for (let i = 0; i < 3; i++) out[i] = lerp(a[i], b[i], t) * n;
  } else {
    const sx = F.hr(x + 2, z) - F.hr(x - 2, z), sz = F.hr(x, z + 2) - F.hr(x, z - 2);
    const sl = smoothstep(0.35, 1.5, Math.hypot(sx, sz) / 4);
    const a = zoneMix(x, z, 'ground', [0, 0, 0]), b = zoneMix(x, z, 'rock', [0, 0, 0]), c = zoneMix(x, z, 'peak', tmp);
    const t = smoothstep(1, 16, dG);
    for (let i = 0; i < 3; i++) out[i] = lerp(lerp(a[i] * 0.97, b[i], t), c[i], sl * 0.85 * smoothstep(3, 14, dG)) * n;
    if (y < WATER + 0.25 && F.zone(x, z) === 4) { const m = smoothstep(WATER + 0.25, WATER - 1.2, y); out[0] = lerp(out[0], 0.2, m); out[1] = lerp(out[1], 0.22, m); out[2] = lerp(out[2], 0.2, m); }
  }
  return out;
}

export function buildTerrain(scene) {
  const mats = [
    patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: strokeDetailTexture('ground') })),
    patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: strokeDetailTexture('rock') })),
  ];
  const group = new THREE.Group(); group.name = 'terrain';
  const col = [0, 0, 0];
  for (let cz = BOUNDS.z0; cz < BOUNDS.z1; cz += CH) {
    for (let cx = BOUNDS.x0; cx < BOUNDS.x1; cx += CH) {
      const nx = Math.min(CH, BOUNDS.x1 - cx) / S + 1, nz = Math.min(CH, BOUNDS.z1 - cz) / S + 1;
      // 길에서 너무 먼 조각은 만들지 않는다(안개 너머)
      let near = false;
      for (let j = 0; j < nz && !near; j += 4) for (let i = 0; i < nx; i += 4) if (F.sdfGround(cx + i * S, cz + j * S) < 105) { near = true; break; }
      if (!near) continue;
      const pos = new Float32Array(nx * nz * 3), cl = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
      for (let j = 0, k = 0; j < nz; j++) for (let i = 0; i < nx; i++, k++) {
        const x = cx + i * S, z = cz + j * S, y = F.hr(x, z);
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        colorAt(x, z, y, col); cl[k * 3] = col[0]; cl[k * 3 + 1] = col[1]; cl[k * 3 + 2] = col[2];
        uv[k * 2] = x * 0.05; uv[k * 2 + 1] = z * 0.05 + y * 0.085;
      }
      const idx = [], idxM = []; // 땅 / 산
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        const t = F.sdfGround(cx + i * S + 1, cz + j * S + 1) > 2.5 ? idxM : idx;
        if ((i + j) & 1) t.push(a, c, b, b, c, d); else t.push(a, c, d, a, d, b);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx.concat(idxM)); geo.addGroup(0, idx.length, 0); geo.addGroup(idx.length, idxM.length, 1);
      geo.computeVertexNormals(); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mats); m.matrixAutoUpdate = false;
      group.add(m);
    }
  }
  scene.add(group);

  // 갈대늪 물(먹빛 물결)
  const waterTex = strokeDetailTexture('ground'); waterTex.repeat.set(26, 26);
  const wmat = patch(new THREE.MeshLambertMaterial({ color: 0x9fb4b6, map: waterTex, transparent: true, opacity: 0.86, depthWrite: false }));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(330, 330), wmat);
  water.rotation.x = -Math.PI / 2; water.position.set(NODES.m3.x + 20, WATER, NODES.m3.z - 30); water.renderOrder = 1;
  scene.add(water);

  // 개울: 골짜기 바닥을 따라 흐르는 띠
  const sp = []; const P = STREAM.pts;
  for (let i = 1; i < P.length; i++) {
    const n = Math.ceil(Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) / 3);
    for (let k = 0; k < n; k++) sp.push([lerp(P[i - 1][0], P[i][0], k / n), lerp(P[i - 1][1], P[i][1], k / n)]);
  }
  sp.push(P[P.length - 1]);
  let level = 1e9; const vs = [], uvs = [], ix = [];
  sp.forEach((p, i) => {
    const q = sp[Math.min(i + 1, sp.length - 1)], o = sp[Math.max(i - 1, 0)];
    let tx = q[0] - o[0], tz = q[1] - o[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    level = Math.min(level, F.hr(p[0], p[1]) + 1.15);
    const hw = STREAM.w * 1.25;
    vs.push(p[0] - tz * hw, level, p[1] + tx * hw, p[0] + tz * hw, level, p[1] - tx * hw);
    uvs.push(0, i * 0.25, 1, i * 0.25);
    if (i > 0) { const a = (i - 1) * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vs), 3));
  sg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  sg.setIndex(ix); sg.computeVertexNormals();
  const stex = strokeDetailTexture('rock'); stex.repeat.set(1, 1);
  const smat = patch(new THREE.MeshLambertMaterial({ color: 0xa9bdc0, map: stex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  const stream = new THREE.Mesh(sg, smat); stream.renderOrder = 1; scene.add(stream);

  return {
    group, water, stream,
    update(t) { waterTex.offset.set(t * 0.004, t * 0.007); stex.offset.y = -t * 0.12; },
  };
}
export { MAT, COL };
