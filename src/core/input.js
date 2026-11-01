// Keyboard + mouse with pointer lock. Losing the lock (Esc) is reported so the game can auto-pause.
const GAME_KEYS = new Set(['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyE', 'KeyF', 'KeyJ', 'KeyP', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  constructor(canvas, events) {
    this.canvas = canvas; this.events = events;
    this.down = new Set(); this.hit = new Set(); this.mouseHit = new Set();
    this.dx = 0; this.dy = 0; this.locked = false; this.expectUnlock = false; this.game = false;
    addEventListener('keydown', (e) => {
      if (this.game && GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code); this.hit.add(e.code);
      this.events.emit('key', e.code, e);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    document.addEventListener('mousedown', (e) => { if (this.locked) { this.mouseHit.add(e.button); this.events.emit('mouse', e.button); } });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      if (was && !this.locked) { const expected = this.expectUnlock; this.expectUnlock = false; this.down.clear(); this.events.emit('unlock', expected); }
      if (this.locked) this.events.emit('lock');
    });
    document.addEventListener('pointerlockerror', () => this.events.emit('lockerror'));
  }
  lock() {
    if (this.locked) return;
    const fail = () => this.events.emit('lockerror');
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { const p2 = this.canvas.requestPointerLock(); if (p2 && p2.catch) p2.catch(fail); } catch { fail(); } });
    } catch { try { this.canvas.requestPointerLock(); } catch { fail(); } }
  }
  unlock(expected = true) { if (this.locked) { this.expectUnlock = expected; document.exitPointerLock(); } }
  isDown(c) { return this.down.has(c); }
  pressed(c) { return this.hit.has(c); }
  click(b = 0) { return this.mouseHit.has(b); }
  takeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.hit.clear(); this.mouseHit.clear(); }
}
