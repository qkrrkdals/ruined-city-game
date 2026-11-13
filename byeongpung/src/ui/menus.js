// 연적(덧칠·도장), 먹 할멈의 좌판, 배첩 영감의 붓 손질.
import { G } from '../core/g.js';
import { CFG } from '../core/config.js';
import { CHARM_IDS } from '../systems/prog.js';

export const SHOP = [
  { id: 'dew1', kind: 'dew', price: 150 }, { id: 'orchid', kind: 'charm', charm: 'orchid', price: 190 }, { id: 'mum', kind: 'charm', charm: 'mum', price: 190 },
  { id: 'bristle', kind: 'bristle', price: 280 }, { id: 'dew2', kind: 'dew', price: 260 },
];

export function createMenus(UI) {
  const T = G.text, el = UI.el;
  const scr = el('div', 'screen veil'); scr.hidden = true; UI.root.appendChild(scr);
  let cur = null, tab = 'up', onClose = null;
  const M = {
    get open() { return !!cur; },
    show(name, cb) { cur = name; onClose = cb || null; tab = 'up'; scr.hidden = false; G.flow.menuOpen(); render(); G.audio.play('page'); },
    close() { if (!cur) return; cur = null; scr.hidden = true; G.audio.play('uiBack'); const cb = onClose; onClose = null; G.flow.menuClose(); if (cb) cb(); },
    update() {},
  };
  const btn = (cls, label, fn, dis) => { const b = el('button', cls, label); b.type = 'button'; if (dis) b.disabled = true; else b.addEventListener('click', fn); return b; };
  const row = (title, sub, val, action) => { const r = el('div', 'row', `<div><b>${title}</b><small>${sub}</small></div>`); if (val !== undefined) r.appendChild(el('span', 'val', val)); if (action) r.appendChild(action); return r; };
  function render() {
    const pr = G.prog, p = G.player;
    scr.innerHTML = '';
    const panel = el('div', 'panel paper wide'); scr.appendChild(panel);
    if (cur === 'shrine') {
      panel.appendChild(el('h2', '', `${T.shrine.title}<small>${T.shrine.rest}</small>`));
      const tabs = el('div', 'tabs');
      for (const [k, label] of [['up', T.shrine.tabUp], ['charm', T.shrine.tabCharm]]) { const b = btn('tab' + (tab === k ? ' on' : ''), label, () => { tab = k; G.audio.play('uiMove'); render(); }); tabs.appendChild(b); }
      panel.appendChild(tabs);
      if (tab === 'up') {
        const cost = pr.cost();
        panel.appendChild(el('p', '', `${T.shrine.level} — <b style="font-family:var(--f-brush);font-weight:normal;font-size:1.3em">${T.tiers[pr.tier]}</b> · ${T.tierDesc}`));
        const vals = { hp: `${p.maxHp}`, atk: `${Math.round(p.atkMul / CFG.weapon[pr.weapon] * 100)}%`, ink: `${Math.round((1 + pr.up.ink * CFG.upgrade.inkGain) * 100)}% · ${p.inkMax}` };
        for (const s of ['hp', 'atk', 'ink']) {
          panel.appendChild(row(`${T.stats[s].name} <span style="color:var(--ink-pale)">${pr.up[s]}</span>`, T.stats[s].desc, vals[s], btn('act', `${T.shrine.tabUp} · ${cost}`, () => {
            if (pr.upgrade(s)) { G.audio.play('upgrade'); G.fx.gold = 0.5; render(); } else G.audio.play('deny');
          }, pr.ink < cost)));
        }
      } else {
        panel.appendChild(el('p', '', T.shrine.charmHelp));
        const g = el('div', 'charms');
        for (const id of CHARM_IDS) {
          if (!pr.charms.includes(id)) continue;
          const c = T.charms[id], on = pr.has(id);
          const b = btn('charm' + (on ? ' on' : ''), `<span class="seal">${c.ch}</span><span><b style="font-family:var(--f-brush);font-weight:normal">${c.name}</b><small>${c.desc}</small></span>`, () => { pr.toggleCharm(id); G.audio.play('stampUi'); render(); });
          g.appendChild(b);
        }
        if (!g.children.length) g.appendChild(el('p', '', T.ui.empty));
        panel.appendChild(g);
      }
    } else if (cur === 'shop') {
      panel.appendChild(el('h2', '', T.shop.title));
      for (const it of SHOP) {
        if (it.id === 'dew2' && !pr.flags.shop_dew1) continue;
        const sold = !!pr.flags['shop_' + it.id];
        const name = it.kind === 'charm' ? T.charms[it.charm].name : T.items[it.kind].name, desc = it.kind === 'charm' ? T.charms[it.charm].desc : T.items[it.kind].desc;
        panel.appendChild(row(name, desc, sold ? T.shop.sold : `${it.price}`, sold ? null : btn('act', T.shop.buy, () => {
          if (!pr.spend(it.price)) { G.audio.play('deny'); return; }
          pr.flag('shop_' + it.id); G.audio.play('item');
          if (it.kind === 'dew') { pr.dew++; pr.apply(); p.heals = p.healsMax; } else if (it.kind === 'charm') pr.addCharm(it.charm); else if (it.kind === 'bristle') pr.bristle++;
          render();
        }, pr.ink < it.price)));
      }
    } else if (cur === 'smith') {
      panel.appendChild(el('h2', '', T.smith.title));
      const max = pr.weapon >= CFG.weapon.length - 1;
      panel.appendChild(row(`${T.items.brush.name} +${pr.weapon}`, T.items.brush.desc, `${Math.round(CFG.weapon[pr.weapon] * 100)}%${max ? '' : ' → ' + Math.round(CFG.weapon[pr.weapon + 1] * 100) + '%'}`));
      panel.appendChild(row(`${T.items.bristle.name} × ${pr.bristle}`, T.items.bristle.desc, undefined, btn('act', max ? T.smith.max : T.smith.do, () => {
        pr.bristle--; pr.weapon++; pr.apply(); G.audio.play('upgrade'); G.fx.gold = 0.5; render(); G.emit('smith');
      }, max || pr.bristle < 1)));
    }
    const foot = el('div', 'foot');
    foot.appendChild(el('span', 'val', `<span style="font-family:var(--f-brush)">${T.ui.ink} ${Math.round(pr.ink)}</span>`));
    foot.appendChild(btn('btn', cur === 'shrine' ? T.shrine.leave : T.ui.close, () => M.close()));
    panel.appendChild(foot);
  }
  G.on('key', (code) => { if (cur && (code === 'Escape' || code === 'KeyE')) M.close(); });
  return M;
}
