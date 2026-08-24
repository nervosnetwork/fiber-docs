'use client';

import { useEffect, useRef, useState } from 'react';
import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle, ensureChannel, findChannel, startFiber } from '../lib/fiber';
import { closeCooperatively, listIncludingClosed } from '../lib/close';

export default function Page() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [channel, setChannel] = useState<Channel>();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Stopped');
  const state = channel?.state.state_name ?? 'Not opened';
  const ready = state === 'CHANNEL_READY';
  const shuttingDown = state === 'SHUTTING_DOWN';
  const closed = state === 'CLOSED';

  async function refresh() {
    if (!node.current) return;
    const [channels, peers] = await Promise.all([
      listIncludingClosed(node.current),
      node.current.listPeers(),
    ]);
    setChannel(findChannel(channels.channels));
    setConnected(peers.peers.some((peer) => peer.pubkey === bottle.pubkey));
  }

  async function start() {
    node.current = await startFiber();
    setStatus('Running');
    await refresh();
  }

  async function open() {
    if (!node.current || shuttingDown) return;
    await ensureChannel(node.current);
    setStatus('Preparing channel');
    await refresh();
  }

  async function close() {
    if (!node.current || !channel) return;
    await closeCooperatively(node.current, channel.channel_id);
    setStatus('Shutdown submitted; waiting for the closing transaction');
    await refresh();
  }

  async function resumeClose() {
    if (!node.current) return;
    setStatus('Reconnecting to continue cooperative shutdown');
    await node.current.connectPeer(bottle);
    await refresh();
  }

  useEffect(() => {
    const timer = setInterval(() => void refresh(), 3_000);
    return () => clearInterval(timer);
  }, []);

  return <main>
    <h1>Close a Fiber Channel</h1>
    <p className="status">{status}</p>
    <div className="row">
      <button onClick={() => void start()}>Start</button>
      <button disabled={shuttingDown || ready} onClick={() => void open()}>{ready ? 'Channel ready' : shuttingDown ? 'Shutdown pending' : 'Prepare channel'}</button>
      <button
        disabled={closed || (!ready && !(shuttingDown && !connected))}
        onClick={() => void (shuttingDown ? resumeClose() : close())}
      >
        {closed ? 'Closed ✓' : shuttingDown && !connected ? 'Reconnect & continue' : shuttingDown ? 'Waiting on-chain…' : 'Close cooperatively'}
      </button>
    </div>
    <section className="card">
      <p>Peer: {connected ? 'Connected' : 'Offline'}</p>
      <p>Channel: <code>{channel?.channel_id ?? '—'}</code></p>
      <p>State: <strong>{state}</strong></p>
      <p>Shutdown tx: <code>{channel?.shutdown_transaction_hash ?? '—'}</code></p>
    </section>
  </main>;
}
