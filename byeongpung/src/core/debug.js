// 개발·자동 점검용 훅(window.__game). 주소에 ?debug 또는 #debug 가 있을 때 화면 표시도 켠다.
import { G } from './g.js';
import { tick } from './game.js';
import { NODES } from '../world/layout.js';
import { F } from '../world/field.js';
import * as HA from '../entity/hanim.js';
import { buildHumanoid } from '../entity/humanoid.js';
import { newPose, applyPose } from '../entity/rig.js';

export function installDebug() {
  window.__game = {
    G,
    get ready() { return !!G.ready; },
    freeze(b = true) { G.frozen = b; },
    renderOnce() { const t = performance.now(); G.gfx.render(); return Math.round(performance.now() - t); },
    sim(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt); },
    // 이름(노드) 또는 [x,z] 로 순간 이동. yaw=주인공이 보는 방향
    tp(where, yaw, pitch, dist) {
      const p = G.player; let x, z;
      if (typeof where === 'string') { const n = NODES[where]; x = n.x; z = n.z; } else { [x, z] = where; }
      p.pos.set(x, F.h(x, z), z);
      if (p.vel) p.vel.set(0, 0, 0);
      if (yaw !== undefined && yaw !== null) { p.yaw = yaw; G.cam.setBehind(yaw); }
      if (pitch !== undefined && pitch !== null) G.cam.pitch = pitch;
      if (dist !== undefined && dist !== null) G.cam.dist = dist;
      G.cam.snap();
    },
    // 자세 점검: 주인공 자리에 시험용 모델을 세우고 자세 함수를 입힌다
    poseRig(kind = 'hero') {
      if (this._rig) G.gfx.scene.remove(this._rig.root);
      const r = buildHumanoid(kind); this._rig = r; this._pose = newPose();
      r.root.position.copy(G.player.pos); r.root.rotation.y = G.player.yaw; G.gfx.scene.add(r.root);
      return Object.keys(r.j);
    },
    pose(fn, ...args) { HA[fn](this._pose, ...args); applyPose(this._rig, this._pose); return this._pose; },
    view(yawOff = 0, pitch = 0.2, dist = 4) { G.cam.yaw = G.player.yaw + Math.PI + yawOff; G.cam.pitch = pitch; G.cam.dist = dist; G.cam.snap(); },
    info() {
      const p = G.player;
      return { state: G.state, pos: [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)], sdf: +F.sdf(p.pos.x, p.pos.z).toFixed(2), zone: F.zone(p.pos.x, p.pos.z), calls: G.gfx.renderer.info.render.calls, tris: G.gfx.renderer.info.render.triangles };
    },
  };
}
