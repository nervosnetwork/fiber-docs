import { FiberNode } from "./node";

export const amountPerPoint = 1 * 10 ** 8; // 1 CKB per point

const node1 = {
    pubkey: "0x02aa3beb0d770fe835db99bf894fb2d9afaf4df0d5ec1871fad731d4fc6c90faed",
    address:
        "/ip4/127.0.0.1/tcp/8228/p2p/QmQuWzdmdCSK9ZtLXK4iCKNnnBSxa6szPCGhdPpbxsb362",
    url: "/node1-api",
};

const node2 = {
    pubkey: "0x03827ccddf3fdf59808fa6baea647d93bd6f6105309d3b20e1fc0d9e40495865cc",
    address:
        "/ip4/127.0.0.1/tcp/8238/p2p/QmdKDFAATW9Gd1btc6WJ1PS5hp1vzMfDRRBErYowuphGzE",
    url: "/node2-api",
};

export async function prepareNodes() {
    const bossNode = new FiberNode(node1.url, node1.pubkey, node1.address);
    const playerNode = new FiberNode(node2.url, node2.pubkey, node2.address);
    console.log("bossNode", bossNode);
    console.log("playerNode", playerNode);

    await bossNode.sdk.connectPeer({
        address: playerNode.address,
    });

    const channels = await bossNode.sdk.listChannels({
        pubkey: playerNode.pubkey,
    });
    const activeChannel = channels.filter(
        (channel: any) => channel.state.stateName === "CHANNEL_READY",
    );
    console.log("activeChannel", activeChannel);
    return { bossNode, playerNode };
}

export async function payPlayerPoints(
    bossNode: FiberNode,
    playerNode: FiberNode,
    points: number,
) {
    const amount = `0x${(amountPerPoint * points).toString(16)}`;

    const invoice = await playerNode.createCKBInvoice(
        amount,
        "player hit the boss!",
    );
    const result = await bossNode.sendPayment(invoice.invoiceAddress);
    console.log(`boss pay player ${points} CKB`);
    console.log("invoice", invoice);
    console.log("payment result", result);
}

export async function payBossPoints(
    bossNode: FiberNode,
    playerNode: FiberNode,
    points: number,
) {
    const amount = `0x${(amountPerPoint * points).toString(16)}`;
    const invoice = await bossNode.createCKBInvoice(
        amount,
        "boss hit the player!",
    );
    const result = await playerNode.sendPayment(invoice.invoiceAddress);
    console.log(`player pay boss ${points} CKB`);
    console.log("invoice", invoice);
    console.log("payment result", result);
}
