/* ==== Menu & toggles ==== */
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

globalThis.paused = true;
globalThis.muted = false;
globalThis.fogEnabled = true;

btnStart.onclick = async () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'none';
  await globalThis.resetGame();
  globalThis.paused = false;
};
btnRestart.onclick = async () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'none';
  await globalThis.resetGame();
  globalThis.paused = false;
};
btnMute.onclick = () => { globalThis.muted = !globalThis.muted; btnMute.textContent = globalThis.muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => {
  globalThis.paused = !globalThis.paused;
  if (globalThis.paused) document.getElementById('heroSelect').style.display = 'none';
  menu.style.display = globalThis.paused ? 'flex' : 'none';
};
btnFog.onclick = () => { globalThis.fogEnabled = !globalThis.fogEnabled; btnFog.textContent = globalThis.fogEnabled ? 'No Fog' : 'Fog'; };

btnResultRestart.onclick = () => {
  resultMenu.style.display = 'none';
  menu.style.display = 'flex';
  globalThis.paused = true;
};

globalThis.showResultMenu = (msg) => {
  globalThis.paused = true;
  if (globalThis.setHeroUI) globalThis.setHeroUI(null);
  resultText.textContent = msg;
  menu.style.display = 'none';
  document.getElementById('heroSelect').style.display = 'none';
  resultMenu.style.display = 'flex';
};
