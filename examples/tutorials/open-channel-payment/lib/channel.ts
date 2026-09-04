import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function openCkbChannel(node: FiberBrowserNode, peer: `0x${string}`, amount: string) {
  const result = await node.openChannel({ pubkey: peer, funding_amount: ckbToHex(amount), public: true });
  return result.temporary_channel_id;
}

export function watchChannelStates(
  node: FiberBrowserNode,
  onChannels: (channels: Awaited<ReturnType<FiberBrowserNode['listChannels']>>['channels']) => void,
) {
  let active = true;
  let checking = false;
  const check = async () => {
    if (!active || checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      onChannels((await node.listChannels()).channels);
    } finally {
      checking = false;
    }
  };

  void check();
  const timer = window.setInterval(() => void check(), 2_000);
  document.addEventListener('visibilitychange', check);
  return () => {
    active = false;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  };
}
