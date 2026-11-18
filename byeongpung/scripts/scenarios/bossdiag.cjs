// 보스 진단: 회피하지 않는 봇으로 싸워 보스의 상태 분포·공격 횟수·명중 수·주인공이 받은 피해를 센다.
module.exports = async (page, h, args) => {
  const key = args[0] || 'tiger', node = { general: 'bossB', toad: 'bossM', tiger: 'bossT' }[key], skill = +(args[1] || 0), secs = +(args[2] || 60);
  await h.ev(([key, node, skill]) => {
    const g = window.__game, G = g.G; g.start({ flags: { firstFight: true, shrine1: true, village: true, jang: true, gateOpen: true, general: key !== 'general', toad: key === 'tiger' }, arts: ['dot', 'wave', 'smash'] });
    G.prog.up.atk = 3; G.prog.up.hp = 3; G.prog.apply(); G.player.fullRestore(); Object.keys(G.text.hints).forEach((k) => (G.prog.flags['h_' + k] = true));
    const n = G.world.node(node); g.tp([n.x + 1, n.z + n.r - 7], 3.14, 0.3, 7); g.sim(420); g.autoplay({ skill }); G.bot.gi = 999; G.bot.replan = () => {};
    window.__diag = { st: {}, atk: {}, hits: 0, dmg: 0, heals: 0 };
    const p = G.player, th = p.takeHit.bind(p); p.takeHit = (info) => { const before = p.hp; const r = th(info); if (r) { window.__diag.hits++; window.__diag.dmg += before - p.hp; if (p.hp <= 0) { p.hp = p.maxHp; p.alive = true; p.setState('move'); G.state = 'play'; window.__diag.deaths = (window.__diag.deaths || 0) + 1; } } return r; };
    G.on('tell', (e) => { if (e.boss) window.__diag.atk[e.atk.id] = (window.__diag.atk[e.atk.id] || 0) + 1; });
  }, [key, node, skill]);
  for (let i = 0; i < secs; i++) await h.ev(() => { const g = window.__game, b = g.G.story.boss; for (let k = 0; k < 60; k++) { g.sim(1); if (b && b.e.alive) window.__diag.st[b.e.st] = (window.__diag.st[b.e.st] || 0) + 1; } });
  return await h.ev(() => { const d = window.__diag, b = window.__game.G.story.boss; const tot = Object.values(d.st).reduce((a, c) => a + c, 0) || 1; return { 상태비율: Object.fromEntries(Object.entries(d.st).map(([k, v]) => [k, Math.round((v / tot) * 100) + '%'])), 공격: d.atk, 맞은횟수: d.hits, 받은피해: Math.round(d.dmg), 죽음: d.deaths || 0, 보스체력: b ? Math.round(b.e.hp) + '/' + b.e.maxHp : '처치' }; });
};
