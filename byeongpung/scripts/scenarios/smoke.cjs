// 기본 점검: 몇 군데로 옮겨 가며 화면을 찍는다.  인자: 이름:노드|x,z:yaw:pitch:dist ...
module.exports = async (page, h, args) => {
  const specs = args.length ? args : ['margin:margin:3.14:0.25', 'first:first:3.14:0.3', 'village:village:3.14:0.35'];
  const out = [];
  for (const s of specs) {
    const [name, where, yaw, pitch, dist] = s.split(':');
    await h.ev(([where, yaw, pitch, dist]) => {
      const g = window.__game; const w = where.includes(',') ? where.split(',').map(Number) : where;
      g.tp(w, yaw === undefined || yaw === '' ? undefined : +yaw, pitch === undefined || pitch === '' ? undefined : +pitch, dist ? +dist : undefined); g.sim(30);
    }, [where, yaw, pitch, dist]);
    const ms = await h.shot(name);
    out.push({ name, ms, ...(await h.ev(() => window.__game.info())) });
  }
  return out;
};
