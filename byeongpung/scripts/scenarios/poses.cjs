// 자세 점검: 한 화면에 한 자세씩, 앞·옆에서 찍는다.  인자: kind
module.exports = async (page, h, args) => {
  const kind = args[0] || 'hero';
  await h.ev((kind) => { const g = window.__game; g.tp([0, 236], 0); g.poseRig(kind); }, kind);
  const D = Math.PI / 180;
  const L1 = { tilt: 20 * D, a0: 115 * D, a1: -75 * D, tw: 0.1, ts: 0.2, dur: 0.4, lead: 'L' };
  const L4 = { tilt: 90 * D, a0: 125 * D, a1: -35 * D, tw: 0.2, ts: 0.32, dur: 0.7, lead: 'R' };
  const TH = { tw: 0.15, ts: 0.25, dur: 0.5 };
  const list = [
    ['stand', ['stand', 0]], ['guard', ['guard', 0]], ['run0', ['run', 0.6, 1]], ['run1', ['run', 2.2, 1]],
    ['L1a', ['swing', L1, 0.09]], ['L1b', ['swing', L1, 0.15]], ['L1c', ['swing', L1, 0.22]],
    ['L4a', ['swing', L4, 0.19]], ['L4b', ['swing', L4, 0.27]], ['L4c', ['swing', L4, 0.36]],
    ['th0', ['thrust', TH, 0.14]], ['th1', ['thrust', TH, 0.26]], ['hurt', ['hurt', 0.1]], ['tuck', ['tuck']], ['drink', ['drink', 0.5]],
  ];
  const only = args[1] ? args[1].split(',') : null;
  for (const [name, call] of list) {
    if (only && !only.includes(name)) continue;
    for (const [vn, yo] of [['f', 0.5], ['s', 2.2]]) {
      await h.ev(([call, yo]) => { const g = window.__game; g.pose(...call); g.view(Math.PI + yo, 0.22, 3.6); g.sim(1); }, [call, yo]);
      await h.shot(`pose_${kind}_${name}_${vn}`);
    }
  }
};
