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
import { Interact } from '../player/interact.js';
import { Props } from '../player/props.js';
import { Hands } from '../player/hands.js';
import { TimeOfDay } from '../systems/timeofday.js';
import { LightPool } from '../systems/lights.js';
import { Flashlight } from '../systems/flashlight.js';
import { Shelters } from '../systems/shelters.js';
import { Remnants } from '../systems/remnants.js';
import { Save } from '../systems/save.js';
import { Weather } from '../systems/weather.js';
import { AudioEngine } from '../systems/audio/engine.js';
import { placeProps } from '../story/placement.js';
import { Story } from '../story/story.js';
import { Puzzles } from '../story/puzzles.js';
import { Ending } from '../story/ending.js';
import { UI, clockText } from '../ui/ui.js';
import { Panels } from '../ui/panels.js';
import { SettingsUI } from '../ui/settings.js';
import { Perf } from './perf.js';

const raf = () => new Promise((r) => requestAnimationFrame(r));
const TOWER_LOOK = new THREE.Vector3(0, 30, -166);
const AUTO = 'clearhaven947.autostart';
export { tick };

export async function startGame() {
  const G = { events: new Events(), state: 'loading', elapsed: 0, systems: [], region: null, dirty: false };
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
  for (const l of G.world.lightSpecs) G.lights.add(l);
  G.interact = new Interact(G);
  G.props = new Props(G);
  G.hands = new Hands(G);
  G.flashlight = new Flashlight(G);
  G.shelters = new Shelters(G);
  G.panels = new Panels(G);
  placeProps(G);
  G.remnants = new Remnants(G);
  G.story = new Story(G);
  G.puzzles = new Puzzles(G);
  G.ending = new Ending(G);
  G.weather = new Weather(G);
  G.audio = new AudioEngine(G);
  G.settingsUI = new SettingsUI(G);
  G.perf = new Perf(G);
  G.systems.push(G.lights, G.props, G.interact, G.hands, G.flashlight, G.shelters, G.remnants, G.story, G.puzzles);
  G.events.on('quality', (q) => G.world.setDensity(q.density));
  G.gfx.setQuality(G.settings.quality);
  G.time.set(14.2, true);
  titleCam(G, 0);
  const warm = [...G.remnants.list.map((r) => r.group), G.weather.rainLines, G.weather.dustPts, G.weather.pollenPts];
  precompile(G, warm);
  G.newGame = (o) => begin(G, 'new', o);
  flow(G);
  if (DEBUG) installDebug(G);
  G.ui.show('loading', false);
  const auto = sessionStorage.getItem(AUTO);
  sessionStorage.removeItem(AUTO);
  if (auto === 'new' || (auto === 'continue' && Save.has())) { begin(G, auto, { skipLock: true }); G.state = 'paused'; G.ui.show('pause', true); }
  else showTitle(G);
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const raw = now - last, dt = Math.min(0.1, raw / 1000); last = now;
    const t0 = performance.now();
    try { tick(G, dt); } catch (e) { console.error(e); }
    G.perf.frame(raw, performance.now() - t0);
  };
  requestAnimationFrame(loop);
}

// Compile every shader variant the game can need while the loading screen is up, for BOTH output paths:
// straight to the canvas (low quality) and into the bloom composer's render target (medium/high), whose
// colour space / tone mapping differ. Textures are uploaded too, so nothing stalls the first time it is seen.
function precompile(G, warm) {
  const R = G.renderer, groups = [...Object.values(G.world.groups), ...Object.values(G.world.details)];
  const vis = groups.map((g) => g.visible);
  [...groups, ...warm].forEach((o) => { o.visible = true; });
  R.compile(G.scene, G.camera);
  R.setRenderTarget(G.gfx.composer.readBuffer); R.compile(G.scene, G.camera); R.setRenderTarget(null);
  const seen = new Set();
  G.scene.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) for (const k of ['map', 'alphaMap']) { const tx = m[k] || (m.uniforms && m.uniforms.uMap && m.uniforms.uMap.value); if (tx && tx.isTexture && !seen.has(tx)) { seen.add(tx); R.initTexture(tx); } }
  });
  warm.forEach((o) => { o.visible = false; });
  groups.forEach((g, i) => { g.visible = vis[i]; });
}

function showTitle(G) {
  G.state = 'title'; G.input.game = false;
  for (const id of ['pause', 'hud', 'note', 'journal', 'keypad', 'ending', 'settings']) G.ui.show(id, false);
  G.ui.show('title', true); G.ui.fade(false, false, 300); G.ui.threat(0);
  document.querySelector('[data-act="continue"]').disabled = !Save.has();
  G.time.set(14.2, true); G.time.range(14.2, 14.2);
}

function begin(G, mode, o = {}) {
  if (G.dirty) { sessionStorage.setItem(AUTO, mode); location.reload(); return; }
  G.dirty = true;
  G.ui.show('title', false); G.ui.show('hud', true);
  G.region = null;
  if (mode === 'continue') {
    const d = Save.read();
    if (d) Save.apply(G, d);
  } else {
    Save.clear();
    const s = G.world.anchors.get('spawn');
    G.player.spawn(s.pos.x, s.pos.y, s.pos.z, s.yaw);
    G.time.set(14.0, true);
    G.story.enterStep(false);
    setTimeout(() => { G.story.addThought('t_wake'); G.ui.objective(G.story.objectiveText()); }, 4600);
  }
  setPlaying(G, !o.skipLock);
  G.events.emit('newGame', mode);
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
    if (act === 'new') { if (Save.has() && !window.confirm(t('save.confirmNew'))) return; begin(G, 'new'); }
    else if (act === 'continue') begin(G, 'continue');
    else if (act === 'resume') resume(G);
    else if (act === 'journal' && G.state === 'paused') { setPlaying(G, false); G.panels.openJournal(); }
    else if (act === 'title') showTitle(G);
  });
  G.events.on('unlock', (expected) => { if (!expected && G.state === 'playing') pause(G); });
  G.events.on('key', (code) => {
    if (code === 'KeyP') { if (G.state === 'playing') { G.input.unlock(true); pause(G); } else if (G.state === 'paused') resume(G); }
  });
  G.renderer.domElement.addEventListener('click', () => { if (G.state === 'paused') resume(G); else if (G.state === 'playing' && !G.input.locked) G.input.lock(); });
  G.events.on('fellOut', () => { G.props.returnCarried(); G.shelters.respawnPlayer(); });
  G.events.on('shelterEnter', () => { if (G.state === 'playing' && Save.write(G)) G.ui.toast(t('save.saved')); });
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
    G.time.update(0, null); G.weather.update(dt); G.time.followShadow(G.camera.position);
    G.world.update(dt, G.camera);
    if (!G.freeze) G.gfx.render();
  } else if (G.state === 'playing' || G.state === 'cutscene') {
    if (G.state === 'playing') { G.player.update(dt); for (const s of G.systems) s.update(dt); }
    else { G.ending.update(dt); G.lights.update(dt); }
    const zone = G.world.zoneAt(G.camera.position);
    G.time.update(dt, zone); G.weather.update(dt); G.time.followShadow(G.state === 'playing' ? G.player.feet : G.camera.position);
    G.world.update(dt, G.camera);
    if (G.state === 'playing') {
      const reg = G.world.regionAt(G.player.feet);
      if (reg !== G.region) { G.region = reg; G.ui.regionCard(t('regions.' + reg), clockText(G.time.hour)); G.events.emit('region', reg); }
      G.ui.crouch(G.player.crouch);
    }
    if (!G.freeze) G.gfx.render();
  }
  G.audio.update(dt);
  G.input.endFrame();
}
