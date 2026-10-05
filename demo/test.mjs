import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../site/demo/index.html', import.meta.url), 'utf8');
const fixture = JSON.parse(await readFile(new URL('../contract/fixtures.json', import.meta.url), 'utf8'));
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[key]));

test('no executable JavaScript, API transport, secret fields or form submission', () => {
  assert.doesNotMatch(html, /<script\b|<form\b|<iframe\b|<object\b|<img\b|\bon\w+\s*=|<input[^>]+type=["'](?:password|text|email)["']/i);
  assert.match(html, /connect-src 'none'; form-action 'none'/);
  assert.match(html, /STATIC MOCK · NO REAL PAYMENT/);
  assert.match(html, /not a live transaction, request log or network test/);
});

test('four keyboard-accessible operation radios and sixteen scenario panels', () => {
  assert.equal((html.match(/name="operation"/g) || []).length, 4);
  assert.equal((html.match(/class="response-panel /g) || []).length, 16);
  for (const id of Object.keys(fixture.operations)) {
    assert.match(html, new RegExp(`id="op-${id}"`));
    assert.match(html, new RegExp(`for="op-${id}"`));
    assert.match(html, new RegExp(`scenario-${id}-unknown`));
  }
  assert.match(html, /:focus-visible \+ label/);
  assert.match(html, /<legend>Choose a synthetic response/);
});

test('all displayed JSON responses come directly from the shared fixture', () => {
  const panels = [...html.matchAll(/<pre data-fixture="([^"]+)"><code>([\s\S]*?)<\/code><\/pre>/g)];
  assert.equal(panels.length, 14); // unknown purchase is explicitly not applicable to two reads.
  for (const [, key, body] of panels) assert.deepEqual(JSON.parse(decode(body)), fixture.responses[key]);
  assert.match(html, /9007199254740993\.01/);
  assert.match(html, /SYNTHETIC_UNCONFIRMED_TX_HASH/);
});

test('trust, uncertainty and actual-test evidence are explicit', () => {
  assert.match(html, /PurchaseOutcomeUnknown, not safe rejection or validation/);
  assert.match(html, /The inspected backend stores submitted purchase credentials/);
  assert.match(html, /does not execute them and does not invent a dispatch counter/);
  assert.match(html, /not an official Telegram, Fragment or TON product/);
  assert.match(html, /Api-Key is only an optional TonConsole provider key/);
});

test('five labelled native gallery frames exist at 1920x1080', async () => {
  const storyboard = JSON.parse(await readFile(new URL('../publishing/media/storyboard.json', import.meta.url), 'utf8'));
  assert.equal(storyboard.frames.length, 5);
  for (const frame of storyboard.frames) {
    const svg = await readFile(new URL(`../publishing/media/${frame.file}.svg`, import.meta.url), 'utf8');
    assert.match(svg, /width="1920" height="1080"/);
    assert.match(svg, /RENDERED SYNTHETIC WALKTHROUGH — NOT LIVE/);
    assert.match(svg, /NO API CALLS · NO SECRET INPUT · NO REAL PAYMENT/);
  }
});
