// 부팅과 메인 루프.
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
import { buildWorld } from '../world/world.js';
import { NODES } from '../world/layout.js';
import { createPlayer } from '../entity/player.js';
import { createEnemies } from '../entity/enemies.js';
import { createShots } from '../entity/shots.js';
import { installDebug } from './debug.js';
import { createAudio } from '../systems/audio/engine.js';
import TEXT from '../data/text.ko.json';

let last = 0;
G.frozen = false;
G.text = TEXT;
G.difficulty = 'normal';
G.audio = createAudio();

const RUN = { play: 1, dialog: 1, cine: 1, dead: 1, ending: 1 };

export function boot() {
  const canvas = document.getElementById('bp-canvas');
  G.gfx = createGfx(canvas);
  createMaterials();
  G.input = createInput(canvas);
  G.fx = createFx();
  G.world = buildWorld();
  createParticles(); createSlash();
  G.stamp = createStamp();
  G.loot = createLoot();
  G.player = createPlayer();
  G.player.place(NODES.margin.x, NODES.margin.z, Math.PI);
  G.enemies = createEnemies();
  G.shots = createShots();
  G.cam = createCamera();
  G.cam.snap();
  G.fx.fade = 0; G.fx.fadeTo = 0;
  G.state = 'play';
  // 소리는 첫 입력 뒤에만 낼 수 있다
  const wake = () => G.audio.init();
  window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
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
  const fx = G.fx, running = !!RUN[G.state];
  const ts = running ? fx.timeScale(rdt) * G.ts : 0;
  const dt = rdt * ts;
  // 여백(완벽 회피)의 느린 시간 속에서 주인공만은 제 속도로 움직인다
  if (fx.playerFree > 0) fx.playerFree -= rdt;
  const pdt = running && fx.playerFree > 0 ? rdt * (fx.stop > 0 ? 0.03 : 1) : dt;
  G.dt = dt; G.time += dt;
  U.uTime.value = G.time; G.gfx.pu.uTime.value = G.real;
  if (G.bot) G.bot.update(rdt);
  if (running) {
    G.player.update(pdt);
    G.enemies.update(dt);
    G.shots.update(dt);
    G.loot.update(dt);
    Slash.update(dt);
    P.update(dt, rdt);
  }
  if (G.story) G.story.update(dt, rdt);
  G.stamp.update(rdt);
  fx.update(rdt);
  G.world.update(dt, rdt);
  G.cam.update(dt, rdt);
  if (G.ui) G.ui.update(dt, rdt);
  G.audio.update(rdt);
  G.input.endFrame();
}
