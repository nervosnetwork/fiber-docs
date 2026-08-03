'use client';
import { useRef, useState } from 'react';
import { scriptToAddress, type FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { connectToRouter, routerPubkey, startFiber } from '../../lib/fiber';
import { openCkbChannel } from '../../lib/channel';
import { sendKeysend } from '../../lib/payment';

export default function PayPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Not sent');
  async function start() { const fiber = await startFiber(); node.current = fiber; const info = await fiber.getNodeInfo(); setAddress(scriptToAddress(info.default_funding_lock_script, 'testnet')); }
  async function connect() { if (!node.current) return; await connectToRouter(node.current); setConnected(true); }
  async function open() { if (!node.current) return; await openCkbChannel(node.current, routerPubkey, '499'); setReady(true); }
  async function pay() { if (!node.current) return; setStatus((await sendKeysend(node.current, routerPubkey, '1')).status); }
  return <main><h1>Fiber channel payment</h1><button onClick={start}>Start node</button><button disabled={!node.current} onClick={connect}>Connect peer</button><code>{address}</code><a href="https://faucet.nervos.org" target="_blank">Fund with Testnet CKB ↗</a><button disabled={!connected} onClick={open}>Open 499 CKB channel</button><button disabled={!ready} onClick={pay}>Send 1 CKB</button><p>{status}</p></main>;
}
