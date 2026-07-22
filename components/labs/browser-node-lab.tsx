'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrowserNodeState, FiberBrowserNode, NodeInfoResult } from '@fiber-pay/sdk/browser';

type LogEntry = { at: string; tone: 'info' | 'success' | 'error'; message: string; method?: string };
type Readiness = 'checking' | 'ready' | 'blocked';

const multiaddrPattern = /^\/(dns4|dns6|ip4|ip6)\/[^/]+\/tcp\/\d+\/(wss|ws)\/p2p\/([^/]+)$/i;
const pubkeyPattern = /^(0x)?(02|03)[0-9a-f]{64}$/i;
const profileStorageKey = 'fiber-docs:browser-node-profile-v1';
const shannonsPerCkb = 100_000_000n;

function short(value?: string) {
  if (!value) return '—';
  return value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (value) => Number.parseInt(value, 16));
}

function getOrCreateProfile() {
  const stored = window.localStorage.getItem(profileStorageKey);
  if (stored) {
    try {
      const profile = JSON.parse(stored) as { fiberKey: string; ckbKey: string; identifier: string };
      if (/^[0-9a-f]{64}$/i.test(profile.fiberKey) && /^[0-9a-f]{64}$/i.test(profile.ckbKey)) {
        return { fiberKey: hexToBytes(profile.fiberKey), ckbKey: hexToBytes(profile.ckbKey), identifier: profile.identifier };
      }
    } catch {
      window.localStorage.removeItem(profileStorageKey);
    }
  }

  const profile = {
    fiberKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: `fiber-docs-${crypto.randomUUID()}`,
  };
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  return { fiberKey: hexToBytes(profile.fiberKey), ckbKey: hexToBytes(profile.ckbKey), identifier: profile.identifier };
}

function ckbToHex(value: string) {
  const amount = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(amount)) throw new Error('Enter a valid CKB amount with at most 8 decimals.');
  const [whole, fraction = ''] = amount.split('.');
  const shannons = BigInt(whole) * shannonsPerCkb + BigInt(fraction.padEnd(8, '0'));
  if (shannons <= 0n) throw new Error('Amount must be greater than zero.');
  return `0x${shannons.toString(16)}` as `0x${string}`;
}

async function queryCkbBalance(script: { code_hash: string; hash_type: string; args: string }) {
  const response = await fetch('https://testnet.ckbapp.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'get_cells_capacity',
      params: [{
        script,
        script_type: 'lock',
      }],
    }),
  });
  const result = await response.json() as { result?: { capacity?: string }; error?: { message?: string } };
  if (!result.result?.capacity) throw new Error(result.error?.message ?? 'Unable to query the CKB balance.');
  return BigInt(result.result.capacity);
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function BrowserNodeLab({
  defaultRouterAddress,
  defaultRouterPubkey,
}: {
  defaultRouterAddress: string;
  defaultRouterPubkey: string;
}) {
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const [readiness, setReadiness] = useState<Readiness>('checking');
  const [router, setRouter] = useState(defaultRouterAddress);
  const [routerPubkey, setRouterPubkey] = useState(defaultRouterPubkey);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [ckbAddress, setCkbAddress] = useState('');
  const [ckbBalance, setCkbBalance] = useState<bigint | null>(null);
  const [channelCount, setChannelCount] = useState(0);
  const [readyChannelCount, setReadyChannelCount] = useState(0);
  const [channelState, setChannelState] = useState('Not opened');
  const [channelAmount, setChannelAmount] = useState('499');
  const [busy, setBusy] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('1');
  const [paymentResult, setPaymentResult] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { at: '--:--:--', tone: 'info', message: 'Waiting for browser capability check.' },
  ]);

  const addLog = useCallback((message: string, tone: LogEntry['tone'] = 'info', method?: string) => {
    setLogs((items) => [...items.slice(-7), { at: new Date().toLocaleTimeString(), tone, message, method }]);
  }, []);

  useEffect(() => {
    const supported = window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
    setReadiness(supported ? 'ready' : 'blocked');
    setLogs([{
      at: new Date().toLocaleTimeString(),
      tone: supported ? 'success' : 'error',
      message: supported
        ? 'SharedArrayBuffer is available. This page can start Fiber WASM.'
        : 'This page is not cross-origin isolated. Check the COOP and COEP response headers.',
    }]);
    return () => {
      void nodeRef.current?.stop();
    };
  }, []);

  const parsedRouter = router.trim().match(multiaddrPattern);
  const pubkeyConfigured = pubkeyPattern.test(routerPubkey.trim());
  const routerConfigured = Boolean(parsedRouter) && pubkeyConfigured;
  const isRunning = nodeState === 'running';

  const startNode = async () => {
    if (!parsedRouter || readiness !== 'ready' || busy) return;
    setBusy(true);
    setPaymentResult('');
    try {
      addLog('Loading the Fiber browser SDK and WASM workers…');
      const { FiberBrowserNode, RawKeyCredentialProvider, scriptToAddress } = await import('@fiber-pay/sdk/browser');
      const profile = getOrCreateProfile();
      const credential = new RawKeyCredentialProvider(profile.fiberKey, profile.ckbKey, profile.identifier);
      const node = new FiberBrowserNode({
        network: 'testnet',
        credential,
        nodeConfig: { bootnodes: [router.trim()], logLevel: 'info' },
      });
      node.on('stateChange', (state) => {
        setNodeState(state);
        addLog(`Node state changed to ${state}.`, state === 'error' ? 'error' : 'info');
      });
      node.on('error', (error) => addLog(error.message, 'error'));
      nodeRef.current = node;

      const info = await node.start();
      setNodeInfo(info);
      const fundingAddress = scriptToAddress(info.default_funding_lock_script, 'testnet');
      setCkbAddress(fundingAddress);
      try {
        setCkbBalance(await queryCkbBalance(info.default_funding_lock_script));
      } catch (error) {
        addLog(`Balance check failed: ${describeError(error)}`, 'error');
      }
      addLog(`WASM node started: ${short(info.pubkey)}`, 'success', 'start()');

      const normalizedRouterPubkey = `${routerPubkey.trim().startsWith('0x') ? '' : '0x'}${routerPubkey.trim()}` as `0x${string}`;
      const routerAddress = router.trim().replace(/\/p2p\/[^/]+$/i, '');
      addLog(`Connecting to Router over ${parsedRouter[2].toUpperCase()}…`, 'info', 'connectPeer()');
      await node.connectPeer({ address: routerAddress, pubkey: normalizedRouterPubkey });
      addLog('Connection request accepted. Waiting for the WSS handshake…', 'info', 'connectPeer()');
      let peers = (await node.listPeers()).peers;
      for (let attempt = 0; peers.length === 0 && attempt < 15; attempt += 1) {
        await wait(1_000);
        peers = (await node.listPeers()).peers;
      }
      setPeerCount(peers.length);
      if (peers.length === 0) {
        addLog('The request was accepted, but no peer completed the handshake. Try Refresh live state or another public node.', 'error', 'listPeers()');
      } else {
        addLog(`WSS handshake complete. The node reports ${peers.length} peer${peers.length === 1 ? '' : 's'}.`, 'success', 'listPeers()');
      }
    } catch (error) {
      addLog(describeError(error), 'error');
      setNodeState(nodeRef.current?.isRunning ? 'running' : 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetNode = async () => {
    if (!nodeRef.current || busy) return;
    setBusy(true);
    try {
      await nodeRef.current.stop();
      addLog('Browser node stopped. You can change the Router and start again.', 'info', 'stop()');
    } catch (error) {
      addLog(describeError(error), 'error');
    } finally {
      nodeRef.current = null;
      setNodeInfo(null);
      setPeerCount(0);
      setCkbAddress('');
      setCkbBalance(null);
      setChannelCount(0);
      setReadyChannelCount(0);
      setChannelState('Not opened');
      setNodeState('idle');
      setPaymentResult('');
      setBusy(false);
    }
  };

  const refreshPeers = async () => {
    if (!nodeRef.current || busy) return;
    setBusy(true);
    try {
      const [{ peers }, info, { channels }] = await Promise.all([
        nodeRef.current.listPeers(),
        nodeRef.current.nodeInfo(),
        nodeRef.current.listChannels(),
      ]);
      setPeerCount(peers.length);
      setNodeInfo(info);
      setChannelCount(channels.length);
      const ready = channels.filter((channel) => channel.state.state_name.toLowerCase().includes('ready'));
      setReadyChannelCount(ready.length);
      setChannelState(channels.length ? channels[channels.length - 1].state.state_name : 'Not opened');
      setCkbBalance(await queryCkbBalance(info.default_funding_lock_script));
      addLog(`Live state: ${peers.length} peer${peers.length === 1 ? '' : 's'}, ${ready.length} ready channel${ready.length === 1 ? '' : 's'}.`, peers.length ? 'success' : 'info', 'listPeers() · listChannels()');
      if (peers.length === 0 && ready.length > 0) {
        addLog('The channel is stored in IndexedDB, but its peer is offline. Reconnect the peer before paying.', 'info', 'listPeers()');
      }
    } catch (error) {
      addLog(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openChannel = async () => {
    if (!nodeRef.current || peerCount === 0 || busy) return;
    setBusy(true);
    try {
      const fundingAmount = ckbToHex(channelAmount);
      const targetPubkey = `${routerPubkey.trim().startsWith('0x') ? '' : '0x'}${routerPubkey.trim()}` as `0x${string}`;
      addLog(`Opening a ${channelAmount} CKB channel. This submits a real Testnet transaction…`, 'info', 'openChannel()');
      const result = await nodeRef.current.openChannel({ pubkey: targetPubkey, funding_amount: fundingAmount, public: true });
      setChannelState('Opening');
      addLog(`Channel negotiation started: ${short(result.temporary_channel_id)}`, 'success', 'openChannel()');
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await wait(2_000);
        const { channels } = await nodeRef.current.listChannels();
        setChannelCount(channels.length);
        const ready = channels.filter((channel) => channel.state.state_name.toLowerCase().includes('ready'));
        setReadyChannelCount(ready.length);
        setChannelState(channels.length ? channels[channels.length - 1].state.state_name : 'Opening');
        if (ready.length) {
          addLog('Channel is ready for payments.', 'success', 'listChannels()');
          break;
        }
      }
    } catch (error) {
      addLog(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendPayment = async () => {
    if (!nodeRef.current || readyChannelCount === 0 || peerCount === 0 || busy) return;
    setBusy(true);
    setPaymentResult('');
    try {
      const amount = ckbToHex(paymentAmount);
      const targetPubkey = `${routerPubkey.trim().startsWith('0x') ? '' : '0x'}${routerPubkey.trim()}` as `0x${string}`;
      addLog(`Sending ${paymentAmount} CKB to the public Testnet node with keysend…`, 'info', 'sendPayment()');
      const submitted = await nodeRef.current.sendPayment({ target_pubkey: targetPubkey, amount, keysend: true });
      const shouldWait = submitted.status !== 'Success' && submitted.status !== 'Failed';
      const result = shouldWait
        ? await nodeRef.current.waitForPayment(submitted.payment_hash, { timeout: 30_000, interval: 1_000 })
        : submitted;
      setPaymentResult(JSON.stringify(result, null, 2));
      addLog(`Payment finished with status ${result.status}.`, result.status === 'Success' ? 'success' : 'error', shouldWait ? 'waitForPayment()' : 'sendPayment()');
    } catch (error) {
      addLog(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const readinessLabel = readiness === 'checking' ? 'Checking' : readiness === 'ready' ? 'Ready' : 'Blocked';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/docs/quick-start/run-a-node/fiberjs" className="text-sm text-neutral-400 transition hover:text-white">← Back to Run a WASM Node</Link>
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">Fiber / Browser Node Lab</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:px-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)] lg:py-16">
        <section>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-emerald-400">Real Testnet Runtime</p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] md:text-6xl">Start Fiber where you are.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">This page runs Fiber WASM in your browser, then connects it to a native Router through WSS. No local RPC endpoint and no simulated network state.</p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Browser runtime', readinessLabel, readiness === 'ready'],
              ['WASM node', nodeState, isRunning],
              ['Connected peers', String(peerCount), peerCount > 0],
              ['Ready channels', String(readyChannelCount), readyChannelCount > 0],
            ].map(([label, value, ok]) => (
              <div key={String(label)} className="bg-[#141414] p-5">
                <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
                <div className={`mt-2 font-mono text-lg ${ok ? 'text-emerald-400' : 'text-neutral-300'}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#141414] p-5 md:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-mono text-sm text-black">1</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl">Connect to a Router</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Use the public node's WSS multiaddr and Fiber pubkey. The multiaddr ends with a libp2p Peer ID; it is not the Fiber pubkey.</p>
                <label className="mt-5 block text-xs uppercase tracking-wider text-neutral-500" htmlFor="router-address">Router WSS multiaddr</label>
                <input id="router-address" value={router} onChange={(event) => setRouter(event.target.value)} disabled={busy || isRunning} placeholder="/dns4/router.example.com/tcp/443/wss/p2p/03…" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm outline-none transition placeholder:text-neutral-700 focus:border-white/30 disabled:opacity-60" />
                <label className="mt-4 block text-xs uppercase tracking-wider text-neutral-500" htmlFor="router-pubkey">Router Fiber pubkey</label>
                <input id="router-pubkey" value={routerPubkey} onChange={(event) => setRouterPubkey(event.target.value)} disabled={busy || isRunning} placeholder="02… or 03…" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm outline-none transition placeholder:text-neutral-700 focus:border-white/30 disabled:opacity-60" />
                <p className="mt-3 text-sm text-neutral-500">Default: <a className="text-neutral-300 underline underline-offset-4 hover:text-white" href="/docs/quick-start/network-resources">fiber-testnet-public-bottle</a> from Network Resources.</p>
                {router && !parsedRouter && <p className="mt-3 text-sm text-red-300">Expected a full `/dns4/.../tcp/.../wss/p2p/...` multiaddr.</p>}
                {routerPubkey && !pubkeyConfigured && <p className="mt-3 text-sm text-red-300">Expected a compressed secp256k1 Fiber pubkey beginning with `02` or `03`.</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={startNode} disabled={!routerConfigured || readiness !== 'ready' || busy || isRunning} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">{busy && !isRunning ? 'Starting…' : 'Start browser node'}</button>
                  <button onClick={refreshPeers} disabled={!isRunning || busy} className="rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-30">Refresh live state</button>
                  <button onClick={resetNode} disabled={!nodeRef.current || busy} className="rounded-full border border-white/15 px-5 py-3 text-sm text-neutral-400 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Stop and reset</button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#141414] p-5 md:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-sm">2</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl">Fund and open a channel</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Send Testnet CKB to this browser's funding address first. The public node currently auto-accepts channels from 499 CKB; keep extra CKB for the funding transaction fee.</p>
                <div className="mt-5 rounded-xl border border-white/10 bg-black p-4">
                  <div className="text-xs uppercase tracking-wider text-neutral-600">This browser's CKB address</div>
                  <div className="mt-2 break-all font-mono text-sm text-emerald-300">{ckbAddress || 'Start the node to derive its address.'}</div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-500">On-chain balance: <strong className="font-mono text-neutral-200">{ckbBalance === null ? '—' : `${Number(ckbBalance) / 100_000_000} CKB`}</strong></span>
                    <a href="https://faucet.nervos.org" target="_blank" rel="noreferrer" className="text-neutral-300 underline underline-offset-4 hover:text-white">Open Testnet faucet ↗</a>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-300">The Testnet key is stored only in this browser. Different browser profiles get different addresses; clearing site data creates a new one.</p>
                <label className="mt-5 block text-xs uppercase tracking-wider text-neutral-500" htmlFor="channel-amount">Channel funding amount (CKB)</label>
                <input id="channel-amount" inputMode="decimal" value={channelAmount} onChange={(event) => setChannelAmount(event.target.value)} disabled={!isRunning || busy} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm outline-none transition focus:border-white/30 disabled:opacity-50" />
                <div className="mt-3 text-sm text-neutral-500">Latest channel state: <span className="font-mono text-neutral-300">{channelState}</span> · Total channels: {channelCount}</div>
                <button onClick={openChannel} disabled={!isRunning || peerCount === 0 || busy || !ckbAddress} className="mt-4 rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-30">Open real Testnet channel</button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#141414] p-5 md:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-sm">3</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl">Send a Testnet payment</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Enter an amount and send it directly to the selected public node using Fiber keysend. No invoice is required. The button becomes available after a channel reaches Ready.</p>
                {readyChannelCount > 0 && peerCount === 0 && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm leading-6 text-amber-300">This browser has a stored Ready channel, but the peer is offline. Reconnect the public node before sending a payment.</p>}
                <label className="mt-5 block text-xs uppercase tracking-wider text-neutral-500" htmlFor="payment-amount">Payment amount (CKB)</label>
                <input id="payment-amount" inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} disabled={readyChannelCount === 0 || peerCount === 0 || busy} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm outline-none transition focus:border-white/30 disabled:opacity-50" />
                <button onClick={sendPayment} disabled={readyChannelCount === 0 || peerCount === 0 || busy || !paymentAmount.trim()} className="mt-4 rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-30">Send to public Testnet node</button>
                {paymentResult && <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-black p-4 text-xs leading-6 text-emerald-300">{paymentResult}</pre>}
              </div>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">Live node output</span>
              <span className={`h-2 w-2 rounded-full ${peerCount > 0 ? 'bg-emerald-400' : nodeState === 'error' ? 'bg-red-400' : 'bg-neutral-600'}`} />
            </div>
            <div className="min-h-72 space-y-4 p-5 font-mono text-xs leading-5">
              {logs.map((entry, index) => (
                <div key={`${entry.at}-${index}`} className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-start gap-3">
                  <span className="text-neutral-600">{entry.at}</span>
                  <span className={entry.tone === 'success' ? 'text-emerald-300' : entry.tone === 'error' ? 'text-red-300' : 'text-neutral-300'}>{entry.message}</span>
                  {entry.method && <code className="rounded-md border border-white/10 bg-black px-2 py-1 text-[10px] leading-none text-sky-300">{entry.method}</code>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="text-xs uppercase tracking-wider text-neutral-500">Node identity</div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">Network</dt><dd className="font-mono">Testnet</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">Pubkey</dt><dd className="font-mono" title={nodeInfo?.pubkey}>{short(nodeInfo?.pubkey)}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">CKB address</dt><dd className="font-mono" title={ckbAddress}>{short(ckbAddress)}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">CKB balance</dt><dd className="font-mono">{ckbBalance === null ? '—' : `${Number(ckbBalance) / 100_000_000} CKB`}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">Transport</dt><dd className="font-mono">WSS</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">Storage</dt><dd className="font-mono">IndexedDB</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}
