'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  BrowserNodeState,
  FiberBrowserNode,
  NodeInfoResult,
} from '@fiber-pay/sdk/browser';
import styles from './fiber-wasm-quickstart.module.css';

const routerAddress =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';
const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';
const profileKey = 'fiber-docs:wasm-quickstart-profile-v1';
const isolationReloadKey = 'fiber-docs:wasm-isolation-reload-v1';

type CodeFile = {
  id: 'install' | 'headers' | 'fiber' | 'app';
  label: string;
  language: string;
  code: string;
};

const codeFiles: CodeFile[] = [
  {
    id: 'install',
    label: 'Terminal',
    language: 'shell',
    code: `npm create next-app@latest fiber-hello
cd fiber-hello
npm install @fiber-pay/sdk`,
  },
  {
    id: 'headers',
    label: 'next.config.mjs',
    language: 'javascript',
    code: `/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@fiber-pay/sdk',
    '@nervosnetwork/fiber-js',
  ],
  async headers() {
    return [{
      source: '/fiber',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
      ],
    }];
  },
};

export default nextConfig;`,
  },
  {
    id: 'fiber',
    label: 'lib/fiber.ts',
    language: 'typescript',
    code: `import type {
  BrowserNodeState,
  FiberBrowserNode,
} from '@fiber-pay/sdk/browser';

export const router =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/' +
  'QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';

export const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';

function randomKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function startFiber(
  onState: (state: BrowserNodeState) => void,
): Promise<FiberBrowserNode> {
  if (!crossOriginIsolated) {
    throw new Error('This page must be cross-origin isolated.');
  }

  const {
    FiberBrowserNode,
    RawKeyCredentialProvider,
  } = await import('@fiber-pay/sdk/browser');

  // Testnet quickstart: persist these keys in encrypted
  // application storage before using this in production.
  const credential = new RawKeyCredentialProvider(
    randomKey(),
    randomKey(),
    crypto.randomUUID(),
  );

  const node = new FiberBrowserNode({
    network: 'testnet',
    credential,
    nodeConfig: {
      bootnodes: [],
      logLevel: 'info',
    },
  });

  node.on('stateChange', onState);
  await node.start();
  return node;
}

export async function connectToRouter(node: FiberBrowserNode) {
  await node.connectPeer({
    address: router.replace(/\\/p2p\\/[^/]+$/, ''),
    pubkey: routerPubkey,
  });
}`,
  },
  {
    id: 'app',
    label: 'app/fiber/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useRef, useState } from 'react';
import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { connectToRouter, startFiber } from '@/lib/fiber';

export default function FiberPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState('idle');
  const [pubkey, setPubkey] = useState('');
  const [peers, setPeers] = useState(0);

  async function start() {
    const fiber = await startFiber(setStatus);
    node.current = fiber;
    const info = await fiber.getNodeInfo();
    setPubkey(info.pubkey);
  }

  async function connect() {
    if (!node.current) return;
    await connectToRouter(node.current);
    const peerList = await node.current.listPeers();
    setPeers(peerList.peers.length);
  }

  return (
    <main>
      <p>Fiber WASM · {status}</p>
      <h1>Your Fiber node, inside React.</h1>
      <button onClick={start}>Start node</button>
      <button disabled={!node.current} onClick={connect}>
        Connect peer
      </button>
      {pubkey && <code>{pubkey}</code>}
      <p>{peers} connected peers</p>
    </main>
  );
}`,
  },
];

type CodeFocus = {
  file: CodeFile['id'];
  start: number;
  end: number;
};

const sectionCode: Record<string, CodeFocus> = {
  intro: { file: 'app', start: 1, end: 5 },
  architecture: { file: 'fiber', start: 1, end: 10 },
  install: { file: 'install', start: 1, end: 3 },
  isolate: { file: 'headers', start: 1, end: 22 },
  start: { file: 'fiber', start: 13, end: 48 },
  'react-store': { file: 'app', start: 7, end: 11 },
  'react-connect': { file: 'app', start: 13, end: 18 },
  'react-render': { file: 'app', start: 20, end: 39 },
  extend: { file: 'app', start: 20, end: 39 },
};

const syntaxPattern =
  /(\/\/.*$|\/\*.*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][\w.]*|\b(?:import|from|export|default|const|let|var|function|async|await|return|if|else|throw|new|typeof|instanceof|true|false|null|undefined|type|interface|extends|implements|as|in|of)\b|\b(?:[A-Z][A-Za-z0-9_]*|[a-zA-Z_$][\w$]*(?=\())\b|\b\d[\d_]*(?:\.\d+)?n?\b)/g;

function syntaxClass(token: string) {
  if (token.startsWith('//') || token.startsWith('/*')) return styles.tokenComment;
  if (/^['"`]/.test(token)) return styles.tokenString;
  if (token.startsWith('<')) return styles.tokenTag;
  if (/^\d/.test(token)) return styles.tokenNumber;
  if (/^[A-Z]/.test(token)) return styles.tokenType;
  if (/^(true|false|null|undefined)$/.test(token)) return styles.tokenConstant;
  if (
    /^(import|from|export|default|const|let|var|function|async|await|return|if|else|throw|new|typeof|instanceof|type|interface|extends|implements|as|in|of)$/.test(
      token,
    )
  ) {
    return styles.tokenKeyword;
  }
  return styles.tokenFunction;
}

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(syntaxPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));
    parts.push(
      <span className={syntaxClass(match[0])} key={`${index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function getOrCreateProfile() {
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
    identifier: `fiber-quickstart-${crypto.randomUUID()}`,
  };
  window.localStorage.setItem(profileKey, JSON.stringify(profile));

  return {
    fiberKey: hexToBytes(profile.fiberKey),
    ckbKey: hexToBytes(profile.ckbKey),
    identifier: profile.identifier,
  };
}

function shorten(value?: string) {
  if (!value) return 'Waiting for node';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function friendlyState(state: BrowserNodeState) {
  if (state === 'running') return 'Node running';
  if (state === 'starting') return 'Starting WASM';
  if (state === 'stopping') return 'Stopping';
  if (state === 'error') return 'Connection issue';
  return 'Ready to start';
}

function CodeBlock({ file, focus }: { file: CodeFile; focus: CodeFocus }) {
  const codeRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const code = codeRef.current;
    const line = code?.querySelector<HTMLElement>(`[data-line="${focus.start}"]`);
    if (!code || !line) return;
    const lineTop =
      line.getBoundingClientRect().top -
      code.getBoundingClientRect().top +
      code.scrollTop;

    code.scrollTo({
      top: Math.max(0, lineTop - code.clientHeight * 0.28),
      behavior: 'smooth',
    });
  }, [file.id, focus.start]);

  return (
    <pre
      className={styles.code}
      aria-label={`${file.label} code`}
      ref={codeRef}
    >
      <code>
        {file.code.split('\n').map((line, index) => {
          const lineNumber = index + 1;
          const isFocused =
            focus.file === file.id &&
            lineNumber >= focus.start &&
            lineNumber <= focus.end;

          return (
            <span
              className={`${styles.codeLine} ${
                isFocused ? styles.focusedCodeLine : ''
              }`}
              data-line={lineNumber}
              key={`${file.id}-${index}`}
            >
              <span className={styles.lineNumber}>{lineNumber}</span>
              <span>{line ? highlightLine(line) : ' '}</span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function FiberWasmQuickstart() {
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState('intro');
  const [activeFile, setActiveFile] = useState<CodeFile['id']>('app');
  const [codeFocus, setCodeFocus] = useState<CodeFocus>(sectionCode.intro);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [busyAction, setBusyAction] = useState<'start' | 'connect' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isolationReady, setIsolationReady] = useState<boolean | null>(null);

  const currentFile =
    codeFiles.find((file) => file.id === activeFile) ?? codeFiles[0];

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
    };
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const onScroll = () => {
      const sections = Array.from(
        article.querySelectorAll<HTMLElement>('[data-tutorial-section]'),
      );
      const articleTop = article.getBoundingClientRect().top;
      let next = sections[0]?.dataset.tutorialSection ?? 'intro';

      for (const section of sections) {
        if (section.getBoundingClientRect().top - articleTop <= 180) {
          next = section.dataset.tutorialSection ?? next;
        } else {
          break;
        }
      }

      setActiveSection(next);
      const nextCode = sectionCode[next] ?? sectionCode.intro;
      setActiveFile(nextCode.file);
      setCodeFocus(nextCode);
    };

    onScroll();
    article.addEventListener('scroll', onScroll, { passive: true });
    return () => article.removeEventListener('scroll', onScroll);
  }, []);

  const logs = useMemo(() => {
    if (error) {
      return [
        ['WASM runtime', nodeState === 'running' ? 'Running' : 'Stopped'],
        ['Public peer', 'Not connected'],
        ['Message', error],
      ];
    }

    if (nodeInfo) {
      return [
        ['WASM runtime', 'Running'],
        [
          'Public peer',
          peerCount > 0
            ? `${peerCount} connected`
            : busyAction === 'connect'
              ? 'Connecting'
              : 'Not connected',
        ],
        ['Network', 'Fiber Testnet'],
      ];
    }

    return [
      ['Runtime', 'Fiber WASM'],
      ['Storage', 'IndexedDB'],
      ['Transport', 'WSS'],
    ];
  }, [busyAction, error, nodeInfo, nodeState, peerCount]);

  const startNode = useCallback(async () => {
    if (busyAction || nodeRef.current) return;
    setBusyAction('start');
    setError('');
    setPeerCount(0);

    try {
      if (!window.crossOriginIsolated) {
        throw new Error('Cross-origin isolation is not enabled for this page.');
      }

      const {
        FiberBrowserNode,
        RawKeyCredentialProvider,
      } = await import('@fiber-pay/sdk/browser');
      const profile = getOrCreateProfile();
      const credential = new RawKeyCredentialProvider(
        profile.fiberKey,
        profile.ckbKey,
        profile.identifier,
      );
      const node = new FiberBrowserNode({
        network: 'testnet',
        credential,
        nodeConfig: {
          bootnodes: [],
          logLevel: 'info',
        },
      });

      node.on('stateChange', (state) => setNodeState(state));
      node.on('error', (nodeError) => setError(nodeError.message));
      nodeRef.current = node;

      const info = await node.start();
      setNodeInfo(info);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Unable to start the Fiber node.',
      );
      if (!nodeRef.current?.isRunning) nodeRef.current = null;
    } finally {
      setBusyAction(null);
    }
  }, [busyAction]);

  const connectPublicPeer = useCallback(async () => {
    const node = nodeRef.current;
    if (busyAction || !node?.isRunning || peerCount > 0) return;
    setBusyAction('connect');
    setError('');

    try {
      await node.connectPeer({
        address: routerAddress.replace(/\/p2p\/[^/]+$/i, ''),
        pubkey: routerPubkey,
      });

      let peers = (await node.listPeers()).peers;
      for (let attempt = 0; peers.length === 0 && attempt < 10; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
        peers = (await node.listPeers()).peers;
      }

      if (peers.length === 0) {
        throw new Error('The node is running, but the peer handshake timed out.');
      }
      setPeerCount(peers.length);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Unable to connect to the public peer.',
      );
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, peerCount]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }, [currentFile]);

  return (
    <div className={styles.shell}>
      <div className={styles.article} ref={articleRef}>
        <header
          className={styles.hero}
          data-tutorial-section="intro"
        >
          <div className={styles.eyebrow}>
            <span>Build</span>
            <span className={styles.eyebrowRule} />
            <span>10 minute quickstart</span>
          </div>
          <h1>Connect to Fiber with a WASM Node</h1>
          <p className={styles.lead}>
            Start a real Fiber node inside a React page, connect it to Testnet
            over WSS, and read live node state—without running your own backend.
          </p>
          <div className={styles.heroMeta}>
            <span>React</span>
            <span>Fiber WASM</span>
            <span>Node connection</span>
          </div>
        </header>

        <section
          className={styles.section}
          data-tutorial-section="architecture"
        >
          <div className={styles.stepLabel}>Before you build</div>
          <h2>The node lives in the browser</h2>
          <p>
            This is not a React UI controlling a remote node. The SDK loads the
            Fiber WASM runtime into workers, keeps node state in IndexedDB, and
            makes an outbound WebSocket Secure connection to a public Fiber
            peer.
          </p>
          <div className={styles.flow} aria-label="Browser to Fiber network flow">
            <div>
              <b>React app</b>
              <span>Fiber WASM + IndexedDB</span>
            </div>
            <span className={styles.flowArrow}>→ WSS →</span>
            <div>
              <b>Public Fiber peer</b>
              <span>Testnet network</span>
            </div>
          </div>
          <div className={styles.note}>
            <strong>Do you need a backend?</strong>
            <p>
              Not for this node-and-network quickstart. Add a receiving service
              later when your product needs to issue invoices, verify merchant
              payments, or unlock server-side content.
            </p>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="install">
          <div className={styles.stepLabel}>
            <span>1</span> Create the React app
          </div>
          <h2>Install the browser SDK</h2>
          <p>
            Start with a regular Next.js app. The browser package wraps
            Fiber WASM and provides a small node lifecycle API for React.
          </p>
          <div className={styles.inlineCode}>
            <code>npm install @fiber-pay/sdk</code>
            <span>Terminal</span>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="isolate">
          <div className={styles.stepLabel}>
            <span>2</span> Enable browser isolation
          </div>
          <h2>Give WASM access to SharedArrayBuffer</h2>
          <p>
            Fiber uses workers and shared memory. Serve only the node route
            with COOP and COEP response headers, then check
            <code> crossOriginIsolated </code>
            before creating the node.
          </p>
          <div className={styles.checkList}>
            <span>Cross-Origin-Opener-Policy: same-origin</span>
            <span>Cross-Origin-Embedder-Policy: require-corp</span>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="start">
          <div className={styles.stepLabel}>
            <span>3</span> Start Fiber
          </div>
          <h2>Start the node without connecting</h2>
          <p>
            Create a credential and start the Testnet node with an empty
            bootnode list. The node is now running locally, but it will not
            contact a public peer until the user clicks Connect.
          </p>
          <div className={styles.note}>
            <strong>Testnet only</strong>
            <p>
              The live preview stores a generated Testnet identity in this
              browser. Production apps should encrypt keys and design backup,
              account switching, and recovery before handling funds.
            </p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reactSection}`}>
          <div className={styles.stepLabel}>
            <span>4</span> Wire it into React
          </div>
          <h2>Connect the node in three small steps</h2>
          <p>
            Each step below selects and highlights the exact lines it adds to
            the React page.
          </p>

          <div className={styles.reactSteps}>
            <article
              className={styles.reactStep}
              data-tutorial-section="react-store"
            >
              <span className={styles.substepNumber}>4.1</span>
              <div>
                <h3>Keep the node between renders</h3>
                <p>
                  Store the node in a ref and keep status, pubkey, and peer
                  count in React state.
                </p>
              </div>
            </article>

            <article
              className={styles.reactStep}
              data-tutorial-section="react-connect"
            >
              <span className={styles.substepNumber}>4.2</span>
              <div>
                <h3>Start the WASM node</h3>
                <p>
                  The first button starts Fiber and reads the browser node
                  pubkey. It does not make a network connection.
                </p>
              </div>
            </article>

            <article
              className={styles.reactStep}
              data-tutorial-section="react-render"
            >
              <span className={styles.substepNumber}>4.3</span>
              <div>
                <h3>Connect only when requested</h3>
                <p>
                  Enable the second button after startup. Its handler connects
                  to the public WSS peer and then renders the peer count.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="extend">
          <div className={styles.stepLabel}>Where to go next</div>
          <h2>Send a payment in the next tutorial</h2>
          <p>
            This tutorial ends after a real peer connection. Channel funding,
            invoices, and sending a payment will live in a separate follow-up
            tutorial so the first connection stays easy to understand.
          </p>
          <div className={styles.nextTutorial}>
            <span>Next tutorial</span>
            <strong>Open a Fiber Channel and Send a Payment</strong>
            <small>Continue with a real Testnet channel</small>
          </div>
          <div className={styles.nextLinks}>
            <a href="/docs/build/open-channel-payment">
              Continue to the payment tutorial <span>→</span>
            </a>
            <a href="/docs/build/sdk/wasm-node">
              Read the WASM integration guide <span>↗</span>
            </a>
            <a href="/labs/browser-node">
              Open the full Browser Node Lab <span>↗</span>
            </a>
          </div>
        </section>

        <footer className={styles.articleFooter}>
          <span>Fiber Network</span>
          <span>Browser quickstart complete</span>
        </footer>
      </div>

      <aside className={styles.workspace} aria-label="Live preview and code">
        <section className={styles.preview}>
          <div className={styles.panelHeader}>
            <span>
              <i className={styles.liveDot} /> Live preview
            </span>
            <span>Testnet</span>
          </div>

          <div className={styles.previewStage}>
            <div className={styles.nodeCard}>
              <div className={styles.nodeCardTop}>
                <div className={styles.nodeMark}>F</div>
                <div>
                  <span>YOUR BROWSER NODE</span>
                  <strong>{friendlyState(nodeState)}</strong>
                </div>
                <i
                  className={`${styles.statusDot} ${
                    nodeState === 'running' ? styles.statusRunning : ''
                  }`}
                />
              </div>

              <div className={styles.nodeIdentity}>
                <span>NODE PUBKEY</span>
                <code>{shorten(nodeInfo?.pubkey)}</code>
              </div>

              <div className={styles.nodeStats}>
                {logs.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong title={value}>{value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.nodeActions}>
                <button
                  className={styles.startButton}
                  disabled={
                    busyAction !== null ||
                    Boolean(nodeInfo)
                  }
                  onClick={
                    isolationReady === false
                      ? () => window.location.reload()
                      : startNode
                  }
                  type="button"
                >
                  {busyAction === 'start'
                    ? 'Starting Fiber…'
                    : nodeInfo
                      ? 'Node running'
                      : isolationReady === false
                        ? 'Reload to enable WASM'
                        : 'Start WASM node'}
                  <span>→</span>
                </button>
                <button
                  className={styles.connectButton}
                  disabled={
                    busyAction !== null ||
                    !nodeInfo ||
                    peerCount > 0
                  }
                  onClick={connectPublicPeer}
                  type="button"
                >
                  {busyAction === 'connect'
                    ? 'Connecting…'
                    : peerCount > 0
                      ? `${peerCount} peer connected`
                      : 'Connect public peer'}
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.codePanel}>
          <div className={styles.fileTabs} role="tablist" aria-label="Code files">
            {codeFiles.map((file) => (
              <button
                aria-selected={file.id === activeFile}
                className={file.id === activeFile ? styles.activeTab : ''}
                key={file.id}
                onClick={() => {
                  setActiveFile(file.id);
                  setCodeFocus({ file: file.id, start: 1, end: 0 });
                }}
                role="tab"
                type="button"
              >
                {file.label}
              </button>
            ))}
            <button
              aria-label={`Copy ${currentFile.label}`}
              className={styles.copyButton}
              onClick={copyCode}
              type="button"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={styles.codeMeta}>
            <span>{currentFile.label}</span>
            <span>{currentFile.language}</span>
          </div>
          <CodeBlock file={currentFile} focus={codeFocus} />
        </section>
      </aside>

      <nav className={styles.progress} aria-label="Tutorial progress">
        {Object.keys(sectionCode).map((section) => (
          <button
            aria-label={`Go to ${section} section`}
            className={activeSection === section ? styles.progressActive : ''}
            key={section}
            onClick={() => {
              articleRef.current
                ?.querySelector<HTMLElement>(
                  `[data-tutorial-section="${section}"]`,
                )
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            type="button"
          />
        ))}
      </nav>
    </div>
  );
}
