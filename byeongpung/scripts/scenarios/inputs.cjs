// 조작 점검: 모아 치기(우클릭 누르고 있기)·조준 고정(T, 휠)·시점(마우스)·달리다 치기·회피 후 치기.
module.exports = async (page, h) => {
  const out = [], ev = h.ev;
  await ev(() => { const g = window.__game, G = g.G; g.start({ flags: { firstFight: true, shrine1: true }, arts: ['dot', 'wave', 'smash'] }); G.spawner.encs.forEach((e) => (e.manual = true)); G.spawner.reset(true); g.tp([-14, 96], 0, 0.3, 6.4); g.spawn('soldier', -2, 7); g.spawn('soldier', 3, 9); g.sim(30); G.god = true; });
  const st = () => ev(() => { const G = window.__game.G, p = G.player; return { st: p.st, move: p.move && p.move.id, charge: +p.charge.toFixed(2), lv: p.chargeLv, lock: G.cam.target ? G.cam.target.kind : null, camYaw: +G.cam.yaw.toFixed(2) }; });
  await ev(() => { const g = window.__game; g.G.input.press('M2'); g.sim(75); }); out.push(['우클릭 1.25초 유지', await st()]); await h.shot('in_charge');
  await ev(() => { const g = window.__game; g.G.input.release('M2'); g.sim(4); }); out.push(['뗌', await st()]);
  await ev(() => window.__game.sim(14)); await h.shot('in_hc2');
  await ev(() => { const g = window.__game; g.sim(80); g.G.input.press('M2'); g.sim(36); g.G.input.release('M2'); g.sim(3); }); out.push(['0.6초 모으고 뗌', await st()]);
  await ev(() => { const g = window.__game; g.sim(80); g.G.input.press('KeyT'); g.sim(2); g.G.input.release('KeyT'); g.sim(30); }); out.push(['T', await st()]); await h.shot('in_lock');
  await ev(() => { const g = window.__game; g.G.input.wheel = 1; g.sim(1); g.sim(20); }); out.push(['휠', await st()]);
  await ev(() => { const g = window.__game; g.G.input.press('KeyT'); g.sim(2); g.G.input.release('KeyT'); g.sim(5); }); out.push(['T 다시', await st()]);
  await ev(() => { const g = window.__game; g.G.input.dx = 200; g.sim(1); }); out.push(['마우스 +200px', await st()]);
  await ev(() => { const g = window.__game, I = g.G.input; I.press('KeyW'); I.press('ShiftLeft'); g.sim(50); I.press('M0'); g.sim(2); I.release('M0'); g.sim(3); }); out.push(['달리다 좌클릭', await st()]);
  await ev(() => { const g = window.__game, I = g.G.input; I.release('KeyW'); I.release('ShiftLeft'); g.sim(60); I.press('Space'); g.sim(2); I.release('Space'); g.sim(19); I.press('M0'); g.sim(2); I.release('M0'); g.sim(3); }); out.push(['회피 후 좌클릭', await st()]);
  await ev(() => { const g = window.__game, I = g.G.input; g.sim(60); for (const k of ['M0', 'M0', 'M0', 'M2']) { I.press(k); g.sim(2); I.release(k); g.sim(17); } }); out.push(['약약약강', await st()]); await h.shot('in_leap');
  return out.map((o) => JSON.stringify(o));
};
