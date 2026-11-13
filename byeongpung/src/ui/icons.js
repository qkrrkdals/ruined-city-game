// 붓으로 그린 듯한 작은 그림(아이콘)을 캔버스로 만든다.
import { canvas } from '../gfx/textures.js';

const INK = '#15151b', RED = '#c5341f', INDIGO = '#2c4c7c';
// 곡선을 따라 굵기가 변하는 붓 획
function stroke(g, S, p0, p1, p2, r0, r1, r2, color) {
  g.fillStyle = color;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const r = t < 0.5 ? r0 + (r1 - r0) * (t * 2) : r1 + (r2 - r1) * (t * 2 - 1);
    g.beginPath(); g.arc(x * S, y * S, Math.max(0.4, r * S), 0, 7); g.fill();
  }
}
function mk(draw, S = 96) { const c = canvas(S, S), g = c.getContext('2d'); draw(g, S); return c.toDataURL(); }

export function makeIcons() {
  return {
    // 점: 꾹 찍고 삐친다
    dot: mk((g, S) => { stroke(g, S, [0.36, 0.3], [0.5, 0.4], [0.62, 0.62], 0.05, 0.17, 0.2, INK); stroke(g, S, [0.62, 0.62], [0.6, 0.74], [0.5, 0.8], 0.16, 0.08, 0.02, INK); }),
    // 삐침: 오른쪽 위에서 왼쪽 아래로 길게
    wave: mk((g, S) => stroke(g, S, [0.78, 0.14], [0.62, 0.52], [0.16, 0.86], 0.11, 0.09, 0.012, INK)),
    // 파임: 왼쪽 위에서 오른쪽 아래로 눌러 긋고 뺀다
    smash: mk((g, S) => { stroke(g, S, [0.16, 0.2], [0.4, 0.42], [0.66, 0.7], 0.03, 0.08, 0.15, INK); stroke(g, S, [0.66, 0.7], [0.78, 0.76], [0.92, 0.78], 0.15, 0.07, 0.01, INK); }),
    gourd: mk((g, S) => {
      g.fillStyle = INK; g.beginPath(); g.arc(S * 0.5, S * 0.66, S * 0.25, 0, 7); g.fill(); g.beginPath(); g.arc(S * 0.5, S * 0.36, S * 0.15, 0, 7); g.fill();
      g.fillRect(S * 0.46, S * 0.12, S * 0.08, S * 0.14); g.fillStyle = RED; g.fillRect(S * 0.44, S * 0.08, S * 0.12, S * 0.07);
      g.fillStyle = 'rgba(248,243,230,0.5)'; g.beginPath(); g.arc(S * 0.42, S * 0.6, S * 0.06, 0, 7); g.fill();
    }),
    drop: mk((g, S) => {
      g.fillStyle = INDIGO; g.beginPath(); g.moveTo(S * 0.5, S * 0.08); g.bezierCurveTo(S * 0.5, S * 0.3, S * 0.84, S * 0.5, S * 0.84, S * 0.66);
      g.arc(S * 0.5, S * 0.66, S * 0.34, 0, Math.PI); g.bezierCurveTo(S * 0.16, S * 0.5, S * 0.5, S * 0.3, S * 0.5, S * 0.08); g.fill();
      g.fillStyle = 'rgba(248,243,230,0.45)'; g.beginPath(); g.arc(S * 0.38, S * 0.66, S * 0.08, 0, 7); g.fill();
    }),
  };
}
