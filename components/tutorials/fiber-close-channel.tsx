'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Channel } from '@fiber-pay/sdk/browser';
import { type RoutingCodeFile, type RoutingCodeFocus, RoutingTutorialFrame } from './routing-tutorial-frame';
import { bottlePeer, ckbToHex, hexToCkb, samePubkey, shorten, useFiberRoutingNode } from './fiber-routing-runtime';
import { ChannelProgress, findMatchingChannel, isChannelReady, normalizedChannelState, progressFromChannelState, type ChannelProgressStage } from './fiber-tutorial-utils';
import styles from './fiber-wasm-quickstart.module.css';

const codeFiles: RoutingCodeFile[] = [
  { id: 'channels', label: 'lib/channels.ts', language: 'typescript', code: `export async function listEveryChannel(node) {
  return node.listChannels({ include_closed: true });
}

export function findRestorableChannel(channels, pubkey) {
  return channels.find(channel =>
    samePubkey(channel.pubkey, pubkey) &&
    channel.is_one_way &&
    !['CLOSED', 'SHUTTING_DOWN'].includes(channel.state.state_name)
  );
}` },
  { id: 'close', label: 'lib/close.ts', language: 'typescript', code: `export async function closeCooperatively(node, channel) {
  await node.shutdownChannel({
    channel_id: channel.channel_id,
    force: false,
  });
}

export async function waitForClosed(node, channelId) {
  while (true) {
    const { channels } = await node.listChannels({ include_closed: true });
    const channel = channels.find(item => item.channel_id === channelId);
    if (channel?.state.state_name === 'CLOSED') return channel;
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }
}` },
  { id: 'balance', label: 'lib/recovery.ts', language: 'typescript', code: `export async function observeRecovery(node, channel) {
  const before = await queryCkbBalance(node.fundingLockScript);
  await closeCooperatively(node, channel);
  const closed = await waitForClosed(node, channel.channel_id);
  const after = await queryCkbBalance(node.fundingLockScript);
  return {
    before,
    after,
    recovered: after - before,
    transaction: closed.shutdown_transaction_hash,
  };
}` },
  { id: 'app', label: 'app/close/page.tsx', language: 'tsx', code: `'use client';

export default function CloseChannelPage() {
  const [state, setState] = useState('CHANNEL_READY');
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);

  async function close() {
    setBefore(await queryBalance());
    await closeCooperatively(node, selectedChannel);
    setState('SHUTTING_DOWN');
  }

  useEffect(() => pollClosedChannel({
    includeClosed: true,
    onChannel(channel) { setState(channel.state.state_name); },
    onBalance: setAfter,
  }), []);

  return <RecoveryResult state={state} before={before} after={after} />;
}` },
];
const sectionCode: Record<string, RoutingCodeFocus> = { restore: { file: 'channels', start: 1, end: 11 }, close: { file: 'close', start: 1, end: 6 }, confirm: { file: 'close', start: 8, end: 16 }, recover: { file: 'balance', start: 1, end: 12 }, react: { file: 'app', start: 4, end: 20 } };

export function FiberCloseChannelTutorial() {
  const runtime = useFiberRoutingNode('fiber-docs:unidirectional-channel-v1');
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [stage, setStage] = useState<ChannelProgressStage>('idle');
  const [before, setBefore] = useState<bigint | null>(null);
  const [after, setAfter] = useState<bigint | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-10), message]), []);
  const reusable = useMemo(() => findMatchingChannel(runtime.channels, bottlePeer.pubkey, (item) => item.is_one_way), [runtime.channels]);
  const selected = useMemo(() => {
    if (reusable) return reusable;
    const matches = allChannels.filter((item) => samePubkey(item.pubkey, bottlePeer.pubkey) && item.is_one_way);
    return matches.sort((left, right) => Number(BigInt(right.created_at) - BigInt(left.created_at)))[0];
  }, [allChannels, reusable]);
  const ready = isChannelReady(selected);
  const state = selected?.state.state_name ?? 'Not opened';
  const closed = selected ? normalizedChannelState(state) === 'closed' : false;
  const connected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const refreshAll = useCallback(async () => {
    const node = runtime.nodeRef.current; if (!node) return;
    setAllChannels((await node.listChannels({ include_closed: true })).channels);
    await runtime.refresh();
  }, [runtime]);
  useEffect(() => { if (selected) setStage(progressFromChannelState(selected)); }, [selected]);
  useEffect(() => {
    if (!runtime.nodeInfo) return;
    void refreshAll();
    const timer = window.setInterval(() => void refreshAll(), 3_000);
    return () => window.clearInterval(timer);
  }, [refreshAll, runtime.nodeInfo]);

  const open = useCallback(async () => {
    const node = runtime.nodeRef.current; if (!node) return;
    setStage('connecting'); const online = connected || await runtime.connect(bottlePeer); if (!online) return setStage('error');
    const existing = findMatchingChannel((await node.listChannels()).channels, bottlePeer.pubkey, (item) => item.is_one_way);
    if (existing) { setStage(progressFromChannelState(existing)); addEvent(`Reused ${existing.state.state_name}`); return void refreshAll(); }
    setStage('submitting');
    const result = await runtime.run('open recovery channel', (current) => current.openChannel({ pubkey: bottlePeer.pubkey, funding_amount: ckbToHex('499'), public: false, one_way: true }));
    if (!result) return setStage('error');
    setStage('confirming'); addEvent(`Channel submitted · ${shorten(result.temporary_channel_id)}`); await refreshAll();
  }, [addEvent, connected, refreshAll, runtime]);
  const close = useCallback(async () => {
    if (!selected || !runtime.nodeRef.current) return;
    setBefore(runtime.balance); setAfter(null); setStage('closing'); addEvent('Cooperative shutdown requested');
    await runtime.run('close channel', (node) => node.shutdownChannel({ channel_id: selected.channel_id, force: false }));
    await refreshAll();
  }, [addEvent, refreshAll, runtime, selected]);
  useEffect(() => {
    if (!closed || before === null) return;
    setAfter(runtime.balance); addEvent(`Channel closed · ${shorten(selected?.shutdown_transaction_hash ?? '')}`);
  }, [addEvent, before, closed, runtime.balance, selected?.shutdown_transaction_hash]);

  const article = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Channel lifecycle</span><span className={styles.eyebrowRule}/><span>20 minute tutorial</span></div><h1>Close a Fiber Channel and Recover Funds</h1><p className={styles.lead}>Restore an existing one-way channel, request a cooperative shutdown, and follow its balance back to the browser funding address.</p><div className={styles.heroMeta}><span>Shutdown</span><span>Recovery</span><span>On-chain</span></div></header>
    <section className={styles.section} data-tutorial-section="restore"><div className={styles.stepLabel}><span>1</span> Restore before creating</div><h2>Look for an existing channel after refresh</h2><p>The browser starts with the same persisted identity as the one-way tutorials. It first lists active channels and reuses any compatible opening or ready channel.</p><small className={styles.fileReference}>lib/channels.ts · lines 1–11</small></section>
    <section className={styles.section} data-tutorial-section="close"><div className={styles.stepLabel}><span>2</span> Request shutdown</div><h2>Prefer a cooperative close</h2><p><code>shutdownChannel()</code> asks both peers to agree on final balances and publish the closing transaction. This tutorial intentionally leaves force close out of the primary flow.</p><small className={styles.fileReference}>lib/close.ts · lines 1–6</small></section>
    <section className={styles.section} data-tutorial-section="confirm"><div className={styles.stepLabel}><span>3</span> Follow every state</div><h2>Keep closed channels in the query</h2><p>Normal active-channel lists eventually drop the channel. Poll with <code>include_closed: true</code> so the UI can show <code>SHUTTING_DOWN → CLOSED</code> and the shutdown transaction hash.</p><small className={styles.fileReference}>lib/close.ts · lines 8–16</small></section>
    <section className={styles.section} data-tutorial-section="recover"><div className={styles.stepLabel}><span>4</span> Reconcile funds</div><h2>Observe the on-chain balance before and after</h2><p>Closing returns the final local allocation to the configured shutdown script, minus on-chain fees. Indexing may lag behind the channel state, so the page continues polling.</p><small className={styles.fileReference}>lib/recovery.ts · lines 1–12</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Make completion explicit</div><h2>Show state, transaction, and recovered balance</h2><p>The final panel preserves the closed channel record and compares funding-address snapshots instead of making the channel disappear.</p><small className={styles.fileReference}>app/close/page.tsx · lines 4–20</small></section>
  </>;
  const recovered = before !== null && after !== null ? after - before : null;
  const liveDemo = <><div className={styles.panelHeader}><span><i className={styles.liveDot}/> Cooperative channel shutdown</span><button className={styles.headerAction} disabled={!runtime.nodeInfo} onClick={() => void refreshAll()}>Refresh</button></div><div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}><div className={styles.paymentCard}>
    <div className={styles.routeStatusGrid}><div><span>Node</span><strong>{runtime.nodeState}</strong></div><div><span>Peer</span><strong>{connected ? 'Connected' : 'Offline'}</strong></div><div><span>Channel</span><strong>{state}</strong></div><div><span>Recovery</span><strong>{closed ? 'Closed' : stage === 'closing' ? 'Pending' : 'Not started'}</strong></div></div>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>1</div><div><strong>Restore or prepare a one-way channel</strong><span>{runtime.address ? `${hexToCkb(runtime.balance)} CKB · ${shorten(runtime.address, 14, 10)}` : 'Start the persisted browser identity.'}</span></div><div className={styles.compactActions}><button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>Start</button><a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a><button className={styles.paymentButton} disabled={!runtime.nodeInfo || Boolean(reusable) || Boolean(runtime.busy) || (runtime.balance ?? 0n) < BigInt(ckbToHex('499'))} onClick={() => void open()}>Open if needed</button></div></div>
    {runtime.address && <div className={styles.rebalanceAddress}><code>{runtime.address}</code><button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button></div>}
    {!closed && <ChannelProgress label="Channel preparation" stage={stage}/>}
    <div className={styles.oneWayChannelFacts}><div><span>Channel ID</span><strong title={selected?.channel_id}>{shorten(selected?.channel_id ?? '')}</strong></div><div><span>Local balance</span><strong>{hexToCkb(selected?.local_balance)} CKB</strong></div><div><span>Shutdown tx</span><strong title={selected?.shutdown_transaction_hash ?? ''}>{shorten(selected?.shutdown_transaction_hash ?? '')}</strong></div><div><span>State</span><strong>{state}</strong></div></div>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>2</div><div><strong>Close cooperatively</strong><span>Both peers agree on final balances before returning funds on-chain.</span></div><button className={styles.paymentButton} disabled={!ready || Boolean(runtime.busy) || stage === 'closing'} onClick={() => void close()}>{stage === 'closing' ? 'Closing…' : closed ? 'Closed' : 'Close channel'}</button></div>
    {before !== null && <div className={styles.balanceComparison}><span>Funding address</span><div><b>Before → after</b><code>{hexToCkb(before)} → {hexToCkb(after)} CKB</code><i>{recovered === null ? 'Waiting for indexer' : `${recovered >= 0n ? '+' : ''}${hexToCkb(recovered)} CKB`}</i></div></div>}
    {runtime.error && <div className={styles.paymentError}>{runtime.error}</div>}
  </div><div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Shutdown events and results</span><i className={styles.liveDot}/></div><div className={styles.eventList}><div><time>CH</time><code>state</code><span>{state}</span></div>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>close</code><span>{event}</span></div>)}</div></div></div></>;
  return <RoutingTutorialFrame article={article} codeFiles={codeFiles} currentTutorialIndex={7} defaultFile="close" demoDescription="Cooperatively close a real Testnet channel and watch its final balance return on-chain." demoTitle="Run the Channel Recovery Demo" downloadHref="/downloads/fiber-close-channel.zip" liveDemo={liveDemo} previousHref="/docs/build/rusd-payment" sectionCode={sectionCode}/>;
}
