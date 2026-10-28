export function channelStateLabel(state?: string) {
  if (!state) return 'Not opened';
  return state.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

export const channelOpeningStates = [
  'NEGOTIATING_FUNDING',
  'COLLABORATING_FUNDING_TX',
  'SIGNING_COMMITMENT',
  'AWAITING_TX_SIGNATURES',
  'AWAITING_CHANNEL_READY',
  'CHANNEL_READY',
];

export const channelOpeningDescriptions: Record<string, string> = {
  NEGOTIATING_FUNDING: 'The two peers agree on channel parameters and funding contributions.',
  COLLABORATING_FUNDING_TX: 'The peers build the on-chain transaction that will fund the channel.',
  SIGNING_COMMITMENT: 'The peers sign the initial commitment transactions that protect their channel balances.',
  AWAITING_TX_SIGNATURES: 'The peers exchange funding-transaction signatures before the transaction can be broadcast.',
  AWAITING_CHANNEL_READY: 'The funding transaction is awaiting confirmation and the peers are exchanging readiness messages. Payments are still disabled.',
  CHANNEL_READY: 'The channel is ready. You can now send an off-chain payment.',
};

export function channelOpeningProgress(currentState?: string) {
  const current = channelOpeningStates.indexOf(channelStateLabel(currentState));
  return channelOpeningStates.map((state, index) => ({
    state,
    status: current === channelOpeningStates.length - 1 || index < current ? 'complete'
      : index === current ? 'current' : 'upcoming',
  }));
}

export function isMultiHopChannelReady(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
}

