// 타격감 장치: 히트스톱, 슬로 모션, 번쩍임, 화면 효과(여백·먹 번짐·페이드).
import { G } from '../core/g.js';
import { damp } from '../core/util.js';

export function createFx() {
  const flashes = [];
  const fx = {
    stop: 0, slowT: 0, slowScale: 1, blankT: 0, hurtV: 0, fade: 1, fadeTo: 1, fadeK: 2, bars: 0, barsTo: 0, gold: 0,
    hitstop(s) { if (s > this.stop) this.stop = s; },
    slowmo(scale, dur) { this.slowScale = scale; this.slowT = dur; },
    // 이번 프레임의 시간 배율
    timeScale(rdt) {
      if (this.stop > 0) { this.stop -= rdt; return 0.03; }
      if (this.slowT > 0) { this.slowT -= rdt; return this.slowT < 0.15 ? this.slowScale + (1 - this.slowScale) * (1 - this.slowT / 0.15) : this.slowScale; }
      return 1;
    },
    flash(mats, dur = 0.1, strength = 1, color) {
      for (const m of mats) { if (!m.userData.uFlash) continue; if (color !== undefined) m.userData.uFlashCol.value.set(color); flashes.push({ m, t: dur, dur, s: strength }); m.userData.uFlash.value = strength; }
    },
    blank(dur) { this.blankT = Math.max(this.blankT, dur); },        // 여백: 세상이 백지로
    hurt(a) { this.hurtV = Math.min(1, this.hurtV + a); },             // 가장자리에서 번져 드는 먹
    fadeOut(k = 2, color) { this.fadeTo = 1; this.fadeK = k; if (color !== undefined) G.gfx.pu.uFadeCol.value.set(color); },
    fadeIn(k = 2) { this.fadeTo = 0; this.fadeK = k; },
    setBars(on) { this.barsTo = on ? 1 : 0; },
    update(rdt) {
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.t -= rdt;
        if (f.t <= 0) { f.m.userData.uFlash.value = 0; flashes.splice(i, 1); } else f.m.userData.uFlash.value = f.s * (f.t / f.dur);
      }
      const pu = G.gfx.pu, p = G.player;
      this.blankT = Math.max(0, this.blankT - rdt);
      pu.uBlank.value = damp(pu.uBlank.value, this.blankT > 0 ? 1 : 0, this.blankT > 0 ? 22 : 7, rdt);
      this.hurtV = Math.max(0, this.hurtV - rdt * 0.9);
      pu.uHurt.value = damp(pu.uHurt.value, this.hurtV, 14, rdt);
      const low = p && p.hp !== undefined && p.hp > 0 && p.hp / p.maxHp < 0.3 ? 1 : 0;
      pu.uLow.value = damp(pu.uLow.value, low, 4, rdt);
      this.fade += Math.sign(this.fadeTo - this.fade) * Math.min(Math.abs(this.fadeTo - this.fade), rdt * this.fadeK);
      pu.uFade.value = this.fade;
      this.bars = damp(this.bars, this.barsTo, 5, rdt); pu.uBars.value = this.bars < 0.003 ? 0 : this.bars;
      this.gold = Math.max(0, this.gold - rdt * 1.2); pu.uGold.value = this.gold;
    },
  };
  return fx;
}
