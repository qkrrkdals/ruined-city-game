// 걸을 수 있는 땅의 거리장(SDF)·높이·충돌. 지도(layout)에서 1m 격자로 미리 구워 둔다.
import { NODES, EDGES, ZONES, BOUNDS, STREAM } from './layout.js';
import { fbm2, noise2, ridge2, segDist, smoothstep, lerp } from '../core/util.js';

const P = []; // 기본 도형: 마당(원)과 길(선분)
const tt = { t: 0 };
const W = BOUNDS.x1 - BOUNDS.x0 + 1, D = BOUNDS.z1 - BOUNDS.z0 + 1;
let gD, gDG, gHW, gHR, gZone, gPath;
const CELL = 8, PAD = 3.2;
const hash = new Map();

function buildPrims() {
  for (const id in NODES) {
    const nd = NODES[id], z = ZONES[nd.zone];
    P.push({ k: 0, ax: nd.x, az: nd.z, ay: nd.y, bx: nd.x, bz: nd.z, by: nd.y, r: nd.r, zi: z.i, H: z.H, rough: nd.exact ? 0 : z.rough, deck: false });
  }
  for (const ed of EDGES) {
    const a = NODES[ed.a], b = NODES[ed.b];
    const pts = [[a.x, a.z], ...ed.via.map((v) => [v[0], v[1]]), [b.x, b.z]];
    let total = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(total); }
    const ys = pts.map((_, i) => (ed.via[i - 1] && ed.via[i - 1][2] !== undefined && i > 0 && i < pts.length - 1 ? ed.via[i - 1][2] : lerp(a.y, b.y, cum[i] / total)));
    const z = ZONES[ed.zone || (a.zone === 'village' ? b.zone : a.zone)];
    for (let i = 1; i < pts.length; i++) {
      P.push({ k: 1, ax: pts[i - 1][0], az: pts[i - 1][1], ay: ys[i - 1], bx: pts[i][0], bz: pts[i][1], by: ys[i], r: ed.w, zi: z.i, H: z.H, rough: ed.deck ? 0 : z.rough * 0.7, deck: !!ed.deck });
    }
  }
}

function streamDist(x, z) {
  let d = 1e9; const s = STREAM.pts;
  for (let i = 1; i < s.length; i++) { const v = segDist(x, z, s[i - 1][0], s[i - 1][1], s[i][0], s[i][1]); if (v < d) d = v; }
  return d;
}

const smin = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k)); return b + (a - b) * h - k * h * (1 - h); };

// 한 점의 모든 값을 계산(굽기 전용, 느림)
export function evalRaw(x, z, o) {
  let g1 = 1e9, g2 = 1e9, deckD = 1e9, deckY = 0, bestD = 1e9, best = P[0], pathD = 1e9;
  let wS = 0, hS = 0, HS = 0, rS = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    let dist, yy;
    if (p.k === 0) { dist = Math.hypot(x - p.ax, z - p.az); yy = p.ay; } else { dist = segDist(x, z, p.ax, p.az, p.bx, p.bz, tt); yy = p.ay + (p.by - p.ay) * tt.t; }
    const s = dist - p.r;
    if (p.deck) { if (s < deckD) { deckD = s; deckY = yy; } continue; }
    if (s < g1) { g2 = g1; g1 = s; } else if (s < g2) g2 = s;
    const dd = (s > 0 ? s : 0) + 1.5, w = 1 / (dd * dd * dd);
    wS += w; hS += w * yy; HS += w * p.H; rS += w * p.rough;
    if (s < bestD) { bestD = s; best = p; }
    if (p.k === 1) { const pd = dist / p.r; if (pd < pathD) pathD = pd; }
  }
  const rough = rS / wS, H = HS / wS, hBase = hS / wS;
  let dG = smin(g1, g2, 3);
  if (rough > 0) dG += (fbm2(x * 0.06 + 31.7, z * 0.06 - 12.3, 3) - 0.62) * 2.2 * rough;
  let hR;
  if (dG <= 0) {
    hR = hBase + (noise2(x * 0.31, z * 0.31) - 0.5) * 0.1 * smoothstep(0.6, 1.4, pathD);
  } else if (H >= 0) {
    const e = dG, k = 1 - Math.exp(-Math.max(0, e - 2.5) / 15);
    const big = fbm2(x * 0.014 + 11.3, z * 0.014 - 4.1, 3), rid = ridge2(x * 0.033 + 3.7, z * 0.033 + 9.2, 3);
    hR = hBase + H * k * (0.3 + 0.95 * big) + H * 0.6 * rid * smoothstep(5, 44, e) + smoothstep(0, 3, e) * 0.5 * Math.min(1, H / 10);
  } else {
    hR = hBase + H * smoothstep(0, 8, dG) + (noise2(x * 0.2, z * 0.2) - 0.5) * 0.3;
  }
  if (dG > 0.3) { // 개울 골짜기
    const sd = streamDist(x, z);
    if (sd < STREAM.w * 2.4) hR = lerp(hR, hBase - STREAM.depth, smoothstep(STREAM.w * 2.4, STREAM.w * 0.55, sd) * smoothstep(0.3, 2.5, dG));
  }
  const onDeck = deckD < 0.5 && dG > -0.4;
  o.dG = dG; o.d = Math.min(dG, deckD); o.hR = hR; o.hW = onDeck ? deckY : hR; o.zi = best.zi;
  o.path = Math.max(0, 1 - pathD); o.deck = deckD < 0.2 ? 1 : 0;
  return o;
}

export function buildField() {
  buildPrims();
  const n = W * D;
  gD = new Float32Array(n); gDG = new Float32Array(n); gHW = new Float32Array(n); gHR = new Float32Array(n);
  gZone = new Uint8Array(n); gPath = new Float32Array(n);
  const o = {};
  for (let j = 0, i = 0; j < D; j++) {
    const z = BOUNDS.z0 + j;
    for (let k = 0; k < W; k++, i++) {
      evalRaw(BOUNDS.x0 + k, z, o);
      gD[i] = o.d; gDG[i] = o.dG; gHW[i] = o.hW; gHR[i] = o.hR; gZone[i] = o.zi; gPath[i] = o.path;
    }
  }
}

function bil(g, x, z) {
  let fx = x - BOUNDS.x0, fz = z - BOUNDS.z0;
  fx = fx < 0 ? 0 : fx > W - 1.001 ? W - 1.001 : fx; fz = fz < 0 ? 0 : fz > D - 1.001 ? D - 1.001 : fz;
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * W + ix;
  const a = g[i], b = g[i + 1], c = g[i + W], d = g[i + W + 1];
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

export const F = {
  W, D,
  sdf: (x, z) => bil(gD, x, z),          // 걷는 땅(다리 포함). 음수면 안쪽
  sdfGround: (x, z) => bil(gDG, x, z),    // 다리를 뺀 땅
  h: (x, z) => bil(gHW, x, z),            // 걷는 높이
  hr: (x, z) => bil(gHR, x, z),           // 보이는 지형 높이
  path: (x, z) => bil(gPath, x, z),
  zone(x, z) {
    const ix = Math.max(0, Math.min(W - 1, Math.round(x - BOUNDS.x0))), iz = Math.max(0, Math.min(D - 1, Math.round(z - BOUNDS.z0)));
    return gZone[iz * W + ix];
  },
  grad(x, z, out) {
    const gx = bil(gD, x + 0.6, z) - bil(gD, x - 0.6, z), gz = bil(gD, x, z + 0.6) - bil(gD, x, z - 0.6);
    const l = Math.hypot(gx, gz) || 1;
    out.x = gx / l; out.z = gz / l; return out;
  },
  // ── 충돌체 ──
  addCircle(x, z, r, o = {}) { return insert({ k: 0, x, z, r, on: true, ...o }, x - r, z - r, x + r, z + r); },
  addSeg(x1, z1, x2, z2, r, o = {}) {
    return insert({ k: 1, x: x1, z: z1, x2, z2, r, on: true, ...o }, Math.min(x1, x2) - r, Math.min(z1, z2) - r, Math.max(x1, x2) + r, Math.max(z1, z2) + r);
  },
  // 위치를 벽·충돌체 밖으로 밀어낸다. 밀렸으면 true
  resolve(p, rad, ignore) {
    let hit = false;
    const list = hash.get(key(Math.floor(p.x / CELL), Math.floor(p.z / CELL)));
    if (list) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (!c.on || c === ignore) continue;
        let cx = c.x, cz = c.z;
        if (c.k === 1) { segDist(p.x, p.z, c.x, c.z, c.x2, c.z2, tt); cx = c.x + (c.x2 - c.x) * tt.t; cz = c.z + (c.z2 - c.z) * tt.t; }
        let dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz), min = c.r + rad;
        if (d < min) {
          if (d < 1e-4) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
          p.x = cx + dx * min; p.z = cz + dz * min; hit = true;
        }
      }
    }
    const d = bil(gD, p.x, p.z) + rad * 0.55;
    if (d > 0) { F.grad(p.x, p.z, gtmp); p.x -= gtmp.x * d; p.z -= gtmp.z * d; hit = true; }
    return hit;
  },
  // 두 점 사이에 벽(걷지 못하는 땅)이 있는지 대략 검사
  blocked(ax, az, bx, bz) {
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
    for (let i = 1; i < n; i++) { const t = i / n; if (bil(gD, ax + (bx - ax) * t, az + (bz - az) * t) > 0.6) return true; }
    return false;
  },
};
const gtmp = { x: 0, z: 0 };
const key = (cx, cz) => cx * 4096 + cz;
function insert(c, x0, z0, x1, z1) {
  for (let cx = Math.floor((x0 - PAD) / CELL); cx <= Math.floor((x1 + PAD) / CELL); cx++) {
    for (let cz = Math.floor((z0 - PAD) / CELL); cz <= Math.floor((z1 + PAD) / CELL); cz++) {
      const k = key(cx, cz); let l = hash.get(k); if (!l) hash.set(k, (l = [])); l.push(c);
    }
  }
  return c;
}
