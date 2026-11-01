// Places movable props, batteries and the flashlight at the anchors registered by the region builders.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';
import { CFG } from '../core/config.js';
import { t } from '../i18n/i18n.js';

export const BOUNDS = {
  r1: [-80, -5, 120.6, 80, 12, 266],
  under: [-70, -8.5, -92, 45, -2, 62],
  r3: [-80, -1, -190, 80, 40, -40],
};
const BATTERIES = ['bat_s1', 'bat_r1_a', 'bat_r1_b', 'bat_s2', 'bat_m_a', 'bat_m_b', 'bat_s3', 'bat_u_a', 'bat_u_b', 'bat_u_c', 'bat_u_d', 'bat_u_e', 'bat_s4', 'bat_r3_a', 'bat_r3_b', 'bat_r3_c', 'bat_s5', 'bat_t_a'];

function batteryGeo() {
  const g = new Geo(() => 0.5);
  g.prism(0, 0, 0, 0.045, 0.045, 0.16, 8, '#3e4656', { bottom: true, jit: 0 });
  g.prism(0, 0.16, 0, 0.045, 0.045, 0.03, 8, '#e8b73f', { jit: 0 });
  g.prism(0, 0.19, 0, 0.018, 0.018, 0.02, 6, '#d9d4cc', { jit: 0 });
  g.box(0, 0.08, 0.046, 0.05, 0.07, 0.004, '#e8b73f', { jit: 0 });
  return g.build();
}
function torchGeo() {
  const g = new Geo(() => 0.5);
  g.prism(0, 0, 0, 0.032, 0.032, 0.22, 8, '#4b4f5e', { rz: Math.PI / 2, jit: 0, bottom: true });
  g.prism(-0.22, 0, 0, 0.045, 0.045, 0.06, 8, '#5e6374', { rz: Math.PI / 2, jit: 0, bottom: true });
  return g.build();
}

export function placeProps(G) {
  const W = G.world, A = (id) => W.anchors.get(id)?.pos;
  for (const id of ['crate_r1_a', 'crate_r1_b', 'crate_r1_c']) G.props.addCrate(id, A(id), BOUNDS.r1);
  G.props.addItem('fuse_r1', 'fuse', A('fuse_r1'), { bounds: BOUNDS.r1, lying: true });
  for (const id of ['crate_u_a', 'crate_u_b']) if (A(id)) G.props.addCrate(id, A(id), BOUNDS.under);
  for (const id of ['fuse_u_a', 'fuse_u_b']) if (A(id)) G.props.addItem(id, 'fuse', A(id), { bounds: BOUNDS.under, lying: true });
  // batteries
  const bg = batteryGeo(), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd585').multiplyScalar(1.5) });
  G.batteries = [];
  for (const id of BATTERIES) {
    const p = A(id); if (!p) continue;
    const mesh = new THREE.Mesh(bg, W.M.world); mesh.position.copy(p); mesh.rotation.y = Math.random() * 3;
    const dot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), glow); dot.position.set(0, 0.22, 0); mesh.add(dot);
    G.scene.add(mesh);
    const b = { id, mesh, taken: false, shelter: id.startsWith('bat_s') };
    b.it = G.interact.add({ id, pos: p.clone().add(new THREE.Vector3(0, 0.1, 0)), r: 0.25, verb: 'pickup', name: 'items.battery', enabled: () => !b.taken, onUse: () => takeBattery(G, b) });
    G.batteries.push(b);
  }
  G.events.on('shelterEnter', (s) => { for (const b of G.batteries) if (b.shelter && b.taken && b.id === 'bat_' + s.id) { b.taken = false; b.mesh.visible = true; } });
  // flashlight on the 2F desk
  const fp = A('flashlight');
  if (fp) {
    const mesh = new THREE.Mesh(torchGeo(), W.M.world); mesh.position.copy(fp); mesh.rotation.y = 0.4; G.scene.add(mesh);
    const it = G.interact.add({ id: 'flashlight', pos: fp, r: 0.25, verb: 'take', name: 'items.flashlight', enabled: () => !G.flashlight.has, onUse: () => { G.flashlight.give(); mesh.visible = false; G.interact.remove(it); G.ui.toast(t('hud.gotFlashlight')); } });
    G.flashlightPickup = { mesh, it };
  }
}

function takeBattery(G, b) {
  const fl = G.flashlight;
  if (!fl.has) { G.ui.toast(t('hud.noFlashlight')); return; }
  if (fl.level > 0.97) { G.ui.toast(t('hud.batteryFull')); return; }
  fl.add(CFG.battery.pickup); b.taken = true; b.mesh.visible = false;
  G.ui.toast(t('hud.batteryPlus'));
  G.events.emit('battery', b);
}
