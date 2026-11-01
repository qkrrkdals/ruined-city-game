// Gameplay tuning constants (balance lives here)
export const CFG = {
  walk: 3.2, run: 5.8, crouch: 1.7, carryMul: 0.85,
  gravity: 24, jump: 7.45,
  radius: 0.35, standTop: 1.45, crouchTop: 0.78, eyeStand: 1.64, eyeCrouch: 1.0,
  fov: 72,
  interactDist: 2.3,
  battery: { full: 180, pickup: 0.35, low: 0.15, respawn: 0.3 },
  noise: { run: 15, walk: 7, crouch: 2, land: 10, impact: 18, drop: 6 },
  remnant: { wander: 1.15, investigate: 1.9, chase: 4.4, catchDist: 1.15, lightSight: 25, darkStand: 7, darkCrouch: 3, loseTime: 4.5, notice: 1.0 },
};
