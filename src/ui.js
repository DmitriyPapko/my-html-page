/* ==== Menu & toggles ==== */
const menu = document.getElementById('menu');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const btnFog = document.getElementById('btnFog');

globalThis.paused = true;
globalThis.muted = false;
globalThis.fogEnabled = true;

btnStart.onclick = async () => {
  menu.style.display = 'none';
  await globalThis.resetGame();
  globalThis.paused = false;
};
btnRestart.onclick = async () => {
  menu.style.display = 'none';
  await globalThis.resetGame();
  globalThis.paused = false;
};
btnMute.onclick = () => { globalThis.muted = !globalThis.muted; btnMute.textContent = globalThis.muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => { globalThis.paused = !globalThis.paused; menu.style.display = globalThis.paused ? 'flex' : 'none'; };
btnFog.onclick = () => { globalThis.fogEnabled = !globalThis.fogEnabled; btnFog.textContent = globalThis.fogEnabled ? 'No Fog' : 'Fog'; };

const endMenu = document.getElementById('endMenu');
const btnEndRestart = document.getElementById('btnEndRestart');
btnEndRestart.onclick = async () => {
  endMenu.style.display = 'none';
  await globalThis.resetGame();
  globalThis.paused = false;
};

globalThis.showEndMenu = (msg) => {
  globalThis.paused = true;
  document.getElementById('endMsg').textContent = msg;
  menu.style.display = 'none';
  endMenu.style.display = 'flex';
};
