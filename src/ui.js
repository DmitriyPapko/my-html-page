/* ==== Menu & toggles ==== */
import state from './state.js';

const menu = document.getElementById('menu');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const btnFog = document.getElementById('btnFog');
const resultMenu = document.getElementById('resultMenu');
const resultText = document.getElementById('resultText');
const btnResultRestart = document.getElementById('btnResultRestart');
const idleWorkersEl = document.getElementById('idleWorkers');
globalThis.idleWorkersEl = idleWorkersEl;

state.paused = true;
state.muted = false;
state.fogEnabled = true;

btnStart.onclick = async () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'none';
  await globalThis.resetGame();
  state.paused = false;
};
btnRestart.onclick = async () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'none';
  await globalThis.resetGame();
  state.paused = false;
};
btnMute.onclick = () => { state.muted = !state.muted; btnMute.textContent = state.muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => {
  state.paused = !state.paused;
  if (state.paused) document.getElementById('heroSelect').style.display = 'none';
  menu.style.display = state.paused ? 'flex' : 'none';
};
btnFog.onclick = () => { state.fogEnabled = !state.fogEnabled; btnFog.textContent = state.fogEnabled ? 'No Fog' : 'Fog'; };

btnResultRestart.onclick = () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'flex';
  state.paused = true;
};

globalThis.showResultMenu = (msg) => {
  state.paused = true;
  if (globalThis.setHeroUI) globalThis.setHeroUI(null);
  resultText.textContent = msg;
  menu.style.display = 'none';
  document.getElementById('heroSelect').style.display = 'none';
  resultMenu.style.display = 'flex';
};
