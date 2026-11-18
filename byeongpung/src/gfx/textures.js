// 캔버스로 그리는 질감: 한지 결, 준법(지형 붓자국), 붓 획, 먹 얼룩, 낙관.
import * as THREE from 'three';
import { mulberry32, hash2, smoothstep } from '../core/util.js';

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// 주기가 있는(이어 붙는) 값 잡음
function tnoise(x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % per) + per) % per;
  const a = hash2(m(xi), m(yi)), b = hash2(m(xi + 1), m(yi)), c = hash2(m(xi), m(yi + 1)), d = hash2(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbm(x, y, per, oct = 4) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += a * tnoise(x, y, per); n += a; a *= 0.5; x *= 2; y *= 2; per *= 2; } return s / n; }

function tex(cv, o = {}) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = o.aniso || 1;
  t.generateMipmaps = o.mip !== false;
  t.minFilter = o.mip === false ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  return t;
}

// 한지: R=밝기(결·섬유), G·B=먹선 흔들림용 잡음
export function paperTexture() {
  const S = 512, cv = canvas(S, S), g = cv.getContext('2d'), R = mulberry32(7);
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
    const v = 232 + (tfbm(x / 64, y / 64, 8, 4) - 0.5) * 30 + (hash2(x, y) - 0.5) * 9;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let k = 0; k < 900; k++) { // 닥나무 섬유
    const x = R() * S, y = R() * S, a = R() * Math.PI, len = 6 + R() * 34, bend = (R() - 0.5) * 0.8;
    g.strokeStyle = R() < 0.55 ? `rgba(255,255,255,${0.1 + R() * 0.22})` : `rgba(95,85,65,${0.05 + R() * 0.1})`;
    g.lineWidth = 0.5 + R() * 0.9;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(a + bend) * len * 0.5, y + oy + Math.sin(a + bend) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      g.stroke();
    }
  }
  const out = g.getImageData(0, 0, S, S), o = out.data;
  for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
    o[i + 1] = tfbm(x / 40 + 3.3, y / 40 + 1.7, 12, 3) * 255;
    o[i + 2] = tfbm(x / 40 + 9.1, y / 40 + 5.9, 12, 3) * 255;
  }
  g.putImageData(out, 0, 0);
  return tex(cv, { data: true });
}

// UI 바탕에 까는 한지 무늬(CSS 배경용 데이터 URL)
export function uiPaperUrl() {
  const S = 256, cv = canvas(S, S), g = cv.getContext('2d'), R = mulberry32(17);
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
    const v = (tfbm(x / 48, y / 48, 5, 3) - 0.5) * 14 + (hash2(x, y) - 0.5) * 6;
    d[i] = 239 + v; d[i + 1] = 231 + v; d[i + 2] = 214 + v * 0.9; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); g.lineCap = 'round';
  for (let k = 0; k < 260; k++) {
    const x = R() * S, y = R() * S, a = R() * Math.PI, len = 5 + R() * 26;
    g.strokeStyle = R() < 0.6 ? `rgba(255,252,244,${0.12 + R() * 0.2})` : `rgba(120,105,80,${0.05 + R() * 0.08})`; g.lineWidth = 0.5 + R() * 0.8;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke(); }
  }
  return cv.toDataURL('image/png');
}

// 지형에 곱하는 붓자국. kind 'rock'=준법(산의 붓질), 'ground'=옅은 담묵 얼룩
export function strokeDetailTexture(kind = 'rock') {
  const S = 512, cv = canvas(S, S), g = cv.getContext('2d'), R = mulberry32(kind === 'rock' ? 21 : 57);
  if (kind === 'ground') {
    const img = g.createImageData(S, S), d = img.data;
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
      const v = 255 * (0.9 + tfbm(x / 90, y / 90, 6, 4) * 0.12) - (hash2(x * 3, y * 7) < 0.012 ? 26 : 0);
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, v); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = 'round';
    for (let k = 0; k < 150; k++) { // 풀잎 같은 짧은 점획
      const x = R() * S, y = R() * S, a = -1.9 + R() * 0.7, len = 3 + R() * 7;
      g.strokeStyle = `rgba(50,55,50,${0.05 + R() * 0.08})`; g.lineWidth = 0.8 + R() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    return tex(cv, { aniso: 4 });
  }
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  for (let k = 0; k < 700; k++) {
    const x = R() * S, y = R() * S, a = Math.PI / 2 + (R() - 0.5) * 0.9, len = 8 + R() * 38;
    g.strokeStyle = R() < 0.85 ? `rgba(36,38,48,${0.03 + R() * 0.09})` : `rgba(255,255,255,${0.1 + R() * 0.15})`;
    g.lineWidth = 0.8 + R() * 3.2;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke();
    }
  }
  return tex(cv, { aniso: 4 });
}

// 붓 획(마른 붓 갈라짐). u=획 방향, v=폭. 흰색 알파.
export function brushTexture(seed = 3) {
  const Wd = 256, Hd = 64, cv = canvas(Wd, Hd), g = cv.getContext('2d');
  const img = g.createImageData(Wd, Hd), d = img.data;
  for (let y = 0, i = 0; y < Hd; y++) for (let x = 0; x < Wd; x++, i += 4) {
    const u = x / Wd, v = y / Hd;
    const hair = tfbm(u * 3 + seed, v * 26 + seed * 1.7, 64, 3);       // 붓털 결
    const dry = smoothstep(0.25, 1, u);                                // 끝으로 갈수록 마른다
    let a = smoothstep(0.26 + dry * 0.3, 0.5 + dry * 0.3, hair + (1 - dry) * 0.35);
    a *= smoothstep(0, 0.12, v) * smoothstep(1, 0.86, v);
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.max(0, Math.min(1, a)) * 255;
  }
  g.putImageData(img, 0, 0);
  return tex(cv, { clamp: true });
}

// 먹 얼룩 4종(2×2 아틀라스)
export function splatAtlas() {
  const S = 256, cv = canvas(S, S), g = cv.getContext('2d'), R = mulberry32(99);
  g.fillStyle = '#fff';
  for (let k = 0; k < 4; k++) {
    const cx = (k % 2) * 128 + 64, cy = ((k / 2) | 0) * 128 + 64;
    const n = 26, base = 24 + R() * 10; g.beginPath();
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = base * (0.72 + R() * 0.5); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
    g.closePath(); g.fill();
    for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, r = base * (1.05 + R() * 0.9), s = 1.2 + R() * 5.5; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, 0, 7); g.fill(); }
    for (let i = 0; i < 5; i++) { const a = R() * Math.PI * 2; g.lineWidth = 1.5 + R() * 3; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(cx + Math.cos(a) * base * 0.6, cy + Math.sin(a) * base * 0.6); g.lineTo(cx + Math.cos(a) * base * (1.3 + R() * 0.6), cy + Math.sin(a) * base * (1.3 + R() * 0.6)); g.stroke(); }
  }
  return tex(cv, { clamp: true });
}

// 부드러운 원(먹 번짐·그림자). dry=true 면 가장자리가 갈라진다.
export function blotTexture(dry = false) {
  const S = 128, cv = canvas(S, S), g = cv.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
    const dx = (x - 63.5) / 64, dy = (y - 63.5) / 64, r = Math.hypot(dx, dy);
    let a = 1 - smoothstep(dry ? 0.5 : 0.1, 1, r + (dry ? (tfbm(x / 9, y / 9, 16, 3) - 0.5) * 0.5 : 0));
    if (!dry) a *= a;
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return tex(cv, { clamp: true });
}

// 낙관(붉은 도장). text: 1~4글자. 글꼴이 준비된 뒤에 부른다.
export function sealCanvas(text, size = 256, o = {}) {
  const cv = canvas(size, size), g = cv.getContext('2d'), R = mulberry32(text.charCodeAt(0) * 31 + text.length);
  const pad = size * 0.06, s = size - pad * 2, rr = size * 0.09;
  g.fillStyle = o.color || '#c5341f';
  g.beginPath(); g.roundRect(pad, pad, s, s, rr); g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = size * 0.022; g.strokeStyle = '#000';
  g.beginPath(); g.roundRect(pad + size * 0.055, pad + size * 0.055, s - size * 0.11, s - size * 0.11, rr * 0.5); g.stroke();
  const chars = [...text], n = chars.length;
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fam = o.font || '"BP Title", "BP Brush", serif';
  if (n === 1) { g.font = `${size * 0.66}px ${fam}`; g.fillText(chars[0], size / 2, size * 0.53); }
  else if (n === 2) { g.font = `${size * 0.42}px ${fam}`; g.fillText(chars[0], size / 2, size * 0.32); g.fillText(chars[1], size / 2, size * 0.71); }
  else { g.font = `${size * 0.38}px ${fam}`; const p = [[0.7, 0.31], [0.7, 0.71], [0.31, 0.31], [0.31, 0.71]]; chars.slice(0, 4).forEach((ch, i) => g.fillText(ch, size * p[i][0], size * p[i][1])); }
  for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(R() * size, R() * size, R() * size * 0.012, 0, 7); g.fill(); } // 닳은 자국
  g.globalCompositeOperation = 'source-over';
  return cv;
}
export const sealTexture = (text, size, o) => tex(sealCanvas(text, size, o), { clamp: true });
export const canvasTexture = tex;
