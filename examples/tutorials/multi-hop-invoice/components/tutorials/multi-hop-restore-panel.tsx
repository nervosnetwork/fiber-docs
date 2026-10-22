'use client';

import { useEffect, useRef, useState } from 'react';
import { createLiquidityRestore, type LiquidityReturn } from './multi-hop-restore';
import { availableChannelBalance, maximumInvoiceAmount, invoiceAmountError } from './multi-hop-progress';
import { bottlePeer, findReusableChannel, hexToCkb, useFiberRoutingNode } from './fiber-routing-runtime';
import styles from './fiber-wasm-quickstart.module.css';

type Runtime = ReturnType<typeof useFiberRoutingNode>;
export function RestoreLiquidityPanel({ sender, receiver, onBlocked, onRestored }: {
  sender: Runtime;
  receiver: Runtime;
  onBlocked: (blocked: boolean) => void;
  onRestored: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('100');
  const [record, setRecord] = useState<LiquidityReturn | null>(null);
  const [working, setWorking] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const controller = useRef<ReturnType<typeof createLiquidityRestore> | null>(null);
  const notified = useRef('');
  const restoredCallback = useRef(onRestored);
  restoredCallback.current = onRestored;
  const a = findReusableChannel(sender.channels, bottlePeer.pubkey);
  const c = findReusableChannel(receiver.channels, bottlePeer.pubkey);
  const outbound = availableChannelBalance(c?.local_balance, c?.offered_tlc_balance);
  const inbound = availableChannelBalance(a?.remote_balance, a?.received_tlc_balance);
  const maximum = maximumInvoiceAmount(outbound, inbound);
  const validation = invoiceAmountError(amount, outbound, inbound)
    .replaceAll('Sender A', 'Node C').replaceAll('Receiver C', 'Node A');
  const pending = record?.phase === 'pending';
  const blocked = !ready || working || settling || pending;

  useEffect(() => { onBlocked(blocked); }, [blocked, onBlocked]);

  useEffect(() => {
    const payer = receiver.nodeRef.current;
    const payee = sender.nodeRef.current;
    if (!payer || !payee || !sender.nodeInfo || !receiver.nodeInfo) return;
    let active = true;
    try {
      const flow = createLiquidityRestore({
        payer, payee, bottle: bottlePeer.pubkey,
        key: `fiber-docs:liquidity-return:${receiver.nodeInfo.pubkey}:${sender.nodeInfo.pubkey}`,
        storage: window.localStorage,
        readLiquidity: async () => {
          const [aChannels, cChannels] = await Promise.all([payee.listChannels(), payer.listChannels()]);
          const a = findReusableChannel(aChannels.channels, bottlePeer.pubkey);
          const c = findReusableChannel(cChannels.channels, bottlePeer.pubkey);
          const isReady = (state?: string) => state?.replace(/[^a-z]/gi, '').toLowerCase() === 'channelready';
          if (!isReady(a?.state.state_name) || !isReady(c?.state.state_name)) throw new Error('Both channels must be ready before sending back to A.');
          return [availableChannelBalance(c?.local_balance, c?.offered_tlc_balance), availableChannelBalance(a?.remote_balance, a?.received_tlc_balance)];
        },
        onChange: next => {
          if (!active) return;
          setRecord(next);
          if (next.phase === 'success' && notified.current !== next.hash) {
            notified.current = next.hash;
            setSettling(true);
            void Promise.allSettled([sender.refresh(), receiver.refresh()]).then(() => {
              if (active) {
                restoredCallback.current();
                setSettling(false);
              }
            });
          }
        },
      });
      controller.current = flow;
      const saved = flow.current();
      setRecord(saved);
      if (saved?.phase === 'success') notified.current = saved.hash;
      if (saved?.phase === 'pending') setExpanded(true);
      setReady(true);
      void flow.check();
      const timer = window.setInterval(() => void flow.check(), 2_000);
      return () => { active = false; flow.dispose(); controller.current = null; window.clearInterval(timer); };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the return payment.');
      setExpanded(true);
    }
    return () => { active = false; controller.current = null; };
  }, [sender.nodeInfo?.pubkey, receiver.nodeInfo?.pubkey, sender.nodeRef, receiver.nodeRef, sender.refresh, receiver.refresh]);

  const open = () => {
    const suggested = maximum === undefined || maximum >= 10_000_000_000n ? 10_000_000_000n : maximum;
    setAmount(hexToCkb(suggested));
    setError('');
    if (record?.phase === 'success') setRecord(null);
    setExpanded(true);
  };
  const send = async () => {
    if (!controller.current || blocked || validation) return;
    setWorking(true);
    setError('');
    try { await controller.current.send(amount); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to start the return payment.'); }
    finally { setWorking(false); }
  };

  return (
    <div className={styles.multiHopRestore}>
      {!expanded ? <button type="button" disabled={!ready || Boolean(sender.busy) || Boolean(receiver.busy)} onClick={open}>Restore receiving liquidity</button> : <>
        <div className={styles.multiHopRestoreHeading}><strong>Restore receiving liquidity</strong>{!blocked && <button type="button" onClick={() => setExpanded(false)} aria-label="Close liquidity restoration">×</button>}</div>
        <p className={styles.multiHopHelp}>Send funds back from C through Bottle to A so you can practise receiving again.</p>
        {pending || working ? <div role="status" className={styles.multiHopRestoreStatus}>
          <strong>{record?.phase === 'pending' ? 'Return payment pending…' : 'Preparing return payment…'}</strong>
          <span>C → B → A · {record?.amount ?? amount} CKB</span>
          <p className={styles.multiHopHelp}>Keep this page open while settlement is checked. If you reload, this payment will be checked again before another return is allowed.</p>
          {record?.detail && <p className={styles.multiHopError}>The submission could not be confirmed. Checking this payment’s status; no second payment will be sent.</p>}
          <button type="button" onClick={() => void controller.current?.check()}>Check return status</button>
        </div> : record?.phase === 'success' ? <div role="status" className={styles.multiHopRestoreStatus}>
          <strong>Liquidity restored</strong><span>{record.amount} CKB received by A.</span>
          <button type="button" disabled={settling} onClick={() => { setRecord(null); setExpanded(false); }}>{settling ? 'Refreshing channel liquidity…' : 'Continue with a new invoice'}</button>
        </div> : <>
          <label className={styles.multiHopField}>Amount to return to A
            <span className={styles.multiHopAmountInput}><input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" aria-invalid={Boolean(validation)} aria-describedby="return-amount-help" /><span>CKB</span></span>
          </label>
          <p className={styles.multiHopHelp} id="return-amount-help">C → B → A · Max. routing fee: 1 CKB · Maximum return: {hexToCkb(maximum)} CKB</p>
          {validation && <p role="alert" className={styles.multiHopError}>{validation}</p>}
          {record?.phase === 'failed' && <p role="alert" className={styles.multiHopError}>The return payment failed. {record.detail}</p>}
          <button type="button" className={styles.verifiedPrimaryAction} disabled={!ready || Boolean(validation) || Boolean(sender.busy) || Boolean(receiver.busy)} onClick={() => void send()}>Send back to A</button>
        </>}
        {record && <span className={styles.multiHopRestoreHash}>Return payment hash: <code>{record.hash}</code></span>}
        {error && <p role="alert" className={styles.multiHopError}>{error}</p>}
      </>}
    </div>
  );
}
