// 주요 장면 찍기: 자동 플레이를 돌리다가 정해 둔 순간(목표 번호·보스 체력)에 멈춰 화면을 찍는다.
module.exports = async (page, h, args) => {
  await h.ev(() => { const g = window.__game; g.G.flow.newGame(); g.autoplay({ god: true }); });
  const want = (args[0] || 'intro,meet,shrine,soldier,village,general,toad,gate,tiger,tiger2,ending').split(',');
  const taken = new Set(), out = [];
  const snap = async (name) => { if (taken.has(name) || !want.includes(name)) return; taken.add(name); await h.shot('m_' + String(taken.size).padStart(2, '0') + '_' + name); out.push(name); };
  for (let i = 0; i < 4000; i++) {
    const s = await h.ev(() => { const g = window.__game, G = g.G; g.sim(30); const b = G.story.boss, p = G.player; return { t: G.bot.t, gi: G.bot.gi, st: G.state, cine: !!G.cam.cine, dlg: G.ui.dialog.active, boss: b ? b.key : '', bhp: b ? b.e.hp / b.e.maxHp : 1, bst: b ? b.e.st : '', flags: G.prog.flags, done: G.bot.done, pst: p.st, fight: G.enemies.fighting, sat: 0 }; });
    if (s.st === 'cine' && s.gi === 0 && s.t > 9.5) await snap('intro');
    if (s.dlg && s.gi === 1) await snap('meet');
    if (s.flags.shrine1 && s.gi === 4 && !s.dlg) await snap('shrine');
    if (s.gi >= 5 && s.gi <= 7 && s.fight && s.pst === 'attack') await snap('soldier');
    if (s.flags.village && s.dlg && s.gi <= 19) await snap('village');
    if (s.boss === 'general' && s.st === 'play' && s.bhp < 0.8 && (s.bst === 'windup' || s.bst === 'strike')) await snap('general');
    if (s.boss === 'toad' && s.st === 'play' && s.bhp < 0.85 && (s.bst === 'strike')) await snap('toad');
    if (s.st === 'cine' && s.flags.jang && !s.flags.gateOpen && s.gi > 60 && !s.dlg) await snap('gate');
    if (s.boss === 'tiger' && s.st === 'play' && s.bhp < 0.9 && s.bhp > 0.6 && (s.bst === 'windup' || s.bst === 'strike')) await snap('tiger');
    if (s.boss === 'tiger' && s.st === 'play' && s.bhp < 0.45 && (s.bst === 'strike')) await snap('tiger2');
    if (s.flags.tiger && s.dlg) await snap('ending');
    if (s.done || taken.size >= want.length) break;
  }
  return out;
};
