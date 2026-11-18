// 화면(UI) 점검: 제목·설정·조작법·HUD·대화·연적·가게·붓 손질·멈춤·지도·죽음·결말 화면을 차례로 찍는다.
module.exports = async (page, h) => {
  const shot = async (name) => { await page.waitForTimeout(350); await h.shot('ui_' + name); };
  const ev = h.ev;
  await ev(() => window.__game.sim(30)); await shot('01_title');
  await ev(() => window.__game.G.ui.screens.panel('settings')); await shot('02_settings');
  await ev(() => window.__game.G.ui.screens.panel('controls')); await shot('03_controls');
  await ev(() => { const g = window.__game, G = g.G; G.ui.screens.closePanel(); g.start({ flags: { shrine1: true, village: true, jang: true }, arts: ['dot', 'wave', 'smash'] }); G.prog.ink = 777; G.prog.charms = ['pine', 'bamboo', 'plum', 'orchid']; G.prog.equipped = ['pine', 'plum']; G.prog.bristle = 1; G.prog.apply(); G.player.hp = 60; G.player.ink = 1.6; g.tp([3, 6], 3.14, 0.3); g.sim(30); G.ui.toast(G.text.items.dew.name, G.text.items.dew.desc); G.ui.hint('finish'); G.ui.banner(G.text.zones.village); });
  await ev(() => window.__game.sim(20)); await shot('04_hud');
  await ev(() => { const G = window.__game.G; G.story.run(function* () { yield* G.story.say('jang1'); }); window.__game.sim(90); }); await shot('05_dialog');
  await ev(() => { const g = window.__game, G = g.G; G.ui.dialog.close(); g.sim(5); G.story.readMemo(2, true); g.sim(10); }); await shot('06_memo');
  await ev(() => { const g = window.__game, G = g.G; G.ui.dialog.close(); g.sim(5); G.ui.menus.show('shrine'); }); await shot('07_shrine');
  await ev(() => { document.querySelectorAll('.tab')[1].click(); }); await shot('08_charms');
  await ev(() => { const G = window.__game.G; G.ui.menus.close(); G.ui.menus.show('shop'); }); await shot('09_shop');
  await ev(() => { const G = window.__game.G; G.ui.menus.close(); G.ui.menus.show('smith'); }); await shot('10_smith');
  await ev(() => { const G = window.__game.G; G.ui.menus.close(); G.flow.pause(); }); await shot('11_pause');
  await ev(() => { const G = window.__game.G; G.flow.resume(); G.flow.pause('map'); }); await shot('12_map');
  await ev(() => { const g = window.__game, G = g.G; G.flow.resume(); G.ui.screens.death(true); }); await page.waitForTimeout(1300); await shot('13_death');
  await ev(() => { const G = window.__game.G; G.ui.screens.death(false); G.prog.stats.time = 3411; G.prog.stats.kills = 83; G.ui.screens.ending(() => {}); }); await shot('14_ending');
  await ev(() => { const G = window.__game.G; G.ui.screens.hideAll(); G.ui.screens.cards(G.text.intro, () => {}); window.__game.sim(80); }); await page.waitForTimeout(1400); await shot('15_cards');
  return 'ok';
};
