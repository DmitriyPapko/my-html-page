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

btnStart.onclick = async () => { await globalThis.resetGame(); globalThis.paused = false; menu.style.display = 'none'; };
  btnRestart.onclick = async () => { await globalThis.resetGame(); globalThis.paused = false; menu.style.display = 'none'; };
btnMute.onclick = () => { globalThis.muted = !globalThis.muted; btnMute.textContent = globalThis.muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => { globalThis.paused = !globalThis.paused; menu.style.display = globalThis.paused ? 'flex' : 'none'; };
btnFog.onclick = () => { globalThis.fogEnabled = !globalThis.fogEnabled; btnFog.textContent = globalThis.fogEnabled ? 'No Fog' : 'Fog'; };
