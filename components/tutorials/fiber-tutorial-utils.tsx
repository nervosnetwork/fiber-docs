'use client';

import type { Channel } from '@fiber-pay/sdk/browser';
import { isReusableChannel, samePubkey } from './fiber-routing-runtime';
import styles from './fiber-wasm-quickstart.module.css';

export type ChannelProgressStage =
  | 'idle'
  | 'connecting'
  | 'submitting'
  | 'confirming'
  | 'ready'
  | 'closing'
  | 'closed'
  | 'error';

export function normalizedChannelState(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function isChannelReady(channel: Channel | undefined) {
  return Boolean(
    channel && normalizedChannelState(channel.state.state_name) === 'channelready',
  );
}

export function progressFromChannelState(
  channel: Channel | undefined,
): ChannelProgressStage {
  if (!channel) return 'idle';
  const state = normalizedChannelState(channel.state.state_name);
  if (state === 'channelready') return 'ready';
  if (state === 'shuttingdown') return 'closing';
  if (state === 'closed') return 'closed';
  if (state.includes('failed') || state.includes('aborted')) return 'error';
  if (state === 'awaitingchannelready') return 'confirming';
  return 'submitting';
}

export function findMatchingChannel(
  channels: Channel[],
  pubkey: string,
  predicate: (channel: Channel) => boolean = () => true,
) {
  const matches = channels.filter(
    (channel) =>
      samePubkey(channel.pubkey, pubkey) &&
      predicate(channel) &&
      isReusableChannel(channel),
  );
  return matches.find((channel) => isChannelReady(channel)) ?? matches[0];
}

export function ChannelProgress({
  stage,
  label = 'Channel progress',
}: {
  stage: ChannelProgressStage;
  label?: string;
}) {
  const current =
    stage === 'connecting'
      ? 0
      : stage === 'submitting'
        ? 1
        : stage === 'confirming'
          ? 2
          : stage === 'ready'
            ? 3
            : -1;
  const labels = ['Connect peer', 'Submit funding', 'Confirm on-chain', 'Channel ready'];

  return (
    <div className={styles.channelConnectionProgress}>
      <span>{label}</span>
      <div>
        {labels.map((item, index) => {
          const complete = stage === 'ready' || index < current;
          const active = index === current && stage !== 'error';
          return (
            <div
              className={
                complete
                  ? styles.channelProgressComplete
                  : active
                    ? styles.channelProgressActive
                    : undefined
              }
              key={item}
            >
              <i>{complete ? '✓' : index + 1}</i>
              <small>{item}</small>
              {index < labels.length - 1 && <b>→</b>}
            </div>
          );
        })}
      </div>
      {stage === 'confirming' && (
        <p>Funding is on-chain. This page keeps checking until the channel is ready.</p>
      )}
    </div>
  );
}
