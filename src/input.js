import { screenToWorld, world, cvs, DPR } from './camera.js';
import state from './state.js';
import { dist2 } from './utils.js';
import { ItemDrop } from './entities.js';

export function setupInput(deps) {
  const { players, neutral, riceNodes, waterNodes, placeGhost, applyItem, drops, renderInventory, tryCast, resumeWorkers, playSfx } = deps;
  const buildTip = document.getElementById('buildTip');
  const input = { x: 0, y: 0, wx: 0, wy: 0, keys: {}, buildMode: null, lastClickT: 0, lastClickType: null, lDown: false, rectStartX: 0, rectStartY: 0, rectStartWX: 0, rectStartWY: 0, rectSelecting: false };

  cvs.addEventListener('mousemove', e => {
    input.x = e.offsetX; input.y = e.offsetY; const w = screenToWorld(input.x, input.y); input.wx = w.x; input.wy = w.y;
    if (input.lDown && !input.rectSelecting) {
      if (Math.abs(e.offsetX - input.rectStartX) > 4 || Math.abs(e.offsetY - input.rectStartY) > 4) input.rectSelecting = true;
    }
  });
  cvs.addEventListener('contextmenu', e => { e.preventDefault(); if (input.buildMode) { input.buildMode = null; buildTip.style.display = 'none'; } });
  cvs.addEventListener('dragover', e => e.preventDefault());
  cvs.addEventListener('drop', e => {
    e.preventDefault();
    const idx = e.dataTransfer.getData('text/plain');
    const h = players[0].hero;
    if (!h || !h.inventory[idx]) return;
    const it = h.inventory[idx];
    if (!it.startsWith('scroll_')) applyItem(h, it, true);
    h.inventory.splice(idx, 1);
    const w = screenToWorld(e.offsetX, e.offsetY);
    drops.push(new ItemDrop(w.x, w.y, it));
    renderInventory(h);
  });
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    input.keys[k] = true;
    if (k === 'f') state.fogEnabled = !state.fogEnabled;
    if (k === '1') tryCast(1);
    if (k === '2') tryCast(2);
    if (k === '3') tryCast(3);
    const idx = ['q','e','r','g','t','y'].indexOf(k);
    if (idx >= 0) {
      const h = players[0].hero;
      if (h && h.inventory[idx]) {
        const it = h.inventory[idx];
        if (it.startsWith('scroll_')) {
          applyItem(h, it);
          h.inventory.splice(idx, 1);
          renderInventory(h);
        } else { playSfx('denied'); }
      } else { playSfx('denied'); }
    }
    if (k === 'r') { resumeWorkers(players[0]); }
  });
  window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });

  function entityAt(wx, wy) {
    function hit(arr, r) { let best = null, bD = 1e9; for (const e of arr) { if (e.dead) continue; const d = dist2(wx, wy, e.x, e.y); const rr = r(e); if (d <= rr * rr && d < bD) { bD = d; best = e; } } return best; }
    const a = [...players[0].units, ...players[1].units, ...players[2].units, ...neutral.units];
    const b = [...players[0].structures, ...players[1].structures, ...players[2].structures];
    const c = [...riceNodes, ...waterNodes];
    return hit(a, e => e.radius + 10) || hit(b, e => e.radius + 14) || hit(c, e => e.radius) || null;
  }
  function unselectAll() { for (const p of [players[0], players[1], players[2]]) { for (const u of p.units) u.selected = false; for (const s of p.structures) s.selected = false; } for (const n of neutral.units) n.selected = false; }
  function selectSameTypeOnScreen(type) { const x1 = world.camX, y1 = world.camY, x2 = world.camX + cvs.width / DPR / world.zoom, y2 = world.camY + cvs.height / DPR / world.zoom; for (const u of players[0].units) { if (u.dead) continue; if (u.type === type) { if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) u.selected = true; } } }

  cvs.addEventListener('mousedown', e => {
    if (e.button === 0) {
      input.lDown = true;
      input.rectStartX = e.offsetX;
      input.rectStartY = e.offsetY;
      input.rectStartWX = input.wx;
      input.rectStartWY = input.wy;
    } else if (e.button === 2) {
      if (input.buildMode) { input.buildMode = null; buildTip.style.display = 'none'; }
      const sel = players[0].units.filter(u => u.selected);
      if (sel.length) {
        sel.forEach((u, i) => u.setDest(input.wx + i * 12, input.wy));
      }
    }
  });
  cvs.addEventListener('mouseup', e => {
    if (e.button === 0) {
      input.lDown = false;
      if (input.rectSelecting) {
        const x1 = Math.min(input.rectStartWX, input.wx), y1 = Math.min(input.rectStartWY, input.wy);
        const x2 = Math.max(input.rectStartWX, input.wx), y2 = Math.max(input.rectStartWY, input.wy);
        unselectAll();
        for (const u of players[0].units) { if (u.dead) continue; if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) u.selected = true; }
        input.rectSelecting = false;
        return;
      }
      if (input.buildMode) {
        const ok = placeGhost(0, input.wx, input.wy, input.buildMode);
        if (ok) { input.buildMode = null; buildTip.style.display = 'none'; }
        return;
      }
      const hit = entityAt(input.wx, input.wy);
      const now = performance.now();
      if (hit && hit.owner === 0 && hit.type) {
        if (now - input.lastClickT < 300 && input.lastClickType === hit.type) { selectSameTypeOnScreen(hit.type); }
        else { unselectAll(); hit.selected = true; }
        input.lastClickType = hit.type; input.lastClickT = now;
      } else { unselectAll(); }
    }
  });

  return { input, entityAt, selectSameTypeOnScreen };
}
