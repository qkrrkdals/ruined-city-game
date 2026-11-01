// Game orchestrator: boot, state machine (title / playing / paused / panel / cutscene), main loop.
import * as THREE from 'three';
import { Events } from './events.js';
import { Input } from './input.js';
import { createRenderer } from './renderer.js';
import { loadSettings, saveSettings } from './settings.js';
import { installDebug, DEBUG } from './debug.js';
import { initI18n, t } from '../i18n/i18n.js';
import { buildWorld } from '../world/world.js';
import { TITLE_PATH } from '../world/layout.js';
import { Player } from '../player/player.js';
import { TimeOfDay } from '../systems/timeofday.js';
import { LightPool } from '../systems/lights.js';
import { UI, clockText } from '../ui/ui.js';

const raf = () => new Promise((r) => requestAnimationFrame(r));
const TOWER_LOOK = new THREE.Vector3(0, 30, -166);

export { tick };
export async function startGame() {
  const G = { events: new Events(), state: 'loading', elapsed: 0, systems: [], region: null };
  G.settings = loadSettings();
  G.saveSettings = () => saveSettings(G.settings);
  initI18n(G.settings.lang);
  G.ui = new UI(G);
  await raf(); await raf();
  const gfx = createRenderer(document.getElementById('game'), G);
  Object.assign(G, { gfx, renderer: gfx.renderer, scene: gfx.scene, camera: gfx.camera });
  G.input = new Input(G.renderer.domElement, G.events);
  G.time = new TimeOfDay(G);
  G.world = buildWorld(G);
  G.player = new Player(G);
  G.lights = new LightPool(G, 3);
  for (const [, a] of G.world.anchors) if (a.lamp) G.lights.add({ pos: a.lamp, intensity: 11, distance: 11 });
  G.systems.push(G.lights);
  G.events.on('quality', (q) => G.world.setDensity(q.density));
  G.gfx.setQuality(G.settings.quality);
  G.time.set(14.2, true);
  titleCam(G, 0);
  G.renderer.compile(G.scene, G.camera);
  G.newGame = (o) => newGame(G, o);
  flow(G);
  if (DEBUG) installDebug(G);
  G.ui.show('loading', false);
  G.ui.show('title', true);
  G.state = 'title';
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    try { tick(G, dt); } catch (e) { console.error(e); }
  };
  requestAnimationFrame(loop);
}

function newGame(G, o = {}) {
  G.ui.show('title', false); G.ui.show('hud', true);
  const s = G.world.anchors.get('spawn');
  G.player.spawn(s.pos.x, s.pos.y, s.pos.z, s.yaw);
  G.time.set(14.0, true); G.time.range(14, 16.4);
  G.region = null;
  setPlaying(G, !o.skipLock);
  G.events.emit('newGame');
}

function setPlaying(G, lock = true) {
  G.state = 'playing'; G.input.game = true;
  G.ui.show('pause', false);
  if (lock) G.input.lock();
}
function pause(G) {
  if (G.state !== 'playing') return;
  G.state = 'paused'; G.input.game = false;
  G.ui.show('pause', true);
  G.events.emit('paused', true);
}
function resume(G) {
  if (G.state !== 'paused') return;
  setPlaying(G, true);
  G.events.emit('paused', false);
}

function flow(G) {
  G.pause = () => pause(G); G.resume = () => resume(G);
  G.events.on('ui', (act) => {
    if (act === 'new') newGame(G);
    else if (act === 'resume') resume(G);
    else if (act === 'title') { G.state = 'title'; G.input.game = false; G.ui.show('pause', false); G.ui.show('hud', false); G.ui.show('title', true); G.time.set(14.2, true); G.events.emit('toTitle'); }
  });
  G.events.on('unlock', (expected) => { if (!expected && G.state === 'playing') pause(G); });
  G.events.on('key', (code) => {
    if (code === 'KeyP') { if (G.state === 'playing') { G.input.unlock(true); pause(G); } else if (G.state === 'paused') resume(G); }
  });
  G.renderer.domElement.addEventListener('click', () => { if (G.state === 'paused') resume(G); else if (G.state === 'playing' && !G.input.locked) G.input.lock(); });
  G.events.on('fellOut', () => G.events.emit('respawn'));
}

function titleCam(G, time) {
  const a = TITLE_PATH[0], b = TITLE_PATH[1], f = (Math.sin(time * 0.035 - 1.4) + 1) / 2;
  G.camera.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
  G.camera.lookAt(TOWER_LOOK);
}

function tick(G, dt) {
  G.elapsed += dt;
  if (G.state === 'title') {
    titleCam(G, G.elapsed);
    G.lights.update(dt);
    G.time.update(0, null); G.time.followShadow(G.camera.position);
    G.world.update(dt, G.camera);
    if (!G.freeze) G.gfx.render();
  } else if (G.state === 'playing' || G.state === 'cutscene') {
    if (G.state === 'playing') G.player.update(dt);
    for (const s of G.systems) s.update(dt);
    const zone = G.world.zoneAt(G.camera.position);
    G.time.update(dt, zone); G.time.followShadow(G.player.feet);
    G.world.update(dt, G.camera);
    const reg = G.world.regionAt(G.player.feet);
    if (reg !== G.region) { G.region = reg; G.ui.regionCard(t('regions.' + reg), clockText(G.time.hour)); G.events.emit('region', reg); }
    G.ui.crouch(G.player.crouch);
    if (!G.freeze) G.gfx.render();
  } else if (G.state === 'panel') {
    for (const s of G.systems) if (s.panelUpdate) s.panelUpdate(dt);
  }
  G.input.endFrame();
}
