/* ==== Menu & toggles ==== */
const menu = document.getElementById('menu');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const btnFog = document.getElementById('btnFog');
const endMenu = document.getElementById('endMenu');
const endMessage = document.getElementById('endMessage');
const btnEndMenu = document.getElementById('btnEndMenu');

globalThis.paused = true;
globalThis.muted = false;
globalThis.fogEnabled = true;

btnStart.onclick = async () => {
  menu.style.display = 'none';
  endMenu.style.display = 'none';
  await globalThis.resetGame();
  document.getElementById('ui').style.display = 'block';
  globalThis.paused = false;
};

btnRestart.onclick = async () => {
  menu.style.display = 'none';
  endMenu.style.display = 'none';
  await globalThis.resetGame();
  document.getElementById('ui').style.display = 'block';
  globalThis.paused = false;
};
btnMute.onclick = () => { globalThis.muted = !globalThis.muted; btnMute.textContent = globalThis.muted ? 'Звук: выкл' : 'Звук: вкл'; };
btnPause.onclick = () => { globalThis.paused = !globalThis.paused; menu.style.display = globalThis.paused ? 'flex' : 'none'; };
btnFog.onclick = () => { globalThis.fogEnabled = !globalThis.fogEnabled; btnFog.textContent = globalThis.fogEnabled ? 'No Fog' : 'Fog'; };

function showEndMenu(victory) {
  endMessage.textContent = victory ? 'Победа' : 'Вы проиграли';
  endMenu.style.display = 'flex';
}

btnEndMenu.onclick = () => { endMenu.style.display = 'none'; menu.style.display = 'flex'; };

globalThis.showEndMenu = showEndMenu;
