// 진입점.
import './ui/styles.css';
import { boot } from './core/game.js';

boot().catch((e) => { console.error(e); });
