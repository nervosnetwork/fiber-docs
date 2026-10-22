import assert from 'node:assert/strict';
import test from 'node:test';
import * as progress from './multi-hop-progress.ts';
import { channelOpeningProgress, channelStateLabel, isMultiHopChannelReady, multiHopStep, multiHopPaymentOutcome, paymentFailureMessage, paymentErrorDetail, invoiceAmountError } from './multi-hop-progress.ts';

test('preserves original Fiber failures for diagnosis, including structured RPC errors', () => {
  assert.equal(paymentErrorDetail(new Error('TemporaryChannelFailure')), 'TemporaryChannelFailure');
  assert.equal(paymentErrorDetail('FeeInsufficient'), 'FeeInsufficient');
  assert.equal(paymentErrorDetail({ code: -32000, message: 'route rejected' }), '{"code":-32000,"message":"route rejected"}');
  assert.equal(paymentErrorDetail(undefined), '');
});

test('exposes the exact invoice limit after reserving the routing fee', () => {
  assert.equal(progress.maximumInvoiceAmount('39899500000', '50000000000'), 39799500000n);
  assert.equal(progress.maximumInvoiceAmount('39899500001', '50000000000'), 39799500001n);
  assert.equal(progress.maximumInvoiceAmount('100000000', '50000000000'), 0n);
  assert.equal(progress.maximumInvoiceAmount('0', '50000000000'), 0n);
  assert.equal(progress.maximumInvoiceAmount(undefined, '50000000000'), undefined);
});

test('rejects invalid invoice amounts while preserving shannon precision', () => {
  const balance = '0x94a320de0'; // 398.995 CKB
  for (const value of ['-1', '0', '', 'NaN', '1e3', '0.000000001']) {
    assert.match(invoiceAmountError(value, balance, '50000000000'), /positive amount/);
  }
  assert.equal(invoiceAmountError('0.00000001', balance, '50000000000'), '');
  assert.equal(invoiceAmountError('397.995', balance, '50000000000'), '');
  assert.match(invoiceAmountError('397.99500001', balance, '50000000000'), /397\.995 CKB.*1 CKB/);
  assert.match(invoiceAmountError('100000', balance, '50000000000'), /397\.995 CKB/);
});

test('requires known balance and room for the routing fee before creating an invoice', () => {
  assert.match(invoiceAmountError('1', undefined, '50000000000'), /liquidity/);
  assert.match(invoiceAmountError('0.00000001', '0x5f5e100', '50000000000'), /insufficient liquidity/);
  assert.match(invoiceAmountError('1', '0x0', '50000000000'), /no remaining liquidity/);
});

test('shows all six opening stages with progress based on the reported state', () => {
  const pending = channelOpeningProgress('AwaitingChannelReady');
  assert.deepEqual(pending.map(({ state }) => state), [
    'NEGOTIATING_FUNDING', 'COLLABORATING_FUNDING_TX', 'SIGNING_COMMITMENT',
    'AWAITING_TX_SIGNATURES', 'AWAITING_CHANNEL_READY', 'CHANNEL_READY',
  ]);
  assert.deepEqual(pending.map(({ status }) => status), ['complete', 'complete', 'complete', 'complete', 'current', 'upcoming']);
  assert.ok(channelOpeningProgress('CHANNEL_READY').every(({ status }) => status === 'complete'));
  for (const state of [undefined, 'Closed', 'Stale']) {
    assert.ok(channelOpeningProgress(state).every(({ status }) => status === 'upcoming'));
  }
});

test('formats protocol states consistently without inventing a state before one is reported', () => {
  const states = [
    ['NegotiatingFunding', 'NEGOTIATING_FUNDING'],
    ['CollaboratingFundingTx', 'COLLABORATING_FUNDING_TX'],
    ['SigningCommitment', 'SIGNING_COMMITMENT'],
    ['AwaitingTxSignatures', 'AWAITING_TX_SIGNATURES'],
    ['AwaitingChannelReady', 'AWAITING_CHANNEL_READY'],
    ['ChannelReady', 'CHANNEL_READY'],
    ['ShuttingDown', 'SHUTTING_DOWN'],
    ['Closed', 'CLOSED'],
    ['Stale', 'STALE'],
  ];
  for (const [protocol, label] of states) {
    assert.equal(channelStateLabel(protocol), label);
    assert.equal(channelStateLabel(label), label);
  }
  assert.equal(channelStateLabel(undefined), 'Not opened');
});

test('channel confirmation does not unlock invoice creation', () => {
  assert.equal(isMultiHopChannelReady('AWAITING_CHANNEL_READY'), false);
  assert.equal(isMultiHopChannelReady('AwaitingChannelReady'), false);
  assert.equal(isMultiHopChannelReady('CHANNEL_READY'), true);
});

const ready = { paymentSubmitted: false, setupReady: true, hasInvoice: false, paymentStatus: 'Not sent', invoiceStatus: 'None' };

test('invoice creation unlocks only after setup', () => {
  assert.equal(multiHopStep({ ...ready, setupReady: false }), 0);
  assert.equal(multiHopStep(ready), 1);
});

test('creating an invoice reveals the review and payment step', () => {
  assert.equal(multiHopStep({ ...ready, hasInvoice: true, invoiceStatus: 'Open' }), 2);
});

test('moves to outcome immediately and keeps pending and failed attempts there', () => {
  for (const paymentStatus of ['Sending', 'Created', 'Inflight', 'Failed', 'Success']) {
    assert.equal(multiHopStep({ ...ready, hasInvoice: true, paymentSubmitted: true, paymentStatus, invoiceStatus: 'Open' }), 3);
  }
});

test('requires both sender success and receiver settlement for a successful outcome', () => {
  assert.equal(multiHopPaymentOutcome('Success', 'Received'), 'pending');
  assert.equal(multiHopPaymentOutcome('Inflight', 'Paid'), 'pending');
  assert.equal(multiHopPaymentOutcome('Success', 'Paid'), 'success');
  assert.equal(multiHopPaymentOutcome('Failed', 'Open'), 'failed');
});

test('explains outbound liquidity in CKB without treating channel funding as spendable', () => {
  const error = 'WASM RPC error: ErrorObject { code: ServerError(-32000), message: "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 39899500000 is insufficient, required amount: 1000000000000", data: None }';
  const message = paymentFailureMessage(error);
  assert.match(message, /398\.995 CKB/);
  assert.match(message, /routing fees/);
  assert.doesNotMatch(message, /499 CKB|WASM|ServerError/);
  assert.match(paymentFailureMessage('Insufficient route liquidity'), /liquidity/);
  assert.match(paymentFailureMessage('Failed to build route'), /route/);
  assert.doesNotMatch(paymentFailureMessage('WASM RPC error: ErrorObject { code: ServerError(-32000) }'), /WASM|ServerError/);
});

test('completed receipts remain available if a channel subsequently disconnects', () => {
  assert.equal(multiHopStep({ ...ready, setupReady: false, hasInvoice: true, paymentStatus: 'Success', invoiceStatus: 'Paid' }), 3);
});



test('caps the invoice by Bottle’s balance toward C, not C’s own funds', () => {
  assert.equal(progress.maximumInvoiceAmount('40000000000', '15100000000'), 15100000000n);
  assert.match(invoiceAmountError('399', '40000000000', '15100000000'), /151 CKB/);
  assert.equal(invoiceAmountError('151', '40000000000', '15100000000'), '');
  assert.match(invoiceAmountError('151.00000001', '40000000000', '15100000000'), /151 CKB/);
  assert.equal(progress.maximumInvoiceAmount('40000000000', '15099999999'), 15099999999n);
  assert.equal(progress.maximumInvoiceAmount('40000000000', '0'), 0n);
  assert.equal(progress.maximumInvoiceAmount('40000000000', undefined), undefined);
  assert.match(invoiceAmountError('1', '40000000000', undefined), /liquidity/);
  assert.match(invoiceAmountError('1', '40000000000', '0'), /no remaining liquidity/);
});

test('excludes in-flight transfers from each channel’s available balance', () => {
  assert.equal(progress.availableChannelBalance?.('40000000000', '100500000'), 39899500000n);
  assert.equal(progress.availableChannelBalance?.('15100000000', '100000001'), 14999999999n);
  assert.equal(progress.availableChannelBalance?.('100', '101'), 0n);
  assert.equal(progress.availableChannelBalance?.(undefined, '0'), undefined);
});


test('reports depleted liquidity before invalid amounts, identifying the blocked direction', () => {
  for (const amount of ['0', '', '-1', '151', 'invalid']) {
    assert.match(invoiceAmountError(amount, '24824500000', '0'), /Bottle B has no remaining liquidity to forward payments to Receiver C/);
    assert.match(invoiceAmountError(amount, '0', '15100000000'), /Sender A has no remaining liquidity to send payments to Bottle B/);
    assert.match(invoiceAmountError(amount, '100000000', '15100000000'), /Sender A has insufficient liquidity.*1 CKB/);
  }
  assert.match(invoiceAmountError('0', '24824500000', '15100000000'), /positive amount/);
});
