import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
export async function closeCooperatively(node:FiberBrowserNode,channelId:`0x${string}`){await node.shutdownChannel({channel_id:channelId,force:false})}
export async function listIncludingClosed(node:FiberBrowserNode){return node.listChannels({include_closed:true})}
