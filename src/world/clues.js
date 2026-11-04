// Canvas drawings for in-world puzzle clues (the hints live in the world, not in pop-ups):
// Haram's chalk drawing, the gate power label, the apartment-block map, the garage fuse-cabinet grid,
// the station power-panel diagram and slot labels, the torn generator card, Yujin's whiteboard,
// and the photo-studio prints (front variants for DRAW.photo).
import { DRAW, FONT, person } from './textures.js';
import { t } from '../i18n/i18n.js';

function fit(ctx, text, x, y, maxW, size, font, weight = '') {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 8);
  ctx.fillText(text, x, y);
}
const grime = (ctx, W, H, n = 14) => { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(90,80,70,${0.03 + Math.random() * 0.07})`; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * W * 0.05, 0, 6.28); ctx.fill(); } };
// little pictograms used by the panel diagram and slot labels
function icon(ctx, kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round';
  if (kind === 'bulb') { ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.3, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(s * 0.12, s * 0.3); ctx.lineTo(-s * 0.12, s * 0.3); ctx.closePath(); ctx.stroke(); ctx.fillRect(-s * 0.13, s * 0.34, s * 0.26, s * 0.1); }
  else if (kind === 'motor') { ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, 6.28); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28); ctx.lineTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, 6.28); ctx.fill(); }
  else if (kind === 'lock') { ctx.strokeRect(-s * 0.26, -s * 0.02, s * 0.52, s * 0.4); ctx.beginPath(); ctx.arc(0, -s * 0.02, s * 0.18, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, s * 0.17, s * 0.05, 0, 6.28); ctx.fill(); }
  else if (kind === 'fan') { for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.1, s * 0.2, 0.4, 0, 6.28); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 6.28); ctx.stroke(); }
  else if (kind === 'shutter') { ctx.strokeRect(-s * 0.4, -s * 0.36, s * 0.8, s * 0.72); for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.36 + i * s * 0.144); ctx.lineTo(s * 0.4, -s * 0.36 + i * s * 0.144); ctx.stroke(); } }
  ctx.restore();
}

Object.assign(DRAW, {
  // Haram's old chalk drawing on the yard wall: three boxes as steps up to a window with a star
  chalk(ctx, s, W, H) {
    ctx.clearRect(0, 0, W, H); ctx.lineWidth = W * 0.012; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const c = (a) => `rgba(250,246,236,${a})`, u = W / 10;
    ctx.strokeStyle = c(0.85);
    for (const [x, y] of [[1, 7.2], [2.4, 7.2], [2.4, 5.8]]) ctx.strokeRect(x * u, y * u * H / W, 1.3 * u, 1.3 * u * H / W);
    ctx.strokeRect(5.6 * u, 1.2 * H / 10, 3.4 * u, 2.4 * H / 10);
    ctx.beginPath(); ctx.moveTo(4 * u, 5.4 * H / 10); ctx.lineTo(5.5 * u, 3.9 * H / 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4.9 * u, 3.9 * H / 10); ctx.lineTo(5.5 * u, 3.9 * H / 10); ctx.lineTo(5.5 * u, 4.5 * H / 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,120,0.9)'; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const x = 7.3 * u + Math.cos(a) * u * 0.55, y = 2.4 * H / 10 + Math.sin(a) * u * 0.55; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = c(0.8); ctx.beginPath(); ctx.arc(1.6 * u, 4.9 * H / 10, u * 0.32, 0, 6.28); ctx.moveTo(1.6 * u, 5.5 * H / 10); ctx.lineTo(1.6 * u, 6.7 * H / 10); ctx.moveTo(1.1 * u, 5.9 * H / 10); ctx.lineTo(2.1 * u, 5.9 * H / 10); ctx.stroke();
    ctx.fillStyle = c(0.75); ctx.textAlign = 'center'; fit(ctx, t('clues.chalk'), 7.3 * u, 9.3 * H / 10, W * 0.5, H * 0.09, FONT.hand2);
  },
  // printed label inside the gate power box lid
  label(ctx, s, W, H) {
    ctx.fillStyle = s.bg ?? '#f2ecdf'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = s.fg ?? '#3d4a60'; ctx.fillRect(0, 0, W, H * 0.06);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const L = t(s.key), ys = [0.26, 0.55, 0.83], sz = [0.13, 0.24, 0.12];
    (Array.isArray(L) ? L : [L]).forEach((l, i) => fit(ctx, l, W / 2, H * ys[i], W * 0.88, H * sz[i], FONT.ui, 'bold'));
    grime(ctx, W, H, 8);
  },
  // apartment-block map in the guard booth: where the block-3 garage and its power room are
  areamap(ctx, s, W, H) {
    ctx.fillStyle = '#f2ecdf'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#4f5f7a'; ctx.fillRect(0, 0, W, H * 0.12);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fit(ctx, t('clues.map.title'), W / 2, H * 0.06, W * 0.9, H * 0.07, FONT.ui, 'bold');
    const X = (x) => W * (0.08 + ((x + 40) / 80) * 0.84), Y = (z) => H * (0.16 + ((268 - z) / 150) * 0.78);
    ctx.fillStyle = '#d9d2c8'; ctx.fillRect(X(-6), Y(266), X(6) - X(-6), Y(120) - Y(266));
    for (const z of [226, 172]) ctx.fillRect(X(-40), Y(z + 4), X(40) - X(-40), Y(z - 4) - Y(z + 4));
    ctx.fillStyle = '#c9bde6'; for (const [x0, z0, x1, z1] of [[-30, 214, -14, 182], [14, 214, 30, 182], [16, 166, 48, 124]]) ctx.fillRect(X(x0), Y(z0), X(x1) - X(x0), Y(z1) - Y(z0));
    ctx.fillStyle = '#7a8fb0'; ctx.fillRect(X(16), Y(166), X(48) - X(16), Y(124) - Y(166));
    ctx.fillStyle = '#fff'; fit(ctx, t('clues.map.block3'), (X(16) + X(48)) / 2, (Y(166) + Y(124)) / 2 - H * 0.02, X(48) - X(16), H * 0.05, FONT.ui, 'bold');
    ctx.fillStyle = '#e8b73f'; ctx.beginPath(); const bx = X(44), by = Y(128); ctx.moveTo(bx, by - 14); ctx.lineTo(bx - 8, by + 2); ctx.lineTo(bx - 1, by + 2); ctx.lineTo(bx - 5, by + 15); ctx.lineTo(bx + 8, by - 3); ctx.lineTo(bx + 1, by - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d3a40'; fit(ctx, t('clues.map.power'), bx - W * 0.12, by + H * 0.045, W * 0.3, H * 0.035, FONT.ui);
    ctx.strokeStyle = '#c9625a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(18), Y(160)); ctx.lineTo(X(18), Y(150)); ctx.stroke();
    fit(ctx, t('clues.map.ramp'), X(18), Y(163), W * 0.22, H * 0.03, FONT.ui);
    ctx.fillStyle = '#c9625a'; ctx.beginPath(); ctx.arc(X(9), Y(124), 7, 0, 6.28); ctx.fill(); ctx.fillStyle = '#3d3a40'; fit(ctx, t('clues.map.here'), X(9), Y(124) + 18, W * 0.2, H * 0.03, FONT.ui, 'bold');
    grime(ctx, W, H, 12);
  },
  // fuse cabinet in the garage: row letters and column numbers, B-3 slot label burnt
  fusegrid(ctx, s, W, H) {
    ctx.fillStyle = '#9a9eab'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2f3352'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cx = (c) => W * (0.32 + c * 0.24), ry = (r) => H * (0.3 + r * 0.38);
    for (let c = 0; c < 3; c++) fit(ctx, String(c + 1), cx(c), H * 0.08, W * 0.2, H * 0.1, FONT.ui, 'bold');
    for (let r = 0; r < 2; r++) fit(ctx, 'AB'[r], W * 0.08, ry(r), W * 0.12, H * 0.12, FONT.ui, 'bold');
    ctx.strokeStyle = 'rgba(47,51,82,0.55)'; ctx.lineWidth = 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { ctx.strokeRect(cx(c) - W * 0.09, ry(r) - H * 0.15, W * 0.18, H * 0.3); }
    ctx.fillStyle = 'rgba(40,30,30,0.55)'; ctx.beginPath(); ctx.ellipse(cx(2) + W * 0.04, ry(0) - H * 0.12, W * 0.09, H * 0.08, 0.4, 0, 6.28); ctx.fill();
    grime(ctx, W, H, 10);
  },
  // station power panel: wiring diagram (pictograms only)
  diagram(ctx, s, W, H) {
    ctx.fillStyle = '#eef2ef'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2f4a52'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, t('clues.diagram.title'), W / 2, H * 0.08, W * 0.9, H * 0.07, FONT.ui, 'bold');
    const slots = ['bulb', 'motor', 'lock', 'fan'], col = '#2f4a52', sx = (i) => W * (0.16 + i * 0.227), sy = H * 0.3;
    slots.forEach((k, i) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(sx(i) - W * 0.08, sy - H * 0.1, W * 0.16, H * 0.2); icon(ctx, k, sx(i), sy, W * 0.13, col); fit(ctx, 'ABCD'[i], sx(i), sy - H * 0.15, W * 0.1, H * 0.06, FONT.ui, 'bold'); });
    const ty = H * 0.78; ctx.lineWidth = 3; ctx.strokeStyle = col;
    icon(ctx, 'shutter', W * 0.48, ty, W * 0.2, col); icon(ctx, 'bulb', W * 0.16, ty, W * 0.13, col); icon(ctx, 'fan', W * 0.84, ty, W * 0.13, col);
    const line = (x0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, sy + H * 0.1); ctx.lineTo(x0, H * 0.55); ctx.lineTo(x1, H * 0.55); ctx.lineTo(x1, y1); ctx.stroke(); };
    line(sx(0), W * 0.16, ty - H * 0.08); line(sx(1), W * 0.44, ty - H * 0.1); line(sx(2), W * 0.52, ty - H * 0.1); line(sx(3), W * 0.84, ty - H * 0.08);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W * 0.48, H * 0.55, 6, 0, 6.28); ctx.fill();
    grime(ctx, W, H, 8);
  },
  slot(ctx, s, W, H) { ctx.fillStyle = '#e9ece8'; ctx.fillRect(0, 0, W, H); icon(ctx, s.icon, W * 0.3, H / 2, H * 0.8, '#2f4a52'); ctx.fillStyle = '#2f4a52'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fit(ctx, s.letter, W * 0.75, H / 2, W * 0.4, H * 0.7, FONT.ui, 'bold'); },
  // laminated generator start card, torn through the middle (steps 2 and 3 missing)
  card(ctx, s, W, H) {
    ctx.fillStyle = '#fbf6e6'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#c9625a'; ctx.fillRect(0, 0, W, H * 0.14);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fit(ctx, t('clues.card.title'), W / 2, H * 0.07, W * 0.9, H * 0.08, FONT.ui, 'bold');
    ctx.fillStyle = '#3d3a40'; ctx.textAlign = 'left';
    fit(ctx, t('clues.card.s1'), W * 0.07, H * 0.26, W * 0.86, H * 0.075, FONT.ui);
    fit(ctx, t('clues.card.s4'), W * 0.07, H * 0.84, W * 0.86, H * 0.075, FONT.ui);
    ctx.fillStyle = '#7c8794'; ctx.beginPath(); ctx.moveTo(0, H * 0.36);
    for (let x = 0; x <= W; x += W / 14) ctx.lineTo(x, H * (0.36 + Math.random() * 0.05)); for (let x = W; x >= 0; x -= W / 14) ctx.lineTo(x, H * (0.68 + Math.random() * 0.05)); ctx.closePath(); ctx.fill();
    grime(ctx, W, H, 10);
  },
  // Yujin's whiteboard in the lab
  board(ctx, s, W, H) {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#3c4a7a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const L = t('clues.board'); (Array.isArray(L) ? L : [L]).forEach((l, i) => fit(ctx, l, W * 0.05, H * (0.14 + i * 0.17), W * 0.9, H * 0.13, FONT.hand));
    ctx.strokeStyle = 'rgba(232,183,63,0.95)'; ctx.lineWidth = W * 0.008; ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.65, W * 0.47, H * 0.2, 0, 0, 6.28); ctx.stroke();
  },
});

// studio prints: two people (or a family) in recognisable colours; only one pair matches the photo at home
const basePhoto = DRAW.photo;
const PEOPLE = {
  p_us: [['#e8b73f', { collar: '#ffffff', hair: '#3e3236' }, 0.36, 0.22], ['#f3b6c6', { hair: '#5a4440', long: true }, 0.6, 0.19]],
  p_raincoat: [['#9fb7d8', { hair: '#3e3236' }, 0.3, 0.22], ['#e8b73f', { hair: '#4a3b3f', smile: true }, 0.5, 0.13], ['#c9bde6', { hair: '#5a4440', long: true }, 0.68, 0.21]],
  p_grad: [['#9cc483', { hair: '#2f2a2c' }, 0.36, 0.22], ['#f3b6c6', { hair: '#5a4440', long: true }, 0.6, 0.19]],
  p_solo: [['#e8b73f', { collar: '#ffffff', hair: '#3e3236' }, 0.5, 0.26]],
};
DRAW.photo = function (ctx, s, W, H) {
  const ppl = PEOPLE[s.variant];
  if (!ppl) return basePhoto(ctx, s, W, H);
  ctx.fillStyle = '#fbf7ef'; ctx.fillRect(0, 0, W, H);
  const m = W * 0.06, iw = W - 2 * m, ih = H - m * 3.2;
  const g = ctx.createLinearGradient(0, m, 0, m + ih); g.addColorStop(0, s.variant === 'p_solo' ? '#c9d3e6' : '#e3d6f0'); g.addColorStop(1, '#f7e3d4');
  ctx.fillStyle = g; ctx.fillRect(m, m, iw, ih);
  ctx.save(); ctx.beginPath(); ctx.rect(m, m, iw, ih); ctx.clip();
  for (const [col, o, x, sz] of ppl) person(ctx, m + iw * x, m + ih * (0.62 - sz), ih * sz, col, o);
  ctx.restore();
};
