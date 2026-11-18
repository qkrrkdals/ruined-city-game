// 키보드·마우스 입력. 포인터 잠금이 안 되는 환경에서는 "자유 커서" 방식으로 물러난다.
import { G } from './g.js';

const BIND = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['M0'], heavy: ['M2'], dodge: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'], heal: ['KeyR'], art1: ['KeyQ'], art2: ['KeyF'], art3: ['KeyC'],
  lock: ['KeyT', 'M1'], map: ['KeyM'], pause: ['Escape'], confirm: ['Enter', 'Space', 'KeyE'],
};
const CODE2ACT = {};
for (const a in BIND) for (const c of BIND[a]) (CODE2ACT[c] || (CODE2ACT[c] = [])).push(a);

export function createInput(canvas) {
  const held = new Set();       // 눌려 있는 코드
  const pressT = {};            // 액션 → 마지막으로 눌린 실제 시각
  const releaseT = {};
  const I = {
    dx: 0, dy: 0, wheel: 0, locked: false, free: false, wantLock: false, enabled: true,
    mx: 0.5, my: 0.5,
    down(a) { const b = BIND[a]; for (let i = 0; i < b.length; i++) if (held.has(b[i])) return true; return false; },
    // 최근 buf 초 안에 눌렸으면 true 를 돌려주고 소비한다(선입력)
    tap(a, buf = 0.12) { const t = pressT[a]; if (t !== undefined && G.real - t <= buf) { pressT[a] = undefined; return true; } return false; },
    peek(a, buf = 0.12) { const t = pressT[a]; return t !== undefined && G.real - t <= buf; },
    released(a, buf = 0.1) { const t = releaseT[a]; if (t !== undefined && G.real - t <= buf) { releaseT[a] = undefined; return true; } return false; },
    clear() { for (const k in pressT) pressT[k] = undefined; for (const k in releaseT) releaseT[k] = undefined; I.dx = I.dy = 0; I.wheel = 0; },
    releaseAll() { held.clear(); },
    press(code) { onDown(code); }, release(code) { onUp(code); }, // 자동 점검용
    axisX() { return (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0); },
    axisY() { return (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0); },
    requestLock() {
      if (I.free || I.locked) return;
      try {
        const p = canvas.requestPointerLock && canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => { I.fallback(); });
      } catch (e) { I.fallback(); }
    },
    exitLock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); },
    fallback() { if (!I.locked) { I.free = true; G.emit('lockchange', false); } },
    endFrame() { I.dx = 0; I.dy = 0; I.wheel = 0; },
  };
  function onDown(code) {
    if (held.has(code)) return;
    held.add(code);
    const acts = CODE2ACT[code]; if (acts) for (const a of acts) pressT[a] = G.real;
    G.emit('key', code);
  }
  function onUp(code) {
    held.delete(code);
    const acts = CODE2ACT[code]; if (acts) for (const a of acts) releaseT[a] = G.real;
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab' || e.ctrlKey || e.metaKey) return; // 브라우저 단축키는 건드리지 않는다
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (/^(Space|Arrow|Key[WASDQERFCTM])/.test(e.code)) e.preventDefault();
    if (!e.repeat) onDown(e.code);
  });
  window.addEventListener('keyup', (e) => onUp(e.code));
  window.addEventListener('blur', () => { held.clear(); G.emit('blur'); });
  canvas.addEventListener('mousedown', (e) => {
    if (G.state === 'play' && !I.locked && !I.free) { I.requestLock(); }
    onDown('M' + e.button); e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => onUp('M' + e.button));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('auxclick', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    I.mx = e.clientX / Math.max(1, window.innerWidth); I.my = e.clientY / Math.max(1, window.innerHeight);
    if (I.locked || (I.free && G.state === 'play')) { I.dx += e.movementX || 0; I.dy += e.movementY || 0; }
  });
  canvas.addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    I.locked = document.pointerLockElement === canvas;
    G.emit('lockchange', I.locked);
  });
  document.addEventListener('pointerlockerror', () => I.fallback());
  return I;
}
