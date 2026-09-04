'use client';

import { useEffect, useRef, useState } from 'react';
import type { BrowserNodeState, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { connectToRouter, startFiber } from '../../lib/fiber';

function friendlyState(state: BrowserNodeState) {
  if (state === 'running') return 'Node running';
  if (state === 'starting') return 'Starting WASM';
  if (state === 'stopping') return 'Stopping';
  if (state === 'error') return 'Connection issue';
  return 'Ready to start';
}

function shorten(value?: string) {
  if (!value) return 'Waiting for node';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

export default function FiberPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState<BrowserNodeState>('idle');
  const [pubkey, setPubkey] = useState('');
  const [peers, setPeers] = useState(0);
  const [busy, setBusy] = useState<'start' | 'connect' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => {
    void node.current?.stop();
  }, []);

  async function start() {
    if (busy || node.current) return;
    setBusy('start');
    setError('');
    try {
      const fiber = await startFiber(setStatus);
      node.current = fiber;
      setPubkey((await fiber.getNodeInfo()).pubkey);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start the Fiber node.');
      if (!node.current?.isRunning) node.current = null;
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    if (!node.current || busy || peers > 0) return;
    setBusy('connect');
    setError('');
    try {
      await connectToRouter(node.current);
      let peerList = (await node.current.listPeers()).peers;
      for (let attempt = 0; peerList.length === 0 && attempt < 10; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
        peerList = (await node.current.listPeers()).peers;
      }
      if (peerList.length === 0) throw new Error('The public peer handshake timed out.');
      setPeers(peerList.length);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to connect to the public peer.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="tutorial-page">
      <header className="hero">
        <span>Fiber Testnet · Browser quickstart</span>
        <h1>Run a Fiber WASM Node in Your Browser</h1>
        <p>
          Start a real Fiber node in this page, connect it to a public Fiber
          Testnet peer, and inspect its runtime state.
        </p>
      </header>

      <section className="steps" aria-label="Tutorial steps">
        <div><b>1</b><p><strong>Start your browser node.</strong> The node starts locally and remains disconnected.</p></div>
        <div><b>2</b><p><strong>Connect to Fiber Testnet.</strong> Make the first public peer connection over WSS.</p></div>
      </section>

      <section className="demo-grid">
        <article className="node-card">
          <div className="node-heading">
            <i>F</i>
            <div><span>Your browser node</span><strong>{friendlyState(status)}</strong></div>
            <em className={error ? 'dot error' : status === 'running' ? 'dot success' : 'dot waiting'} />
          </div>
          <div className="identity"><span>Node pubkey</span><code title={pubkey}>{shorten(pubkey)}</code></div>
          <dl className="stats">
            <div><dt>Runtime</dt><dd>Fiber WASM</dd></div>
            <div><dt>Storage</dt><dd>IndexedDB</dd></div>
            <div><dt>Transport</dt><dd>WSS</dd></div>
          </dl>
          <div className="actions">
            <button disabled={busy !== null || Boolean(pubkey)} onClick={start}>
              {busy === 'start' ? 'Starting Fiber…' : pubkey ? 'Node running' : 'Start WASM node'}
            </button>
            <button className="secondary" disabled={busy !== null || !pubkey || peers > 0} onClick={connect}>
              {busy === 'connect' ? 'Connecting…' : peers > 0 ? `${peers} peer connected` : 'Connect public peer'}
            </button>
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
        </article>

        <aside className="events">
          <header><span>Node events</span><i className={error ? 'dot error' : peers > 0 ? 'dot success' : 'dot waiting'} /></header>
          <div><time>01</time><code>wasm_runtime</code><span>ready</span></div>
          <div><time>02</time><code>node_state</code><span>{friendlyState(status)}</span></div>
          {pubkey && <div><time>03</time><code>node_started</code><span>{shorten(pubkey)}</span></div>}
          {peers > 0 && <div><time>04</time><code>peer_connected</code><span>{peers} public peer</span></div>}
        </aside>
      </section>
    </main>
  );
}
