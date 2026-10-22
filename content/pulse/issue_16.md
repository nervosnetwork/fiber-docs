---
title: Pulse 16
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-10-12
---
*The most exciting work happens when builders take the lead.*

### Twine Advances Its P2P Trading Architecture

[**Twine**](https://talk.nervos.org/t/twine-buy-and-sell-ckb-without-depositing-on-an-exchange-fiber-p2p-poc/10741) is a non-custodial, peer-to-peer trading protocol built on the Fiber Network that enables users to buy and sell CKB directly via off-chain fiat rails without depositing funds on a centralized exchange. By combining Fiber's HTLCs (Hash Time-Locked Contracts) and hold invoices with off-chain fiat settlement, Twine aims to reduce settlement risk without requiring users to deposit their crypto on a centralized exchange.

Since the last update, Twine has [reworked](https://talk.nervos.org/t/twine-buy-and-sell-ckb-without-depositing-on-an-exchange-fiber-p2p-poc/10741/5) its architecture, separating the mobile app from the Fiber node and using encrypted Nostr messaging for trade coordination. A testnet trade exchanging 2 CKB for 2 Nigerian naira was successfully demonstrated.

Following community security feedback, the developer also [improved](https://talk.nervos.org/t/twine-buy-and-sell-ckb-without-depositing-on-an-exchange-fiber-p2p-poc/10741/8) payment settlement to prevent the coordinator from independently settling the seller's locked funds before the buyer is paid, ensuring safety as long as the payment secret remains undisclosed.

### FiberLatch Tests Payment-Based Access Control with FiberFlow

[**FiberLatch Access**](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414) is an open-source toolkit that lets applications grant access to digital resources after a verified Fiber payment.

In its latest update, the developer successfully [tested](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414/8) an integration with **FiberFlow** using real Fiber testnet payments. The test demonstrated signed access receipts, limited-use permissions, and protection against duplicate access grants when payment notifications are retried. The integration currently runs in the developer's own FiberFlow fork.

### FiberSurvivors Brings Fiber Payments into Browser Gaming

[**FiberSurvivors**](https://talk.nervos.org/t/fibersurvivors-a-browser-survivors-like-for-fiber/10898) is a browser-based survivors-like game that demonstrates real-time micro-payments over Fiber Network.

Built with Unity, the WebGL [demo](https://zesty-youtiao-8586ae.netlify.app/) runs a Fiber node directly in the browser. The game opens a channel to a hub node, allowing players to earn CKB for completing levels and spend CKB mid-run on upgrade cards via instant invoices. 

The developer also released the [Fiber WebGL SDK](https://github.com/TranNhi27/FiberWebGLSDK) that other Unity developers can use to integrate Fiber payments into their games. The project is currently a testnet proof of concept.

### Join the builders

Turning an idea into reality takes time, effort, and support. If you are working on a new concept, the Nervos ecosystem is here to back you up with the resources to build sustainably:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [**Telegram group**](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

Keep building!

Fiber Devs