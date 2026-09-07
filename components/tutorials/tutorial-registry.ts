export type TutorialLevel = 'Beginner' | 'Intermediate' | 'Hard';
export type TutorialMode = 'Simulation' | 'Testnet';

export type Tutorial = {
  id: string;
  level: TutorialLevel;
  mode: TutorialMode;
  duration: string;
  title: string;
  shortTitle: string;
  description: string;
  tags: string[];
  href: string;
};

export const conceptTutorials: Tutorial[] = [
  {
    id: 'directional-liquidity',
    level: 'Beginner',
    mode: 'Simulation',
    duration: '~5 min',
    title: 'Explore Directional Channel Liquidity',
    shortTitle: 'Explore directional liquidity',
    description:
      'Move balance across a channel, switch perspectives, and predict whether a payment can flow.',
    tags: ['Liquidity', 'Channels', 'Simulation'],
    href: '/docs/build/directional-liquidity',
  },
  {
    id: 'route-liquidity',
    level: 'Intermediate',
    mode: 'Simulation',
    duration: '~10 min',
    title: 'Find a Route\'s Liquidity Bottleneck',
    shortTitle: 'Find a route bottleneck',
    description:
      'Compare single-path and multi-path payments, inspect fees, and diagnose the limiting hop.',
    tags: ['Routing', 'MPP', 'Fees'],
    href: '/docs/build/route-liquidity',
  },
  {
    id: 'rebalance-liquidity',
    level: 'Hard',
    mode: 'Simulation',
    duration: '~12 min',
    title: 'Rebalance a Fiber Routing Node',
    shortTitle: 'Rebalance a routing node',
    description:
      'Preview a circular payment, move local balance between channels, and account for routing fees.',
    tags: ['Rebalancing', 'Operators', 'Dry run'],
    href: '/docs/build/rebalance-liquidity',
  },
];

export const liveTutorials: Tutorial[] = [
  {
    id: 'connect-wasm-node',
    level: 'Beginner',
    mode: 'Testnet',
    duration: '~10 min',
    title: 'Connect to Fiber with a WASM Node',
    shortTitle: 'Connect a WASM node',
    description:
      'Start a browser-based Fiber node, create a Testnet identity, and connect to a public peer.',
    tags: ['React', 'WASM', 'WebSocket'],
    href: '/docs/build/connect-wasm-node',
  },
  {
    id: 'open-channel-payment',
    level: 'Intermediate',
    mode: 'Testnet',
    duration: '~15 min',
    title: 'Open a Fiber Channel and Send a Payment',
    shortTitle: 'Open a channel and send a payment',
    description:
      'Fund a Testnet channel and send your first off-chain payment through the Fiber network.',
    tags: ['Channels', 'Payments', 'Fiber SDK'],
    href: '/docs/build/open-channel-payment',
  },
  {
    id: 'multi-hop-invoice',
    level: 'Hard',
    mode: 'Testnet',
    duration: '~25 min',
    title: 'Send a Multi-Hop Invoice Payment',
    shortTitle: 'Send a multi-hop invoice payment',
    description:
      'Copy an invoice between two browser nodes and pay it through one public Fiber intermediary.',
    tags: ['Invoice', 'Multi-hop', 'WASM'],
    href: '/docs/build/multi-hop-invoice',
  },
  {
    id: 'unidirectional-channel',
    level: 'Intermediate',
    mode: 'Testnet',
    duration: '~20 min',
    title: 'Open a Unidirectional Fiber Channel',
    shortTitle: 'Open a unidirectional channel',
    description:
      'Open a private one-way channel, inspect the payer and acceptor roles, and send a forward payment.',
    tags: ['One-way', 'Channels', 'Keysend'],
    href: '/docs/build/unidirectional-channel',
  },
  {
    id: 'hold-invoice',
    level: 'Hard',
    mode: 'Testnet',
    duration: '~20 min',
    title: 'Build a Conditional Payment with a Hold Invoice',
    shortTitle: 'Build a Hold Invoice payment',
    description:
      'Pause an Invoice at the receiver, then explicitly settle or cancel the payment.',
    tags: ['Hold Invoice', 'Settle', 'Cancel'],
    href: '/docs/build/hold-invoice',
  },
  {
    id: 'rusd-payment',
    level: 'Hard',
    mode: 'Testnet',
    duration: '~25 min',
    title: 'Pay with RUSD over Fiber',
    shortTitle: 'Pay with RUSD',
    description:
      'Fund a Testnet RUSD channel, inspect token liquidity, and send a stablecoin payment.',
    tags: ['RUSD', 'UDT', 'Stablecoin'],
    href: '/docs/build/rusd-payment',
  },
  {
    id: 'close-channel',
    level: 'Intermediate',
    mode: 'Testnet',
    duration: '~20 min',
    title: 'Close a Fiber Channel and Recover Funds',
    shortTitle: 'Close a channel and recover funds',
    description:
      'Cooperatively close a channel and follow its final balance back on-chain.',
    tags: ['Shutdown', 'Recovery', 'Lifecycle'],
    href: '/docs/build/close-channel',
  },
];
