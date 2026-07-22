---
title: Pulse 10
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-07-21
---

*The most exciting work happens when builders take the lead.*

### Fiber Studio: Visual Overhaul and Easier Node Migration

**Fiber Studio** released [v0.1.9](https://github.com/nervosnetwork/fiber/releases/tag/v0.9.0-rc7) with a UI visual revamp to improve readability. This update is driven by tester feedback while maintaining familiar payment flows.

This release bundles the fnn v0.9.0-rc7 node. This node upgrade requires a database migration, and Fiber Studio now handles the entire process directly in the interface. Error handling for routing and payment failures is also clearer in this release. Instead of outputting raw node text, the app provides plain-language summaries.

- Links: [Website](https://www.getfiberstudio.com/), [v0.1.9](https://github.com/chukwuma619/fiber-studio/releases) release and [forum discussion](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/22).
- Support: CKB Community Fund

### Dular | Redirecting to A More Decentralized Mobile Web/PWA

**Dular** is pausing its production USSD deployment, pivoting to a self-custodial, mobile Progressive Web App (PWA) flow. This redirection is best understood as a practical redesign, due to the constraints from their telecom provider Africa’s Talking, as well as an architectural update based on committee feedback.

Though a functioning USSD interface was simulator-tested, it is currently blocked for production. The telecom provider requires a dedicated USSD code for crypto services, which exceeds the grant budget. USSD will not be used as the main live testing channel.

Architecturally, committee feedback pointed out that Dular’s initial, more centralized ledger custodied user keys, undermining Fiber's core purpose. To resolve this, Dular will use a mobile browser running Fiber WASM. Devices can locally generate and store keys for self-custody, while the backend strictly maps phone numbers to user-owned Fiber identities for seamless, interoperable payments.

- Link: [Forum discussion](https://talk.nervos.org/t/spark-program-dular/10212/25)
- Support: Spark Program

### Paying a Bitcoin Lightning Invoice with CKB UDT on Fiber

This testnet demo shows Fiber’s Cross-Chain Hub (CCH) in action. In the example, the CKB-side asset is cWBTC, while the Lightning payment is handled through LND, turning Fiber’s cross-network payment design into a working end-to-end demo.

- Links: [Live Demo](https://fiber-swap.retric.uk), GitHub [Repo](https://github.com/humble-little-bear/fiber-swap-demo), and [forum discussion](https://talk.nervos.org/t/paying-a-bitcoin-lightning-invoice-with-ckb-udt-on-fiber/10486)

### Bringing Fiber to Mobile: Native iOS and Android Integration

**Fiber’s FFI layer** (`fiber-ffi`) wraps Rust fiber-lib as a stable C ABI, giving native Android and iOS apps a way to embed and interact with a Fiber node directly. This gives mobile developers a practical path to integrate Fiber into Swift and Kotlin applications, including node lifecycle control and direct RPC access from mobile environments.

The technical [guide](https://talk.nervos.org/t/bringing-fiber-to-mobile-apps-ffi-android-and-ios-native-integration/10478) explains how this integration works and outlines a reusable approach for bringing Fiber into mobile apps through an FFI boundary.

### fiber-pay v0.3.0 | UDT Operation Support

The AI-friendly CLI tool **fiber-pay** released [v0.3.0](https://github.com/RetricSu/fiber-pay/releases/tag/v0.3.0), with support for User Defined Token (UDT) operations. 

Fiber-pay was introduced as a developer- and AI-friendly interface to Fiber with JSON-oriented workflows for node interaction, channel management, and payments. This release pushes that idea further by adding asset support that is relevant to more advanced payment and application scenarios.

- Links: [v0.3.0](https://github.com/RetricSu/fiber-pay/releases/tag/v0.3.0) release and [forum discussion](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/11)

### Trickle: Budget-Capped Streaming Micropayments for Fiber Network

**Trickle** is a budget-capped, streaming micropayment system built for Fiber. It enables seamless, pay-as-you-go billing for continuous or high-frequency services like AI token usage, APIs, and agent-to-agent transactions.

Its main idea is to authorize a budget once and then settle many small usage events under that approved budget. This avoids opening a separate HTLC hold for every tiny payment, which would lock liquidity repeatedly and create UI friction.

- Links: [Forum discussion](https://talk.nervos.org/t/trickle-budget-capped-streaming-micropayments-for-fiber-network/10493)

### Proposal | Fiber Payment Gateway for WooCommerce

This proposal aims to build a WooCommerce payment plugin that lets merchants accept Fiber payments through their existing stores and their own Fiber nodes. 

At checkout, the plugin would generate an invoice for the order, display it as a QR code plus copyable invoice string, then watch for settlement through Fiber node webhooks or polling and update the WooCommerce order automatically once the payment is settled.

- Link: [Forum discussion](https://talk.nervos.org/t/spark-program-fiber-network-payment-gateway-for-woocommerce/10500)

### Proposal | Fiber Pay Studio: An End-User-Friendly Dashboard

**Fiber Pay Studio** is a web app that gives end users a simple way to try Fiber payments without running their own frontend. Currently, interacting with a Fiber node requires raw RPC calls or CLI tooling. This project replaces that with a simple, hosted dashboard.

Users can easily generate shareable payment requests, pay them via the CCC wallet connector, and track the channel balances and payment history in real time.

Unlike [Fiber Checkout](https://talk.nervos.org/t/spark-program-fiber-checkout-a-stripe-style-react-payment-library-for-fiber-network/10045), another community project focused on providing a developer library, Fiber Pay Studio is a no-code, ready-to-use application. It allows anyone to experience a Fiber payment end-to-end without running their own infrastructure. Furthermore, these two projects are complementary rather than duplicative: once Fiber Checkout’s component library matures, Fiber Pay Studio can be built on top of it as a reference implementation.

- Link: [Forum discussion](https://talk.nervos.org/t/spark-program-fiber-pay-studio/10485/4)

### Proposal | VibeQuest: Turning AI-Assisted Coding Into Real Learning

VibeQuest is a gamified educational onboarding platform and coding workbench. It is designed to close the gap between writing code with AI and actually understanding it. The project transforms the common workflow of vibe coding into a structured learning loop tailored for the Nervos CKB and Fiber ecosystems.

The current MVP covers two subjects: CKB Cell Model and Fiber Payment Models. The CKB Cell Model teaches how cells, Outputs, Scripts, witnesses, and verifier logic operate. Fiber Payment Models cover invoices, payment proofs, channel state, and replay risks to ensure developers know how off-chain payment evidence is secured.

- Links: [Forum discussion](https://talk.nervos.org/t/spark-program-vibequest-turning-ai-assisted-coding-into-real-learning/10446)

### Proposal | Fiber RGB++ Swap: Cross-Chain Assets Over Fiber

**Fiber RGB++ Swap** is an infrastructure upgrade that enables atomic, cross-chain swaps between RGB++ Bitcoin assets and CKB directly over the Fiber Network. It allows users to trade assets across networks without relying on custodial bridges or waiting for separate block confirmations.

Currently, Fiber's Cross-Chain Hub (CCH) is hardcoded to support only a 1:1 swap between Bitcoin and wrapped BTC on CKB. This project removes that limitation by introducing a two-part solution:

**The Advertisement Mechanism:** Hub operators broadcast a signed `SwapAdvertisement` message over Fiber’s existing peer gossip layer. This allows hubs to publicly declare the specific asset pairs and exchange rates they support, removing the single-pair limitation.

**The Swap Client:** A client tool discovers a compatible hub via the advertisement and initiates the trade. It uses generalized HTLC logic to validate the RGB++ assets and execute a full atomic swap (RGB++ asset in, CKB asset out).

- Link: [Forum discussion](https://talk.nervos.org/t/spark-program-fiber-rgb-swap/10487)

### Opticrum | Decentralized Liquidity Market for Fiber

**Opticrum** is an on-chain liquidity marketplace built on CKB that connects users who need Fiber channel capacity with Liquidity Providers (LPs) who can supply it.

Buyers publish "Order Cells" on-chain, specifying the required channel capacity and locking the rent they are willing to pay. Sellers (LPs) use their Fiber nodes to accept orders and collect linearly released rent.

- Link: [Forum discussion](https://talk.nervos.org/t/fiber-opticrum/10495)

### FiberPass: Prepaid, Revocable Payment Sessions

**FiberPass** is a wallet and payment UX infrastructure designed to simplify recurring and automated transactions on the Fiber Network. Users approve a spending limit only once, then the connected applications can execute subsequent payments automatically as long as they stay within the approved rules. 

Currently live in beta on the CKB testnet, the project is actively seeking ecosystem feedback.

- Link: [Demo](https://fiberpassfrontend.vercel.app/) and [forum discussion](https://talk.nervos.org/t/fiberpass-prepaid-revocable-payment-sessions-for-fiber-network/10491)

### *Building something of your own?*

If you have an idea in progress, there are a few pathways to get educational and financial backing from the Nervos ecosystem:

- **Spark Program:** A fast-track initiative tailored for early-stage concepts. It offers up to $2,000 USD to help you move from a raw idea to a working MVP within one to two months.
- **CKB Community Fund:** A broader, community-governed DAO that provides grants for a wide range of contributions, whether you are writing core code, creating educational content, or organizing community events.
- **CKBuilders**: A structured initiative offering microgrant-backed tracks for developers, content creators, and organizers. It provides monthly stipends, guided learning pipelines, and a supportive peer cohort to help you shape early prototypes.

Every project featured in our ecosystem updates began as an idea shared openly on the forum. If you are building with Fiber, we highly encourage you to share your journey on the [Nervos Talk](https://talk.nervos.org/) forum. We would love to follow your progress and feature your work in an upcoming issue.

Enjoy the process!

Fiber Devs