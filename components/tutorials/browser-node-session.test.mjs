import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrowserNodeSession } from './browser-node-session.ts';
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
// Models the Web Locks ownership contract, including release when the callback finishes.
function locks() {
  const held = new Set();
  return { async request(name, options, callback) {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { return await callback({ name }); } finally { held.delete(name); }
  } };
}
const node = () => ({ isRunning: true, async stop() { this.isRunning = false; } });
test('only one tab starts a given profile; different profiles can run together', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const b = createBrowserNodeSession(manager); const c = createBrowserNodeSession(manager);
  await a.start('shared', async (track) => track(node()));
  let started = false;
  await assert.rejects(b.start('shared', async () => { started = true; }), /another tutorial tab/);
  assert.equal(started, false);
  await c.start('other', async (track) => track(node()));
  await a.stop();
  await b.start('shared', async (track) => track(node()));
  await b.stop(); await c.stop();
});
test('leaving during startup retains ownership until startup and shutdown finish', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const b = createBrowserNodeSession(manager);
  const started = deferred(); const finish = deferred(); const stopped = deferred();
  const opening = a.start('shared', async (track) => { track({ isRunning: true, stop: () => stopped.promise }); started.resolve(); await finish.promise; });
  await started.promise;
  const closing = a.stop();
  await assert.rejects(b.start('shared', async () => {}), /another tutorial tab/);
  finish.resolve(); await opening;
  await assert.rejects(b.start('shared', async () => {}), /another tutorial tab/);
  stopped.resolve(); await closing;
  await b.start('shared', async (track) => track(node())); await b.stop();
});
test('startup failure releases the lease after stopping the failed node', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const b = createBrowserNodeSession(manager);
  let stopped = false;
  await assert.rejects(a.start('shared', async (track) => { track({ isRunning: false, async stop() { stopped = true; } }); throw new Error('startup failed'); }), /startup failed/);
  assert.equal(stopped, true);
  await b.start('shared', async (track) => track(node())); await b.stop();
});
test('repeated clicks share the same in-flight startup', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const gate = deferred(); let count = 0;
  const first = a.start('shared', async (track) => { count++; track(node()); await gate.promise; });
  const second = a.start('shared', async () => { count++; });
  gate.resolve(); await Promise.all([first, second]); assert.equal(count, 1); await a.stop();
});
test('unsupported locking fails before starting a node', async () => {
  let started = false;
  await assert.rejects(createBrowserNodeSession(null).start('shared', async () => { started = true; }), /Web Locks/);
  assert.equal(started, false);
});

test('failed shutdown never hands a still-running node to another tab', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const b = createBrowserNodeSession(manager);
  await a.start('shared', async (track) => track({ isRunning: true, async stop() { throw new Error('shutdown failed'); } }));
  await assert.rejects(a.stop(), /shutdown failed/);
  await assert.rejects(b.start('shared', async () => {}), /another tutorial tab/);
});

test('leaving before lock acquisition prevents the startup callback', async () => {
  const manager = locks(); const a = createBrowserNodeSession(manager); const b = createBrowserNodeSession(manager);
  let started = false;
  const opening = a.start('shared', async () => { started = true; });
  await a.stop(); await opening;
  assert.equal(started, false);
  await b.start('shared', async (track) => track(node())); await b.stop();
});
