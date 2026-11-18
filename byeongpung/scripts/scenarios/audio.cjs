// 소리 점검: 모든 효과음과 음악 분위기를 오프라인 렌더링해 크기를 잰다(귀 대신 숫자로).
module.exports = async (page, h) => {
  const res = await h.ev(() => window.__game.audioTest(null, ['margin', 'pine', 'village', 'bamboo', 'marsh', 'north', 'calm', 'combat', 'miniboss', 'boss']));
  const rows = Object.entries(res).map(([k, v]) => `${k.padEnd(16)} peak ${String(v.peak).padEnd(6)} rms ${String(v.rms).padEnd(7)} dur ${v.dur}${v.nan ? ' NaN!' : ''}${v.peak > 0.98 ? ' CLIP' : ''}${v.peak < 0.02 ? ' QUIET' : ''}`);
  h.log(rows.join('\n'));
  return { n: rows.length };
};
