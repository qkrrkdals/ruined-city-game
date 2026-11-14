// 죽음 → 다시 일어남 점검: 보스전 한가운데에서 체력을 1로 만들어 죽고, 마지막 연적에서 일어나 다시 보스전에 들어갈 수 있는지 본다.
module.exports = async (page, h) => {
  const out = [];
  await h.ev(() => {
    const g = window.__game, G = g.G; g.start({ flags: { firstFight: true, shrine1: true, village: true, jang: true }, arts: ['dot'] });
    G.prog.shrines.push('bamboo'); G.prog.lastShrine = 'bamboo'; G.shrines.load();
    const n = G.world.node('bossB'); g.tp([n.x - 8, n.z + 8], 2.2, 0.3, 7); g.sim(400);
  });
  out.push(['보스전 시작', await h.ev(() => ({ state: window.__game.G.state, boss: !!window.__game.G.story.boss, bars: window.__game.G.world.arenas.general.bars.map((b) => b.on) }))]);
  await h.ev(() => { const g = window.__game, G = g.G; G.player.hp = 1; G.player.inv = 0; G.player.takeHit({ dmg: 50, power: 2 }); g.sim(60); });
  await h.shot('death_1');
  out.push(['죽음', await h.ev(() => ({ state: window.__game.G.state, alive: window.__game.G.player.alive }))]);
  await h.ev(() => window.__game.sim(420));
  await h.shot('death_2_respawn');
  out.push(['다시 일어남', await h.ev(() => { const G = window.__game.G; return { state: G.state, alive: G.player.alive, hp: G.player.hp, pos: [Math.round(G.player.pos.x), Math.round(G.player.pos.z)], boss: !!G.story.boss, enemies: G.enemies.list.length, bars: G.world.arenas.general.bars.map((b) => b.on), deaths: G.prog.stats.deaths }; })]);
  await h.ev(() => { const g = window.__game, G = g.G; const n = G.world.node('bossB'); g.tp([n.x - 8, n.z + 8], 2.2, 0.3, 7); g.sim(400); });
  out.push(['보스전 재진입', await h.ev(() => ({ state: window.__game.G.state, boss: !!window.__game.G.story.boss, bossHp: window.__game.G.story.boss && window.__game.G.story.boss.e.hp }))]);
  await h.shot('death_3_general');
  return out.map((o) => JSON.stringify(o));
};
