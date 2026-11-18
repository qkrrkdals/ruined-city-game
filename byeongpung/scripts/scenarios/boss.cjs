// 보스 점검: 터로 옮겨 등장 연출과 싸움 장면을 찍는다.  인자: general|toad|tiger [찍을 상태들]
module.exports = async (page, h, args) => {
  const key = args[0] || 'tiger', node = { general: 'bossB', toad: 'bossM', tiger: 'bossT' }[key];
  await h.ev(([key, node]) => {
    const g = window.__game, G = g.G; g.start({ flags: { firstFight: true, shrine1: true, village: true, jang: true, gateOpen: true, general: key !== 'general', toad: key === 'tiger' }, arts: ['dot', 'wave', 'smash'] });
    G.prog.up.atk = 4; G.prog.up.hp = 3; G.prog.apply(); G.player.fullRestore();
    const n = G.world.node(node); g.tp([n.x + 1, n.z + n.r - 7], 3.14, 0.3, 7); g.sim(2);
  }, [key, node]);
  const out = [];
  for (const [name, n] of [['intro1', 60], ['intro2', 70], ['intro3', 80]]) { await h.ev((n) => window.__game.sim(n), n); await h.shot(`boss_${key}_${name}`); }
  await h.ev(() => { const g = window.__game; g.sim(200); g.autoplay({ god: true }); g.G.bot.gi = 999; });
  const seen = new Set();
  for (let i = 0; i < 1500 && seen.size < 9; i++) {
    const s = await h.ev(() => { const g = window.__game, b = g.G.story.boss; g.sim(6); return b ? { st: b.e.st, id: b.e.atk ? b.e.atk.id : '', t: b.e.t, hp: b.e.hp / b.e.maxHp } : null; });
    if (!s) break;
    const k = s.st === 'strike' || s.st === 'windup' ? `${s.id}_${s.st}` : s.st === 'stagger' || s.st === 'rage' ? s.st : '';
    if (k && !seen.has(k) && (s.st !== 'windup' || s.t > 0.3)) { seen.add(k); await h.shot(`boss_${key}_${String(seen.size).padStart(2, '0')}_${k}`); out.push(k + ' ' + s.hp.toFixed(2)); }
  }
  return out;
};
