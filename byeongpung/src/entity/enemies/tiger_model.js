// 범의 모양. 'boss' = 먹범(먹빛 몸에 검붉은 줄무늬), 'folk' = 제 모습을 찾은 호작도의 범(누런 털, 우스꽝스러운 눈).
import * as THREE from 'three';
import { quadSkeleton } from './quad.js';
import { ico, cyl, cone, box, merge, seedGeo, paintY } from '../../gfx/geo.js';
import { entityMat } from '../../gfx/materials.js';
import { HEX } from '../../gfx/palette.js';

const PAL = {
  boss: { fur: 0x18181d, belly: 0x2c2c34, stripe: 0x9a2418, nose: 0x3a0c08, claw: 0xe8e2d4 },
  folk: { fur: HEX.tiger, belly: HEX.tigerPale, stripe: 0x1a1a1e, nose: 0xc8606a, claw: 0xf8f3e6 },
};
const CACHE = {};
function geos(kind) {
  if (CACHE[kind]) return CACHE[kind];
  seedGeo(kind === 'boss' ? 170 : 171);
  const c = PAL[kind], J = 0.1;
  const stripesBody = []; for (let i = 0; i < 6; i++) stripesBody.push(box(1.32 - Math.abs(i - 2.5) * 0.05, 0.09, 0.16, c.stripe, { p: [0, 0.6, 0.95 - i * 0.4], r: [0, (i % 2 ? 0.12 : -0.12), 0] }, 0.05), box(0.09, 0.62, 0.15, c.stripe, { p: [0.62, 0.22, 0.85 - i * 0.4], r: [0.15, 0, 0.12] }, 0.05), box(0.09, 0.62, 0.15, c.stripe, { p: [-0.62, 0.22, 0.85 - i * 0.4], r: [0.15, 0, -0.12] }, 0.05));
  const g = {
    body: merge([paintY(new THREE.CylinderGeometry(0.62, 0.58, 2.5, 8).rotateX(Math.PI / 2), c.belly, c.fur, -0.5, 0.2, J), ...stripesBody]),
    chest: merge([ico(0.8, 1, c.fur, { p: [0, 0.02, 0.05], s: [0.98, 1.02, 1.0] }, J), ico(0.5, 0, c.belly, { p: [0, -0.38, 0.35] }, 0.05)]),
    hips: ico(0.7, 1, c.fur, { p: [0, 0, -0.05], s: [0.95, 0.98, 1] }, J),
    neck: cyl(0.4, 0.52, 0.7, 7, c.fur, { p: [0, 0.05, 0.3], r: [Math.PI / 2 - 0.25, 0, 0] }, J),
    head: merge([
      ico(0.56, 1, c.fur, { p: [0, 0.08, 0.1], s: [1.18, 0.96, 1.0] }, J), box(0.56, 0.32, 0.42, c.belly, { p: [0, -0.06, 0.6] }, 0.06),
      cone(0.16, 0.26, 4, c.fur, { p: [-0.42, 0.56, -0.05], r: [0, 0, 0.3] }), cone(0.16, 0.26, 4, c.fur, { p: [0.42, 0.56, -0.05], r: [0, 0, -0.3] }),
      box(0.5, 0.07, 0.12, c.stripe, { p: [0, 0.6, 0.2] }), box(0.34, 0.07, 0.12, c.stripe, { p: [0, 0.57, 0.42] }), box(0.08, 0.3, 0.12, c.stripe, { p: [-0.6, 0.1, 0.2], r: [0, 0, 0.3] }), box(0.08, 0.3, 0.12, c.stripe, { p: [0.6, 0.1, 0.2], r: [0, 0, -0.3] }),
    ]),
    jaw: merge([box(0.46, 0.14, 0.44, c.belly, { p: [0, -0.07, 0.22] }, 0.06)]),
    teeth: merge([...[-0.17, -0.06, 0.06, 0.17].map((x) => cone(0.04, 0.13, 4, c.claw, { p: [x, 0.05, 0.4] }, 0)), cone(0.05, 0.2, 4, c.claw, { p: [-0.2, -0.12, 0.78], r: [Math.PI, 0, 0] }, 0), cone(0.05, 0.2, 4, c.claw, { p: [0.2, -0.12, 0.78], r: [Math.PI, 0, 0] }, 0)]),
    leg: merge([cyl(0.27, 0.2, 0.84, 6, c.fur, { p: [0, -0.4, 0] }, J), box(0.42, 0.08, 0.3, c.stripe, { p: [0, -0.3, 0] }), box(0.36, 0.08, 0.28, c.stripe, { p: [0, -0.55, 0] })]),
    shin: merge([cyl(0.19, 0.16, 0.74, 6, c.fur, { p: [0, -0.36, 0] }, J), box(0.38, 0.2, 0.5, c.fur, { p: [0, -0.74, 0.1] }, J), box(0.3, 0.07, 0.24, c.stripe, { p: [0, -0.3, 0] })]),
    claws: merge([-0.12, 0, 0.12].map((x) => cone(0.035, 0.14, 4, c.claw, { p: [x, -0.8, 0.38], r: [Math.PI / 2 + 0.4, 0, 0] }, 0))),
    tail: merge([cyl(0.1, 0.12, 0.6, 5, c.fur, { p: [0, 0, -0.3], r: [Math.PI / 2, 0, 0] }, J), box(0.26, 0.26, 0.1, c.stripe, { p: [0, 0, -0.32] })]),
    tailTip: cyl(0.05, 0.11, 0.5, 5, c.stripe, { p: [0, 0, -0.25], r: [Math.PI / 2, 0, 0] }, 0.05),
  };
  // 눈: 먹범은 붉게 찢어진 눈, 호작도의 범은 동그랗고 엉뚱한 눈
  g.eyes = kind === 'boss'
    ? merge([box(0.2, 0.07, 0.04, HEX.red, { p: [-0.26, 0.22, 0.56], r: [0, 0, -0.3] }, 0), box(0.2, 0.07, 0.04, HEX.red, { p: [0.26, 0.22, 0.56], r: [0, 0, 0.3] }, 0), cone(0.07, 0.1, 3, c.nose, { p: [0, 0.06, 0.83], r: [Math.PI / 2, 0, 0] }, 0)])
    : merge([cyl(0.17, 0.17, 0.04, 9, 0xe6ea8a, { p: [-0.27, 0.24, 0.57], r: [Math.PI / 2, 0, 0] }, 0), cyl(0.17, 0.17, 0.04, 9, 0xe6ea8a, { p: [0.27, 0.24, 0.57], r: [Math.PI / 2, 0, 0] }, 0),
      cyl(0.06, 0.06, 0.05, 6, 0x15151b, { p: [-0.2, 0.25, 0.59], r: [Math.PI / 2, 0, 0] }, 0), cyl(0.06, 0.06, 0.05, 6, 0x15151b, { p: [0.21, 0.2, 0.59], r: [Math.PI / 2, 0, 0] }, 0),
      cone(0.08, 0.1, 3, c.nose, { p: [0, 0.07, 0.83], r: [Math.PI / 2, 0, 0] }, 0), ...[-1, 1].flatMap((s) => [0.02, -0.06].map((y) => box(0.5, 0.012, 0.012, 0xf8f3e6, { p: [s * 0.45, y, 0.74], r: [0, s * 0.3, s * (y > 0 ? 0.12 : -0.1)] }, 0)))]);
  return (CACHE[kind] = g);
}

export function buildTiger(kind = 'boss') {
  const g = geos(kind);
  const sk = quadSkeleton({ H: 1.62, L: 2.2, w: 0.5, u: 0.84, l: 0.74, neckY: 0.25, neckZ: 0.5, neckLen: 0.62, headY: 0.12, jawY: -0.2, jawZ: 0.36, tail: 4, tailSeg: 0.58, tailY: 0.25, legY: -0.05 });
  const body = entityMat(kind === 'boss' ? { rim: 0.95, keep: true } : {}), keep = entityMat({ keep: true });
  const add = (j, geo, m = body) => { const me = new THREE.Mesh(geo, m); sk.j[j].add(me); return me; };
  add('body', g.body); add('chest', g.chest); add('hips', g.hips); add('neck', g.neck); add('head', g.head); add('head', g.eyes, keep); add('jaw', g.jaw); add('jaw', g.teeth, keep);
  for (const n of ['FL', 'FR', 'BL', 'BR']) { add('leg' + n, g.leg); add('shin' + n, g.shin); add('shin' + n, g.claws, keep); }
  for (let i = 1; i <= 3; i++) add('tail' + i, g.tail); add('tail4', g.tailTip);
  return { ...sk, mats: [body, keep] };
}
// 앉은 자세(호작도): 엉덩이를 내리고 앞발을 세운다
export function poseSit(J, t) {
  J.rest();
  J.set('body', -0.5, 0, 0); J.lift('body', -0.42);
  J.set('chest', -0.12, 0, 0); J.set('hips', 0.35, 0, 0);
  J.set('legFL', 0.5, 0, 0.05); J.set('legFR', 0.5, 0, -0.05); J.set('shinFL', 0, 0, 0); J.set('shinFR', 0, 0, 0);
  J.set('legBL', -0.95, 0, 0.35); J.set('legBR', -0.95, 0, -0.35); J.set('shinBL', 2.1, 0, 0); J.set('shinBR', 2.1, 0, 0);
  J.set('neck', 0.25 + Math.sin(t * 1.1) * 0.04, Math.sin(t * 0.5) * 0.25, 0); J.set('head', 0.3, 0, Math.sin(t * 0.7) * 0.12); J.set('jaw', 0.18 + Math.max(0, Math.sin(t * 0.9)) * 0.1, 0, 0);
  J.set('tail1', 0.6, Math.sin(t * 1.4) * 0.5, 0); J.set('tail2', 0.3, Math.sin(t * 1.4 + 0.6) * 0.5, 0); J.set('tail3', -0.5, Math.sin(t * 1.4 + 1.2) * 0.4, 0); J.set('tail4', -0.7, 0, 0);
}
