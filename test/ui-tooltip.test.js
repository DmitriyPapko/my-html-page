import test from 'node:test';
import assert from 'assert';
import { JSDOM } from 'jsdom';
import { initTooltip, showTooltip, hideTooltip } from '../src/ui/components/Tooltip.js';

test('tooltip shows and hides content', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;
  initTooltip();
  const el = document.getElementById('wctooltip');
  assert.ok(el);
  showTooltip(10, 20, 'hi');
  assert.strictEqual(el.style.display, 'block');
  hideTooltip();
  assert.strictEqual(el.style.display, 'none');
  delete global.document;
  delete global.window;
});
