// 대화창: 한 글자씩 써지는 글, E·클릭·Space 로 넘긴다. 쪽글(화공의 메모)도 여기서 보여 준다.
import { G } from '../core/g.js';

const PITCH = { magpie: 1.5, tiger: 0.5, elder: 0.8, granny: 1.05, scholar: 0.9, kid: 1.45, jangA: 0.6, jangB: 0.7, memo: 1 };

export function createDialog(UI) {
  const T = G.text, box = UI.el('div', 'dlg paper', `<div class="dlg-name seal"></div><div class="dlg-text"></div><div class="dlg-next"><kbd>${T.ui.next}</kbd></div>`);
  box.hidden = true; UI.root.appendChild(box);
  const nameEl = box.querySelector('.dlg-name'), textEl = box.querySelector('.dlg-text'), nextEl = box.querySelector('.dlg-next');
  let lines = null, idx = 0, shown = 0, full = '', done = null, who = '', blipT = 0, memo = false;
  function show() {
    const l = lines[idx]; who = l[0]; full = l[1]; shown = 0; textEl.textContent = '';
    const nm = T.names[who]; nameEl.hidden = !nm || memo; nameEl.textContent = nm || '';
    nextEl.hidden = true;
    if (who === 'magpie') G.audio.play('magpie', { n: 2 + ((Math.random() * 2) | 0) });
    if (memo) { shown = full.length; textEl.textContent = full; nextEl.hidden = false; G.audio.play('page'); }
    G.emit('line', who);
  }
  const D = {
    active: false,
    // lines: [[화자, 문장], ...]
    open(ls, onDone, o = {}) { lines = ls; idx = 0; done = onDone || null; memo = !!o.memo; D.active = true; box.hidden = false; box.classList.toggle('memo', memo); G.input.clear(); show(); },
    advance() {
      if (shown < full.length) { shown = full.length; textEl.textContent = full; nextEl.hidden = false; return; }
      idx++; G.audio.play('uiMove');
      if (idx >= lines.length) D.close(); else show();
    },
    close() { box.hidden = true; D.active = false; const cb = done; done = null; lines = null; G.input.clear(); if (cb) cb(); },
    update(rdt) {
      if (!D.active) return;
      if (shown < full.length) {
        const before = Math.floor(shown); shown = Math.min(full.length, shown + rdt * 44);
        if (Math.floor(shown) !== before) { textEl.textContent = full.slice(0, Math.floor(shown)); blipT -= 1; if (blipT <= 0) { blipT = 2; G.audio.play('blip', { pitch: PITCH[who] || 1 }); } }
        if (shown >= full.length) nextEl.hidden = false;
      }
      const I = G.input;
      if (I.tap('interact', 0.2) || I.tap('attack', 0.2) || I.tap('dodge', 0.2)) D.advance();
    },
  };
  box.addEventListener('click', () => D.active && D.advance());
  return D;
}
