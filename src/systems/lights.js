// Light pool: a fixed number of PointLights is re-assigned to the nearest "virtual" lights (shelter lamps,
// emergency lights). The light count never changes, so no shader recompiles happen at runtime.
import * as THREE from 'three';

export class LightPool {
  constructor(G, n = 3) {
    this.G = G; this.lights = []; this.virtual = []; this.t = 0;
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffcf8a', 0, 9, 1.6); l.userData.target = null; G.scene.add(l); this.lights.push(l); }
  }
  add(v) { this.virtual.push({ intensity: 6, distance: 9, color: '#ffcf8a', on: true, ...v, pos: new THREE.Vector3(...v.pos) }); }
  update(dt) {
    const p = this.G.camera.position;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.25;
      const near = this.virtual.filter((v) => v.on).map((v) => [v, v.pos.distanceToSquared(p)]).filter((e) => e[1] < 45 * 45).sort((a, b) => a[1] - b[1]).slice(0, this.lights.length).map((e) => e[0]);
      for (const l of this.lights) if (l.userData.target && !near.includes(l.userData.target)) l.userData.target = null;
      for (const v of near) if (!this.lights.some((l) => l.userData.target === v)) { const free = this.lights.find((l) => !l.userData.target); if (free) { free.userData.target = v; free.position.copy(v.pos); free.color.set(v.color); free.distance = v.distance; free.intensity = 0; } }
    }
    const time = this.G.elapsed;
    for (const l of this.lights) {
      const v = l.userData.target, want = v ? v.intensity * (v.flicker ? 0.75 + 0.25 * Math.sin(time * 13 + v.pos.x) * Math.sin(time * 7.3) : 1) : 0;
      l.intensity += (want - l.intensity) * Math.min(1, dt * 4);
    }
  }
}
