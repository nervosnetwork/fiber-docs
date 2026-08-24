'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NodeInfoResult, Script } from '@fiber-pay/sdk/browser';
import { type RoutingCodeFile, type RoutingCodeFocus, RoutingTutorialFrame } from './routing-tutorial-frame';
import { bottlePeer, hexToCkb, samePubkey, shorten, useFiberRoutingNode } from './fiber-routing-runtime';
import { ChannelProgress, findMatchingChannel, isChannelReady, progressFromChannelState, type ChannelProgressStage } from './fiber-tutorial-utils';
import styles from './fiber-wasm-quickstart.module.css';

const rusdTypeScript: Script = {
  code_hash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
  hash_type: 'type',
  args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
};
const rusdUnit = 100_000_000n;
const rusdToHex = (value: string) => {
  if (!/^\d+(\.\d{1,8})?$/.test(value.trim())) throw new Error('Enter a valid RUSD amount.');
  const [whole, fraction = ''] = value.trim().split('.');
  return `0x${(BigInt(whole) * rusdUnit + BigInt(fraction.padEnd(8, '0'))).toString(16)}` as `0x${string}`;
};
const formatRusd = (value: bigint | null | undefined) => {
  if (value === null || value === undefined) return '—';
  const fraction = (value % rusdUnit).toString().padStart(8, '0').replace(/0+$/, '');
  return `${value / rusdUnit}${fraction ? `.${fraction}` : ''}`;
};
function littleEndianU128(data: string) {
  const bytes = (data.replace(/^0x/, '').slice(0, 32).match(/../g) ?? []).reverse().join('');
  return bytes ? BigInt(`0x${bytes}`) : 0n;
}
async function queryRusdBalance(lock: NodeInfoResult['default_funding_lock_script']) {
  const response = await fetch('https://testnet.ckbapp.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'get_cells', params: [{ script: lock, script_type: 'lock', filter: { script: rusdTypeScript } }, 'asc', '0x64'] }) });
  const payload = await response.json() as { result?: { objects?: Array<{ output_data: string }> }; error?: { message?: string } };
  if (!payload.result?.objects) throw new Error(payload.error?.message ?? 'Unable to query RUSD balance.');
  return payload.result.objects.reduce((sum, cell) => sum + littleEndianU128(cell.output_data), 0n);
}

const codeFiles: RoutingCodeFile[] = [
  { id: 'asset', label: 'lib/rusd.ts', language: 'typescript', code: `export const rusdTypeScript = {
  code_hash: '0x1142755a...677d21a',
  hash_type: 'type',
  args: '0x878fcc6f...526439b',
};

export async function queryRusdBalance(lockScript) {
  const cells = await indexer.getCells({
    script: lockScript, script_type: 'lock',
    filter: { script: rusdTypeScript },
  });
  return cells.reduce((sum, cell) => sum + readLeU128(cell.output_data), 0n);
}` },
  { id: 'channel', label: 'lib/channel.ts', language: 'typescript', code: `export async function openRusdChannel(node) {
  await node.connectPeer(bottle);
  return node.openChannel({
    pubkey: bottle.pubkey,
    funding_amount: rusdToHex('20'),
    funding_udt_type_script: rusdTypeScript,
    public: true,
  });
}` },
  { id: 'payment', label: 'lib/payment.ts', language: 'typescript', code: `export async function sendRusd(node, amount) {
  const submitted = await node.sendPayment({
    target_pubkey: bottle.pubkey,
    amount: rusdToHex(amount),
    udt_type_script: rusdTypeScript,
    keysend: true,
  });
  if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
  return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
}` },
  { id: 'app', label: 'app/rusd/page.tsx', language: 'tsx', code: `'use client';

export default function RusdPage() {
  const [walletBalance, setWalletBalance] = useState(null);
  const [channelBalance, setChannelBalance] = useState(null);
  const [payment, setPayment] = useState('Not sent');

  async function refresh() {
    setWalletBalance(await queryRusdBalance(nodeInfo.default_funding_lock_script));
    setChannelBalance((await findRusdChannel(node)).local_balance);
  }

  async function pay() {
    const result = await sendRusd(node, '1');
    setPayment(result.status);
    await refresh();
  }

  return <RusdBalances wallet={walletBalance} channel={channelBalance} payment={payment} />;
}` },
];
const sectionCode: Record<string, RoutingCodeFocus> = { asset: { file: 'asset', start: 1, end: 12 }, fund: { file: 'asset', start: 7, end: 12 }, channel: { file: 'channel', start: 1, end: 10 }, payment: { file: 'payment', start: 1, end: 11 }, react: { file: 'app', start: 4, end: 20 } };

export function FiberRusdPaymentTutorial() {
  const runtime = useFiberRoutingNode('fiber-docs:rusd-payment-v1');
  const [walletRusd, setWalletRusd] = useState<bigint | null>(null);
  const [amount, setAmount] = useState('1');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [stage, setStage] = useState<ChannelProgressStage>('idle');
  const [events, setEvents] = useState<string[]>([]);
  const channel = useMemo(() => findMatchingChannel(runtime.channels, bottlePeer.pubkey, (item) => Boolean(item.funding_udt_type_script)), [runtime.channels]);
  const ready = isChannelReady(channel);
  const connected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-10), message]), []);
  const refreshRusd = useCallback(async () => {
    if (!runtime.nodeInfo) return;
    try { setWalletRusd(await queryRusdBalance(runtime.nodeInfo.default_funding_lock_script)); }
    catch (error) { runtime.setError(error instanceof Error ? error.message : 'Unable to query RUSD.'); }
  }, [runtime]);
  useEffect(() => { if (runtime.nodeInfo) void refreshRusd(); }, [refreshRusd, runtime.nodeInfo]);
  useEffect(() => { if (channel) setStage(progressFromChannelState(channel)); }, [channel]);

  const open = useCallback(async () => {
    const node = runtime.nodeRef.current; if (!node) return;
    setStage('connecting');
    const online = connected || await runtime.connect(bottlePeer); if (!online) return setStage('error');
    const existing = findMatchingChannel((await node.listChannels()).channels, bottlePeer.pubkey, (item) => Boolean(item.funding_udt_type_script));
    if (existing) { setStage(progressFromChannelState(existing)); addEvent(`Reused ${existing.state.state_name}`); return void runtime.refresh(); }
    setStage('submitting');
    const result = await runtime.run('open RUSD channel', (current) => current.openChannel({ pubkey: bottlePeer.pubkey, funding_amount: rusdToHex('20'), funding_udt_type_script: rusdTypeScript, public: true }));
    if (!result) return setStage('error');
    setStage('confirming'); addEvent(`20 RUSD channel submitted · ${shorten(result.temporary_channel_id)}`); await runtime.refresh(); await refreshRusd();
  }, [addEvent, connected, refreshRusd, runtime]);
  const pay = useCallback(async () => {
    setPaymentStatus('Sending');
    const submitted = await runtime.run('send RUSD', (node) => node.sendPayment({ target_pubkey: bottlePeer.pubkey, amount: rusdToHex(amount), udt_type_script: rusdTypeScript, keysend: true }));
    if (!submitted) return setPaymentStatus('Failed');
    const result = submitted.status === 'Success' || submitted.status === 'Failed' ? submitted : await runtime.nodeRef.current!.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
    setPaymentStatus(result.status); addEvent(`${result.status} · ${amount} RUSD · ${shorten(result.payment_hash)}`); await runtime.refresh(); await refreshRusd();
  }, [addEvent, amount, refreshRusd, runtime]);

  const article = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Stablecoin</span><span className={styles.eyebrowRule}/><span>25 minute tutorial</span></div><h1>Pay with RUSD over Fiber</h1><p className={styles.lead}>Fund a Fiber channel with Testnet RUSD, inspect token balances, and send a stablecoin payment to Bottle.</p><div className={styles.heroMeta}><span>RUSD</span><span>UDT channel</span><span>Keysend</span></div></header>
    <section className={styles.section} data-tutorial-section="asset"><div className={styles.stepLabel}><span>1</span> Identify the asset</div><h2>A Fiber UDT is defined by its type script</h2><p>CKB and RUSD use the same channel APIs, but an RUSD request includes the Testnet RUSD type script. The script—not a ticker string—identifies the asset.</p><small className={styles.fileReference}>lib/rusd.ts · lines 1–12</small></section>
    <section className={styles.section} data-tutorial-section="fund"><div className={styles.stepLabel}><span>2</span> Fund the browser identity</div><h2>Provide both CKB capacity and Testnet RUSD</h2><p>CKB pays for cells and transaction fees. RUSD supplies channel liquidity. The demo queries matching UDT cells and decodes each little-endian amount.</p><div className={styles.note}><strong>Testnet assets only</strong><p>Use the Nervos faucet for CKB and the Stable++ Testnet faucet for RUSD.</p></div><small className={styles.fileReference}>lib/rusd.ts · lines 7–12</small></section>
    <section className={styles.section} data-tutorial-section="channel"><div className={styles.stepLabel}><span>3</span> Open the RUSD channel</div><h2>Pass the asset type script when funding</h2><p>The 20 RUSD amount is expressed in its smallest unit and paired with <code>funding_udt_type_script</code>. The browser reuses an existing compatible channel after refresh.</p><small className={styles.fileReference}>lib/channel.ts · lines 1–10</small></section>
    <section className={styles.section} data-tutorial-section="payment"><div className={styles.stepLabel}><span>4</span> Send RUSD</div><h2>Keep the same asset on the payment</h2><p>The payment includes <code>udt_type_script</code> so routing selects RUSD liquidity rather than a CKB channel.</p><small className={styles.fileReference}>lib/payment.ts · lines 1–11</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Reconcile balances</div><h2>Show wallet and channel liquidity separately</h2><p>On-chain RUSD decreases when it enters the channel; the channel local balance decreases as payments are sent. The interface keeps both layers visible.</p><small className={styles.fileReference}>app/rusd/page.tsx · lines 4–20</small></section>
  </>;
  const liveDemo = <><div className={styles.panelHeader}><span><i className={styles.liveDot}/> RUSD Testnet flow</span><button className={styles.headerAction} disabled={!runtime.nodeInfo} onClick={() => { void runtime.refresh(); void refreshRusd(); }}>Refresh</button></div><div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}><div className={styles.paymentCard}>
    <div className={styles.routeStatusGrid}><div><span>Node</span><strong>{runtime.nodeState}</strong></div><div><span>Wallet RUSD</span><strong>{formatRusd(walletRusd)}</strong></div><div><span>Channel</span><strong>{channel?.state.state_name ?? 'Not opened'}</strong></div><div><span>Payment</span><strong>{paymentStatus}</strong></div></div>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>1</div><div><strong>Start and fund the browser identity</strong><span>{runtime.address ? `${hexToCkb(runtime.balance)} CKB · ${formatRusd(walletRusd)} RUSD` : 'Start to derive the funding address.'}</span></div><div className={styles.compactActions}><button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>Start</button><a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">CKB ↗</a><a className={styles.faucetButton} href="https://testnet0815.stablepp.xyz/faucet" rel="noreferrer" target="_blank">RUSD ↗</a></div></div>
    {runtime.address && <div className={styles.rebalanceAddress}><code>{runtime.address}</code><button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button></div>}
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>2</div><div><strong>Open a 20 RUSD channel</strong><span>Public channel · Bottle acceptor</span></div><button className={styles.paymentButton} disabled={!runtime.nodeInfo || (walletRusd ?? 0n) < 20n * rusdUnit || Boolean(channel) || Boolean(runtime.busy)} onClick={() => void open()}>{stage === 'connecting' ? 'Connecting…' : stage === 'submitting' ? 'Opening…' : stage === 'confirming' ? 'Confirming…' : ready ? 'Ready' : 'Connect & open'}</button></div>
    <ChannelProgress label="RUSD channel progress" stage={stage}/>
    <div className={styles.oneWayChannelFacts}><div><span>Wallet balance</span><strong>{formatRusd(walletRusd)} RUSD</strong></div><div><span>Channel local</span><strong>{formatRusd(channel ? BigInt(channel.local_balance) : null)} RUSD</strong></div><div><span>Channel remote</span><strong>{formatRusd(channel ? BigInt(channel.remote_balance) : null)} RUSD</strong></div><div><span>Asset</span><strong>Testnet RUSD</strong></div></div>
    <div className={styles.paymentFlow}><div className={styles.paymentFlowNumber}>3</div><div className={styles.paymentFlowBody}><strong>Send stablecoin liquidity</strong><label><input disabled={!ready} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><span>RUSD</span></label></div><button className={styles.paymentButton} disabled={!ready || Boolean(runtime.busy)} onClick={() => void pay()}>{runtime.busy === 'send RUSD' ? 'Sending…' : 'Send RUSD'}</button></div>
    {runtime.error && <div className={styles.paymentError}>{runtime.error}</div>}
  </div><div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Asset events and results</span><i className={styles.liveDot}/></div><div className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>rusd</code><span>{event}</span></div>)}</div></div></div></>;
  return <RoutingTutorialFrame article={article} codeFiles={codeFiles} currentTutorialIndex={5} defaultFile="asset" demoDescription="Fund a real RUSD channel on Testnet and send stablecoin liquidity through Fiber." demoTitle="Run the RUSD Payment Demo" downloadHref="/downloads/fiber-rusd-payment.zip" liveDemo={liveDemo} nextHref="/docs/build/close-channel" previousHref="/docs/build/hold-invoice" sectionCode={sectionCode}/>;
}
