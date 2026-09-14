'use client';

import { useRef, useState } from 'react';
import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { scriptToAddress } from '@fiber-pay/sdk/browser';
import { connectAndOpenRoleChannel, startRole } from '../lib/fiber';
import { createReceiverInvoice } from '../lib/invoice';
import { copyInvoice, pasteInvoice } from '../lib/invoice-transfer';
import { payMultiHopInvoice } from '../lib/payment';

export default function Page() {
  const sender = useRef<FiberBrowserNode | null>(null);
  const receiver = useRef<FiberBrowserNode | null>(null);
  const [senderAddress, setSenderAddress] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [senderInvoice, setSenderInvoice] = useState('');
  const [status, setStatus] = useState('Stopped');

  async function start(role: 'sender' | 'receiver') {
    const current = await startRole(role);
    const info = await current.nodeInfo();
    const address = scriptToAddress(info.default_funding_lock_script, 'testnet');
    if (role === 'sender') {
      sender.current = current;
      setSenderAddress(address);
    } else {
      receiver.current = current;
      setReceiverAddress(address);
    }
    setStatus(`${role} running`);
  }

  async function connectAndOpen(role: 'sender' | 'receiver') {
    const node = role === 'sender' ? sender.current : receiver.current;
    if (!node) return;
    await connectAndOpenRoleChannel(node);
    setStatus(`${role} connected; channel opening — wait for CHANNEL_READY`);
  }

  async function createInvoice() {
    if (!receiver.current) return;
    const result = await createReceiverInvoice(receiver.current, '1');
    setGeneratedInvoice(result.invoice_address);
    setSenderInvoice('');
    setStatus('Invoice created by Node C');
  }

  async function pay() {
    if (!sender.current || !senderInvoice) return;
    const result = await payMultiHopInvoice(sender.current, senderInvoice);
    setStatus(result.status);
  }

  return <main>
    <h1>Multi-Hop Invoice Payment</h1>
    <p>{status}</p>
    <div className="grid">
      <section className="card">
        <strong>Node A · Sender</strong>
        <button onClick={() => start('sender')}>Start Node A</button>
        <code>{senderAddress}</code>
        <button onClick={() => connectAndOpen('sender')}>Connect &amp; open 499 CKB channel</button>
      </section>
      <section className="card">
        <strong>Node C · Receiver</strong>
        <button onClick={() => start('receiver')}>Start Node C</button>
        <code>{receiverAddress}</code>
        <button onClick={() => connectAndOpen('receiver')}>Connect &amp; open 499 CKB channel</button>
      </section>
      <section className="card">
        <strong>Node C · Create</strong>
        <button onClick={createInvoice}>Create 1 CKB invoice</button>
        <textarea readOnly value={generatedInvoice} />
        <button onClick={() => copyInvoice(generatedInvoice)}>Copy invoice</button>
      </section>
      <section className="card">
        <strong>Node A · Pay</strong>
        <textarea onChange={(event) => setSenderInvoice(event.target.value)} value={senderInvoice} />
        <button onClick={async () => setSenderInvoice(await pasteInvoice())}>Paste invoice</button>
        <button disabled={!senderInvoice} onClick={pay}>Pay multi-hop invoice</button>
      </section>
    </div>
  </main>;
}
