---
title: Pulse 14
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-09-14
---

*The most exciting work happens when builders take the lead.*

## Fiber Studio Completes DAO Grant with Additional Features Shipped

**Fiber Studio** is a desktop application that lets users run and manage Fiber Network Node (`fnn`) on macOS, Windows, and Linux without CLI expertise or manual server configuration.

The project has submitted its DAO grant completion [report](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/29) after fully delivering all three planned milestones and shipping [v1.1.2](https://github.com/chukwuma619/fiber-studio/releases/tag/v1.1.2). This latest release adds pre-flight payment checks, channel liquidity health information, circular rebalancing, and clearer channel-closing options.

Fiber Studio delivered several features beyond the original grant scope, including UDT support, Bitcoin Lightning cross-chain swaps (CCH), and several UX enhancements inspired by the *Gone in 60ms* [Hackathon](https://talk.nervos.org/t/gone-in-60ms-fiber-network-infrastructure-hackathon-announcement/10418). A three-month stabilization and maintenance period now follows.

*This project is backed by a [CKB Community Fund DAO](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874).*

## Dular Completes Its Mobile Money Pilot

**Dular** is a mobile wallet that combines phone-number-based payment rails (M-Pesa) and Fiber payment channels via RUSD.

The project has submitted its completion [report](https://talk.nervos.org/t/spark-program-dular/10212/37) after running a pilot with 30 users. The current build includes phone-number identity, OTP verification, an M-Pesa deposit flow, a self-custodial browser wallet, and Fiber-based payments. Its USSD interface was also completed and tested through simulators, although production USSD deployment remains outside the current pilot budget. 

*This project is backed by the [Spark Program](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752).*

## Fiber RGB++ Swap Adds Hub Discovery

**Fiber RGB++ Swap** is a protocol extension built on Fiber’s Cross-Chain Hub (CCH) that provides atomic conversion between Bitcoin-locked RGB++ assets and assets on Fiber across payment channels.

The latest [update](https://talk.nervos.org/t/spark-program-fiber-rgb-swap/10487/26) focuses on hub discovery. Swap hubs can now advertise supported asset pairs, rates, fees, and expiration times through Fiber’s gossip network, while users can query active offers and find the best available rate. The developer has tested advertisement propagation between local Fiber nodes and plans to follow up with clearer setup documentation and a demo.

*This project is backed by the [Spark Program](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752).*

## CLASP Brings Scoped, Revocable Payments to Fiber

**CLASP** is a permission and session layer that lets external applications and AI agents to execute Fiber payments without taking custody of private node credentials or full wallet keys.

Taking 1st place in the Wallet & Payment UX Infrastructure track and overall winner of the *Gone in 60ms* [Hackathon](https://talk.nervos.org/t/gone-in-60ms-fiber-network-infrastructure-hackathon-announcement/10418), CLASP addresses the attack surface of connecting applications directly to node RPCs. The release includes a pairing protocol, an allow-listed Fiber payment gateway, a TypeScript/React SDK, and a policy engine where users enforce explicit spending caps, allowed recipients, and time-bounded session lifetimes.

Following the hackathon, the developer [plans](https://talk.nervos.org/t/clasp-secure-permissioned-payments-for-fiber-overall-winner-of-fiber-network-infrastructure-hackathon/10676?u=sss_is_me) to continue improving CLASP based on judge feedback and is inviting the community to test the product and share feedback.

## FiberNuts Refines Its Cashu + Fiber Direction

**FiberNuts** combines Cashu ecash with Fiber, enabling instant, browser-based RUSD ecash transfers without requiring end users to run a full node.  

Following its category-winning [hackathon](https://talk.nervos.org/t/gone-in-60ms-fiber-network-infrastructure-hackathon-announcement/10418) build, the project [published](https://talk.nervos.org/t/fibernuts-after-the-hackathon-what-could-cashu-fiber-enable-on-ckb/10688) a comprehensive post-hackathon roadmap and design reflection. The update refines the project’s security model, positioning it as private bearer payments with bounded custodial trust, and outlines the next milestone: a lightweight, consumer-friendly RUSD cash wallet application that makes mint identity, redemption policy, liquidity, and custodial risk clear to users. A later phase may explore settlement between independent RUSD mints through Fiber.

## Routed Machine Payment Sessions Explores Multi-Provider AI Payments on Fiber

**Routed Machine Payment Sessions** is a proposed integration layer designed to handle autonomous, multi-provider payment sessions for AI agents and automated software. 

Rather than introducing another payment protocol, the [project](https://talk.nervos.org/t/routed-machine-payment-sessions-on-fiber-looking-for-community-feedback/10694) aims to leverage existing x402 negotiation and Fiber routing primitives so an AI agent can make repeated, budget-capped micropayments across multiple independent APIs with built-in retry and recovery handling.

The team is currently asking for community feedback on building an open-source TypeScript SDK and test environment, with an initial experiment proposed to test repeated payments across several independent providers.

## ILE Labs Explores Automated Channel Liquidity Rebalancing

**ILE Labs** is researching **automated channel rebalancing** to help Fiber node operators manage channels whose liquidity has become heavily skewed to one side.

The team has [published](https://talk.nervos.org/t/rfc-research-automated-channel-liquidity-rebalancing-on-fiber-network/10691) its research threat model, and an early open-source CLI prototype (`fiber-rebalance`) for circular rebalancing. The research identifies five key circular rebalancing failure modes, such as 4-hour TLC capital jamming, negative fee arbitrage, and TLC slot exhaustion.

The accompanying PoC [prototype](https://github.com/ILE-Labs/fiber-rebalance) includes a verified test harness enforcing bounded 15-minute timelocks, micro-chunk routing, and strict economic fee-rate invariants. The team is now looking for feedback from node operators and Fiber maintainers.

## *Thinking about building something of your own?*

Turning an idea into reality takes time, effort, and support. If you are working on a new concept, the Nervos ecosystem is here to back you up with the resources to build sustainably:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [**Telegram group**](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

**Keep building!**

Fiber Devs