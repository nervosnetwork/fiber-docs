import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForChannelBalance } from '../components/tutorials/fiber-payment-balance.ts';

test('waits for the channel update after a successful payment returns a stale balance', async () => {
  let reads = 0;
  const node = {
    async listChannels() {
      reads += 1;
      return { channels: [
        { channel_id: 'other', local_balance: '0x0' },
        { channel_id: 'paid', local_balance: reads === 1 ? '0x190' : '0x18f' },
      ] };
    },
  };
  const channel = await waitForChannelBalance(node, 'paid', 399n);
  assert.equal(channel.channel_id, 'paid');
  assert.equal(BigInt(channel.local_balance), 399n);
  assert.equal(reads, 2);
});

test('does not report a stale balance as the post-payment balance on timeout', async () => {
  const node = { async listChannels() { return { channels: [{ channel_id: 'paid', local_balance: '0x190' }] }; } };
  assert.equal(await waitForChannelBalance(node, 'paid', 399n, 0), undefined);
});

test('keeps a balance RPC failure separate from the payment result', async () => {
  const node = { async listChannels() { throw new Error('RPC unavailable'); } };
  await assert.rejects(waitForChannelBalance(node, 'paid', 399n), /RPC unavailable/);
});
