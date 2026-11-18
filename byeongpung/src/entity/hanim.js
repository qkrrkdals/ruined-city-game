// 인간형 자세 함수들. 모두 P(자세 객체)를 채워 돌려준다. 좌표는 뿌리 기준(+Z 앞, -X 오른쪽).
import { ease, lerp, clamp, clamp01 } from '../core/util.js';

const s3 = (a, x, y, z) => { a[0] = x; a[1] = y; a[2] = z; };
function reset(P) {
  P.hx = P.hy = P.hz = P.hrx = P.hry = P.hrz = P.trx = P.try = P.trz = P.hdx = P.hdy = 0; P.grip = 0;
  s3(P.fl, 0.11, 0, 0.02); s3(P.fr, -0.11, 0, -0.02);
  return P;
}

// 서 있기(평소): 붓을 어깨에 걸친다
export function stand(P, t) {
  reset(P);
  const b = Math.sin(t * 1.7);
  P.hy = b * 0.006; P.trx = 0.02 + b * 0.012; P.hdx = 0.04;
  s3(P.hr, -0.21, 1.2 + b * 0.006, 0.17); s3(P.wd, -0.1, 0.56, -0.82);
  s3(P.hl, 0.28, 0.8 + b * 0.004, 0.04);
  return P;
}
// 겨눔(전투 대기): 두 손으로 붓을 비스듬히 든다
export function guard(P, t) {
  reset(P);
  const b = Math.sin(t * 2.3);
  P.hy = -0.075 + b * 0.008; P.hry = -0.32; P.try = -0.12; P.trx = 0.1; P.hdy = 0.36;
  s3(P.hr, -0.23, 0.96 + b * 0.008, 0.02); s3(P.wd, 0.3, 0.46, 0.84); P.grip = 1;
  s3(P.hl, 0.2, 1.0, 0.3);
  s3(P.fl, 0.15, 0, 0.24); s3(P.fr, -0.17, 0, -0.22);
  return P;
}
// 달리기. ph=걸음 위상, k=속도(0~1.5), lx·lz=몸 기준 이동 방향
export function run(P, ph, k, lx = 0, lz = 1, armed = true) {
  reset(P);
  const stride = 0.34 + 0.15 * k, lift = 0.15 + 0.06 * k, c = Math.cos(ph), s = Math.sin(ph);
  const fy = (v) => (v > 0 ? v * lift : 0);
  s3(P.fl, 0.1 + lx * -c * stride, fy(s), lz * -c * stride);
  s3(P.fr, -0.1 + lx * c * stride, fy(-s), lz * c * stride);
  const lean = 0.09 + 0.12 * k;
  P.hy = -0.05 - 0.025 * k + Math.cos(ph * 2) * 0.024;
  P.hrx = lean * lz; P.hrz = -lean * lx; P.hry = s * 0.1 * lz; P.try = -s * 0.17 * lz; P.trx = 0.05 * k; P.hdx = -0.06 * k;
  if (armed) { s3(P.hr, -0.31, 0.9 + Math.cos(ph * 2) * 0.012, -0.1 + c * 0.06); s3(P.wd, -0.14, 0.26 - 0.1 * Math.min(1.3, k), -0.95); }
  else s3(P.hr, -0.3, 0.9, 0.05 - c * 0.24 * k), s3(P.wd, 0, -1, 0.1);
  s3(P.hl, 0.3, 0.92, 0.04 + c * 0.24 * Math.min(1.2, k));
  return P;
}
// 맞음
export function hurt(P, u) {
  reset(P);
  const k = 1 - ease.out2(clamp01(u));
  P.trx = -0.42 * k; P.hy = -0.05; P.hz = -0.06 * k; P.hdx = -0.3 * k;
  s3(P.hr, -0.42, 1.12, -0.05); s3(P.wd, -0.45, 0.6, -0.55); s3(P.hl, 0.44, 1.08, -0.05);
  s3(P.fl, 0.14, 0, 0.1); s3(P.fr, -0.14, 0, -0.2);
  return P;
}
// 쓰러짐 → 일어남. u: 0~1
export function down(P, u) {
  reset(P);
  const fall = ease.out3(clamp01(u / 0.25)), up = ease.io2(clamp01((u - 0.62) / 0.38)), k = fall * (1 - up);
  P.hy = -0.68 * k; P.hrx = -1.3 * k; P.hz = -0.2 * k; P.trx = -0.12 * k;
  s3(P.hr, -0.45, lerp(0.95, 0.3, k), -0.1); s3(P.wd, -0.6, 0.15, -0.5); s3(P.hl, 0.45, lerp(0.9, 0.3, k), -0.1);
  s3(P.fl, 0.16, 0.04 * k, 0.32 * k); s3(P.fr, -0.16, 0.04 * k, 0.3 * k);
  return P;
}
// 여백(회피): 몸을 접는다
export function tuck(P) {
  reset(P);
  P.hy = -0.2; P.hrx = 0.45; P.trx = 0.3; P.hdx = 0.2;
  s3(P.hr, -0.2, 0.82, 0.16); s3(P.wd, -0.1, 0.25, -0.95); s3(P.hl, 0.2, 0.84, 0.18);
  s3(P.fl, 0.1, 0.1, 0.1); s3(P.fr, -0.1, 0.2, -0.14);
  return P;
}
// 호리병 마시기
export function drink(P, u) {
  reset(P);
  const k = Math.sin(clamp01(u) * Math.PI);
  P.hdx = -0.4 * k; P.trx = -0.1 * k;
  s3(P.hr, -0.3, 0.95, 0.1); s3(P.wd, 0.05, 1, 0.12);
  s3(P.hl, lerp(0.26, 0.05, k), lerp(0.85, 1.5, k), lerp(0.05, 0.2, k));
  return P;
}
// 쓰러져 먹에 잠김
export function collapse(P, u) {
  reset(P);
  const k = ease.io2(clamp01(u));
  P.hy = -0.6 * k; P.hrx = 0.9 * k; P.trx = 0.5 * k; P.hdx = 0.5 * k;
  s3(P.hr, -0.3, lerp(0.95, 0.25, k), 0.3 * k); s3(P.wd, -0.3, lerp(0.8, 0.05, k), 0.9); s3(P.hl, 0.3, lerp(0.9, 0.2, k), 0.3 * k);
  s3(P.fl, 0.12, 0, -0.25 * k); s3(P.fr, -0.12, 0, -0.35 * k);
  return P;
}

// 흐트러짐(무릎 꿇음): 무기를 짚고 버틴다
export function kneel(P, t) {
  reset(P);
  const b = Math.sin(t * 3.1);
  P.hy = -0.43 + b * 0.008; P.trx = 0.5 + b * 0.03; P.hdx = 0.45; P.hz = 0.05;
  s3(P.hr, -0.3, 0.72, 0.3); s3(P.wd, 0.1, 0.95, 0.25); s3(P.hl, 0.3, 0.42, 0.22);
  s3(P.fl, 0.15, 0, 0.27); s3(P.fr, -0.15, 0, -0.38);
  return P;
}
// 무기를 세워 들고 서 있기(군졸 경계)
export function sentry(P, t) {
  reset(P);
  const b = Math.sin(t * 1.5);
  P.hy = b * 0.005; P.trx = 0.02 + b * 0.01; P.hdy = Math.sin(t * 0.4) * 0.4;
  s3(P.hr, -0.3, 0.95, 0.12); s3(P.wd, 0.02, 1, 0.04); s3(P.hl, 0.28, 0.8, 0.04);
  return P;
}
// 휘두르기. sp: { tilt, a0, a1, tw, ts, dur, back, over, lead:'L'|'R', cy, rh, grip, reach }
// 평면: e1=앞(0,0,1), e2=(-cos tilt, sin tilt, 0). 각 a: 0=앞, +90°=e2 쪽(tilt 0 이면 오른쪽, 90° 면 위).
export function swingAngle(sp, t) {
  const sign = Math.sign(sp.a1 - sp.a0) || 1, back = sp.back ?? 0.35, over = sp.over ?? 0.3, cockA = sp.cock ?? 0.55;
  let a, cock, e = 0;
  if (t < sp.tw) { const u = ease.out2(clamp01(t / sp.tw)); a = sp.a0 - sign * back * u; cock = -sign * cockA * u; }
  else if (t < sp.ts) { const u = (t - sp.tw) / (sp.ts - sp.tw); e = u * u * (3 - 2 * u); a = lerp(sp.a0 - sign * back, sp.a1, e); cock = lerp(-sign * cockA, sign * 0.28, e); }
  else { const u = ease.out3(clamp01((t - sp.ts) / Math.max(0.01, sp.dur - sp.ts))); e = 1; a = sp.a1 + sign * over * u; cock = sign * 0.28 * (1 - u * 0.6); }
  return { a, aw: a + cock, e };
}
export function swing(P, sp, t) {
  reset(P);
  const { a, aw, e } = swingAngle(sp, t);
  const ct = Math.cos(sp.tilt), st = Math.sin(sp.tilt), rh = sp.rh ?? 0.34, cy = sp.cy ?? 1.2, cz = sp.cz ?? 0.06;
  const sa = Math.sin(a), ca = Math.cos(a), sw = Math.sin(aw), cw = Math.cos(aw);
  s3(P.hr, -ct * sa * rh, cy + st * sa * rh, cz + ca * rh);
  s3(P.wd, -ct * sw, st * sw + (sp.lift ?? 0.06), cw);
  P.grip = sp.grip ?? 1;
  s3(P.hl, 0.3, 1.0, 0.1);
  const ah = clamp(a, -1.7, 1.7);
  P.try = -ah * 0.42 * ct; P.hry = -ah * 0.2 * ct;
  P.trx = -(ah - 0.5) * 0.3 * st + 0.08; P.hdy = ah * 0.25 * ct;
  const pre = t < sp.tw ? ease.out2(clamp01(t / sp.tw)) : 1;
  P.hy = -0.07 - 0.07 * e - 0.02 * pre; P.hz = -0.05 * pre * (1 - e) + 0.12 * e;
  const L = sp.lead !== 'R';
  s3(L ? P.fl : P.fr, (L ? 1 : -1) * 0.14, 0, 0.2 + 0.14 * e);
  s3(L ? P.fr : P.fl, (L ? -1 : 1) * 0.17, 0, -0.26 - 0.06 * e);
  return P;
}
// 찌르기. sp: { tw, ts, dur, y(높이), grip, lead }
export function thrust(P, sp, t) {
  reset(P);
  let k; // -1(당김) → 1(뻗음)
  if (t < sp.tw) k = -ease.out2(clamp01(t / sp.tw));
  else if (t < sp.ts) { const u = (t - sp.tw) / (sp.ts - sp.tw); k = -1 + 2 * ease.out3(u); }
  else k = 1 - 0.5 * ease.io2(clamp01((t - sp.ts) / Math.max(0.01, sp.dur - sp.ts)));
  const f = (k + 1) / 2, y = sp.y ?? 1.12;
  s3(P.hr, lerp(-0.3, -0.12, f), y - 0.05 + 0.04 * f, lerp(-0.22, 0.42, f));
  s3(P.wd, lerp(0.12, 0.03, f), lerp(0.1, 0.02, f) + (sp.pitch ?? 0), 1);
  P.grip = sp.grip ?? 1; s3(P.hl, 0.25, 1.05, 0.25);
  P.try = lerp(-0.6, 0.38, f); P.hry = lerp(-0.25, 0.12, f); P.trx = 0.06 + 0.2 * f; P.hdy = lerp(0.5, -0.3, f);
  P.hy = -0.1 - 0.08 * f; P.hz = lerp(-0.1, 0.24, f);
  s3(P.fl, 0.14, 0, 0.26 + 0.2 * f); s3(P.fr, -0.17, 0, -0.3 - 0.06 * f);
  return P;
}
