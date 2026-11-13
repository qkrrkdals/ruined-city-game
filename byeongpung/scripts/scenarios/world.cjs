// 월드 둘러보기: 제목 화면을 찍고, 바로 시작해 여러 곳을 돌아다니며 찍는다.
// 인자: 이름:노드|x,z:yaw:pitch:dist ...  (없으면 기본 목록).  환경 변수 FLAGS=a,b 로 진행 깃발을 켠다.
module.exports = async (page, h, args) => {
  const out = [];
  await h.ev(() => window.__game.sim(20));
  out.push({ name: 'title', ms: await h.shot('w_title') });
  const flags = (process.env.FLAGS || '').split(',').filter(Boolean);
  await h.ev((flags) => { const g = window.__game; const f = {}; flags.forEach((k) => (f[k] = true)); g.start({ flags: f, arts: ['dot'] }); g.sim(5); }, flags);
  const specs = args.length ? args : ['margin:0,240:3.14:0.28', 'first:first:3.14:0.3', 'p2:p2:2.4:0.3', 'village:0,10:3.14:0.34:9', 'gate:0,-28:3.14:0.25:8', 'bamboo:b3:1.9:0.3', 'marsh:m3:1.2:0.3', 'north:n3:3.14:0.3', 'arena:0,-215:3.14:0.3:9'];
  for (const s of specs) {
    const [name, where, yaw, pitch, dist] = s.split(':');
    await h.ev(([where, yaw, pitch, dist]) => {
      const g = window.__game; const w = where.includes(',') ? where.split(',').map(Number) : where;
      g.tp(w, yaw === undefined || yaw === '' ? undefined : +yaw, pitch === undefined || pitch === '' ? undefined : +pitch, dist ? +dist : undefined); g.sim(40);
    }, [where, yaw, pitch, dist]);
    const ms = await h.shot('w_' + name);
    out.push({ name, ms, ...(await h.ev(() => window.__game.info())) });
  }
  return out.map((o) => `${o.name} ${o.ms}ms st=${o.st || ''} en=${o.enemies ?? ''}`);
};
