// 게임 흐름: 제목 ↔ 놀이 ↔ 멈춤/메뉴, 새로 그리기·이어 그리기, 설정 적용.
import { G } from './g.js';
import { Save } from '../systems/save.js';
import { CFG } from './config.js';

export function createFlow() {
  G.settings = Object.assign({ master: 0.8, music: 0.7, sfx: 1, sens: 1, invert: false, quality: 'medium', difficulty: 'normal' }, Save.settings());
  const F = {
    applySettings() {
      const s = G.settings;
      G.audio.vol.master = s.master; G.audio.vol.music = s.music; G.audio.vol.sfx = s.sfx;
      if (G.audio.ready) { G.audio.setVol('master', s.master); G.audio.setVol('music', s.music); G.audio.setVol('sfx', s.sfx); }
      G.cam.sens = s.sens; G.cam.invertY = s.invert; G.difficulty = s.difficulty;
      if (G.gfx.qName !== s.quality) F.setQuality(s.quality);
    },
    saveSettings() { G.settings.difficulty = G.difficulty; Save.writeSettings(G.settings); },
    setQuality(q) { G.gfx.setQuality(q); G.emit('quality', G.gfx.q); },
    // 메뉴(연적·가게): 세계를 멈추고 커서를 돌려준다
    menuOpen() { G.state = 'menu'; G.input.exitLock(); G.input.releaseAll(); },
    menuClose() { G.state = 'play'; G.input.clear(); G.input.requestLock(); },
    pause(panel = 'pause') {
      if (G.state !== 'play') return;
      G.state = 'pause'; G.input.exitLock(); G.input.releaseAll(); G.ui.screens.panel(panel); G.audio.play('page');
    },
    resume() { if (G.state !== 'pause') return; G.ui.screens.closePanel(); G.state = 'play'; G.input.clear(); G.input.requestLock(); },
    toTitle() {
      G.ui.screens.hideAll(); G.ui.dialog.active && G.ui.dialog.close();
      G.story.reset(); G.state = 'title'; G.ui.screens.title(true); G.input.exitLock(); G.audio.setMood('margin');
      G.fx.fade = 1; G.fx.fadeIn(0.8);
    },
    newGame() { Save.clear(); G.ui.screens.hideAll(); G.input.requestLock(); G.story.start(null); },
    continueGame() { G.ui.screens.hideAll(); G.input.requestLock(); G.story.start(Save.read()); },
  };
  // Esc: 놀이 중이면 멈춤, 멈춤이면 돌아가기. 포인터 잠금이 풀리면(브라우저의 Esc) 멈춤.
  G.on('key', (code) => {
    if (code === 'Escape') {
      if (G.state === 'play' && (G.input.free || !G.input.locked)) F.pause();
      else if (G.state === 'pause') { if (G.ui.screens.panelName === 'pause' || G.ui.screens.panelName === 'map') F.resume(); else G.ui.screens.back(); }
      else if (G.state === 'title' && G.ui.screens.panelName) G.ui.screens.closePanel();
    } else if (code === 'KeyM') {
      if (G.state === 'play' && !G.enemies.fighting) F.pause('map'); else if (G.state === 'pause' && G.ui.screens.panelName === 'map') F.resume();
    }
  });
  G.on('lockchange', (locked) => {
    if (!locked && G.state === 'play' && !G.input.free && !G.debug) F.pause();
    if (G.input.free && !F.freeShown) { F.freeShown = true; G.ui.screens.showNotice(); }
  });
  G.on('blur', () => { if (G.state === 'play' && !G.debug) F.pause(); });
  G.flow = F;
  return F;
}
export { CFG };
