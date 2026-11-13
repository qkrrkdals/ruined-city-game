// 전체 플레이 점검: 새 게임부터 결말까지 자동 플레이를 돌린다.
//   인자: [god|real] [최대 분]   환경 변수 SHOTS=1 이면 주요 순간을 찍는다.
module.exports = async (page, h, args) => {
  const god = (args[0] || 'god') === 'god', maxMin = +(args[1] || 60);
  await h.ev((god) => { const g = window.__game; g.G.flow.newGame(); g.autoplay({ god }); }, god);
  const out = { god, lines: [] }; let last = null, lastGi = -1, sameN = 0, shotN = 0, prevBoss = '';
  for (let i = 0; i < maxMin * 6; i++) {
    const s = await h.ev(() => { const g = window.__game; g.sim(600); return g.autoStatus(); });
    for (const l of s.log) out.lines.push(l);
    if (i % 6 === 0 || s.boss !== prevBoss) out.lines.push(`[${s.t}s] goal#${s.gi}:${s.goal} ${s.state} pos=${s.pos} hp=${s.hp}/${s.maxHp} 먹물=${s.ink} lv=${s.lv} 붓+${s.weapon} 획=${s.arts} 죽음=${s.deaths} 처치=${s.kills} 맺음=${s.fins} ${s.boss}`);
    if (process.env.SHOTS && (s.boss !== prevBoss || i % 30 === 15) && shotN < 24) { shotN++; await h.shot(`play_${String(shotN).padStart(2, '0')}_${s.goal}`); }
    prevBoss = s.boss; last = s;
    if (s.done) break;
    if (s.gi === lastGi && !s.boss) { sameN++; if (sameN > 18) { out.lines.push(`!! 3분 넘게 같은 목표(${s.goal})에서 멈춤`); break; } } else { sameN = 0; lastGi = s.gi; }
  }
  out.final = last; delete out.final.log;
  h.log(out.lines.join('\n'));
  return { done: last.done, t: last.t, gi: last.gi, goal: last.goal, deaths: last.deaths, kills: last.kills, lv: last.lv, stat: last.stat };
};
