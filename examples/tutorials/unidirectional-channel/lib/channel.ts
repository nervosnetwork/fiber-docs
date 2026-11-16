import { requireNewChannelFunding } from './channel-funding';
import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function openOneWayChannel(
  node: FiberBrowserNode,
  acceptorPubkey: `0x${string}`,
) {
  await requireNewChannelFunding(node);
  return node.openChannel({
    pubkey: acceptorPubkey,
    funding_amount: ckbToHex('500'),
    public: false,
    one_way: true,
  });
}

export function findOneWayChannel(channels: Channel[], acceptorPubkey: string) {
  return channels.find(
    (channel) =>
      channel.pubkey.replace(/^0x/, '') === acceptorPubkey.replace(/^0x/, '') &&
      channel.is_one_way,
  );
}
