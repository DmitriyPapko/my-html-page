import { WC } from '../themeWarcraft.js';

let el;

export function initTooltip() {
  el = document.getElementById('wctooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'wctooltip';
    document.body.appendChild(el);
  }
  el.style.position = 'fixed';
  el.style.background = WC.colors.tooltipBg;
  el.style.border = `1px solid ${WC.colors.tooltipBorder}`;
  el.style.padding = '4px 6px';
  el.style.borderRadius = '4px';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  el.style.display = 'none';
  el.style.pointerEvents = 'none';
  el.style.whiteSpace = 'pre-line';
  el.style.fontFamily = 'sans-serif';
  el.style.fontSize = '12px';
}

export function showTooltip(x, y, html) {
  if (!el) initTooltip();
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML = html;
  el.style.display = 'block';
}

export function hideTooltip() {
  if (el) el.style.display = 'none';
}
