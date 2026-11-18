// 부팅과 메인 루프.
import * as THREE from 'three';
import { G } from './g.js';
import { createGfx } from '../gfx/renderer.js';
import { createMaterials, U } from '../gfx/materials.js';
import { createInput } from './input.js';
import { createCamera } from '../gfx/camera.js';
import { createParticles, P } from '../gfx/particles.js';
import { createSlash, Slash } from '../gfx/slash.js';
import { createStamp } from '../gfx/stamp.js';
import { createFx } from '../systems/fx.js';
import { createLoot } from '../systems/loot.js';
import { createProg } from '../systems/prog.js';
import { createInteract } from '../systems/interact.js';
import { createSpawner } from '../systems/spawner.js';
import { createShrines } from '../systems/shrines.js';
import { createPickups } from '../systems/pickups.js';
import { buildWorld } from '../world/world.js';
import { NODES } from '../world/layout.js';
import { F } from '../world/field.js';
import { createPlayer } from '../entity/player.js';
import { createEnemies } from '../entity/enemies.js';
import { createShots } from '../entity/shots.js';
import { createMagpie } from '../entity/npc.js';
import { createUI } from '../ui/ui.js';
import { createStory } from '../story/story.js';
import { createFlow } from './flow.js';
import { installDebug } from './debug.js';
import { createAudio } from '../systems/audio/engine.js';
import TEXT from '../data/text.ko.json';

let last = 0;
G.frozen = false;
G.text = TEXT;
G.difficulty = 'normal';
G.audio = createAudio();

const RUN = { play: 1, dialog: 1, cine: 1, dead: 1, ending: 1 };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export async function boot() {
  const canvas = document.getElementById('bp-canvas'), root = document.getElementById('bp-ui');
  const loading = document.createElement('div'); loading.className = 'resume'; loading.textContent = TEXT.ui.loading; root.appendChild(loading);
  // 글꼴이 준비된 뒤에 글씨 판·낙관을 만든다
  try { await Promise.race([Promise.all(['BP Title', 'BP Brush', 'BP Body'].map((f) => document.fonts.load(`32px "${f}"`, TEXT.ui.title))), new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* 기본 글꼴로 */ }
  await nextFrame();
  G.gfx = createGfx(canvas);
  createMaterials();
  G.input = createInput(canvas);
  G.fx = createFx();
  G.world = buildWorld();
  createParticles(); createSlash();
  G.stamp = createStamp();
  G.loot = createLoot();
  G.player = createPlayer();
  G.player.place(NODES.margin.x, NODES.margin.z + 6, Math.PI);
  G.enemies = createEnemies();
  G.shots = createShots();
  G.cam = createCamera();
  G.prog = createProg();
  G.interact = createInteract();
  G.spawner = createSpawner();
  G.shrines = createShrines();
  G.pickups = createPickups();
  G.magpie = createMagpie(); G.magpie.hide();
  G.ui = createUI(root);
  G.world.populate();
  createFlow();
  G.story = createStory();
  G.flow.applySettings();
  installDebug();
  // 제목 화면: 솔숲 어귀에서 먼 산과 붉은 해를 바라본다
  G.state = 'title'; G.ui.screens.title(true); titleCam(0);
  G.gfx.warm();
  loading.remove();
  G.fx.fade = 1; G.fx.fadeIn(0.7);
  const wake = () => G.audio.init();
  window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
  G.ready = true;
  requestAnimationFrame(frame);
}

const _tp = new THREE.Vector3(), _tl = new THREE.Vector3();
function titleCam(t) {
  const a = t * 0.02, x = 34 + Math.sin(a) * 6, z = 214 + Math.cos(a * 0.7) * 5;
  _tp.set(x, F.hr(x, z) + 7.5 + Math.sin(a * 1.3) * 0.6, z); _tl.set(-6, 9, 150);
  if (!G.cam.cine) G.cam.cine = { pos: _tp, look: _tl, fov: 50, snap: true };
  else { G.cam.cine.pos = _tp; G.cam.cine.look = _tl; }
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
  const fx = G.fx, running = !!RUN[G.state];
  const ts = running ? fx.timeScale(rdt) * G.ts : 0;
  const dt = rdt * ts;
  // 여백(완벽 회피)의 느린 시간 속에서 주인공만은 제 속도로 움직인다
  if (fx.playerFree > 0) fx.playerFree -= rdt;
  const pdt = running && fx.playerFree > 0 ? rdt * (fx.stop > 0 ? 0.03 : 1) : dt;
  G.dt = dt; G.time += dt;
  U.uTime.value = G.time; G.gfx.pu.uTime.value = G.real;
  if (G.bot) G.bot.update(rdt);
  if (G.state === 'title') titleCam(G.real);
  if (running) {
    G.player.update(pdt);
    G.enemies.update(dt);
    G.shots.update(dt);
    G.loot.update(dt);
    Slash.update(dt);
    P.update(dt, rdt);
    G.story.update(dt, rdt);
  }
  G.stamp.update(rdt);
  fx.update(rdt);
  G.world.update(dt, rdt);
  G.cam.update(dt, rdt);
  G.ui.update(dt, rdt);
  G.audio.update(rdt);
  G.input.endFrame();
}
