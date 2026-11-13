import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptedSessionKey, encryptedBuyerProfile, encryptedSellerProfile, savedNodeIdentifier, readEncryptedProgress, canSubmitEncryptedPayment } from './encrypted-data-session.ts';

const profile = (identifier) => JSON.stringify({ identifier, fiberKey: 'a'.repeat(64), ckbKey: 'b'.repeat(64) });
const profiles = { getItem: key => key === encryptedBuyerProfile ? profile('buyer') : key === encryptedSellerProfile ? profile('seller') : null };
const progress = { version: 1, buyerId: 'buyer', sellerId: 'seller', generatedOffer: 'public offer', buyerOfferText: 'received offer', attemptedPaymentHash: `0x${'c'.repeat(64)}`, triedWithoutKey: true };
const session = (value) => ({ getItem: key => key === encryptedSessionKey ? JSON.stringify(value) : null });

test('restores public progress only for the same saved node identities', () => {
  assert.deepEqual(readEncryptedProgress(session(progress), profiles), progress);
  assert.equal(readEncryptedProgress(session({ ...progress, buyerId: 'different' }), profiles), null);
  assert.equal(readEncryptedProgress(session(progress), { getItem: () => null }), null);
  assert.equal(savedNodeIdentifier({ getItem: () => '{' }, encryptedBuyerProfile), null);
});

test('ignores corrupt caches and never propagates cached decryption secrets', () => {
  assert.equal(readEncryptedProgress({ getItem: () => '{' }, profiles), null);
  assert.equal(readEncryptedProgress(session({ ...progress, attemptedPaymentHash: 'invalid' }), profiles), null);
  assert.equal(readEncryptedProgress(session({ ...progress, buyerKey: 'secret', decrypted: 'private' }), profiles).buyerKey, undefined);
});

test('recovers payments against the selected Multi-Hop profiles', () => {
  const buyerProfileKey = 'fiber-docs:wasm-quickstart-profile-v1';
  const sellerProfileKey = `${encryptedSellerProfile}:fresh:pair`;
  const selected = { ...progress, buyerProfileKey, sellerProfileKey };
  const storage = { getItem: key => key === buyerProfileKey ? profile('buyer') : key === sellerProfileKey ? profile('seller') : null };
  assert.deepEqual(readEncryptedProgress(session(selected), storage), selected);
  assert.equal(readEncryptedProgress(session(selected), profiles), null);
  assert.equal(readEncryptedProgress(session({ ...selected, buyerProfileKey: sellerProfileKey }), storage), null);
});

test('requires the lock experiment and blocks duplicate payments after reload or settlement', () => {
  const state = { routeReady: true, hasOffer: true, triedWithoutKey: true, attemptedPaymentHash: '', paymentStatus: 'Ready to pay', busy: false };
  assert.equal(canSubmitEncryptedPayment(state), true);
  for (const change of [{ routeReady: false }, { hasOffer: false }, { triedWithoutKey: false }, { busy: true }]) {
    assert.equal(canSubmitEncryptedPayment({ ...state, ...change }), false);
  }
  for (const paymentStatus of ['Check status', 'Sending', 'Inflight', 'Success']) {
    assert.equal(canSubmitEncryptedPayment({ ...state, attemptedPaymentHash: progress.attemptedPaymentHash, paymentStatus }), false);
  }
  assert.equal(canSubmitEncryptedPayment({ ...state, attemptedPaymentHash: progress.attemptedPaymentHash, paymentStatus: 'Failed' }), true);
});

test('node status distinguishes startup, runtime errors, and disconnected saved channels', async () => {
  const { encryptedNodeStatus } = await import('./encrypted-data-session.ts');
  const idle = { nodeState: 'idle', starting: false, hasNode: false, hasChannel: false, connected: false, error: false };
  assert.deepEqual(encryptedNodeStatus(idle), { tone: 'idle', label: 'Not started' });
  assert.equal(encryptedNodeStatus({ ...idle, starting: true }).tone, 'waiting');
  const running = { ...idle, nodeState: 'running', hasNode: true };
  assert.equal(encryptedNodeStatus(running).tone, 'running');
  assert.equal(encryptedNodeStatus({ ...running, error: true }).tone, 'running');
  assert.equal(encryptedNodeStatus({ ...running, nodeState: 'error' }).tone, 'error');
  assert.equal(encryptedNodeStatus({ ...running, nodeState: 'stopped' }).tone, 'idle');
  assert.deepEqual(encryptedNodeStatus({ ...running, hasChannel: true }), { tone: 'waiting', label: 'Disconnected' });
  assert.equal(encryptedNodeStatus({ ...running, hasChannel: true, connected: true }).tone, 'running');
});


test('retains completed milestones separately from live payment readiness', () => {
  const restored = readEncryptedProgress(session({ ...progress, completedSteps: ['setup', 'transfer', 'pay', 'decrypt', 'unknown', 42], buyerKey: 'secret' }), profiles);
  assert.deepEqual(restored.completedSteps, ['setup', 'transfer', 'pay', 'decrypt']);
  assert.equal(restored.buyerKey, undefined);
  assert.equal(canSubmitEncryptedPayment({ routeReady: false, hasOffer: false, triedWithoutKey: true, attemptedPaymentHash: restored.attemptedPaymentHash, paymentStatus: 'Check status', busy: false }), false);
  assert.equal(readEncryptedProgress(session({ ...progress, completedSteps: ['setup'], buyerId: 'different' }), profiles), null);
});
