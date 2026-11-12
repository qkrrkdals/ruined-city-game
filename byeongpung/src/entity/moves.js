// 주인공의 기술표. 휘두르기(swing)·찌르기(thrust) 사양은 hanim.js 의 자세 함수가 읽는다.
// 시간(초): tw=준비 끝, ts=휘두름 끝, dur=전체. combo=다음 기술로 이을 수 있는 시점, cancel=이동으로 풀리는 시점.
// dmg=공격력 배율, pos=흐트러짐, power=1 약·2 강·3 큰 일격, lunge=앞으로 내딛는 거리, reach=판정 거리.
const D = Math.PI / 180;

export const MOVES = {
  // 가는 획 4연타
  L1: { kind: 'swing', sp: { tilt: 22 * D, a0: 115 * D, a1: -75 * D, tw: 0.09, ts: 0.19, dur: 0.42, lead: 'L' }, dmg: 1, pos: 9, power: 1, lunge: 1.25, reach: 2.75, combo: 0.21, cancel: 0.3, next: { L: 'L2', H: 'LH' }, note: 0 },
  L2: { kind: 'swing', sp: { tilt: -18 * D, a0: -112 * D, a1: 80 * D, tw: 0.08, ts: 0.18, dur: 0.42, lead: 'R' }, dmg: 1, pos: 9, power: 1, lunge: 1.2, reach: 2.75, combo: 0.21, cancel: 0.3, next: { L: 'L3', H: 'LLH' }, note: 1 },
  L3: { kind: 'swing', sp: { tilt: 6 * D, a0: 150 * D, a1: -170 * D, tw: 0.11, ts: 0.25, dur: 0.5, lead: 'L', back: 0.2 }, spin: -1, dmg: 1.25, pos: 12, power: 1, lunge: 1.4, reach: 2.95, combo: 0.28, cancel: 0.36, next: { L: 'L4', H: 'LLLH' }, note: 2 },
  L4: { kind: 'swing', sp: { tilt: 76 * D, a0: 128 * D, a1: -38 * D, tw: 0.17, ts: 0.29, dur: 0.66, lead: 'R', cy: 1.25 }, dmg: 1.9, pos: 22, power: 2, lunge: 1.5, shape: 'line', reach: 3.3, width: 1.3, combo: 0.5, cancel: 0.42, next: {}, note: 4, slam: 1.7 },
  // 굵은 획
  H: { kind: 'swing', sp: { tilt: 55 * D, a0: 132 * D, a1: -72 * D, tw: 0.24, ts: 0.36, dur: 0.74, lead: 'L' }, dmg: 2.2, pos: 26, power: 2, lunge: 1.7, reach: 3.05, combo: 0.52, cancel: 0.46, next: { L: 'L1' }, note: 3, heavy: true },
  HC: { kind: 'swing', sp: { tilt: 10 * D, a0: 140 * D, a1: -120 * D, tw: 0.07, ts: 0.21, dur: 0.7, lead: 'L' }, dmg: 3.2, pos: 40, power: 3, lunge: 4.6, reach: 3.2, combo: 0.5, cancel: 0.45, next: {}, note: 5, heavy: true, guardBreak: true, big: 1.15 },
  HC2: { kind: 'swing', sp: { tilt: 10 * D, a0: 150 * D, a1: -150 * D, tw: 0.07, ts: 0.23, dur: 0.78, lead: 'L' }, dmg: 4.5, pos: 58, power: 3, lunge: 5.6, reach: 3.5, combo: 0.55, cancel: 0.5, next: {}, note: 6, heavy: true, guardBreak: true, big: 1.35 },
  // 연계
  LH: { kind: 'swing', sp: { tilt: 78 * D, a0: -62 * D, a1: 118 * D, tw: 0.12, ts: 0.24, dur: 0.56, lead: 'L' }, dmg: 1.7, pos: 20, power: 2, lunge: 1.3, shape: 'line', reach: 3.0, width: 1.4, combo: 0.36, cancel: 0.36, next: { L: 'L3' }, note: 3, heavy: true, launch: true },
  LLH: { kind: 'thrust', sp: { tw: 0.14, ts: 0.24, dur: 0.56 }, dmg: 2.1, pos: 24, power: 2, lunge: 2.6, shape: 'line', reach: 3.9, width: 1.0, combo: 0.4, cancel: 0.38, next: {}, note: 4, heavy: true, guardBreak: true },
  LLLH: { kind: 'swing', sp: { tilt: 78 * D, a0: 135 * D, a1: -40 * D, tw: 0.3, ts: 0.42, dur: 0.86, lead: 'R', cy: 1.25 }, leap: 1.5, dmg: 2.8, pos: 42, power: 3, lunge: 3.2, shape: 'circle', radius: 3.3, fwd: 1.5, combo: 0.66, cancel: 0.6, next: {}, note: 5, heavy: true, guardBreak: true, slam: 3.2 },
  // 달리다 치기 · 피하고 치기
  RUN: { kind: 'thrust', sp: { tw: 0.1, ts: 0.2, dur: 0.52 }, dmg: 1.6, pos: 16, power: 2, lunge: 3.4, shape: 'line', reach: 3.7, width: 1.1, combo: 0.34, cancel: 0.36, next: { L: 'L2', H: 'LH' }, note: 1 },
  DA: { kind: 'swing', sp: { tilt: -6 * D, a0: -125 * D, a1: 105 * D, tw: 0.06, ts: 0.15, dur: 0.36, lead: 'R', cy: 1.05 }, dmg: 1.15, pos: 12, power: 1, lunge: 1.8, reach: 2.85, combo: 0.2, cancel: 0.26, next: { L: 'L2', H: 'LH' }, note: 1 },
  // 획(먹을 쓰는 기술)
  DOT: { kind: 'thrust', art: 'dot', sp: { tw: 0.12, ts: 0.27, dur: 0.6, y: 1.1 }, dmg: 2.7, pos: 36, power: 3, lunge: 7.2, dash: true, shape: 'line', reach: 3.4, width: 1.5, combo: 0.42, cancel: 0.42, next: { L: 'L1', H: 'H' }, note: 6, cost: 1, cd: 2.5, guardBreak: true },
  WAVE: { kind: 'swing', art: 'wave', sp: { tilt: 38 * D, a0: 125 * D, a1: -65 * D, tw: 0.2, ts: 0.3, dur: 0.64, lead: 'L' }, dmg: 1.3, pos: 12, power: 2, lunge: 0.6, reach: 3.0, combo: 0.46, cancel: 0.44, next: { L: 'L1' }, note: 5, cost: 1, cd: 4, wave: { dmg: 2.3, pos: 26, speed: 24, range: 17, r: 2.1 } },
  SMASH: { kind: 'swing', art: 'smash', sp: { tilt: 78 * D, a0: 140 * D, a1: -42 * D, tw: 0.42, ts: 0.54, dur: 1.05, lead: 'R', cy: 1.25 }, leap: 2.6, dmg: 3.8, pos: 64, power: 3, lunge: 4.2, shape: 'circle', radius: 5.2, fwd: 0.8, combo: 0.8, cancel: 0.74, next: {}, note: 7, cost: 2, cd: 7, guardBreak: true, slam: 5.2, armor: true },
  // 맺음(마무리)
  FIN: { kind: 'swing', sp: { tilt: 68 * D, a0: 138 * D, a1: -58 * D, tw: 0.3, ts: 0.4, dur: 1.0, lead: 'L' }, dmg: 0, pos: 0, power: 3, lunge: 0, reach: 3.2, combo: 0.9, cancel: 0.9, next: {}, note: 7, fin: true },
};
for (const k in MOVES) MOVES[k].id = k;

export const ARTS = {
  dot: { move: 'DOT', key: 'art1' },
  wave: { move: 'WAVE', key: 'art2' },
  smash: { move: 'SMASH', key: 'art3' },
};
