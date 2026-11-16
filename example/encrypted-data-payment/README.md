# Encrypted data payment starter

A browser-only Buyer and Seller using Fiber and CKB Testnet. The full walkthrough is at https://www.fiber.world/docs/build/encrypted-data-payment.

## Run locally

Use Node.js 22.18 or newer and npm. Extract the archive, then run these commands inside `encrypted-data-payment`:

```sh
npm install
npm run dev
```

Open http://localhost:3001. Use `localhost` or HTTPS: the WASM runtime requires a secure context, SharedArrayBuffer, Web Locks, and cross-origin isolation. `next.config.mjs` supplies the isolation headers. Browser extensions or a proxy that strips those headers can prevent startup.

## Use the starter

Start each node, copy its funding address to the linked faucet, and request enough Testnet CKB for 500 CKB of channel funding plus the on-chain transaction fee. Channel V2 reserves 100 CKB, leaving 400 CKB to meet Bottle’s auto-accept minimum. Open both channels and check their status until each reports `CHANNEL_READY`. Confirmation can take several minutes.

The channel balances show whether Bottle already has inbound liquidity. The 5 CKB transfer is an optional experiment if that balance already covers the purchase. Its button checks an existing transfer before sending another.

Create an encrypted offer, copy the public JSON into the Buyer field, validate it, and test decryption without the key. Then pay its 1 CKB Invoice and decrypt the result. The receipt shows the actual routing fee; the configured maximum is 1 CKB.

## Resume and troubleshoot

- After refreshing, start the same saved nodes, revalidate the restored offer, and choose **Check payment status**. A completed or pending attempt is never automatically submitted again. An explicit retry is available only after the node confirms failure.
- Keep one tab per saved node. Browser storage holds node identities and public offer/payment progress; clearing it can lose access to funded channels. AES keys and decrypted output are not saved by the application. A settled key is recovered through `getPayment`.
- If a 5 CKB transfer was interrupted before its hash returned, the button blocks another transfer. Review the Seller's payment history (`listPayments`) to identify the result before deliberately clearing its `fiber-docs:encrypted-inbound:<seller identifier>` session entry.
- If a channel is slow, check its status or reconnect it. The existing channel is reused. Do not clear its storage or fund a replacement to resolve a wait.
- Faucet requests and network confirmations can take longer than expected. Check the faucet transaction and refresh the channel status once funds arrive.

## Code and checks

`lib/offer.ts` creates the public payload. `lib/payment.ts` checks the decoded Invoice's network, amount, and payment hash and records an attempt before submission. `lib/progress.ts` restores public data only for matching saved node identities. `lib/node-session.ts` prevents concurrent runtimes from opening the same saved node.

```sh
npm run typecheck
npm test
npm run build
```

The application catches action errors and displays them inline. If a payment outcome is unknown, check the existing attempt instead of initiating a replacement.
