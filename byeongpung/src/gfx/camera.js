// 3인칭 카메라: 궤도 회전, 조준 고정, 지형 충돌, 흔들림·킥, 연출 카메라.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { F } from '../world/field.js';
import { clamp, damp, dampAngle, lerp, noise2 } from '../core/util.js';

const _look = new THREE.Vector3(), _pos = new THREE.Vector3(), _v = new THREE.Vector3();

export function createCamera() {
  const cam = G.gfx.camera;
  const C = {
    yaw: Math.PI, pitch: 0.3, dist: CFG.cam.dist, distCur: CFG.cam.dist, distMul: 1,
    pivot: new THREE.Vector3(), trauma: 0, kick: new THREE.Vector3(), kickV: new THREE.Vector3(),
    fov: CFG.cam.fov, fovAdd: 0, fovPunch: 0, sens: 1, invertY: false,
    target: null,                 // 조준 고정 대상
    cine: null, cineW: 0,         // 연출: { pos:Vector3, look:Vector3, fov }
    focus: null, focusW: 0,       // 대화 등: 살짝 당겨 보는 지점
    shake(a) { this.trauma = Math.min(1, this.trauma + a); },
    punch(dir, amt) { this.kickV.addScaledVector(dir, amt * 9); },
    zoomPunch(a) { this.fovPunch = Math.max(this.fovPunch, a); },
    fwd(out) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); },
    snap() { const p = G.player; if (p) { this.pivot.set(p.pos.x, p.pos.y + CFG.cam.height, p.pos.z); this.distCur = this.dist; } this.update(0, 0, true); },
    setBehind(yawFacing) { this.yaw = yawFacing + Math.PI; },
    update(dt, rdt, snap) {
      const I = G.input, p = G.player;
      if (!p) return;
      const controllable = G.state === 'play' && !this.cine;
      if (controllable) {
        const s = CFG.cam.sens * this.sens;
        if (this.target && this.target.alive) {
          const tx = this.target.pos.x - p.pos.x, tz = this.target.pos.z - p.pos.z;
          const want = Math.atan2(-tx, -tz);
          this.yaw = dampAngle(this.yaw, want, 7, rdt);
          const d = Math.hypot(tx, tz);
          this.pitch = damp(this.pitch, clamp(0.34 - d * 0.008 + (this.target.lockPitch || 0), 0.12, 0.5), 4, rdt);
        } else {
          this.yaw -= I.dx * s;
          this.pitch = clamp(this.pitch + I.dy * s * (this.invertY ? -1 : 1), CFG.cam.pitchMin, CFG.cam.pitchMax);
          if (I.free) { // 자유 커서: 화면 가장자리에서는 계속 돈다
            const ex = I.mx < 0.07 ? -(0.07 - I.mx) / 0.07 : I.mx > 0.93 ? (I.mx - 0.93) / 0.07 : 0;
            this.yaw -= ex * 2.4 * rdt;
          }
        }
      }
      // 따라가는 중심
      const tx = p.pos.x, ty = p.pos.y + CFG.cam.height, tz = p.pos.z;
      if (snap) this.pivot.set(tx, ty, tz);
      else { this.pivot.x = damp(this.pivot.x, tx, 16, rdt); this.pivot.z = damp(this.pivot.z, tz, 16, rdt); this.pivot.y = damp(this.pivot.y, ty, 9, rdt); }
      // 조준 고정이면 대상 쪽으로 중심을 조금 민다
      _look.copy(this.pivot);
      if (this.target && this.target.alive) { _look.x = lerp(_look.x, this.target.pos.x, 0.22); _look.z = lerp(_look.z, this.target.pos.z, 0.22); }
      if (this.focus) this.focusW = damp(this.focusW, 1, 5, rdt); else this.focusW = damp(this.focusW, 0, 6, rdt);
      if (this.focusW > 0.002 && this._focus) { _look.lerp(this._focus, this.focusW * 0.45); }
      if (this.focus) (this._focus || (this._focus = new THREE.Vector3())).copy(this.focus);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const dx = Math.sin(this.yaw) * cp, dz = Math.cos(this.yaw) * cp, dy = sp;
      // 지형·벽 충돌: 눈높이가 땅 위로 0.55m 이상, 길 밖으로 너무 나가지 않게
      const want = this.dist * this.distMul * (1 - this.focusW * 0.22);
      let ok = want;
      for (let i = 1; i <= 8; i++) {
        const t = (want * i) / 8, x = _look.x + dx * t, z = _look.z + dz * t, y = _look.y + dy * t;
        if (y < F.hr(x, z) + 0.55 || F.sdf(x, z) > 5.5) { ok = Math.max(CFG.cam.minDist, (want * (i - 1)) / 8); break; }
      }
      this.distCur = snap ? ok : ok < this.distCur ? damp(this.distCur, ok, 22, rdt) : damp(this.distCur, ok, 3.5, rdt);
      _pos.set(_look.x + dx * this.distCur, _look.y + dy * this.distCur, _look.z + dz * this.distCur);
      const gy = F.hr(_pos.x, _pos.z) + 0.5; if (_pos.y < gy) _pos.y = gy;
      // 연출 카메라와 섞기
      this.cineW = this.cine ? damp(this.cineW, 1, this.cine.k || 3.2, rdt) : damp(this.cineW, 0, 4, rdt);
      if (this.cine && this.cine.snap) { this.cineW = 1; this.cine.snap = false; }
      let fov = this.fov + this.fovAdd - this.fovPunch;
      if (this.cineW > 0.001 && this._cp) {
        _pos.lerp(this._cp, this.cineW); _look.lerp(this._cl, this.cineW);
        fov = lerp(fov, this._cf, this.cineW);
      }
      if (this.cine) {
        (this._cp || (this._cp = new THREE.Vector3())).copy(this.cine.pos);
        (this._cl || (this._cl = new THREE.Vector3())).copy(this.cine.look);
        this._cf = this.cine.fov || this.fov;
      }
      // 흔들림(트라우마²) + 킥(스프링)
      this.trauma = Math.max(0, this.trauma - rdt * 1.7);
      const sh = this.trauma * this.trauma, t = G.real * 31;
      this.kickV.addScaledVector(this.kick, -190 * rdt); this.kickV.multiplyScalar(Math.exp(-13 * rdt)); this.kick.addScaledVector(this.kickV, rdt);
      _pos.x += (noise2(t, 1.3) - 0.5) * sh * 0.75 + this.kick.x;
      _pos.y += (noise2(t, 7.7) - 0.5) * sh * 0.6 + this.kick.y;
      _pos.z += (noise2(t, 13.1) - 0.5) * sh * 0.75 + this.kick.z;
      this.fovPunch = damp(this.fovPunch, 0, 9, rdt);
      cam.position.copy(_pos);
      cam.lookAt(_look.x, _look.y + 0.15, _look.z);
      cam.rotateZ((noise2(t, 21.9) - 0.5) * sh * 0.07);
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    },
    // 세계 좌표 → 화면 좌표(픽셀). 카메라 뒤면 null
    project(v, out) {
      _v.copy(v).project(cam);
      if (_v.z > 1) return null;
      out.x = (_v.x * 0.5 + 0.5) * G.gfx.w; out.y = (-_v.y * 0.5 + 0.5) * G.gfx.h; return out;
    },
  };
  return C;
}
