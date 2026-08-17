'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BrowserNodeState,
  Channel,
  FiberBrowserNode,
  NodeInfoResult,
} from '@fiber-pay/sdk/browser';

export type PublicFiberPeer = {
  name: string;
  pubkey: `0x${string}`;
  address: string;
};

export const bottlePeer: PublicFiberPeer = {
  name: 'Bottle',
  pubkey:
    '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71',
  address:
    '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo',
};

export const bracerPeer: PublicFiberPeer = {
  name: 'Bracer',
  pubkey:
    '0x0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc',
  address:
    '/dns4/bracer.fiber.channel/tcp/443/wss/p2p/QmbKyzq9qUmymW2Gi8Zq7kKVpPiNA1XUJ6uMvsUC4F3p89',
};

const shannonsPerCkb = 100_000_000n;
const isolationReloadKey = 'fiber-docs:routing-isolation-reload-v1';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function getOrCreateProfile(profileKey: string) {
  const stored = window.localStorage.getItem(profileKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        fiberKey: string;
        ckbKey: string;
        identifier: string;
      };
      if (
        /^[0-9a-f]{64}$/i.test(parsed.fiberKey) &&
        /^[0-9a-f]{64}$/i.test(parsed.ckbKey)
      ) {
        return {
          fiberKey: hexToBytes(parsed.fiberKey),
          ckbKey: hexToBytes(parsed.ckbKey),
          identifier: parsed.identifier,
        };
      }
    } catch {
      window.localStorage.removeItem(profileKey);
    }
  }

  const profile = {
    fiberKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: `${profileKey}-${crypto.randomUUID()}`,
  };
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
  return {
    fiberKey: hexToBytes(profile.fiberKey),
    ckbKey: hexToBytes(profile.ckbKey),
    identifier: profile.identifier,
  };
}

export function ckbToHex(value: string) {
  const amount = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(amount)) {
    throw new Error('Enter a valid CKB amount with at most 8 decimals.');
  }
  const [whole, fraction = ''] = amount.split('.');
  const shannons =
    BigInt(whole) * shannonsPerCkb + BigInt(fraction.padEnd(8, '0'));
  if (shannons <= 0n) throw new Error('Amount must be positive.');
  return `0x${shannons.toString(16)}` as `0x${string}`;
}

export function hexToCkb(value: string | bigint | null | undefined) {
  if (value === null || value === undefined) return '—';
  const shannons = typeof value === 'bigint' ? value : BigInt(value);
  const whole = shannons / shannonsPerCkb;
  const fraction = (shannons % shannonsPerCkb)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function shorten(value: string, head = 8, tail = 7) {
  if (!value) return '—';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function samePubkey(left: string, right: string) {
  return left.replace(/^0x/i, '').toLowerCase() ===
    right.replace(/^0x/i, '').toLowerCase();
}

function normalizedChannelState(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function isReusableChannel(channel: Channel) {
  const state = normalizedChannelState(channel.state.state_name);
  return (
    state !== 'closed' &&
    state !== 'shuttingdown' &&
    !state.includes('failed') &&
    !state.includes('aborted')
  );
}

export function findReusableChannel(channels: Channel[], pubkey: string) {
  const matches = channels.filter(
    (channel) =>
      samePubkey(channel.pubkey, pubkey) && isReusableChannel(channel),
  );
  return (
    matches.find((channel) =>
      normalizedChannelState(channel.state.state_name).includes('ready'),
    ) ?? matches[0]
  );
}

async function queryCkbBalance(script: NodeInfoResult['default_funding_lock_script']) {
  const response = await fetch('https://testnet.ckbapp.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'get_cells_capacity',
      params: [{ script, script_type: 'lock' }],
    }),
  });
  if (!response.ok) throw new Error('Unable to reach the Testnet indexer.');
  const payload = (await response.json()) as {
    result?: { capacity?: `0x${string}` };
    error?: { message?: string };
  };
  if (!payload.result?.capacity) {
    throw new Error(payload.error?.message ?? 'Unable to read the Testnet balance.');
  }
  return BigInt(payload.result.capacity);
}

export function useFiberRoutingNode(profileKey: string) {
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [isolationReady, setIsolationReady] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const node = nodeRef.current;
    if (!node) return;
    const [info, peerResult, channelResult] = await Promise.all([
      node.nodeInfo(),
      node.listPeers(),
      node.listChannels(),
    ]);
    setNodeInfo(info);
    setPeers(peerResult.peers.map((peer) => peer.pubkey));
    setChannels(channelResult.channels);
    setBalance(await queryCkbBalance(info.default_funding_lock_script));
  }, []);

  const start = useCallback(async () => {
    if (nodeRef.current || busy) return;
    setBusy('start');
    setError('');
    try {
      if (!window.crossOriginIsolated) {
        throw new Error('Cross-origin isolation is required. Reload this page once.');
      }
      const {
        FiberBrowserNode,
        RawKeyCredentialProvider,
        scriptToAddress,
      } = await import('@fiber-pay/sdk/browser');
      const profile = getOrCreateProfile(profileKey);
      const node = new FiberBrowserNode({
        network: 'testnet',
        credential: new RawKeyCredentialProvider(
          profile.fiberKey,
          profile.ckbKey,
          profile.identifier,
        ),
        nodeConfig: { bootnodes: [], logLevel: 'info' },
      });
      node.on('stateChange', setNodeState);
      node.on('error', (nodeError) => setError(nodeError.message));
      nodeRef.current = node;
      const info = await node.start();
      setNodeInfo(info);
      setAddress(scriptToAddress(info.default_funding_lock_script, 'testnet'));
      const [{ peers: currentPeers }, { channels: currentChannels }, currentBalance] =
        await Promise.all([
          node.listPeers(),
          node.listChannels(),
          queryCkbBalance(info.default_funding_lock_script),
        ]);
      setPeers(currentPeers.map((peer) => peer.pubkey));
      setChannels(currentChannels);
      setBalance(currentBalance);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : 'Unable to start the node.',
      );
      if (!nodeRef.current?.isRunning) nodeRef.current = null;
    } finally {
      setBusy('');
    }
  }, [busy, profileKey]);

  const connect = useCallback(
    async (peer: PublicFiberPeer) => {
      const node = nodeRef.current;
      if (!node || busy) return false;
      if (peers.some((pubkey) => samePubkey(pubkey, peer.pubkey))) return true;
      setBusy(`connect:${peer.name}`);
      setError('');
      try {
        await node.connectPeer({
          address: peer.address,
          pubkey: peer.pubkey,
        });
        let nextPeers = (await node.listPeers()).peers;
        let connected = nextPeers.some((item) =>
          samePubkey(item.pubkey, peer.pubkey),
        );
        for (let attempt = 0; !connected && attempt < 10; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          nextPeers = (await node.listPeers()).peers;
          connected = nextPeers.some((item) =>
            samePubkey(item.pubkey, peer.pubkey),
          );
        }
        setPeers(nextPeers.map((item) => item.pubkey));
        if (!connected) {
          throw new Error(
            `${peer.name} did not appear in the connected peer list. Try again.`,
          );
        }
        return true;
      } catch (connectError) {
        setError(
          connectError instanceof Error
            ? connectError.message
            : `Unable to connect to ${peer.name}.`,
        );
        return false;
      } finally {
        setBusy('');
      }
    },
    [busy, peers],
  );

  const run = useCallback(
    async <T,>(label: string, action: (node: FiberBrowserNode) => Promise<T>) => {
      const node = nodeRef.current;
      if (!node || busy) return undefined;
      setBusy(label);
      setError('');
      try {
        return await action(node);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : `Unable to ${label}.`,
        );
        return undefined;
      } finally {
        setBusy('');
      }
    },
    [busy],
  );

  useEffect(() => {
    const supported =
      window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';

    if (!supported) {
      const reloadedPath = window.sessionStorage.getItem(isolationReloadKey);
      if (reloadedPath !== window.location.pathname) {
        window.sessionStorage.setItem(
          isolationReloadKey,
          window.location.pathname,
        );
        window.location.reload();
        return;
      }
    } else {
      window.sessionStorage.removeItem(isolationReloadKey);
    }

    setIsolationReady(supported);
    return () => {
      void nodeRef.current?.stop();
      nodeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!nodeInfo) return;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== 'visible') return;
      checking = true;
      try {
        await refresh();
      } catch {
        // Keep the last successful snapshot; explicit actions surface errors.
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(() => void check(), 5_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [nodeInfo, refresh]);

  return {
    nodeRef,
    nodeState,
    nodeInfo,
    address,
    balance,
    peers,
    channels,
    busy,
    error,
    setError,
    isolationReady,
    start,
    connect,
    refresh,
    run,
  };
}
