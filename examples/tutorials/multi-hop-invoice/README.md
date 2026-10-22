# Multi-hop invoice tutorial

This project packages the same React component, runtime, styles, and outcome logic as the live tutorial. Generated copies live in `components/tutorials/`; edit those files to explore the implementation locally.

## Run

Use Node.js 20.9 or newer. In this directory:

```sh
npm install
npm run dev
```

Open http://localhost:3000. The Next.js configuration provides the cross-origin isolation headers required by the Fiber WASM runtime.

When running inside the docs repository, icons are served directly from the repository's root `public/` directory. The downloadable ZIP includes those same icons in its own `public/` directory so it also runs independently.

The setup screen detects saved profiles without starting them. Choose Prepare nodes for a first visit or Restore nodes to reuse saved identities. An earlier tutorial's node can become Sender A; Receiver C has a separate profile. Start fresh nodes starts new identities for both nodes and preserves the saved profiles.

Fund any new nodes with Testnet CKB and open their public channels with Bottle. Once both channels are ready, the tutorial automatically advances to invoice creation. Choose an amount, create the invoice on C, review it on A, and send the payment. The invoice is passed directly between the nodes. The outcome waits for both sender Success and receiver Paid.

To practise again when receiving liquidity runs low, choose Restore receiving liquidity in the invoice step. Review the amount and 1 CKB routing-fee allowance, then choose Send back to A. A creates a separate invoice and C pays it through Bottle using the existing channels. The return is tracked across reloads and is complete only when C reports Success and A reports Paid. Both channel readings refresh and the next invoice defaults to 1 CKB. This transfers existing funds and incurs routing fees; it does not create new funds.

Use one active tutorial tab when sharing a saved node. If another tab owns that node, startup is blocked here. Continue in the active tab, or close it and retry here. This coordination requires a browser with Web Locks support.

The node profiles are local to the browser origin. A new localhost port uses different storage, so do not expect identities from the hosted tutorial to appear here. Use Testnet funds only. Browser profiles store tutorial keys locally; this is not a production key-management design.

Other tutorial links open the hosted Fiber documentation. The code panel is a generated snapshot of the included source at download time. Update the source snapshot and downloadable archive together when changing the tutorial.

Forward invoices and payments are saved for each sender/receiver pair in this browser. After reloading, restore the same nodes to resume status checks. An uncertain submission stays pending; recovery never automatically sends it again.
