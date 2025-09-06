export function initInput(cvs, screenToWorld) {
  const input = { x: 0, y: 0, wx: 0, wy: 0, keys: {}, buildMode: null, lastClickT: 0, lastClickType: null, lDown: false, rectStartX: 0, rectStartY: 0, rectStartWX: 0, rectStartWY: 0, rectSelecting: false };

  cvs.addEventListener('mousemove', e => {
    input.x = e.offsetX;
    input.y = e.offsetY;
    const w = screenToWorld(input.x, input.y);
    input.wx = w.x;
    input.wy = w.y;
  });

  window.addEventListener('keydown', e => {
    input.keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener('keyup', e => {
    input.keys[e.key.toLowerCase()] = false;
  });

  return input;
}
