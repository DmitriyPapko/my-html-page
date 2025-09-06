import assert from 'assert';
import { JSDOM } from 'jsdom';
import { initCommandCard } from '../src/ui/components/CommandCard.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;

let called = 0;
global.tryCast = () => { called++; };
initCommandCard();
const container = document.getElementById('commandcard');
assert.ok(container);
assert.strictEqual(container.children.length, 9);
container.children[0].click();
assert.strictEqual(called, 1);

console.log('Command card tests passed.');
