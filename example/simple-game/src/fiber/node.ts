import { FiberSDK } from "@ckb-ccc/fiber";

export class FiberNode {
    public readonly sdk: FiberSDK;

    constructor(
        public readonly url: string,
        public readonly pubkey: string,
        public readonly address: string,
    ) {
        this.sdk = new FiberSDK({ endpoint: url });
    }

    private generateRandomPaymentPreimage() {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        return (
            `0x${Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")}`
        );
    }

    async createCKBInvoice(amount: string, description: string) {
        const paymentPreimage = this.generateRandomPaymentPreimage();
        return await this.sdk.newInvoice({
            amount,
            currency: "Fibt",
            description,
            expiry: "0xe10",
            paymentPreimage,
        });
    }

    async sendPayment(invoice: string) {
        return await this.sdk.sendPayment({ invoice });
    }
}
