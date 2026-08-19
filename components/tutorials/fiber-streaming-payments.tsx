'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type RoutingCodeFile,
  type RoutingCodeFocus,
  RoutingTutorialFrame,
} from './routing-tutorial-frame';
import { bottlePeer, ckbToHex, hexToCkb, samePubkey, shorten, useFiberRoutingNode } from './fiber-routing-runtime';
import { ChannelProgress, findMatchingChannel, isChannelReady, progressFromChannelState, type ChannelProgressStage } from './fiber-tutorial-utils';
import styles from './fiber-wasm-quickstart.module.css';

const codeFiles: RoutingCodeFile[] = [
  { id: 'stream', label: 'lib/stream.ts', language: 'typescript', code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

export async function sendStreamTick(node: FiberBrowserNode, amount: string) {
  const submitted = await node.sendPayment({
    target_pubkey: bottle.pubkey,
    amount: ckbToHex(amount),
    keysend: true,
  });
  if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
  return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
}

export async function runPaymentStream(node, options) {
  while (!options.signal.aborted) {
    const result = await sendStreamTick(node, options.amount);
    options.onResult(result);
    if (result.status !== 'Success') break;
    await new Promise(resolve => setTimeout(resolve, options.interval));
  }
}` },
  { id: 'channel', label: 'lib/channel.ts', language: 'typescript', code: `export async function ensureOneWayChannel(node) {
  const existing = await findOneWayChannel(node, bottle.pubkey);
  if (existing) return existing;
  await node.connectPeer(bottle);
  return node.openChannel({
    pubkey: bottle.pubkey,
    funding_amount: ckbToHex('499'),
    public: false,
    one_way: true,
  });
}` },
  { id: 'app', label: 'app/stream/page.tsx', language: 'tsx', code: `'use client';

export default function StreamingPage() {
  const controller = useRef<AbortController | null>(null);
  const [sent, setSent] = useState(0);

  async function startStream() {
    controller.current = new AbortController();
    await runPaymentStream(node.current, {
      amount: '0.01', interval: 5_000,
      signal: controller.current.signal,
      onResult(result) {
        if (result.status === 'Success') setSent(value => value + 1);
      },
    });
  }

  function stopStream() { controller.current?.abort(); }
  useEffect(() => stopStream, []);
  return <StreamControls sent={sent} onStart={startStream} onStop={stopStream} />;
}` },
];
const sectionCode: Record<string, RoutingCodeFocus> = {
  channel: { file: 'channel', start: 1, end: 12 }, tick: { file: 'stream', start: 3, end: 11 }, loop: { file: 'stream', start: 13, end: 21 }, control: { file: 'app', start: 4, end: 22 },
};

export function FiberStreamingPaymentsTutorial() {
  const runtime = useFiberRoutingNode('fiber-docs:unidirectional-channel-v1');
  const [stage, setStage] = useState<ChannelProgressStage>('idle');
  const [amount, setAmount] = useState('0.01');
  const [intervalSeconds, setIntervalSeconds] = useState('5');
  const [streaming, setStreaming] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0n);
  const [status, setStatus] = useState('Idle');
  const [events, setEvents] = useState<string[]>([]);
  const stopRef = useRef(true);
  const channel = useMemo(() => findMatchingChannel(runtime.channels, bottlePeer.pubkey, (item) => item.is_one_way), [runtime.channels]);
  const ready = isChannelReady(channel);
  const connected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  useEffect(() => { if (channel) setStage(progressFromChannelState(channel)); }, [channel]);
  useEffect(() => () => { stopRef.current = true; }, []);
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-12), message]), []);

  const open = useCallback(async () => {
    const node = runtime.nodeRef.current; if (!node) return;
    setStage('connecting');
    const online = connected || await runtime.connect(bottlePeer); if (!online) return setStage('error');
    const existing = findMatchingChannel((await node.listChannels()).channels, bottlePeer.pubkey, (item) => item.is_one_way);
    if (existing) { setStage(progressFromChannelState(existing)); addEvent(`Reused ${existing.state.state_name}`); return void runtime.refresh(); }
    setStage('submitting');
    const result = await runtime.run('open streaming channel', (current) => current.openChannel({ pubkey: bottlePeer.pubkey, funding_amount: ckbToHex('499'), public: false, one_way: true }));
    if (!result) return setStage('error');
    setStage('confirming'); addEvent(`Channel submitted · ${shorten(result.temporary_channel_id)}`); await runtime.refresh();
  }, [addEvent, connected, runtime]);

  const stop = useCallback(() => { stopRef.current = true; setStreaming(false); setStatus('Stopped'); addEvent('Stream stopped by user'); }, [addEvent]);
  const startStream = useCallback(async () => {
    const node = runtime.nodeRef.current; if (!node || !ready || streaming) return;
    stopRef.current = false; setStreaming(true); setStatus('Streaming'); addEvent('Sequential payment stream started');
    const delay = Math.max(1, Number(intervalSeconds) || 5) * 1_000;
    while (!stopRef.current) {
      const submitted = await runtime.run('stream payment', (current) => current.sendPayment({ target_pubkey: bottlePeer.pubkey, amount: ckbToHex(amount), keysend: true }));
      if (!submitted) { setStatus('Failed'); break; }
      const result = submitted.status === 'Success' || submitted.status === 'Failed' ? submitted : await node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
      addEvent(`${result.status} · ${shorten(result.payment_hash)}`);
      if (result.status !== 'Success') { setStatus(result.status); break; }
      const paid = BigInt(ckbToHex(amount)); setCount((value) => value + 1); setTotal((value) => value + paid);
      await runtime.refresh();
      await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
    }
    setStreaming(false); if (!stopRef.current) setStatus('Complete');
  }, [addEvent, amount, intervalSeconds, ready, runtime, streaming]);

  const article = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Repeated payments</span><span className={styles.eyebrowRule}/><span>20 minute tutorial</span></div><h1>Stream Payments over a One-Way Channel</h1><p className={styles.lead}>Turn one ready channel into a controlled sequence of small, real Testnet payments with explicit Start and Stop controls.</p><div className={styles.heroMeta}><span>Streaming</span><span>One-way</span><span>Keysend</span></div></header>
    <section className={styles.section} data-tutorial-section="channel"><div className={styles.stepLabel}><span>1</span> Reuse one channel</div><h2>Pay repeatedly without repeated on-chain setup</h2><p>The tutorial restores the same browser identity and one-way channel used earlier. If a usable channel is already opening or ready, it is reused rather than submitted again.</p><small className={styles.fileReference}>lib/channel.ts · lines 1–12</small></section>
    <section className={styles.section} data-tutorial-section="tick"><div className={styles.stepLabel}><span>2</span> Send one tick</div><h2>Each tick is a normal Fiber payment</h2><p>Every stream item calls <code>sendPayment()</code> and waits for its terminal result. This keeps failures visible and measurable.</p><small className={styles.fileReference}>lib/stream.ts · lines 3–11</small></section>
    <section className={styles.section} data-tutorial-section="loop"><div className={styles.stepLabel}><span>3</span> Sequence the loop</div><h2>Wait, then send the next payment</h2><p>The loop is deliberately sequential. A new payment begins only after the previous one succeeds and the configured interval elapses, avoiding unbounded concurrent TLCs.</p><small className={styles.fileReference}>lib/stream.ts · lines 13–21</small></section>
    <section className={styles.section} data-tutorial-section="control"><div className={styles.stepLabel}><span>4</span> Give the user control</div><h2>Start, stop, count, and clean up</h2><p>An abort flag stops the next iteration and cleanup prevents the stream from continuing after navigation. The UI records count, total value, and each payment hash.</p><small className={styles.fileReference}>app/stream/page.tsx · lines 4–22</small></section>
  </>;

  const liveDemo = <><div className={styles.panelHeader}><span><i className={styles.liveDot}/> Live payment stream</span><button className={styles.headerAction} disabled={!runtime.nodeInfo} onClick={() => void runtime.refresh()}>Refresh</button></div><div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}><div className={styles.paymentCard}>
    <div className={styles.routeStatusGrid}><div><span>Node</span><strong>{runtime.nodeState}</strong></div><div><span>Channel</span><strong>{channel?.state.state_name ?? 'Not opened'}</strong></div><div><span>Stream</span><strong>{status}</strong></div><div><span>Payments</span><strong>{count}</strong></div></div>
    <div className={styles.routeDiagram}><b>Browser payer</b><i>→</i><span>One-way channel</span><i>→</i><b>Bottle</b></div>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>1</div><div><strong>Prepare the streaming channel</strong><span>{runtime.address ? `${hexToCkb(runtime.balance)} CKB · ${shorten(runtime.address, 14, 10)}` : 'Start the browser node first.'}</span></div><div className={styles.compactActions}><button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>Start</button><button className={styles.paymentButton} disabled={!runtime.nodeInfo || Boolean(channel) || Boolean(runtime.busy) || (runtime.balance ?? 0n) < BigInt(ckbToHex('499'))} onClick={() => void open()}>{stage === 'connecting' ? 'Connecting…' : stage === 'submitting' ? 'Opening…' : stage === 'confirming' ? 'Confirming…' : ready ? 'Ready' : 'Connect & open'}</button></div></div>
    {runtime.address && <div className={styles.rebalanceAddress}><code>{runtime.address}</code><button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button><a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a></div>}
    <ChannelProgress label="Streaming channel progress" stage={stage}/>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>2</div><div className={styles.paymentFlowBody}><strong>Configure the stream</strong><label><input disabled={streaming} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><span>CKB</span></label><label><input disabled={streaming} inputMode="numeric" onChange={(e) => setIntervalSeconds(e.target.value)} value={intervalSeconds}/><span>seconds</span></label></div><div className={styles.compactActions}><button className={styles.paymentButton} disabled={!ready || streaming || Boolean(runtime.busy)} onClick={() => void startStream()}>Start stream</button><button disabled={!streaming} onClick={stop}>Stop</button></div></div>
    <div className={styles.oneWayChannelFacts}><div><span>Successful ticks</span><strong>{count}</strong></div><div><span>Total paid</span><strong>{hexToCkb(total)} CKB</strong></div><div><span>Interval</span><strong>{intervalSeconds}s</strong></div><div><span>Current status</span><strong>{status}</strong></div></div>
    {runtime.error && <div className={styles.paymentError}>{runtime.error}</div>}
  </div><div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Stream events and results</span><i className={styles.liveDot}/></div><div className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>tick</code><span>{event}</span></div>)}</div></div></div></>;
  return <RoutingTutorialFrame article={article} codeFiles={codeFiles} currentTutorialIndex={5} defaultFile="stream" demoDescription="Send a controlled sequence of real Testnet keysend payments through one reusable one-way channel." demoTitle="Run the Streaming Payment Demo" downloadHref="/downloads/fiber-streaming-payments.zip" liveDemo={liveDemo} nextHref="/docs/build/rusd-payment" previousHref="/docs/build/hold-invoice" sectionCode={sectionCode}/>;
}
