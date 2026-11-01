import '@fontsource/nanum-pen-script';
import '@fontsource/gaegu/400.css';
import './ui/styles.css';
import { startGame } from './core/game.js';

startGame().catch((e) => {
  console.error(e);
  const el = document.getElementById('ui');
  if (el) el.insertAdjacentHTML('beforeend', `<div class="fatal">${String((e && e.message) || e)}</div>`);
});
