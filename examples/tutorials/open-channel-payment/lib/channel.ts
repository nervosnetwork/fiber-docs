import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';
export async function openCkbChannel(node: FiberBrowserNode, peer: `0x${string}`, amount: string) {
  return node.openChannel({ pubkey: peer, funding_amount: ckbToHex(amount), public: true });
}
