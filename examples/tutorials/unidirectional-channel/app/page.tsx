'use client';

import { useEffect, useRef, useState } from 'react';
import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { scriptToAddress } from '@fiber-pay/sdk/browser';
import { bottle, connectBottle, startFiber } from '../lib/fiber';
import { findOneWayChannel, openOneWayChannel } from '../lib/channel';
import { sendOneWayPayment } from '../lib/payment';
import { hexToCkb } from '../lib/amounts';

export default function Page() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [address, setAddress] = useState('');
  const [channel, setChannel] = useState<Channel | undefined>();
  const [amount, setAmount] = useState('1');
  const [status, setStatus] = useState('Stopped');

  async function refresh() {
    if (!node.current) return;
    const channels = (await node.current.listChannels()).channels;
    setChannel(findOneWayChannel(channels, bottle.pubkey));
  }

  async function start() {
    const current = await startFiber();
    node.current = current;
    const info = await current.nodeInfo();
    setAddress(scriptToAddress(info.default_funding_lock_script, 'testnet'));
    setStatus('Running');
    await refresh();
  }

  async function connectAndOpen() {
    if (!node.current) return;
    setStatus('Connecting');
    await connectBottle(node.current);
    const existing = findOneWayChannel(
      (await node.current.listChannels()).channels,
      bottle.pubkey,
    );
    if (!existing) await openOneWayChannel(node.current, bottle.pubkey);
    setStatus('Opening — wait for ChannelReady');
    await refresh();
  }

  async function pay() {
    if (!node.current || !channel) return;
    setStatus('Sending');
    const result = await sendOneWayPayment(node.current, bottle.pubkey, amount);
    setStatus(result.status);
    await refresh();
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const ready =
    channel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() ===
    'channelready';

  return <main>
    <h1>Open a Unidirectional Fiber Channel</h1>
    <p>{status}</p>
    <button disabled={Boolean(node.current)} onClick={start}>Start browser node</button>
    <section className="card">
      <span>Funding address</span>
      <code>{address || 'Start the node to create an address'}</code>
      <a href="https://faucet.nervos.org" target="_blank">Open Testnet faucet ↗</a>
    </section>
    <button disabled={!node.current || Boolean(channel)} onClick={connectAndOpen}>
      {channel ? channel.state.state_name : 'Connect and open 499 CKB one-way channel'}
    </button>
    <div className="grid">
      <section className="card"><span>is_one_way</span><strong>{channel ? String(channel.is_one_way) : '—'}</strong></section>
      <section className="card"><span>is_public</span><strong>{channel ? String(channel.is_public) : '—'}</strong></section>
      <section className="card"><span>Local balance</span><strong>{channel ? `${hexToCkb(channel.local_balance)} CKB` : '—'}</strong></section>
      <section className="card"><span>Remote balance</span><strong>{channel ? `${hexToCkb(channel.remote_balance)} CKB` : '—'}</strong></section>
    </div>
    <label><input value={amount} onChange={(event) => setAmount(event.target.value)} /><span>CKB</span></label>
    <button disabled={!ready} onClick={pay}>Send payment to Bottle</button>
  </main>;
}
