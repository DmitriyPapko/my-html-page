import test from 'node:test';
import assert from 'assert';
import { JSDOM } from 'jsdom';
import { initCommandCard } from '../src/ui/components/CommandCard.js';

test('command card initializes with nine buttons', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.document = dom.window.document;
  initCommandCard({});
  const container = document.getElementById('commandcard');
  assert.ok(container);
  assert.strictEqual(container.querySelectorAll('button').length, 9);
  delete global.document;
});
