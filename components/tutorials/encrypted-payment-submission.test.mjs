import assert from 'node:assert/strict';
import test from 'node:test';
import { assertEncryptedInvoiceNotExpired, EncryptedPaymentRejectedError, submitEncryptedPayment } from './encrypted-payment-submission.ts';

const hash = `0x${'a'.repeat(64)}`;
const params = { invoice: 'fibt-example' };
const rpcError = message => new Error(`WASM RPC error: ErrorObject { code: ServerError(-32000), message: ${JSON.stringify(message)}, data: None }`);
const missing = (paymentHash = hash) => rpcError(`InvalidParameter: Payment session not found: ${paymentHash}`);

test('expiry uses invoice milliseconds and expiry seconds, including the exact boundary', () => {
  const invoice = { data: { timestamp: '0x3e8', attrs: [{ expiry_time: '0x2' }] } };
  assert.doesNotThrow(() => assertEncryptedInvoiceNotExpired(invoice, 2999));
  assert.throws(() => assertEncryptedInvoiceNotExpired(invoice, 3000), /expired/);
  assert.doesNotThrow(() => assertEncryptedInvoiceNotExpired({ data: { timestamp: '0x0', attrs: [] } }));
});

test('a definitive pre-submission rejection requires the matching missing record', async () => {
  for (const error of [new Error('invoice is expired'), rpcError('invoice does not support hop hints'),
    rpcError('InvalidParameter: Failed to validate payment request: "invoice is expired"')]) {
    const calls = [];
    const node = {
      sendPayment: async () => { calls.push('send'); throw error; },
      getPayment: async ({ payment_hash }) => { calls.push(payment_hash); throw missing(); },
    };
    await assert.rejects(submitEncryptedPayment(node, hash, params), EncryptedPaymentRejectedError);
    assert.deepEqual(calls, ['send', hash]);
  }
});

test('a rejection preserves any existing payment result instead of resetting it', async () => {
  for (const status of ['Inflight', 'Success', 'Failed']) {
    const result = { status, payment_hash: hash };
    const node = { sendPayment: async () => { throw rpcError('invoice is expired'); }, getPayment: async () => result };
    assert.equal(await submitEncryptedPayment(node, hash, params), result);
  }
});

test('timeouts, route errors and worker failures remain uncertain', async () => {
  for (const message of ['RPC request timed out', 'Failed to build route', 'Fiber worker failed', 'Network timeout: invoice is expired']) {
    const error = new Error(message);
    const node = { sendPayment: async () => { throw error; }, getPayment: () => assert.fail('Uncertain errors must not clear an attempt') };
    await assert.rejects(submitEncryptedPayment(node, hash, params), failure => failure === error);
  }
});

test('an unavailable status read or a different missing hash cannot prove rejection', async () => {
  for (const checkError of [new Error('Node unavailable'), missing(`0x${'b'.repeat(64)}`)]) {
    const error = rpcError('invoice is expired');
    const node = { sendPayment: async () => { throw error; }, getPayment: async () => { throw checkError; } };
    await assert.rejects(submitEncryptedPayment(node, hash, params), failure => failure === error);
  }
});

test('an error after submission keeps the submitted attempt even if its message resembles rejection', async () => {
  const error = rpcError('invoice is expired');
  const node = {
    sendPayment: async () => ({ status: 'Inflight', payment_hash: hash }),
    waitForPayment: async () => { throw error; },
    getPayment: () => assert.fail('A submitted payment must not be reset'),
  };
  await assert.rejects(submitEncryptedPayment(node, hash, params), failure => failure === error);
});

test('successful submissions still wait for settlement when necessary', async () => {
  const result = { status: 'Success', payment_hash: hash };
  const node = {
    sendPayment: async () => ({ status: 'Inflight', payment_hash: hash }),
    waitForPayment: async paymentHash => { assert.equal(paymentHash, hash); return result; },
  };
  assert.equal(await submitEncryptedPayment(node, hash, params), result);
});
