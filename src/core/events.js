export class Events {
  constructor() { this.m = new Map(); }
  on(name, fn) { if (!this.m.has(name)) this.m.set(name, []); this.m.get(name).push(fn); return () => this.off(name, fn); }
  off(name, fn) { const a = this.m.get(name); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(name, ...args) { const a = this.m.get(name); if (a) for (const f of a.slice()) f(...args); }
}
