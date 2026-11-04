const KEY = 'clearhaven947.settings';
const DEF = { lang: 'ko', sens: 1, quality: 'medium', volume: 0.8, fps: false, fov: 72, bob: true, invertY: false, sparkle: true, autoQuality: true, volMusic: 1, volSfx: 1, volAmb: 1 };
export function loadSettings() {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; }
}
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
