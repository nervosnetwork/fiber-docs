---
title: Pulse 11
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-08-03
---

*The most exciting work happens when builders take the lead.*

### FiberLatch Access: Fiber Payments Access Control

**Target Problem:** Accepting a Fiber payment is only half the job. Once the money lands, the app still has to figure out what the user actually paid for, whether to let them in, when that access should expire, and whether someone's trying to reuse the same receipt. [**FiberLatch**](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414) Access is a small, reusable access-control layer for exactly that "what happens after payment" step.

**Current Status:** An estimated 6-week timeline with the $3,000 grant proposal has been approved. [Weeks 1–2](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414/4) are done and works include: defining the package scope, receipt format, expiration rules, and verification rules. 

**Highlights:**

- Built by TicoWorld ([GitHub page](https://github.com/ticoworld)) as a grant-scoped spinoff of his earlier FiberLatch work from the CKBuilder program, which already demonstrated a full pay → verify → grant-once → deny-reuse flow on Fiber testnet.
- It's a lightweight, open-source Node.js package that complements payment tools like fiber-pay. No hosted service, no dashboard, no CLI.
- It utilizes a signed JWT representing access to a resource, without requiring a Fiber RPC call during normal receipt redemption.
- The package provides clear rules for replay protection and expiration, ensuring access receipts cannot be infinitely reused.

*This project is backed by CKB Community DAO grant.*

### fiber-payjoin-kit: Collaborative Privacy for Fiber

**Target Problem:** Standard payment channels on UTXO-based chains suffer from blockchain surveillance heuristics. Specifically, the "common-input heuristic" permanently links sender and receiver identities in the funding transaction before a off-chain payment even begin.

**Current Status:** While the [initial proposal](https://talk.nervos.org/t/dis-fiber-payjoin-kit-collaborative-privacy-for-the-nervos-fiber-network/10296) did not reach the required 30 upvotes within 7 days to pass the discussion stage, the developer, [ILE_LABS](https://ilelabs.org/), is actively preparing a revised proposal. This update will incorporate community feedback and leverage a completed Lightning Proof of Concept as its foundation.

**Highlights:**

- An open-source, asynchronous Rust library bringing collaborative Payjoin privacy natively to the Fiber Network.
- By allowing the receiver to contribute input Cells to the funding transaction, it breaks the common-input ownership heuristic, ensuring off-chain CKB payments remain entirely private.
- Includes non-interactive fallbacks: if the receiver's node goes offline, it degrades gracefully to a standard channel opening.
- Purpose-built for CKB's Cell model and Cell-Deps architecture, sidestepping the computational overhead of EVM-style mixers.
- ILE Labs already maintains `lightning-payjoin-kit` for Bitcoin Lightning, so this is a port of an architecture they've built before — not a from-scratch gamble.

### Sluice: A Liquidity Operations Workspace for Fiber

**Target Problem:** Operating any payment-channel node involves complex liquidity management. Operators frequently struggle to understand channel liquidity direction and predict if a payment will route successfully, often only discovering bottlenecks through failed payments.  

**Current Status:** [**Sluice**](https://talk.nervos.org/t/introducing-sluice-a-liquidity-operations-workspace-for-ckb-fiber/10532) is currently live as a testnet MVP connected to a real Fiber Network Node (0.9.0-rc7). It's still testnet-only and single-node for now, and the team is actively asking operators for feedback on Route Probe usefulness, rebalance safety, and reconciliation behaviour.

**Highlights:**

- Sluice consolidates monitoring, route analysis, rebalancing, alerts, and reconciliation into a single operational workspace.
- It features a Route Probe that tests whether a payment can be routed before funds are sent.
- The platform is built with a strong focus on correctness, ensuring the live Fiber node remains the authoritative single source of truth rather than relying on cached database snapshots.

### Gone in 60ms: Fiber Infrastructure Hackathon Roundup

The **Gone in 60ms" Fiber Network Infrastructure Hackathon** (July 1–15, 2026) has officially wrapped up, concluding a highly productive two-week sprint.

As Part 1 of the broader Fiber builder initiative, this sprint challenged developers to build the foundational tools, SDKs, and services that make Fiber easier to use, operate, and integrate for everyone, from wallet builders to node operators and merchants. 

Around **85 registrations** and close to **100 participants** produced **66 final project submissions, all fully open-sourced**, across three categories: 13 in Wallet & Payment UX Infrastructure, 32 in Node, Routing, Cross-Chain & Diagnostics, and 21 in Merchant, Liquidity, LSP & Multi-Asset.

Judges are in the first round of scoring now, with high-scoring entries going to a second round. The **$20,000** prize pool splits evenly across the three categories ($3,000 / $2,000 / $1,000 per category), plus a **$2,000 bonus** for the overall best project. Winners are expected around the middle or end of August — no exact date, in case more rounds are needed.

Part 2 is already being planned, shifting focus from infrastructure to consumer-facing products built on top of Fiber

Read the [full roundup](https://talk.nervos.org/t/gone-in-60ms-fiber-infrastructure-hackathon-roundup/10561) for more details.

### *Building something of your own?*

If you have an idea in progress, there are a few pathways to get educational and financial backing from the Nervos ecosystem:

- [**Spark Program:**](https://talk.nervos.org/c/daos-funding/spark-program/77) A fast-track initiative tailored for early-stage concepts. It offers up to $2,000 USD to help you move from a raw idea to a working MVP within one to two months.
- [**CKB Community Fund:**](https://talk.nervos.org/c/daos-funding/ckb-community-fund-dao/65) A broader, community-governed DAO that provides grants for a wide range of contributions, whether you are writing core code, creating educational content, or organizing community events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) A structured initiative offering microgrant-backed tracks for developers, content creators, and organizers. It provides monthly stipends, guided learning pipelines, and a supportive peer cohort to help you shape early prototypes. Join the Build on CKB [telegram group](https://t.me/+FpFa74ubID4xNzg0) and stay in the loop.

Keep building!

Fiber Devs