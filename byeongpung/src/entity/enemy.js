// 적 공통: 상태기계(잠듦→알아챔→추격→맴돎→예고→공격→빈틈), 피격·흐트러짐·맺음, 체력 띠.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { Combat, inShape, rel } from './combat.js';
import { P } from '../gfx/particles.js';
import { Slash } from '../gfx/slash.js';
import { HEX } from '../gfx/palette.js';
import { blotTexture } from '../gfx/textures.js';
import { patch } from '../gfx/materials.js';
import { approachAngle, wrapAngle, rand, randSign, clamp, clamp01, damp } from '../core/util.js';

const _d = new THREE.Vector3(), _p = new THREE.Vector3(), R = { f: 0, r: 0, dist: 0, ang: 0 };
let shadowMat = null, barGeo = null, barMats = null;
const KB = [0, 5.5, 9, 13]; // 세기별 넉백 속도

export class Enemy {
  constructor(def, x, z, o = {}) {
    this.def = def; this.kind = def.kind; this.name = def.name;
    this.pos = new THREE.Vector3(x, F.h(x, z), z); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.yaw = o.yaw ?? rand(Math.PI * 2); this.home = { x, z, yaw: this.yaw };
    this.hp = this.maxHp = def.hp; this.posture = 0; this.postureMax = def.posture; this.postureT = 9;
    this.radius = def.radius; this.height = def.height; this.mass = def.mass || 1; this.boss = !!def.boss;
    this.alive = true; this.targetable = true; this.hittable = true; this.solid = true; this.attacking = false; this.staggered = false;
    this.st = 'idle'; this.t = 0; this.atk = null; this.cd = rand(0.4, 1.4); this.strafe = randSign(); this.strafeT = rand(1, 3);
    this.aware = false; this.flinchN = 0; this.flinchT = 9; this.revenge = false; this.struck = false; this.deadT = 0; this.jumpY = 0;
    this.speedMul = 1; this.inkColor = HEX.ink; this.ink = def.ink || 0; this.enc = o.enc || null; this.ambush = !!o.ambush;
    this.group = new THREE.Group(); this.model = new THREE.Group(); this.group.add(this.model); G.gfx.scene.add(this.group);
    this.mats = [];
    this.build();
    // 발밑 먹 그림자
    if (!shadowMat) shadowMat = patch(new THREE.MeshBasicMaterial({ map: blotTexture(false), color: HEX.ink, transparent: true, opacity: 0.34, depthWrite: false }), { keep: true });
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sg, shadowMat); this.shadow.scale.setScalar(this.radius * 3.4); this.shadow.renderOrder = 1; this.group.add(this.shadow);
    this.makeBar();
    if (this.ambush) { this.st = 'sleep'; this.targetable = false; this.hittable = false; this.solid = false; this.model.visible = false; this.shadow.visible = false; }
    this.sync();
  }
  build() {}                 // 모델 만들기(하위 클래스)
  animate(dt) {}             // 자세(하위 클래스)
  makeBar() {
    if (!barGeo) {
      barGeo = new THREE.PlaneGeometry(1, 1); barGeo.translate(0.5, 0, 0);
      const mk = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, fog: false, depthTest: false, transparent: true, opacity: o });
      barMats = [mk(HEX.paper, 0.75), mk(HEX.ink), mk(HEX.red)];
    }
    const w = this.boss ? 0 : Math.min(1.6, 0.6 + this.maxHp / 240);
    const b = new THREE.Group(); b.visible = false; this.bar = b; this.barW = w;
    const bg = new THREE.Mesh(barGeo, barMats[0]), hp = new THREE.Mesh(barGeo, barMats[1]), ps = new THREE.Mesh(barGeo, barMats[2]);
    bg.scale.set(w + 0.05, 0.11, 1); bg.position.set(-w / 2 - 0.025, 0, 0); hp.position.set(-w / 2, 0.018, 0.001); ps.position.set(-w / 2, -0.034, 0.001);
    hp.scale.set(w, 0.05, 1); ps.scale.set(0.001, 0.026, 1);
    bg.renderOrder = 8; hp.renderOrder = 9; ps.renderOrder = 9;
    b.add(bg, hp, ps); b.userData = { hp, ps }; G.gfx.scene.add(b);
  }
  get distP() { const p = G.player; return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z); }
  setState(st) { this.st = st; this.t = 0; }
  face(x, z, rate, dt) { this.yaw = approachAngle(this.yaw, Math.atan2(x - this.pos.x, z - this.pos.z), rate * dt); }
  // 목표 쪽으로 속도를 맞춘다
  go(x, z, speed, dt, accel = 30) {
    let dx = x - this.pos.x, dz = z - this.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    this.steer(dx * speed, dz * speed, accel, dt);
  }
  steer(tx, tz, accel, dt) {
    const dvx = tx - this.vel.x, dvz = tz - this.vel.z, dv = Math.hypot(dvx, dvz), a = accel * dt;
    if (dv <= a) { this.vel.x = tx; this.vel.z = tz; } else { this.vel.x += (dvx / dv) * a; this.vel.z += (dvz / dv) * a; }
  }
  armored() { const a = this.atk; return this.revenge || (a && (this.st === 'windup' || this.st === 'strike') && (a.armor || this.def.poise >= 3)); }

  // ── 맞기 ──
  takeHit(info) {
    if (!this.alive || !this.hittable) return {};
    if (!this.aware) this.notice(true);
    if (this.blocks && this.blocks(info)) {
      this.posture += info.pos * 0.6; this.postureT = 0; this.onBlock && this.onBlock(info);
      if (this.posture >= this.postureMax) this.stagger();
      return { blocked: true };
    }
    let dmg = info.dmg * (this.staggered ? 1.35 : 1) * (this.def.dmgTaken || 1);
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg; this.lastHitT = G.time;
    G.fx.flash(this.mats, 0.1, 0.95, HEX.white);
    const kb = KB[info.power || 1] / this.mass * (this.armored() ? 0.25 : 1);
    if (info.dir) this.knock.addScaledVector(info.dir, kb);
    if (info.launch && this.mass <= 1.2) this.jumpV = 7;
    this.pop = 1;
    if (this.hp <= 0) {
      if (this.boss && !this.finalReady) { this.hp = 1; this.finalReady = true; this.posture = this.postureMax; this.stagger(true); return { dmg }; }
      if (!this.boss) { this.die(info); return { kill: true, dmg }; }
      return { dmg };
    }
    if (!this.staggered) {
      this.posture += info.pos; this.postureT = 0;
      if (this.posture >= this.postureMax) { this.stagger(); return { dmg }; }
      if (!this.armored() && (info.power || 1) >= (this.def.flinchPower || 1)) {
        this.flinchN = this.flinchT < 2 ? this.flinchN + 1 : 1; this.flinchT = 0;
        if (this.flinchN > (this.def.flinchMax || 4)) { this.revenge = true; this.flinchN = 0; this.cd = 0; }
        else this.flinch(info);
      }
    }
    return { dmg };
  }
  flinch(info) { this.endAttack(); this.setState('flinch'); this.flinchDur = (this.def.flinchTime || 0.36) * (info.power >= 2 ? 1.4 : 1); G.audio.play('eHurt', { kind: this.kind }); }
  stagger(final) {
    this.endAttack(); this.setState('stagger'); this.staggered = true; this.revenge = false; this.staggerDur = final ? 1e9 : (this.def.staggerTime || 3);
    _p.copy(this.pos); _p.y += this.height + 0.3; P.sparks(_p, 16, 9, HEX.red); P.paperBurst(_p, 6, 4);
    Slash.ring({ pos: this.pos, y: 0.15, r0: this.radius, r1: this.radius + 0.5, grow: 7, fade: 0.35, color: HEX.red, dry: 0.6 });
    G.fx.hitstop(0.09); G.cam.shake(0.3); G.audio.play('stagger', { boss: this.boss });
    G.emit('stagger', this);
  }
  beginFinish() { this.setState('finish'); this.vel.set(0, 0, 0); this.knock.set(0, 0, 0); }
  // 맺음을 받았다. 보통 적은 그대로 맺어지고, 우두머리는 큰 피해를 입고 일어선다.
  finish(info) {
    this.staggered = false; this.posture = 0;
    if (!this.boss) { this.die(info, true); return { kill: true }; }
    if (this.finalReady) { this.die(info, true); return { kill: true }; }
    const dmg = Math.round(this.maxHp * (this.def.finFrac || 0.2));
    this.hp = Math.max(1, this.hp - dmg); G.fx.flash(this.mats, 0.2, 1, HEX.white);
    if (info.dir) this.knock.addScaledVector(info.dir, 6);
    Combat.number(_p.copy(this.pos).setY(this.pos.y + this.height), dmg, 'crit');
    this.setState('flinch'); this.flinchDur = 1.1; this.cd = 1.2;
    if (this.hp <= 1) { this.finalReady = true; this.posture = this.postureMax; this.stagger(true); }
    return { kill: false };
  }
  die(info, finished) {
    if (!this.alive) return;
    this.alive = false; this.endAttack(); this.setState('dead'); this.staggered = false; this.targetable = false; this.hittable = false; this.solid = false;
    this.bar.visible = false; if (G.cam.target === this) G.cam.target = null;
    _p.copy(this.pos); _p.y += this.height * 0.5;
    P.inkBurst(_p, 14 + this.radius * 14, 6, info && info.dir, this.inkColor, 4); P.puffs(_p, 5, this.radius * 2.2, HEX.ink, this.radius, 1);
    P.splat(this.pos.x, this.pos.z, this.radius * 4 + 1);
    G.audio.play('eDie', { kind: this.kind, big: this.radius > 1 });
    if (G.loot && this.ink) G.loot.ink(this.pos, this.ink * (finished ? 1.3 : 1));
    this.onDeath && this.onDeath(info, finished);
    G.emit('enemyDead', this, finished);
  }
  endAttack() { if (this.atk && this.atk.onEnd) this.atk.onEnd(this); this.atk = null; this.attacking = false; this.struck = false; Combat.release(this); if (this.tellFx) { Slash.kill(this.tellFx); this.tellFx = null; } }
  notice(silent) {
    this.aware = true;
    if (this.st === 'sleep') { this.setState('rise'); this.model.visible = true; this.shadow.visible = true; this.solid = true; P.inkBurst(this.pos, 10, 3, null, HEX.ink, 3); P.splat(this.pos.x, this.pos.z, this.radius * 3.5); G.audio.play('rise'); return; }
    if (this.st === 'idle' || this.st === 'return') { this.setState(silent ? 'chase' : 'alert'); if (!silent) G.audio.play('alert', { kind: this.kind }); }
    if (this.enc) this.enc.alert(this);
  }

  // ── 공격 ──
  chooseAttack(d) {
    const list = this.def.attacks; let tot = 0; const ok = [];
    for (const a of list) { if (d >= a.range[0] && d <= a.range[1] && (!a.cond || a.cond(this)) && !(a.id === this.lastAtk && list.length > 1 && Math.random() < 0.6)) { ok.push(a); tot += a.w || 1; } }
    if (!ok.length) return null;
    let r = Math.random() * tot; for (const a of ok) { r -= a.w || 1; if (r <= 0) return a; }
    return ok[0];
  }
  startAttack(a) {
    this.atk = a; this.attacking = true; this.struck = false; this.lastAtk = a.id; this.setState('windup');
    this.windup = a.windup * (this.revenge ? 0.6 : 1) / (this.rage || 1); this.revenge = this.revenge && false;
    G.fx.flash(this.mats, 0.22, 0.55, HEX.red);
    _p.copy(this.pos); _p.y += this.height * 0.8; P.sparks(_p, 6, 5, HEX.red);
    G.audio.play('tell', { kind: this.kind, big: a.power >= 3 });
    if (a.ground) this.tellFx = this.groundTell(a);
    if (a.onStart) a.onStart(this);
    G.emit('tell', this);
  }
  // 바닥에 붉은 붓자국으로 공격 범위를 미리 보여 준다
  groundTell(a) {
    const s = a.groundShape || a.shape, o = { parent: this.group, color: HEX.red, reveal: this.windup * 0.5, hold: this.windup * 0.5 + (a.strike || 0.1), fade: 0.2, dry: 0.75, opacity: 0.6, flat: 1 };
    if (s.kind === 'line') return Slash.line({ ...o, c: [0, 0.14, 0], dir: [0, 0, 1], side: [1, 0, 0], len: s.len, width: s.w * 2 });
    if (s.kind === 'sector') return Slash.arc({ ...o, c: [0, 0.14, 0], tilt: 0, a0: (s.off || 0) - s.half, a1: (s.off || 0) + s.half, r0: Math.max(0.5, s.r * 0.25), r1: s.r });
    return Slash.arc({ ...o, c: [0, 0.14, s.fwd || 0], tilt: 0, a0: 0, a1: Math.PI * 2, r0: s.r > 5 ? s.r * 0.62 : s.r * 0.15, r1: s.r, opacity: s.r > 5 ? 0.42 : 0.55 });
  }
  updateAttack(dt) {
    const a = this.atk, p = G.player;
    if (this.st === 'windup') {
      const left = this.windup - this.t;
      if (left > (a.commit ?? 0.16)) this.face(p.pos.x, p.pos.z, a.track ?? 5, dt);
      this.steer(0, 0, 40, dt);
      if (a.onWindup) a.onWindup(this, dt);
      if (this.t >= this.windup) { this.setState('strike'); if (a.onStrike) a.onStrike(this); G.audio.play('eSwing', { kind: this.kind, big: a.power >= 3 }); }
    } else if (this.st === 'strike') {
      const dur = a.strike || 0.12;
      if (a.lunge) { const v = a.lunge / dur; this.vel.set(Math.sin(this.yaw) * v, 0, Math.cos(this.yaw) * v); } else this.steer(0, 0, 60, dt);
      if (a.onUpdate) a.onUpdate(this, dt);
      if (!this.struck && a.shape && this.t >= (a.hitAt ?? 0) * dur && this.tryHit(a)) this.struck = true;
      if (this.t >= dur) { if (a.onStrikeEnd) a.onStrikeEnd(this); this.setState('recover'); this.vel.multiplyScalar(0.2); if (this.tellFx) this.tellFx = null; }
    } else {
      this.steer(0, 0, 30, dt);
      if (this.t >= (a.recover || 0.6) / (this.rage || 1)) {
        const chain = a.chain && (!a.chainCond || a.chainCond(this)) ? this.def.attacks.find((x) => x.id === a.chain) : null;
        const cd = a.cd || [1.2, 2.4];
        this.endAttack(); this.cd = rand(cd[0], cd[1]) / (this.rage || 1);
        if (chain && Combat.request(this)) { this.startAttack(chain); this.windup *= 0.6; } else this.setState('engage');
      }
    }
  }
  // 공격 도형 안에 주인공이 있으면 때린다. 판정이 끝났으면(맞았든 피했든) true
  tryHit(a, shape) {
    const p = G.player, s = shape || a.shape;
    if (!inShape(s, this.pos.x, this.pos.z, this.yaw, p.pos.x, p.pos.z, p.radius)) return !(a.lunge || a.sweep);
    if (p.jumpY > 1.2 && !a.air) return true;
    _d.set(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize();
    p.takeHit({ dmg: a.dmg * (this.dmgMul || 1), power: a.power || 1, dir: _d, from: this });
    return true;
  }

  // ── 매 프레임 ──
  update(dt) {
    this.t += dt;
    if (!this.alive) { this.deadT += dt; this.dying(dt); return; }
    const p = G.player, d = this.distP;
    this.postureT += dt; this.flinchT += dt; if (this.cd > 0) this.cd -= dt;
    if (!this.staggered && this.postureT > 2.6 && this.posture > 0) this.posture = Math.max(0, this.posture - dt * this.postureMax * 0.22);
    const peace = G.peace || !p.alive;
    switch (this.st) {
      case 'sleep': if (!peace && d < (this.def.wake || 9)) this.notice(); break;
      case 'rise': this.model.scale.setScalar(clamp01(this.t / 0.5)); if (this.t >= 0.55) { this.model.scale.setScalar(1); this.targetable = true; this.hittable = true; this.setState('chase'); } break;
      case 'idle':
        this.steer(0, 0, 20, dt);
        if (!peace && d < (this.def.aggro || 14) && !F.blocked(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) this.notice();
        break;
      case 'alert': this.steer(0, 0, 30, dt); this.face(p.pos.x, p.pos.z, 8, dt); if (this.t > 0.45) this.setState('chase'); break;
      case 'chase': case 'engage': if (peace) { this.setState('return'); break; } this.think(dt, d); break;
      case 'windup': case 'strike': case 'recover': this.updateAttack(dt); break;
      case 'flinch': this.steer(0, 0, 30, dt); if (this.t >= this.flinchDur) this.setState('engage'); break;
      case 'stagger': this.steer(0, 0, 30, dt); if (this.t >= this.staggerDur) { this.staggered = false; this.posture = 0; this.setState('engage'); this.cd = 0.6; } break;
      case 'finish': this.vel.set(0, 0, 0); if (this.t > 3) { this.staggered = false; this.setState('engage'); } break;
      case 'return': {
        const hd = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
        if (hd < 1) { this.setState('idle'); this.aware = false; this.hp = this.maxHp; this.posture = 0; this.yaw = this.home.yaw; } else { this.go(this.home.x, this.home.z, this.def.speed, dt); this.face(this.home.x, this.home.z, 7, dt); }
        if (!peace && d < (this.def.aggro || 14) * 0.7) this.setState('chase');
        break;
      }
    }
    this.integrate(dt);
    this.animate(dt);
    this.sync();
  }
  // 기본 두뇌: 다가가서 맴돌다가 순번이 오면 공격
  think(dt, d) {
    const p = G.player, df = this.def;
    const leash = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
    if (leash > (df.leash || 42) || d > (df.lose || 34)) { this.setState('return'); this.aware = false; return; }
    this.face(p.pos.x, p.pos.z, df.turn || 6, dt);
    const reach = d - p.radius - this.radius;
    if (this.cd <= 0) {
      const a = this.chooseAttack(reach);
      if (a && Combat.request(this)) { this.startAttack(a); return; }
    }
    const pref = df.pref || 2.6; this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = randSign(); this.strafeT = rand(1.2, 3.2); }
    let tx = 0, tz = 0; const dx = (p.pos.x - this.pos.x) / (d || 1), dz = (p.pos.z - this.pos.z) / (d || 1);
    const sp = df.speed * this.speedMul;
    if (reach > pref + 1.2) { tx = dx * sp; tz = dz * sp; this.st = 'chase'; }
    else {
      this.st = 'engage';
      const rad = clamp((reach - pref) * 1.2, -1, 1) * sp * 0.6, tan = this.strafe * sp * (df.strafe ?? 0.35);
      tx = dx * rad - dz * tan; tz = dz * rad + dx * tan;
    }
    this.steer(tx, tz, df.accel || 22, dt);
  }
  integrate(dt) {
    if (this.jumpV || this.jumpY > 0) { this.jumpY += (this.jumpV || 0) * dt; this.jumpV = (this.jumpV || 0) - 24 * dt; if (this.jumpY <= 0) { this.jumpY = 0; this.jumpV = 0; } }
    this.pos.x += (this.vel.x + this.knock.x) * dt; this.pos.z += (this.vel.z + this.knock.z) * dt;
    const f = Math.exp(-9 * dt); this.knock.x *= f; this.knock.z *= f;
    if (!this.flying) { if (F.resolve(this.pos, this.radius * 0.8) && this.onWall) this.onWall(); this.pos.y = F.h(this.pos.x, this.pos.z); }
  }
  sync() {
    this.group.position.set(this.pos.x, this.pos.y + this.jumpY, this.pos.z); this.group.rotation.y = this.yaw;
    this.shadow.position.y = 0.05 - this.jumpY; this.shadow.scale.setScalar(this.radius * 3.4 * Math.max(0.3, 1 - this.jumpY * 0.12));
    if (this.pop > 0) { this.pop = Math.max(0, this.pop - 0.016 * 9); const k = this.pop; this.model.scale.set(1 + k * 0.16, 1 - k * 0.14, 1 + k * 0.16); }
    const b = this.bar, show = this.alive && !this.boss && this.targetable && (this.hp < this.maxHp || this.posture > 0 || G.cam.target === this) && (G.time - (this.lastHitT || -9) < 6 || this.aware);
    b.visible = show;
    if (show) {
      b.position.set(this.pos.x, this.pos.y + this.height + 0.45 + this.jumpY, this.pos.z); b.quaternion.copy(G.gfx.camera.quaternion);
      b.userData.hp.scale.x = Math.max(0.001, this.barW * clamp01(this.hp / this.maxHp)); b.userData.ps.scale.x = Math.max(0.001, this.barW * clamp01(this.posture / this.postureMax));
    }
  }
  // 죽은 뒤: 먹으로 흩어지며 가라앉는다
  dying(dt) {
    const u = clamp01(this.deadT / 0.45);
    this.model.scale.set(1 + u * 0.5, Math.max(0.001, 1 - u), 1 + u * 0.5); this.shadow.scale.setScalar(this.radius * 3.4 * (1 + u));
    this.sync0();
    if (this.deadT > 0.5) this.dispose();
  }
  sync0() { this.group.position.set(this.pos.x, this.pos.y, this.pos.z); }
  dispose() {
    if (this.gone) return; this.gone = true;
    G.gfx.scene.remove(this.group); G.gfx.scene.remove(this.bar);
    for (const m of this.mats) m.dispose();
  }
}
export { rel, wrapAngle, damp };
