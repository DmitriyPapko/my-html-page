/* ==== Menu & toggles ==== */
import state from './state.js';
import { initResourceBar, drawResourceBar } from './ui/components/ResourceBar.js';
import { initHeroPanel, drawHeroPanel } from './ui/components/HeroPanel.js';
import { initCommandCard, drawCommandCard } from './ui/components/CommandCard.js';
import { initUnitCard, drawUnitCard } from './ui/components/UnitCard.js';
import { initTooltip } from './ui/components/Tooltip.js';

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

/* ==== Warcraft style HUD ==== */
export function initUI(deps) {
  initResourceBar(deps);
  initHeroPanel(deps);
  initCommandCard(deps);
  initUnitCard(deps);
  initTooltip();
}

export function drawUI(dt) {
  drawResourceBar(dt);
  drawHeroPanel(dt);
  drawCommandCard(dt);
  drawUnitCard(dt);
}

// expose for convenience
globalThis.initUI = initUI;
globalThis.drawUI = drawUI;
