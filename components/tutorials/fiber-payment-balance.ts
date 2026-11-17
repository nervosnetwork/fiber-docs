import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';

// A 0.10.1 payment may succeed before its final channel update is visible.
export async function waitForChannelBalance(
  node: Pick<FiberBrowserNode, 'listChannels'>,
  channelId: string,
  expectedMaximum: bigint,
  timeoutMs = 10_000,
): Promise<Channel | undefined> {
  const deadline = Date.now() + timeoutMs;
  do {
    const { channels } = await node.listChannels();
    const channel = channels.find((item) => item.channel_id === channelId);
    if (channel && BigInt(channel.local_balance) <= expectedMaximum) return channel;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() <= deadline);
  return undefined;
}
