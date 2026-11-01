// First-person arms in a yellow cardigan (the protagonist's identity colour). Shown while carrying
// something or holding the flashlight. Drawn on top of the world (no depth test) so they never clip.
import * as THREE from 'three';
import { Geo } from '../world/geo.js';

function armGeo() {
  const g = new Geo(() => 0.5);
  g.box(0, 0, -0.2, 0.115, 0.115, 0.44, '#e8b73f', { jit: 0 });
  for (let i = 0; i < 4; i++) g.box(0, 0.058, -0.06 - i * 0.1, 0.118, 0.01, 0.03, '#d4a232', { jit: 0 });
  g.box(0, 0, -0.43, 0.125, 0.125, 0.05, '#f6e7bf', { jit: 0 });
  g.box(0, -0.005, -0.51, 0.085, 0.05, 0.12, '#f0c9a8', { jit: 0 });
  g.box(0.03, 0.01, -0.575, 0.025, 0.03, 0.05, '#ecc29f', { jit: 0 });
  return g.build();
}
function torchGeo() {
  const g = new Geo(() => 0.5);
  g.prism(0, 0, 0, 0.028, 0.028, 0.2, 8, '#4b4f5e', { rx: -Math.PI / 2, jit: 0 });
  g.prism(0, 0, -0.2, 0.04, 0.04, 0.06, 8, '#5e6374', { rx: -Math.PI / 2, jit: 0 });
  return g.build();
}

export class Hands {
  constructor(G) {
    this.G = G;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, depthTest: false, depthWrite: false, fog: false });
    const geo = armGeo();
    this.left = new THREE.Mesh(geo, mat); this.right = new THREE.Mesh(geo, mat);
    this.torch = new THREE.Mesh(torchGeo(), mat); this.torch.position.set(0, 0.04, -0.5); this.left.add(this.torch);
    this.lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 10), new THREE.MeshBasicMaterial({ color: '#fff3c4', depthTest: false, depthWrite: false, fog: false }));
    this.lens.position.set(0, 0, -0.231); this.torch.add(this.lens);
    for (const m of [this.left, this.right, this.torch, this.lens]) { m.renderOrder = 1000; m.frustumCulled = false; }
    G.camera.add(this.left, this.right);
    this.l = 0; this.r = 0; this.t = 0;
  }
  update(dt) {
    const G = this.G, carry = G.props.carrying, torchOn = !!(G.flashlight && G.flashlight.on && G.flashlight.has);
    const crate = carry && carry.crate, small = carry && carry.small;
    const wantL = crate || torchOn ? 1 : 0, wantR = crate || small ? 1 : 0;
    this.l += (wantL - this.l) * Math.min(1, dt * 9); this.r += (wantR - this.r) * Math.min(1, dt * 9);
    this.t += dt;
    const pl = G.player, bob = Math.sin(pl.bob * 2) * pl.bobAmp * 0.35, sway = Math.sin(pl.bob) * pl.bobAmp * 0.25;
    const down = (v) => (1 - v) * 0.45;
    if (crate) {
      this.left.position.set(-0.34 + sway, -0.42 - down(this.l) + bob, -0.3); this.left.rotation.set(0.18, -0.32, 0.25);
      this.right.position.set(0.34 + sway, -0.42 - down(this.r) + bob, -0.3); this.right.rotation.set(0.18, 0.32, -0.25);
    } else {
      this.left.position.set(-0.27 + sway, -0.31 - down(this.l) + bob, -0.12); this.left.rotation.set(0.05, 0.1, 0.1);
      this.right.position.set(0.25 + sway, -0.32 - down(this.r) + bob, -0.12); this.right.rotation.set(0.12, -0.05, -0.15);
    }
    this.torch.visible = torchOn && !crate;
    this.left.visible = this.l > 0.02; this.right.visible = this.r > 0.02;
    if (small && carry.mesh.parent === G.camera) carry.mesh.position.set(0.25 + sway, -0.25 - down(this.r) + bob, -0.62);
  }
}
