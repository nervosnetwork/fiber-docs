---
title: Pulse 15
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-09-28
---
*The most exciting work happens when builders take the lead.*

## Dular Concludes Spark Grant Pilot

[**Dular**](https://talk.nervos.org/t/spark-program-dular/10212) is a mobile-first payment solution bridging African mobile money rails (M-Pesa) with Fiber Network channels using RUSD. The Spark Program committee has published its [final evaluation](https://talk.nervos.org/t/spark-program-dular/10212/43), officially approving completion of the $2,000 mini-grant.

Dular’s field pilot completed a live pilot with 30 users in Kenya with 57 successful Fiber payments across 31 channels, backed by automated end-to-end tests and verifiable on-chain evidence. In response to committee and developer feedback, Dular pivoted from a managed ledger to a self-custodial Fiber WASM mobile web wallet, generating local keys protected by a PIN and facilitating direct peer-to-peer Fiber invoice payments.

The team published a retrospective [*What Mobile Money Users Taught Us Building on Fiber*](https://talk.nervos.org/t/dular-what-mobile-money-users-taught-us-building-on-fiber/10717), highlighting real-world friction around user onboarding, phone-number identity registries, and helping users understand channel liquidity.

*This project is backed by the [Spark Program](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752).*

## Spark Grant Updates: Fiber RGB++ Swap Funding Ends

The Spark Program committee has announced the [termination](https://talk.nervos.org/t/spark-program-fiber-rgb-swap/10487/30) of funding for the Fiber RGB++ Swap project. While acknowledging the developer's work on gossip-based quote announcements, the review concluded that the milestone significantly diverged from the original scope of delivering an executable atomic swap on testnet compatible with production FNN (Fiber Network Node) code.

In parallel, the developer has submitted a new Spark proposal, [Fiber Weir](https://talk.nervos.org/t/spark-program-fiber-weir-condition-gated-payment-streams-for-fiber-network/10723), although its review was put on hold while the committee completed its review of Fiber RGB++ Swap. Fiber Weir seeks to explore condition-gated payment streams, a protocol primitive allowing continuous micropayments that automatically halt and refund if on-chain state conditions are violated.

## FiberNuts Launches Community Market Demo on Testnet

[**FiberNuts**](https://talk.nervos.org/t/fibernuts-after-the-hackathon-what-could-cashu-fiber-enable-on-ckb/10688) connects Cashu ecash with Fiber payment channels, using Fiber at the edges for deposits and redemptions while enabling instant, private, off-chain bearer transfers in between.

Following its rebuilt wallet release, the team has launched the [**FiberNuts Community Market**](https://talk.nervos.org/t/fibernuts-community-market-a-testnet-app-for-cashu-fiber/10792), an interactive testnet application showcasing how Cashu + Fiber operate in a real-world event setting.

The demo provides an [Attendee](https://market.fibernuts.xyz/) Web App to load RUSD via Fiber and pay for goods, alongside a [Vendor](https://market.fibernuts.xyz/vendor) Terminal to generate orders, accept ecash, and cash out back to Fiber. It implements NUT-18 payment requests and vendor-key locking. An order is marked as "Paid" only after the issuing mint successfully validates and swaps received proofs for fresh ones, ensuring clear trust and settlement boundaries.

The open-source code and testnet deployment are available on [GitHub](https://github.com/code3ks/fibernuts), with the developer seeking community feedback on UX clarity and potential event pilots.

## FNN Safeguard Proposes Recovery Checks for Node Operators

[**FNN Safeguard**](https://talk.nervos.org/t/dis-fnn-safeguard-recovery-verification-and-pre-upgrade-qualification-for-fiber-nodes/10712) is a proposed operator utility submitted to the CKB Community Fund DAO, designed to harden node lifecycle management.

While FNN includes native backup functionality, FNN Safeguard adds an automated, isolated verification layer. Its existing MVP can trigger and inspect backups, create checksummed recovery manifests, conduct recovery drills, and compare recovered node identity, channel state, and payment records with the original state.

## Twine Experiments With P2P CKB Trading Over Fiber

[**Twine**](https://talk.nervos.org/t/twine-buy-and-sell-ckb-without-depositing-on-an-exchange-fiber-p2p-poc/10741) is an open-source peer-to-peer fiat desk that allows users to buy and sell CKB directly without centralized exchange deposits or KYC friction. 

Rather than holding escrow funds centrally, Twine uses Fiber HTLC hold invoices. When a trade starts, the seller locks CKB in a Fiber conditional payment. Off-chain fiat is transferred directly (via bank transfer or local payment apps). Once confirmed, the seller reveals the preimage to release funds. If the buyer fails to pay, the preimage is withheld and the locked CKB automatically reverts automatically after timelock expiry.

The recent update introduced a dispute flow into the mobile app. An elected coordinator can inspect signed trade evidence and settle or refund payments.

## Paying .cell Domains Over Fiber

A typical Fiber node ID is a long hexadecimal string starting with `0x03...`. [**LusoCryptoLabs**](https://lusocryptolabs.com/) [tested](https://talk.nervos.org/t/paying-a-cell-name-over-fiber-on-testnet-what-it-took/10787) whether a human-readable `.cell` decentralized domains (powered by [cellula.id](https://cellula.id/)) can act as a Fiber payment endpoint. 

A `.cell` name can publish a Fiber node's public key and network address. A payer can look up a recipient’s node information, e.g., `alice.cell`, and send funds without asking for a fresh invoice each time.

The test worked on Fiber testnet, including a payment routed through a public hub to `telmo.cell`. The developer also documented the configuration and implementation details needed to make the setup work reliably, such as maintaining public routing channels and ensuring sufficient inbound channel liquidity.

## Connecting Payment to Delivery via Fiber Invoices

In a typical online service, making a payment and receiving what you paid for are separate steps. An application first checks that the payment arrived, then uses its own system to give the buyer access, or confirm that a service has been completed.

Two testnet [experiments](https://talk.nervos.org/t/how-a-fiber-payment-can-unlock-data-and-control-settlement/10731) on Fiber explore ways to connect these steps more directly. In one, successfully paying a Fiber invoice gives the buyer what they need to unlock encrypted content, so access follows directly from the payment. In the other, the payment is held while the application checks whether a requested service was completed correctly, and is settled only after that check succeeds.

The experiments point to ways Fiber payments could become part of how an application delivers and verifies services, rather than serving only as a way to transfer money. This could be useful for paid APIs, digital content, AI agents, and other machine-to-machine services where payment and delivery need to happen together.

## Developer Tooling: Fiber Test Lab & Compatibility Kit

Independent tooling efforts are making testing and integration more resilient across the network:

[**Fiber Test Lab:**](https://talk.nervos.org/t/fiber-test-lab-local-reproducible-failure-scenarios-for-fiber-payments/10752) A CLI and automated Vitest harness designed to reproduce edge-case payment failure scenarios locally (such as multi-hop routing bottlenecks, offline peers, channel capacity depletion, and expired invoices) to help application developers write robust assertion suites.

[**Fiber Compatibility Kit:**](https://talk.nervos.org/t/compatibility-kit-for-rpc-and-sdk-consumers-technical-feedback/10737) Developed by [ILE Labs](https://ilelabs.org/), this standalone test kit executes black-box comparisons between FNN  v0.9.0 and v0.9.1 runtimes to detect consumer-contract drift, unmapped data fields, and SDK discrepancies before upgrades hit production.

[**Rebalancing Discussion**](https://talk.nervos.org/t/rfc-research-automated-channel-liquidity-rebalancing-on-fiber-network/10691/5): ILE Labs continues to gather maintainer and node operator input on its circular rebalancing research and CLI prototype. The Fiber team [replied](https://talk.nervos.org/t/rfc-research-automated-channel-liquidity-rebalancing-on-fiber-network/10691/6) that additional routing hints and graph-cycle queries are not currently a high priority, while the team is working on Loop-style liquidity management. However, circular rebalancing was described as complementary, and the developers were invited to contribute focused improvements, such as allowing circular payments to constrain the outgoing and returning channels.

## *Thinking about building something of your own?*

Turning an idea into reality takes time, effort, and support. If you are working on a new concept, the Nervos ecosystem is here to back you up with the resources to build sustainably:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [**Telegram group**](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

Keep building!

Fiber Devs