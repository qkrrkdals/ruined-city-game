// 성장과 진행 상태(저장되는 모든 것): 먹물·덧칠·붓 손질·도장·획·깃발.
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';

export const CHARM_IDS = ['pine', 'bamboo', 'plum', 'orchid', 'mum', 'crane'];

export function createProg() {
  const P = {
    ink: 0, up: { hp: 0, atk: 0, ink: 0 }, weapon: 0, dew: 0, bristle: 0, pages: 0,
    charms: [], equipped: [], arts: { dot: false, wave: false, smash: false },
    flags: {}, shrines: [], chests: [], memos: [], lastShrine: null,
    stats: { time: 0, deaths: 0, kills: 0, finishers: 0, perfect: 0 },
    get level() { return this.up.hp + this.up.atk + this.up.ink; },
    get tier() { return Math.min(3, Math.floor(this.level / 3)); },
    get artCount() { return (this.arts.dot ? 1 : 0) + (this.arts.wave ? 1 : 0) + (this.arts.smash ? 1 : 0); },
    cost() { return CFG.upgrade.base + CFG.upgrade.step * this.level; },
    addInk(v) { this.ink += v; },
    spend(v) { if (this.ink < v) return false; this.ink -= v; return true; },
    upgrade(stat) { if (!this.spend(this.cost())) return false; this.up[stat]++; this.apply(); return true; },
    has(id) { return this.equipped.includes(id); },
    addCharm(id) { if (!this.charms.includes(id)) { this.charms.push(id); if (this.equipped.length < 2) this.equipped.push(id); this.apply(); } },
    toggleCharm(id) {
      const i = this.equipped.indexOf(id);
      if (i >= 0) this.equipped.splice(i, 1); else { if (this.equipped.length >= 2) this.equipped.shift(); this.equipped.push(id); }
      this.apply();
    },
    learn(id) { this.arts[id] = true; this.apply(); },
    flag(k, v = true) { this.flags[k] = v; },
    // 진행 상태를 주인공 능력치에 반영
    apply() {
      const p = G.player, c = CFG.player, before = p.maxHp;
      p.maxHp = c.hp + this.up.hp * CFG.upgrade.hp + (this.has('pine') ? 25 : 0);
      p.atkMul = (1 + this.up.atk * CFG.upgrade.atk) * CFG.weapon[this.weapon];
      p.inkMax = c.inkMax + Math.floor(this.up.ink / 2);
      p.inkGain = 1 + this.up.ink * CFG.upgrade.inkGain + (this.has('orchid') ? 0.35 : 0);
      p.healsMax = c.heal.charges + this.dew;
      p.healMul = this.has('mum') ? 1.35 : 1;
      p.perfectBonus = this.has('bamboo') ? 0.07 : 0; p.perfectInk = this.has('bamboo') ? 0.5 : 0;
      p.lowHpBoost = this.has('plum') ? 0.3 : 0;
      p.finHeal = this.has('crane') ? 0.16 : 0.06;
      p.arts = this.arts;
      if (p.maxHp > before) p.hp += p.maxHp - before;
      p.hp = Math.min(p.hp, p.maxHp); p.ink = Math.min(p.ink, p.inkMax); p.heals = Math.min(p.heals, p.healsMax);
      // 농담: 덧칠할수록 밑그림이 짙어진다
      const k = Math.min(1, this.level / 10), v = 1 - 0.56 * k;
      p.rig.body.color.setRGB(v, v, v * 1.04);
    },
    serialize() {
      return { v: 1, ink: Math.round(this.ink), up: this.up, weapon: this.weapon, dew: this.dew, bristle: this.bristle, pages: this.pages, charms: this.charms, equipped: this.equipped, arts: this.arts, flags: this.flags, shrines: this.shrines, chests: this.chests, memos: this.memos, lastShrine: this.lastShrine, stats: this.stats, difficulty: G.difficulty };
    },
    load(d) {
      for (const k of ['ink', 'weapon', 'dew', 'bristle', 'pages', 'lastShrine']) if (d[k] !== undefined) this[k] = d[k];
      Object.assign(this.up, d.up || {}); Object.assign(this.arts, d.arts || {}); Object.assign(this.stats, d.stats || {});
      this.flags = d.flags || {}; this.charms = d.charms || []; this.equipped = d.equipped || []; this.shrines = d.shrines || []; this.chests = d.chests || []; this.memos = d.memos || [];
      if (d.difficulty) G.difficulty = d.difficulty;
    },
  };
  return P;
}
