---
title: Pulse 13
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-08-31
---

*The most exciting work happens when builders take the lead.*

### Fiber Studio v1.1.1: Bundled FNN v0.9.0 and Enhanced Channel States

**Fiber Studio** has released [v1.1.1](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/26#p-25834-fiber-studio-v111-bundled-fnn-v090-upgrade-channel-state-handling-1), featuring a major upgrade that bundles the official FNN (Fiber Network Node) v0.9.0 stable release. 

This update improves the reliability and clarity of day-to-day channel management. In particular, Fiber Studio now recognizes channels in a Stale state and presents them with a clear “Needs sync” badge, rather than treating them as pending openings. The channel-details interface also explains why cooperative-close or abandon actions may be unavailable until a peer re-synchronizes.

Updated mainnet and testnet configuration templates add guidance for RPC module configuration and Biscuit-token authentication, while version indicators and documentation now reflect the FNN 0.9.0 engine. Signed installers are available for macOS, Windows, and Linux, and existing users can update in-app.

*This project is backed by a CKB Community Fund DAO.*

### FiberLatch Access Concludes with Open-Source Node.js Release

**FiberLatch Access** has completed its [six-week grant](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414/5), delivering a lightweight, reusable Node.js package for turning a trusted payment or business decision into a signed, scoped access receipt.

This package is now publicly available on npm in version 0.1.1. It supports receipt creation, Ed25519 signing and verification, trusted request-context binding, expiration, and single-use redemption backed by application-owned atomic storage. 

*This project is backed by a CKB Community Fund DAO grant.*  

### Fiber Infrastructure Hackathon Spotlights 66 Projects

July’s *Gone in 60ms:* *Fiber Network Infrastructure [Hackathon](https://talk.nervos.org/t/gone-in-60ms-fiber-network-infrastructure-hackathon-results/10671/1)* brought together roughly 100 participants and 66 submissions across wallet and payment UX, node/routing diagnostics, and merchant/liquidity tooling.

The overall winner was **Clasp** ([GitHub](https://github.com/Enoch208/Clasp)), a wallet-policy and pairing system that lets users grant applications or AI agents scoped, editable, time-limited, and revocable access to selected Fiber payment operations—without exposing a node’s underlying RPC interface directly. 

Other category winners included **fiber-forge ([GitHub](https://github.com/code3ks/fibernuts))**, a one-command local Fiber development environment with topology presets and a web GUI; and **FiberNuts ([GitHub](https://github.com/code3ks/fibernuts))**, a Cashu mint integration that settles over Fiber and enables browser-based RUSD-backed ecash use without requiring end users to operate a node. The results also recognized tools for deterministic failure testing, payment readiness checks, merchant liquidity provisioning, and Fiber-powered paid HTTP access.

### OpenStrike Fiber Arena: Real-Time Gaming Settled on Fiber

[**OpenStrike Fiber Arena**](https://talk.nervos.org/t/porting-couter-strike-to-fiber-network/10647) is a testnet prototype that combines a simple 1v1 first-person shooter with Fiber hold invoices to settle game damage in real value.

Before a match begins, each player opens a Fiber channel and authorizes four hold invoices. The authoritative game server runs at 64 ticks per second, determines when a hit lands, and releases the associated preimage; this makes the relevant payment claimable and prevents the losing player from refusing payment after confirmed damage. 

This demonstration is designed for those willing to trust a centralized server to run the game and adjudicate hits, while leveraging Fiber to handle the actual damage payments. This approach prioritizes getting a game up and running quickly with the fastest possible Fiber channel integration, though it currently lacks robust anti-cheat validation for client inputs.  

### Myelin Explores Continuous CKB-Aligned Off-Chain Sessions

[**Myelin**](https://talk.nervos.org/t/from-bounded-sessions-to-continuous-operation-pluggable-chain-modules-in-myelin/10658/1) explores how an application can keep operating over time while processing its activity in smaller, finite steps.

The latest update draws on a scaling challenge highlighted by the [OpenStrike Fiber Arena](https://github.com/RetricSu/openstrike-fiber-arena) demo. In this fast-paced game, players authorize hold invoices before a match, and the server releases a payment when it records enough damage. The author notes that, in a larger game, preparing a separate hold invoice for every event could reserve liquidity, make the pre-match setup longer, and complicate cancellation, timeouts, and recovery.

Instead of handling individual events separately, Myelin examines how to group a series of game events over time into bounded epochs. Each completed checkpoint records the relevant sequence and balances, so the application can verify what happened and continue from its last saved state after a restart.

### Fiber Meets CKB Light Client in an Embedded Prototype

A new [Fiber + CKB Light Client exploration](https://talk.nervos.org/t/integrating-fiber-with-ckb-light-client-an-exploration-in-reducing-reliance-on-full-node-rpc-servicesfiber-lightclient/10656) shows how desktop, mobile, and local-wallet applications could reduce their long-term reliance on public full-node RPC providers.

The experimental integration runs CKB Light Client and Fiber in the same process through `fiber-ffi`, with a local RPC gateway allowing Fiber to retain its existing CKB JSON-RPC call paths. The embedded light client synchronizes and verifies headers, scans configured filter scripts for the Cells and transactions Fiber needs, and can broadcast transactions through the CKB P2P network after local validation. 

Basic workflows, including light-client preparation, Fiber startup, channel operations, and payments, already work in this experimental build. The API remains incomplete and has not undergone rigorous testing. Current limitations include synchronization time, limited use of an external RPC endpoint for specific cases, a single light-client instance per process, and required application restarts after shutdown or certain preparation failures.

### Mapping Where AI and Machine Payments Meet Fiber

A community report [*AI, machine payments, and Fiber in 2026*](https://talk.nervos.org/t/ai-machine-payments-and-fiber-in-2026-an-opportunity-map-for-ckb-and-fiber-developers/10665) looks at where Fiber can add something distinct to AI services and machine payments, and where other tools may be a better fit.

The report highlights generic usage metering and receipt-based paid access as mature components ready for immediate reuse by developers. It identifies routed, bidirectional CKB-asset sessions and browser-side self-custody sessions as areas to validate next. 

The report finds Fiber most useful when an application needs more than a simple one-way payment. That could include two-way payment channels, CKB or UDT assets, multi-hop routing, self-custody in the browser, payments linked to rights on CKB, or moving assets between Lightning and Fiber.

The report is most cautious about ordinary one-way USDC API payments  because simpler or more mature options already exist.

### *Thinking about building something of your own?*

Turning an idea into reality takes time, effort, and support. If you are working on a new concept, the Nervos ecosystem is here to back you up with the resources to build sustainably:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [**Telegram group**](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

Keep building!

Fiber Devs