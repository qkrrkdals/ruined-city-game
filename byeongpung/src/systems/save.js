// 저장: 연적에서 쉴 때 localStorage 에 적는다. 쓸 수 없는 환경이면 조용히 넘어간다.
import { G } from '../core/g.js';

const KEY = 'byeongpung.save.v1', SKEY = 'byeongpung.settings.v1';
const get = (k) => { try { const s = window.localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const set = (k, v) => { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

export const Save = {
  has() { const d = get(KEY); return !!(d && d.v === 1 && d.lastShrine); },
  read() { return get(KEY); },
  write() { return set(KEY, G.prog.serialize()); },
  clear() { try { window.localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } },
  settings() { return get(SKEY) || {}; },
  writeSettings(s) { set(SKEY, s); },
};
