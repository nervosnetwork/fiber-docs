'use client';

import { useEffect, useRef, useState } from 'react';
import type { Channel, CkbInvoiceStatus, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle, connectAndOpenChannel, prepareWorkerInbound, startRole } from '../lib/fiber';
import { createJobInvoice, fundJob } from '../lib/job-invoice';
import { faultyResult, type VerificationCheck, type WorkerResult, validResult, verifyResult } from '../lib/job';
import { createVerifierLock, releaseSettlement } from '../lib/verifier';

type Role = 'requester' | 'worker';
type JobStatus = 'Draft' | 'Funded' | 'Running' | 'Submitted' | 'Verified' | 'Rejected' | 'Settled';

export default function Page() {
  const requester = useRef<FiberBrowserNode | null>(null);
  const worker = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState('Start Requester A and Worker C');
  const [requesterChannel, setRequesterChannel] = useState<Channel | null>(null);
  const [workerChannel, setWorkerChannel] = useState<Channel | null>(null);
  const [invoice, setInvoice] = useState('');
  const [pasted, setPasted] = useState('');
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [preimage, setPreimage] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [jobStatus, setJobStatus] = useState<JobStatus>('Draft');
  const [mode, setMode] = useState<'valid' | 'faulty'>('valid');
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);

  async function start(role: Role) {
    try {
      setStatus(`Starting ${role === 'requester' ? 'Requester A' : 'Worker C'}…`);
      const node = await startRole(role);
      if (role === 'requester') requester.current = node;
      else worker.current = node;
      setStatus(`${role === 'requester' ? 'Requester A' : 'Worker C'} is running`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function prepare(role: Role) {
    const node = role === 'requester' ? requester.current : worker.current;
    if (!node) return;
    try {
      setStatus(`Opening ${role} channel to Bottle; Testnet confirmation can take a few minutes…`);
      const channel = await connectAndOpenChannel(node);
      if (role === 'requester') setRequesterChannel(channel);
      else setWorkerChannel(channel);
      setStatus(`${role === 'requester' ? 'Requester' : 'Worker'} channel is ready`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function prepareInbound() {
    if (!worker.current) return;
    setStatus('Worker C is moving 5 CKB to Bottle to create inbound liquidity…');
    const payment = await prepareWorkerInbound(worker.current);
    const channel = (await worker.current.listChannels()).channels.find(
      (item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
    );
    setWorkerChannel(channel ?? null);
    setStatus(payment.status === 'Success' ? 'Worker inbound liquidity is ready' : `Inbound payment: ${payment.status}`);
  }

  async function createInvoice() {
    if (!worker.current) return;
    const lock = await createVerifierLock();
    const created = await createJobInvoice(worker.current, lock.paymentHash);
    setPaymentHash(lock.paymentHash);
    setPreimage(lock.preimage);
    setInvoice(created.invoice_address);
    setPasted('');
    setInvoiceStatus('Open');
    setPaymentStatus('Not sent');
    setJobStatus('Draft');
    setResult(null);
    setChecks([]);
    await navigator.clipboard.writeText(created.invoice_address);
    setStatus('Verifier V created K/H; Worker C copied the locked Invoice');
  }

  async function fund() {
    if (!requester.current || !workerChannel) return;
    const payment = await fundJob(requester.current, pasted, workerChannel);
    setPaymentStatus(payment.status);
    setStatus('Funding submitted. Wait for the Worker Invoice to reach Received.');
  }

  async function runWorker() {
    if (invoiceStatus !== 'Received') return;
    setJobStatus('Running');
    setResult(null);
    setChecks([]);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setResult(mode === 'valid' ? validResult : faultyResult);
    setJobStatus('Submitted');
    setStatus('Worker C submitted a structured route allocation');
  }

  function runVerifier() {
    if (!result) return;
    const nextChecks = verifyResult(result);
    const passed = nextChecks.every((check) => check.passed);
    setChecks(nextChecks);
    setJobStatus(passed ? 'Verified' : 'Rejected');
    setStatus(passed ? 'Verifier V passed every rule; settlement is unlocked' : 'Verifier V rejected the result; K remains hidden');
  }

  async function settle() {
    if (!worker.current || !paymentHash || !preimage || jobStatus !== 'Verified') return;
    const paid = await releaseSettlement(worker.current, paymentHash, preimage);
    setInvoiceStatus(paid.status);
    setJobStatus('Settled');
    setStatus('Verifier V released K; Worker Invoice is Paid');
  }

  async function cancel() {
    if (!worker.current || !paymentHash || jobStatus !== 'Rejected') return;
    const cancelled = await worker.current.cancelInvoice({ payment_hash: paymentHash });
    setInvoiceStatus(cancelled.status);
    setStatus('Rejected job cancelled; pending liquidity is released');
  }

  useEffect(() => {
    const refresh = async () => {
      if (requester.current) {
        const channels = (await requester.current.listChannels()).channels;
        setRequesterChannel(channels.find((item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase()) ?? null);
      }
      if (worker.current) {
        const channels = (await worker.current.listChannels()).channels;
        setWorkerChannel(channels.find((item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase()) ?? null);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!paymentHash) return;
    let checking = false;
    const poll = async () => {
      if (checking) return;
      checking = true;
      try {
        if (worker.current) setInvoiceStatus((await worker.current.getInvoice({ payment_hash: paymentHash })).status);
        if (requester.current) {
          try { setPaymentStatus((await requester.current.getPayment({ payment_hash: paymentHash })).status); }
          catch { /* The Requester does not know the payment before submission. */ }
        }
      } finally {
        checking = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => window.clearInterval(timer);
  }, [paymentHash]);

  useEffect(() => {
    if (invoiceStatus === 'Received' && jobStatus === 'Draft') setJobStatus('Funded');
  }, [invoiceStatus, jobStatus]);

  const requesterReady = requesterChannel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
  const workerReady = workerChannel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
  const workerInbound = BigInt(workerChannel?.remote_balance ?? '0x0');
  const canReceive = workerReady && workerInbound >= 100_000_000n;

  return <main>
    <header><span className="eyebrow">Fiber · Agent commerce</span><h1>Verified Agent Job</h1><p>Payment is locked first. A deterministic Verifier releases the settlement key only after the Worker result passes every rule.</p></header>
    <p className="status" aria-live="polite">{status}</p>

    <section className="contract"><div><span className="eyebrow">Job contract</span><h2>Allocate exactly 300 CKB</h2></div><div className="limits"><span>A ≤ 120</span><span>B ≤ 100</span><span>C ≤ 80</span><span>Total = 300</span></div></section>

    <div className="grid">
      {(['requester', 'worker'] as const).map((role) => <section className="card" key={role}><span className="eyebrow">{role === 'requester' ? 'Requester A' : 'Worker C'}</span><h2>Prepare the {role}</h2><div className="row"><button onClick={() => void start(role)}>Start local node</button><button onClick={() => void prepare(role)}>Open 499 CKB channel</button></div>{role === 'worker' && workerChannel && <div className="liquidity"><span>Inbound: {Number(workerInbound) / 100_000_000} CKB</span><button disabled={!workerReady || workerInbound >= 500_000_000n} onClick={() => void prepareInbound()}>{workerInbound >= 500_000_000n ? '✓ Inbound ready' : 'Prepare 5 CKB inbound'}</button></div>}</section>)}
    </div>

    <div className="grid">
      <section className="card"><span className="eyebrow">Worker C · Locked Invoice</span><button disabled={!canReceive} onClick={() => void createInvoice()}>Create job Invoice &amp; copy</button><textarea readOnly placeholder="Locked Invoice appears here" value={invoice}/></section>
      <section className="card"><span className="eyebrow">Requester A · Fund</span><textarea onChange={(event) => setPasted(event.target.value)} placeholder="Paste the job Invoice" value={pasted}/><button disabled={!requesterReady || !canReceive || !pasted.trim()} onClick={() => void fund()}>Fund agent job</button><p className="mini-status">Invoice: <b>{invoiceStatus}</b> · Payment: <b>{paymentStatus}</b></p></section>
    </div>

    <div className="grid job-grid">
      <section className="card"><span className="eyebrow">Worker C · Execution</span><h2>{jobStatus}</h2><div className="toggle"><button aria-pressed={mode === 'valid'} onClick={() => setMode('valid')}>Valid</button><button aria-pressed={mode === 'faulty'} onClick={() => setMode('faulty')}>Faulty</button></div><button disabled={invoiceStatus !== 'Received' || jobStatus === 'Running'} onClick={() => void runWorker()}>{jobStatus === 'Running' ? 'Running…' : 'Run Worker C'}</button><pre>{result ? JSON.stringify(result, null, 2) : '// Result appears here'}</pre></section>
      <section className="card"><span className="eyebrow">Verifier V · Rules</span><h2>{jobStatus === 'Verified' ? 'Passed' : jobStatus === 'Rejected' ? 'Rejected' : 'Not evaluated'}</h2><p className="key">Settlement key K: {jobStatus === 'Verified' || jobStatus === 'Settled' ? `${preimage.slice(0, 14)}…` : 'hidden'}</p><button disabled={jobStatus !== 'Submitted'} onClick={runVerifier}>Run verification</button><div className="checks">{checks.length ? checks.map((check) => <div className={check.passed ? 'pass' : 'fail'} key={check.label}><b>{check.passed ? '✓' : '×'}</b><span>{check.label}</span></div>) : <p>Checks unlock after Worker submission.</p>}</div></section>
    </div>

    <section className="decision"><div><span className="eyebrow">Verifier V · Settlement policy</span><h2>{jobStatus}</h2><p>Fiber guarantees atomic settlement for a valid preimage. The application&apos;s Verifier is responsible for deciding whether the Worker result deserves that preimage.</p></div><div className="decision-actions"><button className="settle" disabled={jobStatus !== 'Verified'} onClick={() => void settle()}>Release K &amp; settle</button><button className="cancel" disabled={jobStatus !== 'Rejected'} onClick={() => void cancel()}>Reject &amp; cancel</button></div></section>
    <aside><strong>Teaching trust model:</strong> this demo keeps K and runs the Verifier in one browser. A production system should authenticate evidence and place K behind a TEE, proof verifier, committee, or application service.</aside>
  </main>;
}
