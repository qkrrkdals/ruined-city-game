// 병풍 제1폭의 지도. 마당(node)과 길(edge)의 합집합이 걸을 수 있는 땅이다.
// 좌표: x 동(+)·서(-), z 남(+)·북(-). 그림 아래(남)가 가깝고 위(북)가 멀다. 단위 m.
export const BOUNDS = { x0: -226, x1: 236, z0: -302, z1: 272 };
export const WATER = 1.0; // 갈대늪 물 높이

// H: 길 밖 산의 높이(음수면 물속으로 꺼진다), rough: 가장자리 굴곡
export const ZONES = {
  margin: { i: 0, H: 0, rough: 0.5 },
  pine: { i: 1, H: 27, rough: 2.6 },
  village: { i: 2, H: 13, rough: 1.2 },
  bamboo: { i: 3, H: 15, rough: 2.2 },
  marsh: { i: 4, H: -3.4, rough: 2.0 },
  north: { i: 5, H: 46, rough: 2.2 },
};
export const ZONE_NAMES = ['margin', 'pine', 'village', 'bamboo', 'marsh', 'north'];

const n = (x, z, r, y, zone, o = {}) => ({ x, z, r, y, zone, ...o });
export const NODES = {
  // 여백 · 솔숲
  margin: n(0, 236, 18, 0, 'margin', { exact: true }),
  mgate: n(6, 206, 7, 0.4, 'margin'),
  first: n(14, 178, 16, 1.5, 'pine'),
  p1: n(-18, 146, 12, 3, 'pine'),
  p2: n(-42, 116, 15, 5, 'pine'),
  p2s: n(-70, 126, 9, 6, 'pine'),
  p3: n(-14, 88, 14, 7, 'pine'),
  p3s: n(20, 102, 8, 6.5, 'pine'),
  p4: n(16, 58, 12, 8, 'pine'),
  vsouth: n(4, 33, 7, 8, 'village'),
  // 붓골
  village: n(0, 0, 27, 8, 'village', { exact: true }),
  vwest: n(-33, -4, 6, 8.3, 'village'),
  veast: n(33, -2, 6, 8, 'village'),
  vnorth: n(0, -33, 7, 8.6, 'village'),
  vnw: n(-25, -25, 5, 8.6, 'village'),
  vne: n(25, -25, 5, 8.4, 'village'),
  // 대숲
  b1: n(-62, -12, 10, 9.2, 'bamboo'),
  b2: n(-92, -27, 11, 10, 'bamboo'),
  b2s: n(-98, 6, 8, 10.3, 'bamboo'),
  b3: n(-123, -13, 12, 11, 'bamboo'),
  b4: n(-151, -38, 12, 13, 'bamboo'),
  b4s: n(-177, -22, 8, 13.6, 'bamboo'),
  b5: n(-153, -73, 11, 15, 'bamboo'),
  b6: n(-133, -100, 9, 16.2, 'bamboo'),
  bossB: n(-104, -124, 19, 17, 'bamboo', { exact: true }),
  bs1: n(-74, -103, 6, 15.2, 'bamboo'),
  bs2: n(-50, -70, 6, 12, 'bamboo'),
  // 갈대늪
  m0: n(58, -6, 7, 7, 'village'),
  m1: n(82, -15, 12, 4.5, 'marsh'),
  m2: n(112, 6, 15, 3, 'marsh'),
  m2s: n(120, 40, 9, 2.4, 'marsh'),
  m3: n(142, -20, 12, 2.2, 'marsh'),
  m4: n(170, -47, 11, 1.7, 'marsh'),
  m4s: n(197, -27, 8, 1.7, 'marsh'),
  m5: n(166, -85, 10, 1.7, 'marsh'),
  bossM: n(136, -116, 20, 0.72, 'marsh', { exact: true }),
  ms1: n(100, -104, 6, 4, 'marsh'),
  ms2: n(58, -66, 6, 7.2, 'village'),
  // 벼룻길 · 벼루못
  n1: n(0, -62, 9, 11, 'north'),
  n2: n(-16, -96, 12, 15, 'north'),
  n2s: n(16, -104, 7, 15.5, 'north'),
  n3: n(10, -134, 13, 20, 'north'),
  n4: n(-4, -167, 10, 25, 'north'),
  n5: n(0, -193, 7, 28, 'north'),
  bossT: n(0, -233, 25, 30, 'north', { exact: true }),
  fold: n(0, -266, 5, 30, 'north'),
};

const e = (a, b, w, via, o = {}) => ({ a, b, w, via: via || [], ...o });
export const EDGES = [
  e('margin', 'mgate', 5),
  e('mgate', 'first', 4.5, [[12, 194]]),
  e('first', 'p1', 4, [[2, 158]]),
  e('p1', 'p2', 4, [[-36, 134]]),
  e('p2', 'p2s', 3, [[-56, 126]]),
  e('p2', 'p3', 4, [[-32, 98]]),
  e('p3', 'p3s', 3, [[6, 99]]),
  e('p3', 'p4', 4, [[6, 74]]),
  e('p4', 'vsouth', 4, [[12, 44]]),
  e('vsouth', 'village', 5),
  e('village', 'vwest', 4.5), e('village', 'veast', 4.5), e('village', 'vnorth', 5),
  e('village', 'vnw', 3.5), e('village', 'vne', 3.5),
  // 대숲
  e('vwest', 'b1', 4, [[-48, -5]]),
  e('b1', 'b2', 3.6, [[-78, -16]]),
  e('b2', 'b2s', 3, [[-100, -10]]),
  e('b2', 'b3', 3.6, [[-108, -24]]),
  e('b3', 'b4', 3.6, [[-138, -22]]),
  e('b4', 'b4s', 3, [[-166, -32]]),
  e('b4', 'b5', 3.6, [[-158, -56]]),
  e('b5', 'b6', 3.6, [[-146, -90]]),
  e('b6', 'bossB', 4, [[-122, -110]]),
  e('bossB', 'bs1', 3.5),
  e('bs1', 'bs2', 3.2, [[-60, -90]]),
  e('bs2', 'vnw', 3.2, [[-38, -46]]),
  // 갈대늪
  e('veast', 'm0', 3, [], { deck: 'bridge' }),
  e('m0', 'm1', 4, [[70, -8]]),
  e('m1', 'm2', 4, [[98, -8]]),
  e('m2', 'm2s', 3, [[120, 24]]),
  e('m2', 'm3', 4, [[130, -6]]),
  e('m3', 'm4', 2.2, [[156, -32]], { deck: 'plank' }),
  e('m4', 'm4s', 2.2, [[184, -38]], { deck: 'plank' }),
  e('m4', 'm5', 2.2, [[172, -66]], { deck: 'plank' }),
  e('m5', 'bossM', 4, [[154, -104]]),
  e('bossM', 'ms1', 3.5),
  e('ms1', 'ms2', 3.2, [[80, -88]]),
  e('ms2', 'vne', 3.2, [[40, -44]]),
  // 벼룻길
  e('vnorth', 'n1', 4, [[0, -48]]),
  e('n1', 'n2', 3.8, [[-10, -78]]),
  e('n2', 'n2s', 3),
  e('n2', 'n3', 3.8, [[-6, -118]]),
  e('n3', 'n4', 3.8, [[6, -152]]),
  e('n4', 'n5', 3.5, [[-2, -182]]),
  e('n5', 'bossT', 4),
  e('bossT', 'fold', 3),
];

// 마을 동쪽 개울(지형만 깎는다. 다리는 deck 길)
export const STREAM = { pts: [[47, -32], [45, -14], [45, 6], [50, 26], [62, 52], [84, 84], [112, 118]], w: 5.5, depth: 3.2, level: 5.2 };

// 노드 기준 위치: at('p2', dx, dz) → [x, z]
export const at = (id, dx = 0, dz = 0) => [NODES[id].x + dx, NODES[id].z + dz];
