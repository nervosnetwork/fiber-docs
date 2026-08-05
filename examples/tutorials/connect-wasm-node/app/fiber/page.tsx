'use client';

import { useRef, useState } from 'react';
import type { BrowserNodeState, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { connectToRouter, startFiber } from '../../lib/fiber';

export default function FiberPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState<BrowserNodeState>('idle');
  const [pubkey, setPubkey] = useState('');
  const [peers, setPeers] = useState(0);

  async function start() {
    const fiber = await startFiber(setStatus);
    node.current = fiber;
    setPubkey((await fiber.getNodeInfo()).pubkey);
  }

  async function connect() {
    if (!node.current) return;
    await connectToRouter(node.current);
    setPeers((await node.current.listPeers()).peers.length);
  }

  return <main>
    <p>Fiber WASM · {status}</p>
    <h1>Your Fiber node, inside React.</h1>
    <button disabled={Boolean(node.current)} onClick={start}>Start node</button>
    <button disabled={!node.current || peers > 0} onClick={connect}>Connect peer</button>
    {pubkey && <code>{pubkey}</code>}
    <p>{peers} connected peers</p>
  </main>;
}
