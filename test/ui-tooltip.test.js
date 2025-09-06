import assert from 'assert';
import { JSDOM } from 'jsdom';
import { initTooltip, showTooltip, hideTooltip } from '../src/ui/components/Tooltip.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;

initTooltip();
const el = document.getElementById('wctooltip');
assert.ok(el);
showTooltip(10, 20, 'Hello');
assert.strictEqual(el.style.display, 'block');
assert.strictEqual(el.innerHTML, 'Hello');
hideTooltip();
assert.strictEqual(el.style.display, 'none');

console.log('Tooltip tests passed.');
