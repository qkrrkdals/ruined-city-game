// 지도: 병풍 첫째 폭을 먹으로 그린 약도. 길(걸을 수 있는 땅), 깨운 연적, 길잡이, 내 위치.
import { G } from '../core/g.js';
import { F } from '../world/field.js';
import { BOUNDS, NODES } from '../world/layout.js';
import { mulberry32 } from '../core/util.js';

let base = null;
function makeBase(S) {
  const W = Math.round((BOUNDS.x1 - BOUNDS.x0) * S), H = Math.round((BOUNDS.z1 - BOUNDS.z0) * S);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const img = g.createImageData(W, H), d = img.data, R = mulberry32(3);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    const wx = BOUNDS.x0 + x / S, wz = BOUNDS.z0 + y / S, sd = F.sdf(wx, wz), zone = F.zone(wx, wz);
    let v;
    if (sd < 0) v = 246 - Math.min(18, -sd * 1.5);                         // 길: 밝게
    else if (sd < 1.6) v = 60;                                              // 가장자리 먹선
    else v = zone === 0 ? 240 : zone === 4 ? 188 + Math.min(30, sd * 0.6) : 214 - Math.min(60, sd * 1.1) + (R() < 0.03 ? -50 : 0); // 산·물
    d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * (zone === 4 && sd > 1.6 ? 0.98 : 0.9); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
export function drawMap(cv) {
  const S = 1.3; if (!base) base = makeBase(S);
  cv.width = base.width; cv.height = base.height;
  const g = cv.getContext('2d'); g.drawImage(base, 0, 0);
  const X = (x) => (x - BOUNDS.x0) * S, Y = (z) => (z - BOUNDS.z0) * S;
  // 구역 이름
  g.fillStyle = 'rgba(21,21,27,0.75)'; g.textAlign = 'center'; g.font = `${22 * S}px "BP Brush", serif`;
  const Z = G.text.zones;
  for (const [id, name, dx, dz] of [['margin', Z.margin, 46, 6], ['p2', Z.pine, 60, 0], ['village', Z.village, 0, 50], ['b3', Z.bamboo, 0, 52], ['m3', Z.marsh, 0, 50], ['n3', Z.north, 62, 0], ['bossT', Z.arena, 0, -32]]) g.fillText(name, X(NODES[id].x + dx), Y(NODES[id].z + dz));
  // 연적
  for (const s of G.world.shrines || []) {
    if (!G.prog.shrines.includes(s.id)) continue;
    g.fillStyle = '#2c4c7c'; g.beginPath(); g.arc(X(s.x), Y(s.z), 6 * S, 0, 7); g.fill();
  }
  const o = G.story && G.story.objTarget;
  if (o) { g.fillStyle = '#c5341f'; g.save(); g.translate(X(o.x), Y(o.z)); g.rotate(Math.PI / 4); g.fillRect(-6 * S, -6 * S, 12 * S, 12 * S); g.restore(); }
  const p = G.player; g.save(); g.translate(X(p.pos.x), Y(p.pos.z)); g.rotate(-p.yaw + Math.PI);
  g.fillStyle = '#15151b'; g.strokeStyle = '#f8f3e6'; g.lineWidth = 2 * S; g.beginPath(); g.moveTo(0, -11 * S); g.lineTo(7 * S, 8 * S); g.lineTo(0, 4 * S); g.lineTo(-7 * S, 8 * S); g.closePath(); g.stroke(); g.fill(); g.restore();
}
