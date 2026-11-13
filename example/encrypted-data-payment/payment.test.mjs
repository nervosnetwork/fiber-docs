import assert from 'node:assert/strict';
import test from 'node:test';
import { payForOffer, validateOffer } from './lib/payment.ts';

const hash = `0x${'a'.repeat(64)}`;
const offer = { invoice: 'fibt-example', paymentHash: hash, lastHop: {} };
function fixture(status = 'Success') {
  const calls = [];
  const result = { status, payment_hash: hash, fee: '0x0' };
  const node = {
    parseInvoice: async () => ({ invoice: { currency: 'Fibt', amount: '0x5f5e100', data: { payment_hash: hash } } }),
    sendPayment: async () => { calls.push('send'); return result; },
    getPayment: async () => { calls.push('check'); return result; },
    waitForPayment: async () => result,
  };
  return { node, calls, result };
}
test('mismatched currency, amount, or payment hash blocks submission', async () => {
  for (const change of [{ currency: 'Fibb' }, { amount: '0x1' }, { data: { payment_hash: '0xother' } }]) {
    const { node, calls } = fixture();
    const original = node.parseInvoice;
    node.parseInvoice = async () => ({ invoice: { ...(await original()).invoice, ...change } });
    await assert.rejects(validateOffer(node, offer), /does not match/);
    assert.deepEqual(calls, []);
  }
});
test('attempt is recorded before submission and failed storage prevents spending', async () => {
  const { node, calls } = fixture();
  await payForOffer(node, offer, '', () => calls.push('record'));
  assert.deepEqual(calls, ['record', 'send']);
  const second = fixture();
  await assert.rejects(payForOffer(second.node, offer, '', () => { throw new Error('Storage failed'); }), /Storage failed/);
  assert.deepEqual(second.calls, []);
});
test('restored successful and pending payments are checked without resubmission', async () => {
  for (const status of ['Success', 'Inflight']) {
    const { node, calls } = fixture(status);
    await payForOffer(node, offer, hash, () => calls.push('record'), true);
    assert.deepEqual(calls, ['check']);
  }
});
test('retry requires both explicit intent and a verified failure', async () => {
  const first = fixture('Failed');
  await payForOffer(first.node, offer, hash, () => first.calls.push('record'));
  assert.deepEqual(first.calls, ['check']);
  const retry = fixture('Failed');
  await payForOffer(retry.node, offer, hash, () => retry.calls.push('record'), true);
  assert.deepEqual(retry.calls, ['check', 'record', 'send']);
  await assert.rejects(payForOffer(retry.node, offer, '0xwrong', () => {}), /previous payment/);
});
