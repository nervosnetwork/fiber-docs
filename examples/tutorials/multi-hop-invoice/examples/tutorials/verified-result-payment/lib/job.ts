export type AllocationResult = {
  routeA: number;
  routeB: number;
  routeC: number;
};

export type VerificationCheck = { label: string; passed: boolean };
export type GroupedVerificationCheck = VerificationCheck & { rule: string };

export type ResultStatus =
  | 'Draft'
  | 'Funded'
  | 'Submitted'
  | 'Verified'
  | 'Rejected'
  | 'Paid';

export type PaymentRecoveryAction = 'submit' | 'retry' | 'continue' | 'recreate';
export type SetupRole = 'customer' | 'solver';
export type TutorialVariant = 'hold-invoice' | 'verified-result-payment';
export type ChannelActionStage =
  | 'idle'
  | 'connecting'
  | 'submitting'
  | 'confirming'
  | 'ready'
  | 'closing'
  | 'closed'
  | 'error';

const observedChannelStateSequence = [
  'NEGOTIATING_FUNDING',
  'COLLABORATING_FUNDING_TX',
  'SIGNING_COMMITMENT',
  'AWAITING_TX_SIGNATURES',
  'AWAITING_CHANNEL_READY',
  'CHANNEL_READY',
] as const;

export function appendObservedChannelState(history: string[], nextState: string) {
  return history.at(-1) === nextState
    ? history
    : [...history, nextState].slice(-8);
}

export function nextObservedChannelState(current: string) {
  const normalized = current.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const index = observedChannelStateSequence.findIndex(
    (state) => state.replace(/_/g, '').toLowerCase() === normalized,
  );

  return index >= 0 && index < observedChannelStateSequence.length - 1
    ? observedChannelStateSequence[index + 1]
    : null;
}

export function browserNodeTransport(role: SetupRole) {
  const offset = role === 'customer' ? 0 : 100;
  return {
    p2pListeningAddr: `/ip4/127.0.0.1/tcp/${8228 + offset}`,
    rpcListeningAddr: `127.0.0.1:${8227 + offset}`,
  };
}

export function browserNodeProfileKey(role: SetupRole) {
  return `fiber-docs:verified-result-${role}-v1`;
}

export function tutorialNodeConfiguration(
  variant: TutorialVariant,
  role: SetupRole,
) {
  if (variant === 'verified-result-payment') {
    return {
      profileKey: browserNodeProfileKey(role),
      transport: browserNodeTransport(role),
    };
  }

  return {
    profileKey: role === 'customer'
      ? 'fiber-docs:multi-hop-sender-v1'
      : 'fiber-docs:multi-hop-receiver-v1',
    transport: undefined,
  };
}

export function peerConnectionRecoveryMessage(peerName: string) {
  return `${peerName} did not remain connected. Close any other live Fiber tutorial tabs, then select Prepare nodes again.`;
}

export const job = {
  amount: 300,
  limits: { routeA: 120, routeB: 100, routeC: 80 },
} as const;

export const verificationSimulationNotice =
  'These are hard-coded sample results. No solver is actually calculating the allocation.';

export const verificationSamples = [
  {
    id: 'within-limits',
    label: 'Result #1',
    result: { routeA: 120, routeB: 100, routeC: 80 },
  },
  {
    id: 'over-route-a',
    label: 'Result #2',
    result: { routeA: 150, routeB: 100, routeC: 50 },
  },
] as const;

export type VerificationSampleId = typeof verificationSamples[number]['id'];

export function selectVerificationSample(
  currentId: VerificationSampleId,
  requestedId: string,
): VerificationSampleId {
  return verificationSamples.some((sample) => sample.id === requestedId)
    ? requestedId as VerificationSampleId
    : currentId;
}

export function nextSetupRole({
  customerReady,
  solverReady,
}: {
  customerReady: boolean;
  solverReady: boolean;
}) {
  if (!customerReady) return 'customer';
  if (!solverReady) return 'solver';
  return 'complete';
}

export function setupDisclosureRole({
  nodesPrepared,
  customerReady,
  solverReady,
}: {
  nodesPrepared: boolean;
  customerReady: boolean;
  solverReady: boolean;
}): SetupRole | null {
  if (!nodesPrepared) return null;
  const role = nextSetupRole({ customerReady, solverReady });
  return role === 'complete' ? null : role;
}

export function setupParticipantLocks(nodesPrepared: boolean) {
  const locked = !nodesPrepared;
  return { customer: locked, solver: locked };
}

export function setupParticipantState({
  nodeRunning,
  nodeStarting,
}: {
  nodeRunning: boolean;
  nodeStarting: boolean;
}) {
  if (nodeRunning) return { label: 'Node running', tone: 'success' } as const;
  if (nodeStarting) return { label: 'Starting node…', tone: 'waiting' } as const;
  return { label: 'Waiting for nodes', tone: 'idle' } as const;
}

export function setupChannelActionRequirement({
  role,
  nodePrepared,
  fundingReady,
  actionPending,
  channelReady,
}: {
  role: SetupRole;
  nodePrepared: boolean;
  fundingReady: boolean;
  actionPending: boolean;
  channelReady: boolean;
}) {
  if (actionPending || channelReady) return null;
  if (!nodePrepared) return 'Prepare both browser nodes before opening a channel.';
  if (!fundingReady) {
    const participant = role === 'customer' ? 'Customer A' : 'Solver C';
    return `Fund ${participant}'s on-chain address with at least 499 CKB, then select Refresh.`;
  }
  return null;
}

export function setupInboundActionRequirement({
  channelReady,
  inboundReady,
  busy,
}: {
  channelReady: boolean;
  inboundReady: boolean;
  busy: boolean;
}) {
  if (busy || inboundReady) return null;
  return channelReady
    ? null
    : "Open Solver C's channel and wait for CHANNEL_READY.";
}

export function updateOpeningRoles(
  openingRoles: Record<SetupRole, boolean>,
  role: SetupRole,
  opening: boolean,
) {
  return { ...openingRoles, [role]: opening };
}

export function channelActionState({
  stage,
  busy,
}: {
  stage: ChannelActionStage;
  busy: boolean;
}) {
  if (stage === 'ready') {
    return { disabled: true, label: 'Channel ready', pending: false } as const;
  }

  if (stage === 'confirming' || stage === 'closing') {
    return {
      disabled: true,
      label: 'Waiting for CHANNEL_READY…',
      pending: true,
    } as const;
  }

  if (busy || stage === 'connecting' || stage === 'submitting') {
    return { disabled: true, label: 'Opening channel…', pending: true } as const;
  }

  return { disabled: false, label: 'Open channel', pending: false } as const;
}

export function rolesToPrepare({
  customerRunning,
  solverRunning,
}: {
  customerRunning: boolean;
  solverRunning: boolean;
}) {
  return [
    ...(!customerRunning ? ['customer' as const] : []),
    ...(!solverRunning ? ['solver' as const] : []),
  ];
}

export async function prepareSetupRolesInOrder(
  roles: readonly SetupRole[],
  prepare: (role: SetupRole) => Promise<boolean>,
) {
  const results: { role: SetupRole; ready: boolean }[] = [];
  for (const role of roles) {
    results.push({ role, ready: await prepare(role) });
  }
  return results;
}

export function resultStatusLabel(status: ResultStatus) {
  return status === 'Draft' ? '—' : status;
}

export function selectReviewStep(currentStep: number, requestedStep: number) {
  return Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= currentStep
    ? requestedStep
    : currentStep;
}

export function participantStatusLabel({
  nodeRunning,
  roleReady,
}: {
  nodeRunning: boolean;
  roleReady: boolean;
}) {
  if (roleReady) return 'Ready';
  if (nodeRunning) return 'Node running';
  return 'Ready to start';
}

export function channelFundingReady(balance: bigint | null) {
  return balance !== null && balance >= 49_900_000_000n;
}

export function roleReadySummary(
  role: SetupRole,
  solverInbound: bigint,
) {
  return role === 'customer'
    ? 'Ready for outbound payment'
    : `Ready · ${Number(solverInbound) / 100_000_000} CKB inbound`;
}

export function setupActionLabels(role: SetupRole) {
  const label = role === 'customer' ? 'Customer A' : 'Solver C';
  return {
    fund: `Fund ${label}'s on-chain address`,
    open: `Open ${label} ↔ Bottle channel`,
  };
}

export function setupParticipantSummary({
  role,
  onChainBalance,
  localBalance,
  remoteBalance,
  channelReady,
}: {
  role: SetupRole;
  onChainBalance: bigint | null;
  localBalance: bigint;
  remoteBalance: bigint;
  channelReady: boolean;
}) {
  const solver = role === 'solver';
  return {
    label: solver ? 'Solver C' : 'Customer A',
    status: channelReady ? 'Ready' : 'Setup required',
    onChainBalance,
    channelBalance: localBalance + remoteBalance,
    liquidityLabel: solver ? 'Inbound liquidity' : 'Available to pay',
    liquidityBalance: solver ? remoteBalance : localBalance,
  };
}

export function paymentRecoveryState(
  invoiceStatus: string,
  errorMessage = '',
): {
  action: PaymentRecoveryAction;
  actionLabel: string | null;
  message: string | null;
} {
  if (invoiceStatus === 'Received' || invoiceStatus === 'Paid') {
    return {
      action: 'continue',
      actionLabel: null,
      message: 'The payment is already on hold. Continuing to verification.',
    };
  }

  if (invoiceStatus === 'Cancelled' || invoiceStatus === 'Expired') {
    return {
      action: 'recreate',
      actionLabel: 'Create new payment request',
      message: 'This payment request is no longer open. Create a new one to continue.',
    };
  }

  if (errorMessage) {
    const routeMissing = /no path found|failed to build route|pathfind error/i.test(errorMessage);
    return {
      action: 'retry',
      actionLabel: 'Refresh route and retry',
      message: routeMissing
        ? 'No route was found. No payment was submitted. Refresh both nodes and try again.'
        : 'The payment was not submitted. Refresh both nodes and try again.',
    };
  }

  return {
    action: 'submit',
    actionLabel: 'Place 1 CKB on hold',
    message: null,
  };
}

export function verifiedResultStep({
  setupReady,
  hasPaymentRequest,
  invoiceStatus,
}: {
  setupReady: boolean;
  hasPaymentRequest: boolean;
  invoiceStatus: string;
}) {
  if (invoiceStatus === 'Paid' || invoiceStatus === 'Cancelled') return 3;
  if (invoiceStatus === 'Received') return 2;
  if (hasPaymentRequest || setupReady) return 1;
  return 0;
}

export function verifyResult(result: AllocationResult): VerificationCheck[] {
  return [
    { label: 'Result has exactly the required JSON fields', passed: Object.keys(result).sort().join(',') === 'routeA,routeB,routeC' },
    { label: 'Route A stays within 120 CKB', passed: result.routeA <= job.limits.routeA },
    { label: 'Route B stays within 100 CKB', passed: result.routeB <= job.limits.routeB },
    { label: 'Route C stays within 80 CKB', passed: result.routeC <= job.limits.routeC },
    { label: 'The allocations total exactly 300 CKB', passed: result.routeA + result.routeB + result.routeC === job.amount },
  ];
}

export function groupVerificationChecks(checks: VerificationCheck[]): GroupedVerificationCheck[] {
  const passed = (label: string) => checks.find((check) => check.label === label)?.passed === true;
  return [
    {
      label: 'Result format',
      rule: 'routeA, routeB, routeC',
      passed: passed('Result has exactly the required JSON fields'),
    },
    {
      label: 'Route limits',
      rule: 'A ≤ 120 · B ≤ 100 · C ≤ 80',
      passed: [
        'Route A stays within 120 CKB',
        'Route B stays within 100 CKB',
        'Route C stays within 80 CKB',
      ].every(passed),
    },
    {
      label: 'Required total',
      rule: 'Exactly 300 CKB',
      passed: passed('The allocations total exactly 300 CKB'),
    },
  ];
}

export function summarizeVerification(result: AllocationResult) {
  const checks = verifyResult(result);
  const firstFailure = checks.find((check) => !check.passed);
  const failureMessages: Record<string, string> = {
    'Route A stays within 120 CKB': 'Route A exceeds the 120 CKB limit',
    'Route B stays within 100 CKB': 'Route B exceeds the 100 CKB limit',
    'Route C stays within 80 CKB': 'Route C exceeds the 80 CKB limit',
    'The allocations total exactly 300 CKB': 'The allocation must total exactly 300 CKB',
  };

  return {
    passed: !firstFailure,
    message: firstFailure
      ? failureMessages[firstFailure.label] ?? firstFailure.label
      : `All ${checks.length} rules passed`,
    checks,
  };
}

export function paymentDecision(result: AllocationResult) {
  const passed = summarizeVerification(result).passed;

  return passed
    ? {
        action: 'release' as const,
        actionLabel: 'Release 1 CKB to Solver C',
        outcome: 'Solver C receives 1 CKB',
        passed,
      }
    : {
        action: 'cancel' as const,
        actionLabel: 'Cancel and return 1 CKB',
        outcome: '1 CKB returns to Customer A',
        passed,
      };
}

export function shouldPollPaymentSession(paymentStatus: string) {
  return paymentStatus !== 'Not sent';
}

export function paymentReceipt(status: 'Paid' | 'Cancelled') {
  return status === 'Paid'
    ? {
        description: 'The selected result passed every check, so the held payment was released.',
        payment: '1 CKB released to Solver C',
        result: 'Verified',
        statusLabel: 'Payment released',
        title: 'Solver C received 1 CKB',
      }
    : {
        description: 'The selected result failed verification, so the held payment was cancelled.',
        payment: '1 CKB available to Customer A again',
        result: 'Rejected',
        statusLabel: 'Payment cancelled',
        title: '1 CKB returned to Customer A',
      };
}
