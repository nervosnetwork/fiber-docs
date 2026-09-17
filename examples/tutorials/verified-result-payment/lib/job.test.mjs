import assert from 'node:assert/strict';
import test from 'node:test';

const job = await import('./job.ts');

test('summarizes a valid allocation as accepted', () => {
  assert.deepEqual(
    job.summarizeVerification({ routeA: 120, routeB: 100, routeC: 80 }),
    {
      passed: true,
      message: 'All 5 rules passed',
      checks: job.verifyResult({ routeA: 120, routeB: 100, routeC: 80 }),
    },
  );
});

test('summarizes the first actionable failure', () => {
  assert.deepEqual(
    job.summarizeVerification({ routeA: 150, routeB: 100, routeC: 50 }),
    {
      passed: false,
      message: 'Route A exceeds the 120 CKB limit',
      checks: job.verifyResult({ routeA: 150, routeB: 100, routeC: 50 }),
    },
  );
});

test('prepares Customer A before Solver C', () => {
  assert.equal(
    job.nextSetupRole?.({ customerReady: false, solverReady: false }),
    'customer',
  );
  assert.equal(
    job.nextSetupRole?.({ customerReady: true, solverReady: false }),
    'solver',
  );
  assert.equal(
    job.nextSetupRole?.({ customerReady: true, solverReady: true }),
    'complete',
  );
});

test('keeps the channel action disabled until CHANNEL_READY', () => {
  assert.deepEqual(
    job.channelActionState?.({ stage: 'submitting', busy: true }),
    {
      disabled: true,
      label: 'Opening channel…',
      pending: true,
    },
  );
  assert.deepEqual(
    job.channelActionState?.({ stage: 'confirming', busy: false }),
    {
      disabled: true,
      label: 'Waiting for CHANNEL_READY…',
      pending: true,
    },
  );
  assert.deepEqual(
    job.channelActionState?.({ stage: 'ready', busy: false }),
    {
      disabled: true,
      label: 'Channel ready',
      pending: false,
    },
  );
});

test('builds the same observed channel progression as the open-channel tutorial', () => {
  let history = [];
  for (const state of [
    'NEGOTIATING_FUNDING',
    'NEGOTIATING_FUNDING',
    'COLLABORATING_FUNDING_TX',
    'SIGNING_COMMITMENT',
  ]) {
    history = job.appendObservedChannelState?.(history, state);
  }

  assert.deepEqual(history, [
    'NEGOTIATING_FUNDING',
    'COLLABORATING_FUNDING_TX',
    'SIGNING_COMMITMENT',
  ]);
  assert.equal(
    job.nextObservedChannelState?.('SIGNING_COMMITMENT'),
    'AWAITING_TX_SIGNATURES',
  );
  assert.equal(job.nextObservedChannelState?.('CHANNEL_READY'), null);
});

test('allows a channel retry only before submission or after a terminal failure', () => {
  for (const stage of ['idle', 'error', 'closed']) {
    assert.deepEqual(
      job.channelActionState?.({ stage, busy: false }),
      {
        disabled: false,
        label: 'Open channel',
        pending: false,
      },
    );
  }
});

test('advances the default setup disclosure without removing either participant', () => {
  assert.equal(
    job.setupDisclosureRole?.({
      nodesPrepared: false,
      customerReady: false,
      solverReady: false,
    }),
    null,
  );
  assert.equal(
    job.setupDisclosureRole?.({
      nodesPrepared: true,
      customerReady: false,
      solverReady: false,
    }),
    'customer',
  );
  assert.equal(
    job.setupDisclosureRole?.({
      nodesPrepared: true,
      customerReady: true,
      solverReady: false,
    }),
    'solver',
  );
  assert.equal(
    job.setupDisclosureRole?.({
      nodesPrepared: true,
      customerReady: true,
      solverReady: true,
    }),
    null,
  );
});

test('keeps participant headers scoped to the browser node lifecycle', () => {
  const cases = [
    {
      input: { nodeRunning: false, nodeStarting: false, channelReady: false, pendingLabel: null },
      expected: { label: 'Waiting for nodes', tone: 'idle' },
    },
    {
      input: { nodeRunning: false, nodeStarting: true, channelReady: false, pendingLabel: null },
      expected: { label: 'Starting node…', tone: 'waiting' },
    },
    {
      input: { nodeRunning: true, nodeStarting: false, channelReady: false, pendingLabel: null },
      expected: { label: 'Node running', tone: 'success' },
    },
    {
      input: { nodeRunning: true, nodeStarting: false, channelReady: false, pendingLabel: 'Waiting for CHANNEL_READY' },
      expected: { label: 'Node running', tone: 'success' },
    },
    {
      input: { nodeRunning: true, nodeStarting: false, channelReady: true, pendingLabel: null },
      expected: { label: 'Node running', tone: 'success' },
    },
  ];

  for (const { input, expected } of cases) {
    assert.deepEqual(job.setupParticipantState?.(input), expected);
  }
});

test('explains only the unmet prerequisites for disabled setup actions', () => {
  assert.equal(
    job.setupChannelActionRequirement?.({
      role: 'customer',
      nodePrepared: false,
      fundingReady: false,
      actionPending: false,
      channelReady: false,
    }),
    'Prepare both browser nodes before opening a channel.',
  );
  assert.equal(
    job.setupChannelActionRequirement?.({
      role: 'solver',
      nodePrepared: true,
      fundingReady: false,
      actionPending: false,
      channelReady: false,
    }),
    "Fund Solver C's on-chain address with at least 499 CKB, then select Refresh.",
  );
  assert.equal(
    job.setupChannelActionRequirement?.({
      role: 'solver',
      nodePrepared: true,
      fundingReady: true,
      actionPending: true,
      channelReady: false,
    }),
    null,
  );
  assert.equal(
    job.setupInboundActionRequirement?.({
      channelReady: false,
      inboundReady: false,
      busy: false,
    }),
    "Open Solver C's channel and wait for CHANNEL_READY.",
  );
  assert.equal(
    job.setupInboundActionRequirement?.({
      channelReady: true,
      inboundReady: false,
      busy: false,
    }),
    null,
  );
});

test('unlocks Customer A and Solver C together after both nodes start', () => {
  assert.deepEqual(
    job.setupParticipantLocks?.(false),
    { customer: true, solver: true },
  );
  assert.deepEqual(
    job.setupParticipantLocks?.(true),
    { customer: false, solver: false },
  );
});

test('tracks simultaneous channel openings independently', () => {
  const idle = { customer: false, solver: false };
  const customerOpening = job.updateOpeningRoles?.(idle, 'customer', true);
  const bothOpening = job.updateOpeningRoles?.(customerOpening, 'solver', true);

  assert.deepEqual(bothOpening, { customer: true, solver: true });
  assert.deepEqual(
    job.updateOpeningRoles?.(bothOpening, 'customer', false),
    { customer: false, solver: true },
  );
});

test('prepares both browser nodes and retries only a missing node', () => {
  assert.deepEqual(
    job.rolesToPrepare?.({ customerRunning: false, solverRunning: false }),
    ['customer', 'solver'],
  );
  assert.deepEqual(
    job.rolesToPrepare?.({ customerRunning: true, solverRunning: false }),
    ['solver'],
  );
  assert.deepEqual(
    job.rolesToPrepare?.({ customerRunning: true, solverRunning: true }),
    [],
  );
});

test('prepares participant peer connections without overlapping handshakes', async () => {
  const events = [];
  let releaseCustomer;
  const customerReady = new Promise((resolve) => {
    releaseCustomer = resolve;
  });

  const preparation = job.prepareSetupRolesInOrder?.(
    ['customer', 'solver'],
    async (role) => {
      events.push(`${role}:start`);
      if (role === 'customer') await customerReady;
      events.push(`${role}:ready`);
      return true;
    },
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['customer:start']);

  releaseCustomer();
  assert.deepEqual(await preparation, [
    { role: 'customer', ready: true },
    { role: 'solver', ready: true },
  ]);
  assert.deepEqual(events, [
    'customer:start',
    'customer:ready',
    'solver:start',
    'solver:ready',
  ]);
});

test('isolates the two browser nodes on different transport addresses', () => {
  const customer = job.browserNodeTransport?.('customer');
  const solver = job.browserNodeTransport?.('solver');

  assert.match(customer?.p2pListeningAddr, /^\/ip4\/127\.0\.0\.1\/tcp\/\d+$/);
  assert.match(solver?.p2pListeningAddr, /^\/ip4\/127\.0\.0\.1\/tcp\/\d+$/);
  assert.match(customer?.rpcListeningAddr, /^127\.0\.0\.1:\d+$/);
  assert.match(solver?.rpcListeningAddr, /^127\.0\.0\.1:\d+$/);
  assert.notEqual(customer?.p2pListeningAddr, solver?.p2pListeningAddr);
  assert.notEqual(customer?.rpcListeningAddr, solver?.rpcListeningAddr);
});

test('isolates verified-result identities from the earlier tutorials', () => {
  const customer = job.browserNodeProfileKey?.('customer');
  const solver = job.browserNodeProfileKey?.('solver');

  assert.equal(customer, 'fiber-docs:verified-result-customer-v1');
  assert.equal(solver, 'fiber-docs:verified-result-solver-v1');
  assert.notEqual(customer, solver);
  assert.notEqual(customer, 'fiber-docs:multi-hop-sender-v1');
  assert.notEqual(solver, 'fiber-docs:multi-hop-receiver-v1');
});

test('keeps Hold Invoice identities while isolating Verified Result nodes', () => {
  assert.deepEqual(
    job.tutorialNodeConfiguration?.('hold-invoice', 'customer'),
    {
      profileKey: 'fiber-docs:multi-hop-sender-v1',
      transport: undefined,
    },
  );
  assert.deepEqual(
    job.tutorialNodeConfiguration?.('hold-invoice', 'solver'),
    {
      profileKey: 'fiber-docs:multi-hop-receiver-v1',
      transport: undefined,
    },
  );
  assert.deepEqual(
    job.tutorialNodeConfiguration?.('verified-result-payment', 'customer'),
    {
      profileKey: 'fiber-docs:verified-result-customer-v1',
      transport: {
        p2pListeningAddr: '/ip4/127.0.0.1/tcp/8228',
        rpcListeningAddr: '127.0.0.1:8227',
      },
    },
  );
});

test('explains how to recover from a duplicate live tutorial connection', () => {
  assert.equal(
    job.peerConnectionRecoveryMessage?.('Bottle'),
    'Bottle did not remain connected. Close any other live Fiber tutorial tabs, then select Prepare nodes again.',
  );
});

test('shows no result label before submission and keeps later internal states', () => {
  assert.equal(job.resultStatusLabel?.('Draft'), '—');

  for (const status of ['Funded', 'Submitted', 'Verified', 'Rejected', 'Paid']) {
    assert.equal(job.resultStatusLabel?.(status), status);
  }
});

test('allows reviewing current or completed steps but blocks future steps', () => {
  assert.equal(job.selectReviewStep?.(3, 1), 1);
  assert.equal(job.selectReviewStep?.(3, 3), 3);
  assert.equal(job.selectReviewStep?.(3, 4), 3);
  assert.equal(job.selectReviewStep?.(3, -1), 3);
});

test('describes participant readiness with the node setup lifecycle', () => {
  assert.equal(
    job.participantStatusLabel?.({ nodeRunning: false, roleReady: false }),
    'Ready to start',
  );
  assert.equal(
    job.participantStatusLabel?.({ nodeRunning: true, roleReady: false }),
    'Node running',
  );
  assert.equal(
    job.participantStatusLabel?.({ nodeRunning: true, roleReady: true }),
    'Ready',
  );
});

test('offers one passing and one failing result for immediate verification', () => {
  assert.deepEqual(
    job.verificationSamples?.map((sample) => ({
      id: sample.id,
      label: sample.label,
      passed: job.summarizeVerification(sample.result).passed,
    })),
    [
      { id: 'within-limits', label: 'Result #1', passed: true },
      { id: 'over-route-a', label: 'Result #2', passed: false },
    ],
  );
});

test('switches only between known verification samples', () => {
  assert.equal(
    job.selectVerificationSample?.('within-limits', 'over-route-a'),
    'over-route-a',
  );
  assert.equal(
    job.selectVerificationSample?.('over-route-a', 'missing'),
    'over-route-a',
  );
});

test('groups verification details into three scan-friendly outcomes', () => {
  assert.deepEqual(
    job.groupVerificationChecks?.(
      job.verifyResult({ routeA: 120, routeB: 100, routeC: 80 }),
    ),
    [
      { label: 'Result format', rule: 'routeA, routeB, routeC', passed: true },
      { label: 'Route limits', rule: 'A ≤ 120 · B ≤ 100 · C ≤ 80', passed: true },
      { label: 'Required total', rule: 'Exactly 300 CKB', passed: true },
    ],
  );
  assert.deepEqual(
    job.groupVerificationChecks?.(
      job.verifyResult({ routeA: 150, routeB: 100, routeC: 50 }),
    ),
    [
      { label: 'Result format', rule: 'routeA, routeB, routeC', passed: true },
      { label: 'Route limits', rule: 'A ≤ 120 · B ≤ 100 · C ≤ 80', passed: false },
      { label: 'Required total', rule: 'Exactly 300 CKB', passed: true },
    ],
  );
});

test('maps each sample to its final payment action', () => {
  assert.deepEqual(
    job.paymentDecision?.({ routeA: 120, routeB: 100, routeC: 80 }),
    {
      action: 'release',
      actionLabel: 'Release 1 CKB to Solver C',
      outcome: 'Solver C receives 1 CKB',
      passed: true,
    },
  );
  assert.deepEqual(
    job.paymentDecision?.({ routeA: 150, routeB: 100, routeC: 50 }),
    {
      action: 'cancel',
      actionLabel: 'Cancel and return 1 CKB',
      outcome: '1 CKB returns to Customer A',
      passed: false,
    },
  );
});

test('maps a final Invoice status to one clear payment receipt', () => {
  assert.deepEqual(job.paymentReceipt?.('Paid'), {
    description: 'The selected result passed every check, so the held payment was released.',
    payment: '1 CKB released to Solver C',
    result: 'Verified',
    statusLabel: 'Payment released',
    title: 'Solver C received 1 CKB',
  });
  assert.deepEqual(job.paymentReceipt?.('Cancelled'), {
    description: 'The selected result failed verification, so the held payment was cancelled.',
    payment: '1 CKB available to Customer A again',
    result: 'Rejected',
    statusLabel: 'Payment cancelled',
    title: '1 CKB returned to Customer A',
  });
});

test('requires enough on-chain CKB before opening a channel', () => {
  assert.equal(job.channelFundingReady?.(null), false);
  assert.equal(job.channelFundingReady?.(49_899_999_999n), false);
  assert.equal(job.channelFundingReady?.(49_900_000_000n), true);
});

test('describes readiness using the capacity each role needs', () => {
  assert.equal(job.roleReadySummary?.('customer', 0n), 'Ready for outbound payment');
  assert.equal(job.roleReadySummary?.('solver', 500_000_000n), 'Ready · 5 CKB inbound');
});

test('offers a route refresh after path finding fails before submission', () => {
  assert.deepEqual(
    job.paymentRecoveryState?.(
      'Open',
      'Send payment error: Failed to build route, PathFind error: no path found',
    ),
    {
      action: 'retry',
      actionLabel: 'Refresh route and retry',
      message: 'No route was found. No payment was submitted. Refresh both nodes and try again.',
    },
  );
});

test('does not resubmit a payment when the invoice is already received', () => {
  assert.deepEqual(
    job.paymentRecoveryState?.(
      'Received',
      'Send payment error: Failed to build route, PathFind error: no path found',
    ),
    {
      action: 'continue',
      actionLabel: null,
      message: 'The payment is already on hold. Continuing to verification.',
    },
  );
});

test('requires a new payment request after the invoice can no longer be paid', () => {
  for (const status of ['Cancelled', 'Expired']) {
    assert.deepEqual(job.paymentRecoveryState?.(status, 'no path found'), {
      action: 'recreate',
      actionLabel: 'Create new payment request',
      message: 'This payment request is no longer open. Create a new one to continue.',
    });
  }
});

test('keeps an open invoice ready for its first payment attempt', () => {
  assert.deepEqual(job.paymentRecoveryState?.('Open'), {
    action: 'submit',
    actionLabel: 'Place 1 CKB on hold',
    message: null,
  });
});

test('keeps a created payment request on the hold-payment step when the route drops', () => {
  assert.equal(
    job.verifiedResultStep?.({
      setupReady: false,
      hasPaymentRequest: true,
      invoiceStatus: 'Open',
    }),
    1,
  );
});

test('does not poll the sender before a payment session has been submitted', () => {
  assert.equal(job.shouldPollPaymentSession?.('Not sent'), false);
  assert.equal(job.shouldPollPaymentSession?.('Inflight'), true);
  assert.equal(job.shouldPollPaymentSession?.('Success'), true);
  assert.equal(job.shouldPollPaymentSession?.('Failed'), true);
});

test('uses invoice progress instead of a transient route snapshot after submission', () => {
  assert.equal(
    job.verifiedResultStep?.({
      setupReady: false,
      hasPaymentRequest: true,
      invoiceStatus: 'Received',
    }),
    2,
  );
  assert.equal(
    job.verifiedResultStep?.({
      setupReady: false,
      hasPaymentRequest: true,
      invoiceStatus: 'Paid',
    }),
    3,
  );
});

test('returns to setup only before a payment request exists', () => {
  assert.equal(
    job.verifiedResultStep?.({
      setupReady: false,
      hasPaymentRequest: false,
      invoiceStatus: 'None',
    }),
    0,
  );
});

test('names the funding address and Bottle channel owner in setup actions', () => {
  assert.deepEqual(job.setupActionLabels?.('customer'), {
    fund: "Fund Customer A's on-chain address",
    open: 'Open Customer A ↔ Bottle channel',
  });
  assert.deepEqual(job.setupActionLabels?.('solver'), {
    fund: "Fund Solver C's on-chain address",
    open: 'Open Solver C ↔ Bottle channel',
  });
});

test('summarizes each participant channel separately for setup review', () => {
  assert.deepEqual(
    job.setupParticipantSummary?.({
      role: 'customer',
      onChainBalance: 12_000_000_000n,
      localBalance: 49_900_000_000n,
      remoteBalance: 0n,
      channelReady: true,
    }),
    {
      label: 'Customer A',
      status: 'Ready',
      onChainBalance: 12_000_000_000n,
      channelBalance: 49_900_000_000n,
      liquidityLabel: 'Available to pay',
      liquidityBalance: 49_900_000_000n,
    },
  );
  assert.deepEqual(
    job.setupParticipantSummary?.({
      role: 'solver',
      onChainBalance: 8_000_000_000n,
      localBalance: 49_400_000_000n,
      remoteBalance: 500_000_000n,
      channelReady: true,
    }),
    {
      label: 'Solver C',
      status: 'Ready',
      onChainBalance: 8_000_000_000n,
      channelBalance: 49_900_000_000n,
      liquidityLabel: 'Inbound liquidity',
      liquidityBalance: 500_000_000n,
    },
  );
});
