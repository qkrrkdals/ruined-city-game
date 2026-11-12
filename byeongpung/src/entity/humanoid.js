// 인간형 모델 만들기(주인공·군졸·묵장). 모두 같은 뼈대를 쓰고 겉모습만 다르다.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { box, cyl, cone, ico, merge, seedGeo, xf, paint, tris } from '../gfx/geo.js';
import { HEX } from '../gfx/palette.js';
import { entityMat } from '../gfx/materials.js';

const D = Math.PI / 180;

function skeleton() {
  const r = new Rig();
  r.joint('hips', null, 0, 0.9, 0);
  r.joint('torso', 'hips', 0, 0.06, 0);
  r.joint('head', 'torso', 0, 0.5, 0);
  r.joint('armR', 'torso', -0.2, 0.42, 0); r.joint('foreR', 'armR', 0, -0.27, 0); r.joint('weapon', 'foreR', 0, -0.27, 0);
  r.joint('armL', 'torso', 0.2, 0.42, 0); r.joint('foreL', 'armL', 0, -0.27, 0); r.joint('handL', 'foreL', 0, -0.27, 0);
  r.joint('legR', 'hips', -0.09, -0.04, 0); r.joint('shinR', 'legR', 0, -0.42, 0); r.joint('footR', 'shinR', 0, -0.42, 0);
  r.joint('legL', 'hips', 0.09, -0.04, 0); r.joint('shinL', 'legL', 0, -0.42, 0); r.joint('footL', 'shinL', 0, -0.42, 0);
  r.dim = { arm: [0.27, 0.27], leg: [0.42, 0.42], ankle: 0.06, grip: -0.36, tip: 1.35 };
  return r;
}

// 큰 붓(몽당붓): 손을 원점으로 +Y 가 붓끝
function brushGeo() {
  return merge([
    cyl(0.026, 0.03, 1.5, 6, 0xb89a6a, { p: [0, 0.2, 0] }, 0.05),
    cyl(0.034, 0.03, 0.05, 6, 0x6b5238, { p: [0, -0.5, 0] }),
    cyl(0.05, 0.036, 0.1, 7, 0x2a2a30, { p: [0, 0.99, 0] }),
    cyl(0.085, 0.055, 0.16, 7, 0x8a8a88, { p: [0, 1.11, 0] }, 0.1),
    cone(0.086, 0.22, 7, 0x1a1a20, { p: [0, 1.3, 0] }, 0.12),
  ]);
}
function spearGeo(len = 2.3) {
  return merge([
    cyl(0.022, 0.022, len, 5, 0x2b2623, { p: [0, len / 2 - 0.75, 0] }),
    cone(0.05, 0.34, 4, 0x8f9096, { p: [0, len - 0.58, 0], s: [1, 1, 0.45] }, 0.05),
    cyl(0.05, 0.03, 0.08, 6, HEX.red, { p: [0, len - 0.8, 0] }),
  ]);
}
function swordGeo() {
  return merge([
    box(0.05, 0.95, 0.016, 0x9a9ca4, { p: [0, 0.58, 0] }, 0.05),
    tris([[[-0.025, 1.055, 0], [0.025, 1.055, 0], [0.02, 1.16, 0]]], 0x9a9ca4),
    box(0.16, 0.035, 0.05, 0x3a3023, { p: [0, 0.09, 0] }),
    cyl(0.022, 0.022, 0.2, 5, 0x231f1c, { p: [0, -0.02, 0] }),
  ]);
}
function glaiveGeo() {
  const blade = [];
  // 월도 날: 초승달 모양 삼각형 띠
  const pts = [[0, 1.55], [0.2, 1.72], [0.3, 2.0], [0.24, 2.3], [0.06, 2.52], [0, 2.3], [0.04, 2.0], [0, 1.8]];
  for (let i = 1; i < pts.length - 1; i++) blade.push([[pts[0][0], pts[0][1], 0], [pts[i][0], pts[i][1], 0], [pts[i + 1][0], pts[i + 1][1], 0]]);
  const b = tris(blade, 0xa0a2aa, null, 0.06);
  const b2 = b.clone(); b2.scale(1, 1, -1);
  return merge([
    cyl(0.032, 0.032, 2.5, 6, 0x221d1b, { p: [0, 0.4, 0] }),
    b, xf(b2, { p: [0, 0, 0.001] }),
    cyl(0.07, 0.045, 0.1, 6, HEX.red, { p: [0, 1.52, 0] }),
    cone(0.04, 0.12, 5, 0x55565c, { p: [0, -0.9, 0], r: [Math.PI, 0, 0] }),
  ]);
}

// kind: hero | soldier | shield | elite | general
export function buildHumanoid(kind) {
  seedGeo(kind.length * 97 + 5);
  const rig = skeleton();
  const hero = kind === 'hero';
  const body = entityMat(hero ? {} : { rim: 0.55 });
  const keep = entityMat({ keep: true, double: true });
  rig.mats = [body, keep]; rig.body = body; rig.keepMat = keep;
  // 색: 주인공은 옅은 담묵(덧칠할수록 재질 색으로 짙어진다), 적은 먹
  const c = hero
    ? { cloth: 0xe9e4d8, cloth2: 0xd9d3c4, skin: 0xf0e8d8, dark: 0x8a8880, trim: 0xb9b2a2 }
    : { cloth: 0x1b1b21, cloth2: 0x24242b, skin: 0x121216, dark: 0x0d0d11, trim: 0x34343c };
  const J = 0.09;
  rig.add('hips', merge([box(0.3, 0.17, 0.2, c.cloth2, { p: [0, -0.01, 0] }, J), box(0.33, 0.06, 0.22, hero ? 0x9a948a : 0x101014, { p: [0, 0.08, 0] })]), body);
  rig.add('torso', merge([
    cyl(0.205, 0.15, 0.46, 6, c.cloth, { p: [0, 0.25, 0], s: [1, 1, 0.66] }, J),
    tris([[[-0.1, 0.47, 0.115], [0.02, 0.2, 0.125], [-0.03, 0.47, 0.115]], [[0.1, 0.47, 0.115], [0.03, 0.47, 0.115], [-0.02, 0.2, 0.125]]], c.trim),
  ]), body);
  rig.add('head', merge([ico(0.125, 1, c.skin, { p: [0, 0.12, 0] }, 0.04), cyl(0.05, 0.06, 0.08, 5, c.skin, { p: [0, 0, 0] })]), body);
  for (const s of ['R', 'L']) {
    rig.add('arm' + s, cyl(0.062, 0.075, 0.29, 5, c.cloth, { p: [0, -0.135, 0] }, J), body);
    rig.add('fore' + s, merge([cyl(0.075, 0.058, 0.25, 5, c.cloth2, { p: [0, -0.12, 0] }, J), box(0.07, 0.08, 0.07, c.skin, { p: [0, -0.27, 0] })]), body);
    rig.add('leg' + s, cyl(0.095, 0.085, 0.44, 5, c.cloth2, { p: [0, -0.21, 0] }, J), body);
    rig.add('shin' + s, merge([cyl(0.085, 0.05, 0.3, 5, c.cloth2, { p: [0, -0.15, 0] }, J), cyl(0.05, 0.045, 0.13, 5, c.dark, { p: [0, -0.36, 0] })]), body);
    rig.add('foot' + s, box(0.1, 0.07, 0.23, c.dark, { p: [0, -0.025, 0.05] }), body);
  }
  if (hero) {
    // 삿갓: 얼굴을 가린다
    rig.add('head', merge([
      cone(0.42, 0.2, 9, 0xd8c9a0, { p: [0, 0.27, 0.02], r: [0.1, 0, 0] }, 0.08),
      cone(0.4, 0.14, 9, 0x8f8468, { p: [0, 0.225, 0.02], r: [0.1, 0, 0] }, 0.05),
      cone(0.05, 0.07, 5, 0x6f6650, { p: [0, 0.39, 0.0] }),
    ]), body);
    rig.add('torso', box(0.36, 0.05, 0.25, HEX.indigo, { p: [0, 0.02, 0] }), keep); // 쪽빛 허리띠
    rig.add('weapon', brushGeo(), body);
    // 호리병(허리)
    rig.add('hips', merge([ico(0.07, 0, 0xc9b98a, { p: [0.17, -0.06, 0.06] }), ico(0.045, 0, 0xc9b98a, { p: [0.17, 0.02, 0.06] })]), body);
  } else {
    // 붉은 눈
    rig.add('head', merge([box(0.035, 0.02, 0.02, HEX.red, { p: [-0.05, 0.13, 0.115] }), box(0.035, 0.02, 0.02, HEX.red, { p: [0.05, 0.13, 0.115] })]), keep);
    if (kind === 'general') {
      rig.add('head', merge([
        cone(0.2, 0.24, 6, 0x15151a, { p: [0, 0.3, 0] }), cyl(0.2, 0.22, 0.07, 6, 0x2a2a31, { p: [0, 0.2, 0] }),
        box(0.1, 0.22, 0.02, 0x1a1a20, { p: [-0.2, 0.12, 0] }), box(0.1, 0.22, 0.02, 0x1a1a20, { p: [0.2, 0.12, 0] }),
      ]), body);
      rig.add('head', merge([cone(0.03, 0.2, 4, HEX.red, { p: [0, 0.5, 0] }), cyl(0.05, 0.02, 0.06, 5, HEX.gold, { p: [0, 0.42, 0] })]), keep);
      rig.add('torso', merge([
        box(0.44, 0.3, 0.3, 0x24242c, { p: [0, 0.3, 0] }, 0.12),
        box(0.2, 0.09, 0.26, 0x33333c, { p: [-0.29, 0.44, 0], r: [0, 0, 0.35] }), box(0.2, 0.09, 0.26, 0x33333c, { p: [0.29, 0.44, 0], r: [0, 0, -0.35] }),
        cyl(0.26, 0.36, 0.4, 6, 0x1c1c22, { p: [0, -0.16, 0], s: [1, 1, 0.75] }, 0.1),
      ]), body);
      rig.add('torso', box(0.46, 0.05, 0.31, HEX.red, { p: [0, 0.13, 0] }), keep);
      rig.add('weapon', glaiveGeo(), body);
      rig.dim.tip = 2.5; rig.dim.grip = -0.55;
    } else {
      // 벙거지(전립) + 붉은 상모
      rig.add('head', merge([cyl(0.1, 0.12, 0.13, 6, 0x15151a, { p: [0, 0.27, 0] }), cyl(0.27, 0.29, 0.025, 8, 0x1d1d23, { p: [0, 0.215, 0] })]), body);
      rig.add('head', cone(0.035, kind === 'elite' ? 0.26 : 0.12, 4, HEX.red, { p: [0, kind === 'elite' ? 0.44 : 0.38, 0] }), keep);
      rig.add('torso', box(0.36, 0.3, 0.26, 0x26262e, { p: [0, 0.27, 0] }, 0.12), body);
      if (kind === 'elite') { // 탈(하회탈 같은 흰 탈)
        rig.add('head', merge([box(0.2, 0.2, 0.03, 0xe9e2d0, { p: [0, 0.11, 0.12] }), box(0.05, 0.015, 0.035, 0x15151a, { p: [-0.045, 0.135, 0.125] }), box(0.05, 0.015, 0.035, 0x15151a, { p: [0.045, 0.135, 0.125] })]), keep);
        rig.add('torso', box(0.38, 0.05, 0.28, HEX.red, { p: [0, 0.1, 0] }), keep);
      }
      if (kind === 'shield') {
        rig.add('weapon', swordGeo(), body); rig.dim.tip = 1.15;
        // 등패(둥근 방패)
        const sh = rig.joint('shield', 'foreL', 0, -0.2, 0.09);
        sh.rotation.set(Math.PI / 2, 0, 0);
        rig.add('shield', merge([cyl(0.46, 0.46, 0.05, 9, 0x22222a, null, 0.12), cyl(0.34, 0.34, 0.07, 9, 0x2e2e37, null, 0.1)]), body);
        rig.add('shield', cyl(0.13, 0.13, 0.09, 7, HEX.red), keep);
      } else if (kind === 'elite') { rig.add('weapon', swordGeo(), body); rig.dim.tip = 1.15; rig.j.weapon.scale.setScalar(1.25); rig.dim.tip = 1.4; } else { rig.add('weapon', spearGeo(), body); rig.dim.tip = 1.6; rig.dim.grip = -0.5; }
    }
  }
  if (kind === 'general') rig.root.scale.setScalar(1.55);
  if (kind === 'elite') rig.root.scale.setScalar(1.12);
  return rig;
}
export { D };
