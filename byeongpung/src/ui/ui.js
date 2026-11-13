// HUD: 체력·먹·호리병·획·길잡이·보스 띠·안내·떠오르는 숫자. 문장은 모두 text.ko.json 에서.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { MOVES, ARTS } from '../entity/moves.js';
import { finisherTarget } from '../entity/player_act.js';
import { makeIcons } from './icons.js';
import { paperTexture } from '../gfx/textures.js';
import { createDialog } from './dialog.js';
import { createMenus } from './menus.js';
import { createScreens } from './screens.js';
import { wrapAngle, clamp } from '../core/util.js';

const _v = new THREE.Vector3(), _s = { x: 0, y: 0 };
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export function createUI(root) {
  const T = G.text, icons = makeIcons();
  // 한지 무늬를 CSS 변수로
  try { const pt = paperTexture().image; root.style.setProperty('--paper-img', `url(${pt.toDataURL()})`); } catch (e) { /* 무늬 없이 */ }
  const hud = el('div', 'hud off');
  hud.innerHTML = `
    <div class="hud-tl"><div class="hp"><b></b><i></i></div><div class="inkrow"></div><div class="heals"></div></div>
    <div class="hud-tr"><div class="obj" hidden><span class="obj-l">${T.ui.objective}</span><span class="obj-t"></span></div><div class="money"><img src="${icons.drop}" alt=""><span>0</span></div></div>
    <div class="compass" hidden><div class="compass-m"></div><div class="compass-d"></div></div>
    <div class="boss" hidden><div class="boss-n"></div><div class="boss-hp"><b></b><i></i></div><div class="boss-ps"><i></i></div></div>
    <div class="arts"></div><div class="prompt" hidden></div><div class="hint"></div><div class="banner"></div><div class="word"></div>
    <div class="lock" hidden></div><div class="toasts"></div><div class="nums"></div>`;
  root.appendChild(hud);
  const $ = (s) => hud.querySelector(s);
  const hp = $('.hp'), hpI = $('.hp i'), hpB = $('.hp b'), inkRow = $('.inkrow'), heals = $('.heals'), objBox = $('.obj'), objT = $('.obj-t'), money = $('.money'), moneyT = $('.money span');
  const compass = $('.compass'), cm = $('.compass-m'), cd = $('.compass-d'), boss = $('.boss'), bossN = $('.boss-n'), bossHp = $('.boss-hp i'), bossHpB = $('.boss-hp b'), bossPs = $('.boss-ps i');
  const arts = $('.arts'), prompt = $('.prompt'), hint = $('.hint'), banner = $('.banner'), word = $('.word'), lock = $('.lock'), toasts = $('.toasts'), nums = $('.nums');
  const artEls = {};
  for (const id in ARTS) {
    const a = el('div', 'art', `<img src="${icons[id]}" alt=""><kbd>${T.arts[id].key}</kbd><div class="cd"></div>`); a.hidden = true; a.title = T.arts[id].name;
    arts.appendChild(a); artEls[id] = { a, cd: a.querySelector('.cd'), shown: false, no: false, h: -1 };
  }
  const numPool = []; let numI = 0;
  for (let i = 0; i < 22; i++) { const n = el('div', 'num'); n.hidden = true; nums.appendChild(n); numPool.push(n); }
  const cache = { hpw: -1, hpf: -1, inkN: -1, ink: -1, healN: -1, heals: -1, money: -1, prompt: '', obj: '', bossHp: -1, bossPs: -1 };
  let moneyShown = 0, hintT = 0, hintKey = '', objTarget = null, bossE = null;
  const restart = (e, cls) => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };

  const UI = {
    root, hud, icons, el,
    number(pos, text, cls) {
      if (!G.cam.project(_v.copy(pos), _s)) return;
      const n = numPool[numI]; numI = (numI + 1) % numPool.length;
      n.hidden = false; n.textContent = text; n.className = 'num ' + (cls || '');
      n.style.left = _s.x + (Math.random() - 0.5) * 40 + 'px'; n.style.top = _s.y - 10 + (Math.random() - 0.5) * 24 + 'px';
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
    },
    flashWord(key) { word.textContent = T.ui[key] || key; word.classList.toggle('red', key === 'boost'); restart(word, 'on'); },
    hint(key, dur = 6) { if (!key) { hintT = 0; return; } if (hintKey === key && hintT > 0) return; hintKey = key; hint.textContent = T.hints[key] || key; hintT = dur; hint.classList.add('on'); },
    banner(text, sub) { banner.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); restart(banner, 'on'); },
    toast(title, sub) { const t = el('div', 'toast', `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`); toasts.appendChild(t); setTimeout(() => t.remove(), 4300); while (toasts.children.length > 4) toasts.firstChild.remove(); },
    // 화면 가운데 크게(획을 익혔다 등)
    big(title, sub) { const b = el('div', 'big', `<small>${sub || ''}</small><b>${title}</b>`); hud.appendChild(b); setTimeout(() => b.remove(), 4700); },
    setObjective(key, target) { objTarget = target || null; const txt = key ? T.obj[key] || key : ''; if (txt !== cache.obj) { cache.obj = txt; objT.textContent = txt; objBox.hidden = !txt; } },
    showBoss(e) { bossE = e; boss.hidden = !e; if (e) { bossN.innerHTML = `${T.names[e.def.nameKey || e.kind] || ''}<small>${T.bossSub[e.def.nameKey || e.kind] || ''}</small>`; cache.bossHp = cache.bossPs = -1; bossHpB.style.width = '100%'; } },
    denyArt(id, noInk) { const a = artEls[id]; if (a) restart(a.a, 'deny'); UI.hint(noInk ? G.text.toast.noInk : G.text.toast.cooldown, 1.6); },
    setVisible(v) { hud.classList.toggle('off', !v); },
    update(dt, rdt) {
      const p = G.player, pr = G.prog;
      const playing = G.state === 'play' || G.state === 'dead';
      UI.setVisible(playing && !G.cam.cine);
      if (UI.dialog) UI.dialog.update(rdt);
      if (UI.screens) UI.screens.update(rdt);
      if (hintT > 0) { hintT -= rdt; if (hintT <= 0) hint.classList.remove('on'); }
      if (!playing) return;
      // 체력
      const w = Math.min(30, 7 + p.maxHp * 0.075); if (w !== cache.hpw) { cache.hpw = w; hp.style.width = w + 'em'; }
      const f = Math.round(clamp(p.hp / p.maxHp, 0, 1) * 1000) / 10;
      if (f !== cache.hpf) { cache.hpf = f; hpI.style.width = f + '%'; hpB.style.width = f + '%'; hp.classList.toggle('low', f < 30); }
      // 먹
      if (p.inkMax !== cache.inkN) { cache.inkN = p.inkMax; inkRow.innerHTML = ''; for (let i = 0; i < p.inkMax; i++) inkRow.appendChild(el('div', 'inkseg', '<i></i>')); const d = el('div', 'dodges', '<i></i><i></i>'); inkRow.appendChild(d); cache.ink = -1; cache.dg = -1; }
      const ik = Math.round(p.ink * 50) / 50;
      if (ik !== cache.ink) { cache.ink = ik; for (let i = 0; i < p.inkMax; i++) { const s = inkRow.children[i], v = clamp(p.ink - i, 0, 1); s.firstChild.style.height = v * 100 + '%'; s.classList.toggle('full', v >= 1); } }
      if (p.dodges !== cache.dg) { cache.dg = p.dodges; const d = inkRow.lastChild; d.children[0].classList.toggle('used', p.dodges < 1); d.children[1].classList.toggle('used', p.dodges < 2); }
      // 호리병
      if (p.healsMax !== cache.healN) { cache.healN = p.healsMax; heals.innerHTML = ''; for (let i = 0; i < p.healsMax; i++) { const im = el('img'); im.src = icons.gourd; im.alt = ''; heals.appendChild(im); } cache.heals = -1; }
      if (p.heals !== cache.heals) { cache.heals = p.heals; for (let i = 0; i < p.healsMax; i++) heals.children[i].classList.toggle('used', i >= p.heals); }
      // 먹물
      if (pr) { const tgt = Math.round(pr.ink); if (moneyShown !== tgt) { const d = tgt - moneyShown; moneyShown += Math.abs(d) < 3 ? d : Math.round(d * Math.min(1, rdt * 10)) || Math.sign(d); moneyT.textContent = moneyShown; if (d > 0 && !money.classList.contains('bump')) { money.classList.add('bump'); setTimeout(() => money.classList.remove('bump'), 260); } } }
      // 획
      for (const id in artEls) {
        const a = artEls[id], m = MOVES[ARTS[id].move], have = !!p.arts[id];
        if (have !== a.shown) { a.shown = have; a.a.hidden = !have; }
        if (!have) continue;
        const h = Math.round(clamp(p.artCd[id] / m.cd, 0, 1) * 50) * 2; if (h !== a.h) { a.h = h; a.cd.style.height = h + '%'; }
        const no = p.ink < m.cost; if (no !== a.no) { a.no = no; a.a.classList.toggle('no', no); }
      }
      // 안내 문구: 맺음 > 상호작용
      let pt = '', fin = false;
      if (p.alive && G.state === 'play') {
        if (finisherTarget(p)) { pt = `<kbd>E</kbd> ${T.ui.finish}`; fin = true; }
        else { const l = G.interact && G.interact.label(); if (l) pt = `<kbd>E</kbd> ${l}`; }
      }
      if (pt !== cache.prompt) { cache.prompt = pt; prompt.hidden = !pt; prompt.innerHTML = pt; prompt.classList.toggle('fin', fin); }
      // 조준 고정 표시
      const tg = G.cam.target;
      if (tg && tg.alive && G.cam.project(_v.set(tg.pos.x, tg.pos.y + tg.height * 0.55, tg.pos.z), _s)) { lock.hidden = false; lock.style.left = _s.x + 'px'; lock.style.top = _s.y + 'px'; } else lock.hidden = true;
      // 보스 띠
      if (bossE) {
        if (!bossE.alive) UI.showBoss(null);
        else { const h = Math.round(clamp(bossE.hp / bossE.maxHp, 0, 1) * 1000) / 10, s = Math.round(clamp(bossE.posture / bossE.postureMax, 0, 1) * 100);
          if (h !== cache.bossHp) { cache.bossHp = h; bossHp.style.width = h + '%'; bossHpB.style.width = h + '%'; }
          if (s !== cache.bossPs) { cache.bossPs = s; bossPs.style.width = s + '%'; } }
      }
      // 길잡이 방향
      if (objTarget && !bossE) {
        compass.hidden = false;
        const dx = objTarget.x - p.pos.x, dz = objTarget.z - p.pos.z, a = wrapAngle(Math.atan2(-dx, -dz) - G.cam.yaw), d = Math.hypot(dx, dz);
        const x = clamp(-a / 1.3, -1, 1); cm.style.left = 50 + x * 50 + '%'; cm.style.opacity = Math.abs(x) >= 1 ? 0.45 : 1;
        const dt10 = Math.round(d / 5) * 5; if (dt10 !== cache.cd) { cache.cd = dt10; cd.textContent = d < 8 ? '' : dt10 + ' m'; }
      } else compass.hidden = true;
    },
  };
  UI.dialog = createDialog(UI);
  UI.menus = createMenus(UI);
  UI.screens = createScreens(UI);
  return UI;
}
