// 품질 설정 점검: 낮음·높음으로 바꿔도 화면(먹선 포함)이 제대로 나오는지 찍는다.
module.exports = async (page, h) => {
  await h.ev(() => { const g = window.__game; g.start({ flags: { shrine1: true, village: true } }); g.tp([3, 14], 3.14, 0.3, 7); g.sim(20); });
  const out = [];
  for (const q of ['low', 'high', 'medium']) { await h.ev((q) => { window.__game.G.flow.setQuality(q); window.__game.sim(3); }, q); out.push(q + ' ' + (await h.shot('q_' + q)) + 'ms'); }
  return out;
};
