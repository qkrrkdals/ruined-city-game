// 부팅과 메인 루프.
import * as THREE from 'three';
import { G } from './g.js';
import { createGfx } from '../gfx/renderer.js';
import { createMaterials, U } from '../gfx/materials.js';
import { createInput } from './input.js';
import { createCamera } from '../gfx/camera.js';
import { buildWorld } from '../world/world.js';
import { NODES } from '../world/layout.js';
import { F } from '../world/field.js';
import { installDebug } from './debug.js';

let last = 0;
G.frozen = false;

export function boot() {
  const canvas = document.getElementById('bp-canvas');
  G.gfx = createGfx(canvas);
  createMaterials();
  G.input = createInput(canvas);
  G.world = buildWorld();
  // 임시 주인공(아직 모델 없음)
  G.player = { pos: new THREE.Vector3(NODES.margin.x, 0, NODES.margin.z), yaw: Math.PI };
  G.player.pos.y = F.h(G.player.pos.x, G.player.pos.z);
  G.cam = createCamera();
  G.cam.snap();
  G.gfx.pu.uFade.value = 0;
  G.state = 'play';
  installDebug();
  G.ready = true;
  requestAnimationFrame(frame);
}

function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (G.frozen) return;
  tick(rdt);
  G.gfx.render();
}

export function tick(rdt) {
  G.rdt = rdt; G.real += rdt;
  const dt = rdt * G.ts;
  G.dt = dt; G.time += dt;
  U.uTime.value = G.time; G.gfx.pu.uTime.value = G.real;
  G.world.update(dt, rdt);
  G.cam.update(dt, rdt);
  G.input.endFrame();
}
