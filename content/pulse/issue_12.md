---
title: Pulse 12
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-08-17
---

*The most exciting work happens when builders take the lead.*

### fiber-payjoin-kit: Collaborative Channel Funding Privacy

[**fiber-payjoin-kit**](https://talk.nervos.org/t/dis-fiber-payjoin-kit-collaborative-channel-funding-privacy-for-the-nervos-fiber-network-res/10604) is an Rust library built to enable collaborative channel funding on the Fiber Network. 

**Target Problem:** Every Fiber channel opening writes a funding transaction to CKB Layer 1, and a standard opening has all Input Cells belonging to one wallet, providing enough data for chain surveillance tools to identify the funder and cluster their full history. By allowing both parties to contribute Inputs to the funding transaction, the toolkit makes chain attribution impossible, improving operational security and privacy.

**Current Status:** Resubmitted. The team has submitted a revised proposal with a reduced scope and budget. The new proposal is scoped to Phase 1, featuring two concrete end-to-end demos against a real Fiber node to address fee-contribution and funding privacy pain points.

The 7-day window to collect at least 30 likes is now open.

*This project is seeking a CKB Community Fund DAO.*

### FiberLatch Access: Fiber Payments Access Control with Receipt Package Built and Tested

[**FiberLatch Access**](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414) serves as an open-source access-control layer designed specifically for Fiber payment flows.

**Target Problem:** Accepting a Fiber payment is only half the job. Once money lands, the app still has to decide what the user paid for, whether to let them in, when access expires, and whether someone is replaying an old receipt. FiberLatch Access provides a small, reusable layer for that step.

**Current Status**: Weeks 3–4 of the 6-week grant are complete with two main implementation deliverables finished: the reusable @fiberlatch/access Node.js package and the paid-resource example. 

Code lives in the fiber-latch [repo](https://github.com/Ticoworld/fiber-latch), with the [access package](https://github.com/Ticoworld/fiber-latch/tree/master/packages/access) and paid-resource [example](https://github.com/Ticoworld/fiber-latch/tree/master/examples/paid-resource) public.

*This project is backed by a CKB Community Fund DAO grant.*

### Fiber Studio v1.0.0 (Former Fiber Desktop v1): Bringing Fiber Node to Your Desktop

[Fiber Studio](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/23) is a desktop app for Fiber Network Node. This consumer-grade desktop app replaces the need for command lines, VPS hosting, and router configurations, guiding users through everyday node operations. Through the interface, users can open CKB or UDT channels, manage invoices, execute keysends, pay Lightning invoices with cWBTC via a Cross-Chain Hub (CCH), and track asset balances.

The v1.0.0 launch establishes Fiber Studio as a standalone product with a dedicated brand, a custom domain ([getfiberstudio.com](https://www.getfiberstudio.com/)), and signed app installers. The application prioritizes security by ensuring the user's CKB key remains local to their computer and passwords are kept within the system keychain.

*This project is backed by a CKB Community Fund DAO.*

### Fiber RGB++ Swap: Extending Cross-Chain Hub for Custom Asset Pairs

[**Fiber RGB++ Swap**](https://talk.nervos.org/t/spark-program-fiber-rgb-swap/10487) is a developer tool extending the Fiber's CCH beyond its default BTC and wrapped-BTC pair. 

With the RGB++ protocol-level development and bridge mechanics removed out of scope for this grant, the project narrows its focus to the discovery and advertisement layers for multi-asset swaps. 

Development begins with establishing CKB and Fiber testnet nodes and finalizing the SwapAdvertisement message schema. Next, it implements SwapAdvertisement signing and verification, wiring it into fiber-lib's existing broadcast and relay path as a new message type. Following this is the building of the listening-side index, exposed through an API endpoint and wired to a CLI for users to query live advertisements. The plan closes with a two-node broadcast and discovery test, a short recorded demo, and setup docs.

**Current Status:** Approved under the *Spark Program*, the project is advancing through its testnet milestones. Progress updates are scheduled for the upcoming ecosystem monthly call. 

### Pay Lightning with Fiber: Self-Hosted Cross-Chain Hub

[**Pay Lightning with Fiber**](https://talk.nervos.org/t/pay-lightning-with-fiber-a-self-hosted-cross-chain-hub-anyone-can-run/10599) introduces a self-hosted CCH to act as a bridge between the Fiber Network and Bitcoin Lightning. This standalone kit allows users to swap value between the two networks without custody. The [repository](https://github.com/chukwuma619/fiber-cch-hub) provides a unified stack containing a Fiber node, a Lightning node, and the CCH wired between them.

### FiberFlow: Self-Hosted Merchant Payments Infrastructure

[**FiberFlow**](https://talk.nervos.org/t/fiberflow-self-hosted-merchant-payments-for-fiber-try-the-live-demo/10574) provides a self-hosted merchant payment infrastructure layer for the Fiber Network. The [repository](https://github.com/chukwuma619/fiberflow) includes a Fiber node, an API for invoices and webhooks, a merchant dashboard, and a customer checkout page. Store owners can run this infrastructure using their own wallet keys, allowing customers to check out and pay via any Fiber-compatible wallet.  

### *Building something of your own?*

Turning an idea into reality takes time, effort, and support. If you are working on a new concept, the Nervos ecosystem is here to back you up with the resources to build sustainably:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [Telegram group](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

Keep building!

Fiber Devs
