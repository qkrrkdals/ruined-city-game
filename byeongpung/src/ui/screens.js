// 화면들: 제목, 멈춤, 설정, 조작법, 죽음, 글 카드(여는 글), 결말, 지도.
import { G } from '../core/g.js';
import { Save } from '../systems/save.js';
import { drawMap } from './map.js';

export function createScreens(UI) {
  const T = G.text, el = UI.el, root = UI.root;
  const layer = (cls) => { const d = el('div', 'screen ' + cls); d.hidden = true; root.appendChild(d); return d; };
  const title = layer('title-wrap'), over = layer('veil'), dead = layer('dead'), cards = layer('cards'), ending = layer('cards'), resume = el('div', 'resume', T.ui.clickToResume), notice = el('div', 'notice', T.ui.free);
  resume.hidden = true; notice.hidden = true; root.appendChild(resume); root.appendChild(notice);
  const btn = (cls, label, fn) => { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); }); b.addEventListener('mouseenter', () => G.audio.play('uiMove')); return b; };
  let overName = null, overBack = null, cardState = null, noticeT = 0;

  function buildTitle() {
    title.innerHTML = `<div class="title-v">${T.ui.title}</div><div class="title-sub">${T.ui.chapter}</div><div class="title-seal seal">${T.ui.sealTitle}</div>`;
    const menu = el('div', 'title-menu');
    if (Save.has()) menu.appendChild(btn('btn', T.ui.continue, () => { G.audio.init(); G.audio.play('uiOk'); G.flow.continueGame(); }));
    menu.appendChild(btn('btn', T.ui.new, () => { G.audio.init(); G.audio.play('uiOk'); if (Save.has()) S.confirm(T.ui.confirmNew, () => G.flow.newGame()); else G.flow.newGame(); }));
    menu.appendChild(btn('btn small', T.ui.settings, () => S.panel('settings')));
    menu.appendChild(btn('btn small', T.ui.controls, () => S.panel('controls')));
    title.appendChild(menu); title.appendChild(el('div', 'title-foot', T.ui.pcOnly));
  }
  function slider(label, key, min, max, step, apply) {
    const r = el('div', 'row', `<div><b>${label}</b></div>`), w = el('div', 'slider'), i = el('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = G.settings[key]; i.id = 'bp-set-' + key;
    i.addEventListener('input', () => { G.settings[key] = +i.value; apply(+i.value); G.flow.saveSettings(); });
    w.appendChild(i); r.appendChild(w); return r;
  }
  function seg(label, key, opts, apply) {
    const r = el('div', 'row', `<div><b>${label}</b></div>`), w = el('div', 'seg');
    for (const [val, name] of opts) { const b = btn(G.settings[key] === val ? 'on' : '', name, () => { G.settings[key] = val; apply(val); G.flow.saveSettings(); G.audio.play('uiMove'); S.panel('settings', overBack); }); w.appendChild(b); }
    r.appendChild(w); return r;
  }
  const S = {
    title(show) { title.hidden = !show; if (show) buildTitle(); },
    // 겹쳐 뜨는 판: pause | settings | controls | map | confirm
    panel(name, back) {
      overName = name; overBack = back || null; over.hidden = false; over.innerHTML = '';
      const p = el('div', 'panel paper' + (name === 'map' ? ' map' : '')); over.appendChild(p);
      const st = T.settings;
      if (name === 'pause') {
        p.appendChild(el('h2', '', T.ui.paused));
        p.appendChild(btn('btn', T.ui.resume, () => G.flow.resume()));
        p.appendChild(el('br')); p.appendChild(btn('btn', T.ui.settings, () => S.panel('settings', 'pause')));
        p.appendChild(el('br')); p.appendChild(btn('btn', T.ui.controls, () => S.panel('controls', 'pause')));
        p.appendChild(el('br')); p.appendChild(btn('btn', T.ui.toTitle, () => G.flow.toTitle()));
        return;
      }
      if (name === 'settings') {
        p.appendChild(el('h2', '', T.ui.settings));
        p.appendChild(slider(st.master, 'master', 0, 1, 0.05, (v) => G.audio.setVol('master', v)));
        p.appendChild(slider(st.music, 'music', 0, 1, 0.05, (v) => G.audio.setVol('music', v)));
        p.appendChild(slider(st.sfx, 'sfx', 0, 1, 0.05, (v) => { G.audio.setVol('sfx', v); G.audio.play('uiOk'); }));
        p.appendChild(slider(st.sens, 'sens', 0.3, 2.5, 0.05, (v) => { G.cam.sens = v; }));
        p.appendChild(seg(st.invert, 'invert', [[false, st.off], [true, st.on]], (v) => { G.cam.invertY = v; }));
        p.appendChild(seg(st.quality, 'quality', [['low', st.qLow], ['medium', st.qMedium], ['high', st.qHigh]], (v) => G.flow.setQuality(v)));
        p.appendChild(seg(st.difficulty, 'difficulty', [['story', st.dStory], ['normal', st.dNormal]], (v) => { G.difficulty = v; }));
        const f = el('div', 'foot'); f.appendChild(btn('act', st.fullscreen, () => { try { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* 지원 안 함 */ } }));
        f.appendChild(btn('btn', T.ui.back, () => S.back())); p.appendChild(f);
        return;
      }
      if (name === 'controls') {
        p.appendChild(el('h2', '', T.ui.controls));
        const k = el('div', 'keys'); for (const [a, b] of T.controls) { k.appendChild(el('span', '', a)); k.appendChild(el('span', '', b)); } p.appendChild(k);
        p.appendChild(el('p', '', T.comboTips));
        const f = el('div', 'foot'); f.appendChild(el('span')); f.appendChild(btn('btn', T.ui.back, () => S.back())); p.appendChild(f);
        return;
      }
      if (name === 'map') {
        p.appendChild(el('h2', '', T.ui.mapTitle));
        const cv = el('canvas'); p.appendChild(cv); drawMap(cv);
        p.appendChild(el('div', 'legend', `<span><i style="background:var(--ink)"></i>${T.ui.mapYou}</span><span><i style="background:var(--indigo);border-radius:50%"></i>${T.ui.mapShrine}</span><span><i style="background:var(--red)"></i>${T.ui.mapGoal}</span>`));
        const f = el('div', 'foot'); f.appendChild(el('span')); f.appendChild(btn('btn', T.ui.close, () => G.flow.resume())); p.appendChild(f);
      }
    },
    confirm(text, yes) {
      overName = 'confirm'; over.hidden = false; over.innerHTML = '';
      const p = el('div', 'panel paper center'); over.appendChild(p); p.appendChild(el('p', '', text));
      const f = el('div', 'foot'); f.appendChild(btn('btn', T.ui.no, () => S.closePanel())); f.appendChild(btn('btn', T.ui.yes, () => { S.closePanel(); yes(); })); p.appendChild(f);
    },
    back() { G.audio.play('uiBack'); if (overBack) S.panel(overBack); else S.closePanel(); },
    closePanel() { over.hidden = true; overName = null; overBack = null; },
    get panelName() { return overName; },
    death(show) { dead.hidden = !show; if (show) dead.innerHTML = `<div><h1>${T.ui.dead}</h1><p>${T.ui.deadSub}</p></div>`; },
    // 종이 위에 한 장씩 떠오르는 글. 클릭·E·Space 로 넘기고 Esc 로 건너뛴다.
    cards(lines, onDone) {
      cards.hidden = false; cards.innerHTML = `<div class="card"></div><div class="skip">${T.ui.skip}</div>`;
      cardState = { lines, i: -1, t: 0, phase: 'out', el: cards.firstChild, onDone, esc: 0 };
    },
    cardsActive() { return !!cardState; },
    ending(onDone) {
      const pr = G.prog, st = pr.stats, E = T.end, mm = Math.floor(st.time / 60), ss = String(Math.floor(st.time % 60)).padStart(2, '0');
      ending.hidden = false;
      ending.innerHTML = `<div class="endcard"><h1>${E.chapterEnd}</h1><h3>${E.toBe}</h3>
        <div class="endstats"><span>${E.time}</span><span>${mm}:${ss}</span><span>${E.kills}</span><span>${st.kills}</span><span>${E.finishers}</span><span>${st.finishers}</span><span>${E.perfect}</span><span>${st.perfect}</span><span>${E.deaths}</span><span>${st.deaths}</span><span>${E.memos}</span><span>${pr.memos.length} / ${T.memos.length}</span></div>
        <div class="credits">${E.credits.join('<br>')}<br>${E.thanks}</div></div>`;
      const b = btn('btn', T.ui.toTitle, () => { ending.hidden = true; onDone(); }); ending.firstChild.appendChild(el('br')); ending.firstChild.appendChild(b);
    },
    hideAll() { title.hidden = true; over.hidden = true; dead.hidden = true; cards.hidden = true; ending.hidden = true; resume.hidden = true; cardState = null; overName = null; },
    showNotice() { notice.hidden = false; noticeT = 7; },
    update(rdt) {
      const I = G.input;
      resume.hidden = !(G.state === 'play' && !I.locked && !I.free && !G.debug);
      if (noticeT > 0) { noticeT -= rdt; if (noticeT <= 0) notice.hidden = true; }
      const c = cardState;
      if (c) {
        c.t += rdt;
        const next = I.tap('interact', 0.2) || I.tap('attack', 0.2) || I.tap('dodge', 0.2);
        if (I.down('pause')) { c.esc += rdt; if (c.esc > 0.6) { finish(); return; } } else c.esc = 0;
        if (c.phase === 'in' && (c.t > 4.6 || (next && c.t > 0.5))) { c.phase = 'out'; c.t = 0; c.el.classList.remove('on'); }
        else if (c.phase === 'out' && c.t > (c.i < 0 ? 0.5 : 1.25)) {
          c.i++; if (c.i >= c.lines.length) { finish(); return; }
          c.el.textContent = c.lines[c.i]; c.el.classList.add('on'); c.phase = 'in'; c.t = 0; G.audio.play('page');
        }
      }
      function finish() { const cb = c.onDone; cardState = null; cards.hidden = true; I.clear(); if (cb) cb(); }
    },
  };
  return S;
}
