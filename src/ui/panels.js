// Paper note / observation view, journal (J) and keypad panels. Opening a panel pauses the simulation.
import { t } from '../i18n/i18n.js';
import { NOTES, OBS } from '../story/content.js';
import { DRAW } from '../world/textures.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgCache = {};
function photo(variant) {
  if (imgCache[variant]) return imgCache[variant];
  const c = document.createElement('canvas'); c.width = 480; c.height = 560;
  DRAW.photo(c.getContext('2d'), { variant, key: variant === 'home' ? 'signs.photoDate' : 'signs.photoNone' }, 480, 560);
  return (imgCache[variant] = c.toDataURL());
}
// clue drawings (chalk, map, diagram, card, whiteboard) shown large in the examine view
function drawing(d, dark) {
  const w = 560, h = Math.round(560 * (d.h / d.w)), c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); if (dark) { ctx.fillStyle = dark === true ? '#6b5f6a' : dark; ctx.fillRect(0, 0, w, h); }
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; DRAW[d.kind](tmp.getContext('2d'), { ...d, key: d.key }, w, h); ctx.drawImage(tmp, 0, 0);
  return c.toDataURL();
}
export function docHTML(kind, id) {
  const meta = kind === 'note' ? NOTES.find((n) => n.id === id) : OBS.find((o) => o.id === id);
  if (kind === 'obs') {
    const o = t(`obs.${id}`);
    const img = meta && meta.image ? photo(meta.image) : meta && meta.draw ? drawing(meta.draw, meta.dark) : null;
    return { cls: 'hand2 photo', html: `<h3>${esc(o.title)}</h3>${img ? `<img src="${img}" alt="">` : ''}<div class="body"><p>${esc(o.text)}</p></div>` };
  }
  const n = t(`notes.${id}`), body = (n.body || []).map((p) => `<p>${esc(p)}</p>`).join('');
  return { cls: meta.style, html: `<h3>${esc(n.title)}</h3>${meta.image ? `<img src="${photo(meta.image)}" alt="">` : ''}<div class="body">${body}${n.sign ? `<p class="sign">— ${esc(n.sign)}</p>` : ''}</div>` };
}

export class Panels {
  constructor(G) {
    this.G = G; this.cur = null; this.tab = 'obj'; this.sel = null; this.code = '';
    G.events.on('key', (code) => this.key(code));
    G.events.on('ui', (act, el) => this.ui(act, el));
  }
  $(id) { return document.getElementById(id); }
  open(kind, mouse) {
    const G = this.G;
    this.cur = kind; G.state = 'panel'; G.input.game = false;
    if (mouse) G.input.unlock(true);
    G.ui.prompt(''); G.events.emit('panel', kind);
  }
  close(code) {
    const G = this.G, kind = this.cur;
    if (!kind) return;
    this.cur = null;
    for (const id of ['note', 'journal', 'keypad']) G.ui.show(id, false);
    G.state = 'playing'; G.input.game = true;
    if (code) G.input.hit.delete(code);
    if (!G.input.locked) G.input.lock();
    G.events.emit('panelClose', kind);
    const cb = this.onClose; this.onClose = null; if (cb) cb();
  }
  openDoc(kind, id, onClose) {
    const { cls, html } = docHTML(kind, id);
    this.$('note').innerHTML = `<div><div class="paper ${cls}">${html}</div><div class="close-hint">${esc(t('noteui.close'))}</div></div>`;
    this.G.ui.show('note', true); this.onClose = onClose; this.open('note', false);
    this.G.events.emit('paper');
  }
  openJournal() {
    if (this.cur || this.G.state !== 'playing') return;
    this.G.ui.journalPulse(false);
    this.renderJournal(); this.G.ui.show('journal', true); this.open('journal', true);
  }
  renderJournal() {
    const S = this.G.story, tab = this.tab;
    const tabs = ['obj', 'notes', 'obs'].map((k) => `<button class="${k === tab ? 'on' : ''}" data-act="jtab" data-tab="${k}">${esc(t('journal.tab' + k[0].toUpperCase() + k.slice(1)))}</button>`).join('');
    let side = '', main = '';
    if (tab === 'obj') {
      side = '';
      main = `<div class="print" style="opacity:.6">${esc(t('journal.now'))}</div><div class="obj">${esc(S.dirText())}</div>`
        + `<div class="print" style="opacity:.6;margin-top:14px">${esc(t('journal.mine'))}</div>`
        + `<div class="thoughts">${[...S.thoughts].reverse().map((id) => `<p>${esc(t('thoughts.' + id))}</p>`).join('') || `<p>${esc(t('journal.empty'))}</p>`}</div>`;
    } else {
      const list = tab === 'notes' ? NOTES : OBS, found = tab === 'notes' ? S.notes : S.obs, kind = tab === 'notes' ? 'note' : 'obs';
      side = `<div class="count">${esc(t('journal.count', { n: list.filter((x) => found.has(x.id)).length, total: list.length }))}</div><div class="list">`;
      let reg = '';
      for (const it of list) {
        if (it.region !== reg) { reg = it.region; side += `<h4>${esc(t('regions.' + reg))}</h4>`; }
        const ok = found.has(it.id), title = ok ? (tab === 'notes' ? t(`notes.${it.id}.title`) : t(`obs.${it.id}.title`)) : t('journal.unknown');
        side += `<button class="${ok ? '' : 'locked'} ${this.sel === it.id ? 'sel' : ''}" ${ok ? `data-act="jsel" data-id="${it.id}"` : 'disabled'}>${esc(title)}</button>`;
      }
      side += '</div>';
      if (this.sel && found.has(this.sel)) { const d = docHTML(kind, this.sel); main = `<div class="${d.cls}">${d.html}</div>`; }
      else main = `<p class="hand2" style="opacity:.5">${esc(t('journal.empty'))}</p>`;
    }
    this.$('journal').innerHTML = `<div><div class="book"><div class="side"><div class="tabs">${tabs}</div>${side}</div><div class="main">${main}</div></div><div class="close-hint">${esc(t('journal.close'))}</div></div>`;
  }
  openKeypad(spec) {
    this.pad = spec; this.code = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) => `<button data-act="kp" data-k="${k}">${k === 'OK' ? esc(t('keypadui.enter')) : k}</button>`).join('');
    this.$('keypad').innerHTML = `<div><div class="pad"><div class="label">${esc(spec.title)}</div><div class="disp" id="kp-disp">____</div><div class="keys">${keys}</div></div><div class="close-hint">${esc(t('keypadui.close'))}</div></div>`;
    this.G.ui.show('keypad', true); this.open('keypad', true);
  }
  press(k) {
    const d = this.$('kp-disp'); if (!d || !this.pad) return;
    d.classList.remove('bad');
    if (k === '⌫') this.code = this.code.slice(0, -1);
    else if (k === 'OK') return this.submit();
    else if (this.code.length < 4) this.code += k;
    d.textContent = (this.code + '____').slice(0, 4);
    this.G.events.emit('keypadPress');
    if (this.code.length === 4) setTimeout(() => this.submit(), 180);
  }
  submit() {
    const d = this.$('kp-disp'), spec = this.pad; if (!spec || !d) return;
    if (spec.codes.includes(this.code)) {
      d.classList.add('ok'); this.G.events.emit('keypadOk'); this.pad = null;
      setTimeout(() => { this.close(); spec.onOk(); }, 450);
    } else {
      d.classList.add('bad'); this.G.events.emit('keypadFail'); this.code = '';
      setTimeout(() => { if (d.isConnected) d.textContent = '____'; }, 400);
      this.G.ui.toast(t('puz.wrong')); if (spec.onFail) spec.onFail();
    }
  }
  key(code) {
    const G = this.G;
    if (!this.cur) { if (code === 'KeyJ' && G.state === 'playing' && G.player.enabled) this.openJournal(); return; }
    if (this.cur === 'keypad') {
      const m = /^(Digit|Numpad)(\d)$/.exec(code);
      if (m) this.press(m[2]); else if (code === 'Backspace') this.press('⌫'); else if (code === 'Enter' || code === 'NumpadEnter') this.submit();
      else if (code === 'KeyE' || code === 'Escape') this.close(code);
      return;
    }
    if (code === 'KeyE' || code === 'Escape' || code === 'KeyJ' || (this.cur === 'note' && code === 'Space')) this.close(code);
  }
  ui(act, el) {
    if (act === 'jtab') { this.tab = el.dataset.tab; this.sel = null; this.renderJournal(); }
    else if (act === 'jsel') { this.sel = el.dataset.id; this.renderJournal(); this.G.events.emit('paper'); }
    else if (act === 'kp') this.press(el.dataset.k);
  }
}
