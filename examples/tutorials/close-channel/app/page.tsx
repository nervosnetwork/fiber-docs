'use client';

import { channelFundingGuidance } from '../lib/channel-funding';
import { useEffect, useRef, useState } from 'react';
import { scriptToAddress, type Channel, type FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle, ensureChannel, findChannel, startFiber } from '../lib/fiber';
import { closeCooperatively, listIncludingClosed } from '../lib/close';

export default function Page() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [address, setAddress] = useState('');
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
    const info = await node.current.nodeInfo();
    setAddress(scriptToAddress(info.default_funding_lock_script, 'testnet'));
    setStatus('Running');
    await refresh();
  }

  async function open() {
    if (!node.current || shuttingDown) return;
    try {
      await ensureChannel(node.current);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the channel.');
      return;
    }
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
    {address && !ready && !shuttingDown && <section className="card">
      <code>{address}</code>
      <p>{channelFundingGuidance}</p>
      <a href="https://faucet.nervos.org" target="_blank" rel="noreferrer">Get Testnet CKB ↗</a>
    </section>}
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
