// Canvas-generated textures (no image files): signs, decals, posters, photos, billboard, clock faces.
import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { patch } from './materials.js';

export const FONT = {
  ui: '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Nanum Gothic",sans-serif',
  hand: '"Nanum Pen Script","Gaegu",cursive',
  hand2: '"Gaegu","Nanum Pen Script",cursive',
  print: '"Noto Serif KR","Nanum Myeongjo","AppleMyungjo","Batang",serif',
};

export function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), tex };
}

let _dot = null;
export function dotTexture() {
  if (_dot) return _dot;
  const { ctx, tex } = canvasTex(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return (_dot = tex);
}

function fit(ctx, text, x, y, maxW, size, font, weight = '') {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 8);
  ctx.fillText(text, x, y);
}
function weather(ctx, W, H, amt = 0.5) {
  for (let i = 0; i < 40 * amt; i++) {
    ctx.fillStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},${70 + Math.random() * 40},${0.04 + Math.random() * 0.1})`;
    const r = 4 + Math.random() * W * 0.06; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, r, 0, 6.28); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(60,50,50,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i < 10 * amt; i++) { ctx.beginPath(); const x = Math.random() * W, y = Math.random() * H; ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 60, y + Math.random() * 30); ctx.stroke(); }
}
function lines(ctx, arr, x, y, lh, maxW, size, font) { arr.forEach((l, i) => fit(ctx, l, x, y + i * lh, maxW, size, font)); }

// stylised person: head + hair + body in a colour (yellow cardigan for the protagonist)
export function person(ctx, x, y, s, body, o = {}) {
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - s * 0.55, y + s * 1.6); ctx.lineTo(x - s * 0.42, y + s * 0.55); ctx.quadraticCurveTo(x, y + s * 0.35, x + s * 0.42, y + s * 0.55); ctx.lineTo(x + s * 0.55, y + s * 1.6); ctx.closePath(); ctx.fill();
  if (o.collar) { ctx.fillStyle = o.collar; ctx.beginPath(); ctx.moveTo(x - s * 0.16, y + s * 0.47); ctx.lineTo(x, y + s * 0.8); ctx.lineTo(x + s * 0.16, y + s * 0.47); ctx.fill(); }
  ctx.fillStyle = '#f2cfb3'; ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, 6.28); ctx.fill();
  ctx.fillStyle = o.hair ?? '#4a3b3f'; ctx.beginPath(); ctx.arc(x, y - s * 0.07, s * 0.38, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  if (o.long) ctx.fillRect(x - s * 0.38, y - s * 0.07, s * 0.15, s * 0.6), ctx.fillRect(x + s * 0.23, y - s * 0.07, s * 0.15, s * 0.6);
  if (o.smile !== false) { ctx.strokeStyle = 'rgba(80,50,50,0.6)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.arc(x, y + s * 0.06, s * 0.12, 0.2, Math.PI - 0.2); ctx.stroke(); }
}

export const DRAW = {
  sign(ctx, s, W, H) {
    ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = s.fg; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.strokeRect(8, 8, W - 16, H - 16); ctx.globalAlpha = 1;
    ctx.fillStyle = s.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, t(s.key), W / 2, H / 2 + 4, W * 0.86, H * 0.56, FONT.ui, 'bold');
    weather(ctx, W, H, 0.8);
  },
  decal(ctx, s, W, H) {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = s.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85; fit(ctx, t(s.key), W / 2, H / 2, W * 0.92, H * 0.62, s.font === 'print' ? FONT.ui : FONT.hand, s.font === 'print' ? 'bold' : '');
    ctx.globalAlpha = 1;
  },
  sticker(ctx, s, W, H) {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fbf3e4'; ctx.beginPath(); ctx.roundRect(4, 4, W - 8, H - 8, 18); ctx.fill();
    ctx.strokeStyle = '#7a8fb0'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#7a8fb0'; ctx.beginPath(); ctx.arc(H * 0.5, H * 0.5, H * 0.26, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fbf3e4'; ctx.beginPath(); ctx.arc(H * 0.5, H * 0.46, H * 0.1, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#4f5f7a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fit(ctx, t(s.key), H * 0.9, H * 0.5, W - H * 1.05, H * 0.34, FONT.ui, 'bold');
    weather(ctx, W, H, 0.6);
  },
  poster(ctx, s, W, H) {
    ctx.fillStyle = s.bg ?? '#f3ecdc'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = s.fg ?? '#a3504a'; ctx.fillRect(0, 0, W, H * 0.16);
    ctx.fillStyle = '#fff8ee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, t(s.key + '.title'), W / 2, H * 0.08, W * 0.9, H * 0.08, FONT.ui, 'bold');
    ctx.fillStyle = '#3d3a40'; ctx.textAlign = 'left';
    const body = t(s.key + '.lines'); if (Array.isArray(body)) lines(ctx, body, W * 0.08, H * 0.26, H * 0.075, W * 0.84, H * 0.045, FONT.ui);
    weather(ctx, W, H, 1);
  },
  banner(ctx, s, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, s.bg ?? '#f6c9b8'); g.addColorStop(1, s.bg2 ?? '#cdb8e6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fffaf3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, t(s.key), W / 2, H / 2, W * 0.9, H * 0.5, FONT.ui, 'bold');
    weather(ctx, W, H, 0.9);
  },
  billboard(ctx, s, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#bfe3df'); g.addColorStop(0.6, '#d9cdf0'); g.addColorStop(1, '#f6d6c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(W * 0.62, H * 0.15, W * 0.05, H * 0.85); ctx.beginPath(); ctx.moveTo(W * 0.6, H * 0.18); ctx.lineTo(W * 0.645, H * 0.02); ctx.lineTo(W * 0.69, H * 0.18); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,133,0.9)'; ctx.beginPath(); ctx.arc(W * 0.645, H * 0.12, H * 0.035, 0, 6.28); ctx.fill();
    person(ctx, W * 0.8, H * 0.38, H * 0.33, '#e8b73f', { collar: '#ffffff', hair: '#3e3236' });
    ctx.fillStyle = '#3c3a5a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    fit(ctx, t('signs.billboard.org'), W * 0.05, H * 0.2, W * 0.5, H * 0.08, FONT.ui, 'bold');
    fit(ctx, t('signs.billboard.headline'), W * 0.05, H * 0.42, W * 0.55, H * 0.13, FONT.ui, 'bold');
    fit(ctx, t('signs.billboard.copy'), W * 0.05, H * 0.56, W * 0.55, H * 0.06, FONT.ui);
    ctx.fillStyle = '#5b5677'; fit(ctx, t('signs.billboard.name'), W * 0.05, H * 0.86, W * 0.55, H * 0.07, FONT.ui, 'bold');
    weather(ctx, W, H, 1.6);
  },
  photo(ctx, s, W, H) {
    ctx.fillStyle = '#fbf7ef'; ctx.fillRect(0, 0, W, H);
    const m = W * 0.06, iw = W - 2 * m, ih = H - m * 3.2;
    const g = ctx.createLinearGradient(0, m, 0, m + ih);
    if (s.variant === 'ceremony') { g.addColorStop(0, '#6f6aa6'); g.addColorStop(1, '#f2b49c'); } else { g.addColorStop(0, '#bfe0f0'); g.addColorStop(1, '#f7e3c4'); }
    ctx.fillStyle = g; ctx.fillRect(m, m, iw, ih);
    ctx.save(); ctx.beginPath(); ctx.rect(m, m, iw, ih); ctx.clip();
    if (s.variant === 'ceremony') {
      ctx.fillStyle = '#4c4878'; ctx.fillRect(m + iw * 0.7, m + ih * 0.1, iw * 0.08, ih); ctx.fillStyle = '#ffd585'; ctx.beginPath(); ctx.arc(m + iw * 0.74, m + ih * 0.13, iw * 0.03, 0, 6.28); ctx.fill();
      for (let i = 0; i < 9; i++) { ctx.fillStyle = ['#ffd27a', '#ff9eb9', '#9ee7dc'][i % 3]; ctx.beginPath(); ctx.arc(m + (i + 0.5) * iw / 9, m + ih * 0.2 + Math.sin(i) * ih * 0.04, iw * 0.014, 0, 6.28); ctx.fill(); }
    } else { ctx.fillStyle = '#9cc483'; ctx.fillRect(m, m + ih * 0.78, iw, ih); ctx.fillStyle = '#f2b8c6'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(m + iw * (0.1 + i * 0.17), m + ih * 0.3, iw * 0.09, 0, 6.28); ctx.fill(); } }
    person(ctx, m + iw * 0.36, m + ih * 0.5, ih * 0.22, '#e8b73f', { collar: '#ffffff', hair: '#3e3236' });
    person(ctx, m + iw * 0.6, m + ih * 0.56, ih * 0.19, s.variant === 'ceremony' ? '#9fc9e8' : '#f3b6c6', { hair: '#5a4440', long: true });
    ctx.restore();
    ctx.fillStyle = '#7a6f68'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = `${H * 0.06}px ${FONT.hand}`;
    ctx.fillText(t(s.key ?? 'signs.photoDate'), W - m, H - m * 1.1);
  },
  clock(ctx, s, W, H) {
    ctx.fillStyle = s.bg ?? '#f4ecdc'; ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.48, 0, 6.28); ctx.fill();
    ctx.strokeStyle = s.fg ?? '#4b4458'; ctx.lineWidth = W * 0.03; ctx.stroke();
    ctx.fillStyle = s.fg ?? '#4b4458';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.save(); ctx.translate(W / 2 + Math.sin(a) * W * 0.4, H / 2 - Math.cos(a) * W * 0.4); ctx.rotate(a); ctx.fillRect(-W * 0.012, -W * 0.04, W * 0.024, W * (i % 3 ? 0.05 : 0.08)); ctx.restore(); }
    if (s.hands !== false) {
      const hand = (a, len, w) => { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(a); ctx.fillRect(-w / 2, -len, w, len + W * 0.04); ctx.restore(); };
      hand(((9 + 47 / 60) / 12) * Math.PI * 2, W * 0.24, W * 0.045); hand((47 / 60) * Math.PI * 2, W * 0.36, W * 0.028);
      ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.035, 0, 6.28); ctx.fill();
    }
    weather(ctx, W, H, 0.5);
  },
  chain(ctx, s, W, H) {
    ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(150,150,160,1)'; ctx.lineWidth = 3;
    for (let i = -H; i < W + H; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + H, 0); ctx.lineTo(i, H); ctx.stroke(); }
  },
};

// textured plane in the world (re-drawn on language change)
export function makeSign(s, W) {
  const pw = s.pw ?? 512, ph = s.ph ?? Math.max(64, Math.round(pw * (s.h / s.w)));
  const { c, ctx, tex } = canvasTex(pw, ph);
  const transparent = s.kind === 'decal' || s.kind === 'sticker' || s.kind === 'chain';
  if (s.kind === 'chain') { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(s.w / 2, s.h / 2); }
  const Mat = s.glow ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const mat = patch(new Mat({ map: tex, transparent, alphaTest: transparent ? 0.05 : 0, depthWrite: !transparent || s.kind === 'chain', side: s.double || s.kind === 'chain' ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2 }), { soft: s.soft });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
  mesh.position.set(s.x, s.y, s.z); mesh.rotation.set(s.rx || 0, s.ry || 0, s.rz || 0, 'YXZ');
  mesh.receiveShadow = true;
  const draw = () => { ctx.save(); DRAW[s.kind](ctx, s, pw, ph); ctx.restore(); tex.needsUpdate = true; };
  draw(); W.textDraws.push(draw);
  mesh.userData.canvas = c;
  return mesh;
}
