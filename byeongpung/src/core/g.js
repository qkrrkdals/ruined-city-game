// 게임 전역 상태. 모든 모듈이 이 객체를 통해 서로를 찾는다.
const listeners = {};
export const G = {
  state: 'boot',      // boot | title | play | dialog | menu | cine | dead | pause | ending
  time: 0,            // 게임 시간(느려짐·멈춤 반영)
  real: 0,            // 실제 시간
  dt: 0, rdt: 0,
  ts: 1,              // 시간 배율(슬로 모션)
  debug: /[?&#]debug/.test(location.search + location.hash),
  on(ev, fn) { (listeners[ev] || (listeners[ev] = [])).push(fn); },
  emit(ev, a, b, c) { const l = listeners[ev]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); },
};
