// Distant city silhouettes + outer ground so the horizon never looks empty.
import * as THREE from 'three';
import { Geo, mulberry32 } from '../geo.js';
import { patch } from '../materials.js';

export function farCity(W, scene) {
  const R = mulberry32(777), g = new Geo(R);
  const cols = ['#c9bfd2', '#bfb4c9', '#d3c4c4', '#b8b3c8', '#cbbfb8'];
  for (let i = 0; i < 170; i++) {
    const side = R();
    let x, z;
    if (side < 0.35) { x = -125 - R() * 220; z = -320 + R() * 720; }
    else if (side < 0.7) { x = 125 + R() * 220; z = -320 + R() * 720; }
    else if (side < 0.85) { x = -300 + R() * 600; z = -230 - R() * 200; }
    else { x = -300 + R() * 600; z = 300 + R() * 160; }
    const w = 10 + R() * 26, d = 10 + R() * 26, h = 8 + R() * 26;
    g.box(x, h / 2, z, w, h, d, cols[Math.floor(R() * cols.length)], { ry: R() * 0.3, jit: 0.05 });
    if (R() < 0.5) g.box(x + (R() - 0.5) * w * 0.4, h + 2, z, w * 0.3, 4, d * 0.3, cols[0]);
    if (R() < 0.35) g.ico(x, h, z, Math.min(w, d) * 0.4, '#8fae7f', { sy: 0.3 });
  }
  for (let i = 0; i < 160; i++) { const a = R() * 6.28, r = 140 + R() * 360, x = Math.cos(a) * r, z = 30 + Math.sin(a) * r; if (Math.abs(x) < 100 && z > -215 && z < 290) continue; g.ico(x, 2, z, 5 + R() * 9, ['#7fae6e', '#8fbc78', '#6d9f63'][i % 3], { sy: 0.9 }); }
  const fm = patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { far: true });
  const mesh = new THREE.Mesh(g.build(), fm);
  mesh.frustumCulled = false;
  const og = new Geo(R);
  for (const [x0, z0, x1, z1] of [[-1300, -1260, -80, 1340], [80, -1260, 1300, 1340], [-80, -1260, 80, -190], [-80, 266, 80, 1340]]) og.flat(x0, z0, x1, z1, -0.02, '#a3b98f', 0);
  const ground = new THREE.Mesh(og.build(), patch(new THREE.MeshLambertMaterial({ vertexColors: true })));
  ground.receiveShadow = true; ground.frustumCulled = false;
  scene.add(mesh, ground);
  W.far = mesh;
}
