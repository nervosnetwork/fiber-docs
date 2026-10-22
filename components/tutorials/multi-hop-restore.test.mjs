import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiquidityRestore } from './multi-hop-restore.ts';

function fixture(overrides = {}) {
  const data = new Map();
  const calls = [];
  let paymentStatus = 'Inflight';
  let invoiceStatus = 'Open';
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const dependencies = {
    key: 'return:C:A', storage, bottle: '0xbottle',
    readLiquidity: async () => [55100000000n, 30275500000n],
    payee: { newInvoice: async params => { calls.push(['invoice-on-A', params]); return { invoice_address: 'fibt_return', invoice: { data: { payment_hash: '0x1234' } } }; }, getInvoice: async () => ({ status: invoiceStatus }) },
    payer: { sendPayment: async params => { calls.push(['send-from-C', params]); assert.equal(JSON.parse(data.get('return:C:A')).phase, 'pending'); return { status: paymentStatus }; }, getPayment: async () => ({ status: paymentStatus }) },
    onChange: () => {}, ...overrides,
  };
  return { dependencies, calls, data, setStatuses: (payment, invoice) => { paymentStatus = payment; invoiceStatus = invoice; } };
}

test('creates A’s invoice and persists its identity before C sends through Bottle', async () => {
  const f = fixture(); const flow = createLiquidityRestore(f.dependencies);
  await flow.send('100');
  assert.equal(f.calls[0][0], 'invoice-on-A');
  assert.equal(f.calls[0][1].amount, '0x2540be400');
  assert.equal(f.calls[0][1].allow_trampoline_routing, true);
  assert.deepEqual(f.calls[1], ['send-from-C', { invoice: 'fibt_return', trampoline_hops: ['0xbottle'], max_fee_amount: '0x5f5e100' }]);
  assert.equal(flow.current().phase, 'pending');
});

test('checks fresh reverse-direction liquidity before creating an invoice', async () => {
  const f = fixture({ readLiquidity: async () => [55100000000n, 5000000000n] });
  const flow = createLiquidityRestore(f.dependencies);
  await assert.rejects(flow.send('100'), /50 CKB/);
  assert.equal(f.calls.length, 0);
});

test('prevents concurrent submissions and blocks resending a pending return', async () => {
  const f = fixture(); const flow = createLiquidityRestore(f.dependencies);
  await Promise.all([flow.send('100'), flow.send('100')]);
  await flow.send('100');
  assert.equal(f.calls.filter(([kind]) => kind === 'send-from-C').length, 1);
});

test('timeout preserves the payment hash across reload and only checks status', async () => {
  const f = fixture(); f.dependencies.payer.sendPayment = async () => { throw new Error('RPC timeout'); };
  const flow = createLiquidityRestore(f.dependencies); await flow.send('100');
  assert.equal(flow.current().phase, 'pending');
  const resumed = createLiquidityRestore(f.dependencies);
  await resumed.send('100');
  assert.equal(f.calls.length, 1);
  assert.equal(resumed.current().hash, '0x1234');
  f.setStatuses('Success', 'Paid'); await resumed.check();
  assert.equal(resumed.current().phase, 'success');
});

test('requires sender success and receiver Paid before confirming recovery', async () => {
  const f = fixture(); const flow = createLiquidityRestore(f.dependencies); await flow.send('100');
  f.setStatuses('Success', 'Open'); await flow.check(); assert.equal(flow.current().phase, 'pending');
  f.setStatuses('Success', 'Paid'); await flow.check(); assert.equal(flow.current().phase, 'success');
});

test('a confirmed failed return permits a new attempt', async () => {
  const f = fixture(); const flow = createLiquidityRestore(f.dependencies); await flow.send('100');
  f.setStatuses('Failed', 'Open'); await flow.check(); assert.equal(flow.current().phase, 'failed');
  await flow.send('100'); assert.equal(f.calls.length, 4);
});

test('storage failure prevents sending an untracked payment', async () => {
  const f = fixture({ storage: { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } } });
  await assert.rejects(createLiquidityRestore(f.dependencies).send('100'), /storage unavailable/);
  assert.equal(f.calls.filter(([kind]) => kind === 'send-from-C').length, 0);
});

test('a definitive route rejection allows a corrected return while timeouts remain pending', async () => {
  const f = fixture();
  f.dependencies.payer.sendPayment = async () => { throw new Error('WASM RPC error: Send payment error: Failed to build route, Insufficient balance'); };
  f.dependencies.payer.getPayment = async () => { throw new Error('not found'); };
  const flow = createLiquidityRestore(f.dependencies); await flow.send('100');
  assert.equal(flow.current().phase, 'failed');
});

test('rejects zero, negative and overly precise amounts without creating invoices', async () => {
  const f = fixture(); const flow = createLiquidityRestore(f.dependencies);
  for (const amount of ['0', '-1', '', '1e2', '0.000000001']) await assert.rejects(flow.send(amount), /positive/);
  assert.equal(f.calls.length, 0);
});

test('leaving during invoice preparation cancels the old controller before it can send', async () => {
  const f = fixture();
  const makeInvoice = f.dependencies.payee.newInvoice;
  let release; let started;
  const inInvoice = new Promise(resolve => { started = resolve; });
  f.dependencies.payee.newInvoice = async params => { started(); await new Promise(resolve => { release = resolve; }); return makeInvoice(params); };
  const first = createLiquidityRestore(f.dependencies);
  const preparing = first.send('100'); await inInvoice;
  first.dispose();
  f.dependencies.payee.newInvoice = makeInvoice;
  const replacement = createLiquidityRestore(f.dependencies);
  await replacement.send('100'); release(); await preparing;
  assert.equal(f.calls.filter(([kind]) => kind === 'send-from-C').length, 1);
  assert.equal(replacement.current().phase, 'pending');
});

test('a late response from an old controller cannot overwrite a newer return', async () => {
  const f = fixture(); let count = 0; let release; let started;
  const inSend = new Promise(resolve => { started = resolve; });
  f.dependencies.payee.newInvoice = async () => ({ invoice_address: `fibt_${++count}`, invoice: { data: { payment_hash: `0x${count}` } } });
  f.dependencies.payer.sendPayment = async () => { started(); await new Promise(resolve => { release = resolve; }); throw new Error('late timeout'); };
  const old = createLiquidityRestore(f.dependencies); const oldSend = old.send('100'); await inSend; old.dispose();
  const next = createLiquidityRestore(f.dependencies);
  f.setStatuses('Failed', 'Open'); await next.check();
  f.setStatuses('Inflight', 'Open'); f.dependencies.payer.sendPayment = async () => ({ status: 'Inflight' });
  await next.send('100'); release(); await oldSend;
  assert.equal(JSON.parse(f.data.get('return:C:A')).hash, '0x2');
  assert.equal(JSON.parse(f.data.get('return:C:A')).phase, 'pending');
});
