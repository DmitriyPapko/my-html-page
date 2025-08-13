/* ==== Menu & toggles ==== */
import { paused, muted, fogEnabled, setPaused, setMuted, setFogEnabled, resetGame } from './main.js';

const menu = document.getElementById('menu');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const btnFog = document.getElementById('btnFog');

btnStart.onclick = () => { setPaused(false); menu.style.display = 'none'; };
btnRestart.onclick = () => { resetGame(); setPaused(false); menu.style.display = 'none'; };
btnMute.onclick = () => { setMuted(!muted); btnMute.textContent = muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => { setPaused(!paused); menu.style.display = paused ? 'flex' : 'none'; };
btnFog.onclick = () => { setFogEnabled(!fogEnabled); btnFog.textContent = fogEnabled ? 'No Fog' : 'Fog'; };
