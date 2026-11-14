// 입력 배선 점검: 진짜 마우스·키보드 이벤트(DOM)를 보내고, 그 사이는 sim 으로 시간을 흘린다.
// 제목 → 새로 그리기(클릭) → 여는 글(E) → 걷기(W) → 붓 뽑기(E) → 대화 넘기기 → 공격(클릭) → 멈춤(Esc) → 돌아가기 → 저장 후 이어 그리기.
module.exports = async (page, h) => {
  const out = [], sim = (n) => h.ev((n) => window.__game.sim(n), n), info = () => h.ev(() => ({ ...window.__game.info(), armed: window.__game.G.player.armed, dlg: window.__game.G.ui.dialog.active }));
  await page.getByText('새로 그리기').click(); await sim(30);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await sim(100); }
  await sim(400); out.push(['여는 글 뒤', await info()]);
  await page.keyboard.down('KeyW'); await sim(150); await page.keyboard.up('KeyW'); await sim(10);
  out.push(['W 2.5초', await info()]);
  await h.ev(() => window.__game.G.player.place(1.5, 224.6, 3.14)); await sim(10);
  await page.keyboard.press('KeyE'); await sim(400);
  for (let i = 0; i < 14; i++) { await page.keyboard.press('KeyE'); await sim(40); }
  await sim(60); out.push(['붓·까치 뒤', await info()]);
  await page.mouse.click(640, 360); await sim(8); out.push(['좌클릭', (await info()).st]);
  await h.shot('live_attack');
  await sim(60); await page.mouse.down({ button: 'right' }); await sim(45); await page.mouse.up({ button: 'right' }); await sim(6); out.push(['우클릭 모으기', (await info()).st]);
  await sim(80); await page.keyboard.press('Space'); await sim(5); out.push(['Space', (await info()).st]);
  await sim(60); await page.keyboard.press('Escape'); await sim(5); out.push(['Esc', (await info()).state]);
  await h.shot('live_pause');
  await page.getByText('돌아가기').click(); await sim(5); out.push(['돌아가기', (await info()).state]);
  await page.keyboard.press('KeyM'); await sim(5); out.push(['M', (await info()).state]); await page.keyboard.press('KeyM'); await sim(5);
  // 저장하고 제목으로 → 이어 그리기
  await h.ev(() => { const G = window.__game.G; G.player.place(15, 172, 0); G.shrines.wake(G.shrines.get('first')); }); await sim(700);
  for (let i = 0; i < 10; i++) { await page.keyboard.press('KeyE'); await sim(40); }
  await page.keyboard.press('Escape'); await sim(5); await page.getByText('처음 화면으로').click(); await sim(30);
  out.push(['제목으로', (await info()).state, await h.ev(() => !!document.querySelector('.title-menu') && [...document.querySelectorAll('.title-menu .btn')].map((b) => b.textContent))]);
  await page.getByText('이어 그리기').click(); await sim(120);
  out.push(['이어 그리기', await info(), await h.ev(() => ({ arts: window.__game.G.prog.arts, shrines: window.__game.G.prog.shrines, flags: Object.keys(window.__game.G.prog.flags).filter((k) => !k.startsWith('h_')) }))]);
  await h.shot('live_continue');
  return out.map((o) => JSON.stringify(o));
};
