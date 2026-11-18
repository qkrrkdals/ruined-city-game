// 밸런스·조작감 상수. 숫자를 만지려면 여기부터.
export const CFG = {
  player: {
    radius: 0.42, run: 6.3, sprint: 9.0, lockSpeed: 5.4, chargeSpeed: 2.4, healSpeed: 2.6,
    accel: 70, decel: 60, turn: 16,
    hp: 100, atk: 10, inkMax: 3,
    dodge: { dur: 0.44, dist: 5.4, iStart: 0.0, iEnd: 0.34, perfect: 0.22, cancel: 0.3, charges: 2, recharge: 0.95 },
    hurt: { stun: 0.36, inv: 0.75, down: 0.95 },
    heal: { dur: 0.95, at: 0.5, frac: 0.45, charges: 3 },
    perfect: { slow: 0.22, dur: 0.75, ink: 0.5, boost: 2.2, boostDur: 2.6 },
    ink: { light: 0.085, heavy: 0.17, kill: 0.12, finisher: 0.5 },
    buffer: 0.28,                // 선입력 허용 시간
  },
  cam: { dist: 6.4, minDist: 1.6, height: 1.55, sens: 0.0023, pitchMin: -0.35, pitchMax: 1.05, fov: 58, lockRange: 24 },
  combat: {
    tokens: 2,                   // 동시에 공격을 시작할 수 있는 적 수
    finisherRange: 4.6,
    hitstop: { light: 0.045, heavy: 0.085, big: 0.13, finisher: 0.16, hurt: 0.07 },
  },
  upgrade: { base: 60, step: 34, hp: 15, atk: 0.085, inkGain: 0.12 },
  weapon: [1, 1.16, 1.33, 1.5],  // 붓 손질 단계별 배율
  difficulty: { story: { taken: 0.6, dealt: 1.25 }, normal: { taken: 1, dealt: 1 } },
  spawn: { wake: 78, sleep: 115 },
};
