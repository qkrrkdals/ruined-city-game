// 전투 점검: 적을 불러 자동 전투를 돌리고, 휘두르는 순간들을 찍는다.  인자: 종류,종류,... [초]
module.exports = async (page, h, args) => {
  const kinds = (args[0] || 'inkling,inkling,inkling,soldier').split(',');
  const secs = +(args[1] || 30);
  await h.ev((kinds) => {
    const g = window.__game; g.start({ flags: { firstFight: true, shrine1: true }, arts: ['dot', 'wave', 'smash'] }); g.G.spawner.encs.forEach((e) => (e.manual = true)); g.G.spawner.reset(true);
    g.tp([-14, 96], 0, 0.32, 6.4);
    kinds.forEach((k, i) => g.spawn(k, (i - (kinds.length - 1) / 2) * 2.2, 7 + (i % 2) * 1.5));
    g.bot(true, { arts: true, heavy: true });
  }, kinds);
  const out = { shots: [], log: [] };
  let shotN = 0, lastShot = -99;
  for (let f = 0; f < secs * 60; f++) {
    const s = await h.ev(() => { const g = window.__game; g.sim(1); const p = g.G.player, m = p.move; return { st: p.st, t: p.t, id: m && m.id, tw: m && m.sp.tw, ts: m && m.sp.ts, hp: p.hp, n: g.G.enemies.list.filter((e) => e.alive).length, fin: p.st === 'finisher', blank: g.G.fx.blankT > 0 }; });
    const mid = s.id && s.t > s.tw + (s.ts - s.tw) * 0.55 && s.t < s.ts + 0.05;
    if ((mid || s.blank) && f - lastShot > 50 && shotN < 10) { lastShot = f; shotN++; await h.shot(`combat_${String(shotN).padStart(2, '0')}_${s.blank ? 'blank' : s.id}`); out.shots.push(s.id); }
    if (f % 300 === 0) out.log.push({ f, hp: Math.round(s.hp), n: s.n, st: s.st });
    if (s.n === 0 || s.st === 'dead') { out.end = { f, sec: +(f / 60).toFixed(1), hp: Math.round(s.hp), st: s.st }; break; }
  }
  out.stat = await h.ev(() => window.__game.G.bot.stat);
  out.info = await h.ev(() => window.__game.info());
  out.enemies = await h.ev(() => window.__game.enemies());
  await h.shot('combat_end');
  return out;
};
