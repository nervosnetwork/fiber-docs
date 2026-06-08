---
title: Pulse 07
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-06-08
---

*The most exciting work happens when builders take the lead.*

### Fiber Desktop: Shifting to the Seller Side & Active DAO Voting

**Fiber Desktop**, a desktop application that makes running a local Fiber Network Node (FNN) effortless without a VPS, has laid out its next direction. The team is shifting focus to the **seller side** by adding a dedicated **Agents Tab**.

This new feature allows merchants to seamlessly connect their online shops directly to the desktop application using a website URL and merchant credentials. As long as the app running locally, the local node handles invoice generation and transaction management automatically upon customer checkout—completely bypassing the need to manage a dedicated Fiber server. Additionally, the architecture supports multiple agents simultaneously, allowing a single desktop instance to manage payments for several independent storefronts at once.

This milestone is tied to the [*Fiber Desktop v1 Ground-Up Rebuild*](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/1). The project's development proposal is officially up for a vote. If you are a Nervos DAO member, be sure to cast your vote and participate in shaping this retail infrastructure.

- **Check it out**: [Forum Link](https://talk.nervos.org/t/fiber-desktop-run-fiber-fnn-on-your-laptop-without-the-public-node-headache/10247/8)
- **Participate in Governance**: [DAO Voting](https://dao.ckb.community/thread/vot-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app-72720)

### Fiber Pay v0.2.6: AI-Friendly CLI and Developer SDK Updates

The AI-friendly command-line tool and developer SDK, **fiber-pay**, has rolled out version **v0.2.6**.

This latest release introduces optimization patches and enhances standard command operations. These enhancements provide developers with a cleaner, more robust environment when building applications that require automated, continuous micropayment streams or AI-driven agent payments

- **Check it out:** [Forum Link](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/9) & [Release Note](https://github.com/RetricSu/fiber-pay/releases/tag/v0.2.6)

### **fiber-payjoin-kit: Functional PoC and Technical Specification Completed**

A major milestone just dropped for the **fiber-payjoin-kit**, an open-source Rust library bringing collaborative Payjoin privacy natively to the Fiber Network. By letting receivers contribute inputs to channel-funding transactions, it breaks common common-input heuristic to keep payments private.

The team has focused on a functional Proof of Concept (PoC) to validate the design:

- **Cross-Chain PoC:** They built a working local middleware PoC for collaborative channel funding on CKB, while simultaneously developing a Bitcoin Lightning equivalent (`lightning-payjoin-kit`) to validate the same collaborative pattern.
- **Demo & Spec Ready:** The new technical specification includes a demo video showing the standalone middleware handling local negotiation, cryptographic validation, and broadcasting transactions to a local CKB devnet node.

- **Check it out**: [Forum Link](https://talk.nervos.org/t/dis-fiber-payjoin-kit-collaborative-privacy-for-the-nervos-fiber-network/10296/12)

### Opticrum: Decentralizing Inbound Liquidity Markets on CKB

An architectural breakdown by community developer Ckroamer explores how CKB's Turing-complete power can build a decentralized alternative to Bitcoin's *Amboss,* named **Opticrum** ("Optic-" + "Fulcrum").

In the Lightning Network ecosystem, Amboss serves as a marketplace for buying and selling inbound liquidity, giving merchants a larger capacity to receive payments. It stands out as one of the few true liquidity markets in the Lightning space. However, due to Bitcoin's smart contract limits, Amboss has to rely on a centralized escrow and reputation system to ensure that sellers actually keep channels open.

If run on CKB, Opticrum can handle the entire lifecycle trustlessly using Layer 1 Cells:

- **Decentralized Matching:** Instead of relying on a centralized platform, buyers post liquidity requests directly on-chain as individual Cells. Sellers find and accept these orders by simply querying on-chain.
- **Atomic Matching:** The buyer packs both the requested channel capacity and the rental fee into a single request Cell, while the seller consumes this Cell to create the channel. Atomic matching is natively achieved this way.
- **No Need for Monitoring**: By converting the channel’s duration into a block count and writing it into the request Cell, the seller cannot withdraw all the rent at once. Instead, they must periodically submit rent withdrawal transactions with proof that the channel still exists. This eliminates the need for monitoring entirely.

While current limitations prevent custom extensions inside Fiber's native channel setup, the author outlines a neat two-step workaround to keep things completely decentralized without sacrificing security.

- **Check it out:** [Forum Link](https://talk.nervos.org/t/fiber-ckb-fiber-amboss/10353)

### Fiber Link: Wallets and Hosting Hurdles for Forum Tipping

**Fiber Link**, the micro-tipping layers for digital communities, had some great chat about getting native tipping running on Nervos Talk.

The discussion highlighted the two main challenges the project is tackling right now:

**The User-Side Wallet Barrier:** While users already have standard browser extensions, Keith clarified that the real hurdle is the lack of wallets with native Fiber routing and deep liquidity. To make tipping seamless, the ecosystem needs liquidity nodes that support channel rotation, allowing users to pull funds out without disconnecting the channel.

**The Convenience vs. Trust Trade-Off:** Responding to architecture questions from Ckroamer, Keith explained that the forum doesn't run a centralized node. Instead, a simple plugin handles the UI, while Fiber Link acts as a cross-platform service layer that manages the ledger and receiving node. This saves tippers from paying the 61 CKB cell deposit and keeps creators from needing to run 24/7 infrastructure. It introduces a minor custodial trade-off, but it allows creators to aggregate small tips from multiple different platforms into a single balance for faster withdrawals.

- **Join the Conversation**: [Forum Link](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845/36)

### *Got an idea? Let’s Build It Together*

Fiber Network is a community-driven ecosystem, and we have real resources dedicated to backing builders. If you’ve been thinking about hacking on a tool, an application, or core infrastructure, we want to help you get it off the ground:

- **Spark Program**: A fast-track path for early prototypes, offering up to **$2,000** in funding to help turn ideas into working MVPs within 1–2 months.
- **CKB Community Fund**: A DAO-backed grant program supporting a wide range of ecosystem work, from core development to tools, content, and community initiatives.

Share your idea on the **Nervos Talk** forum and reach out to the programs above. We’d love to feature your project in our next update!

Keep building 🏗️