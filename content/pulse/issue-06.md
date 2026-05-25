---
title: Pulse 06
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-05-25
---

*The most exciting work happens when builders take the lead.*

### Grant Approved: Dular Connects Fiber to Mobile Money Infrastructure

The Spark Program Committee has approved a $2,000 USD grant (funded via 1,408,451 CKB) for **Dular**, a stablecoin wallet designed to bridge CKB's Fiber Network with traditional mobile money rails like M-Pesa. Designed for practical accessibility, Dular uses phone numbers as identities and features USSD (Unstructured Supplementary Service Data) support for feature phones. This allows users to transact with stablecoins without navigating complex cryptographic addresses.

The approval follows a rigorous review process aligned with Spark 2026's technical focus on Fiber Network and UDT-based (User Defined Token) payments. The committee noted that Dular brings Fiber's capabilities into a practical, real-world retail payment scenario. The project's milestones include a 30-seed-user pilot and a structured user feedback report, matching Spark's requirement for verifiable deliverables.

Welcome to the ecosystem, Dular! 🎉

- **Supported by**: The Spark Program
- **Check it out**: [Forum Link](https://talk.nervos.org/t/spark-program-dular/10212/5)

### Scryve Reads: A Live Demo of Pay-As-You-Read Content Streaming

**Scryve Reads** is a digital reading platform testing a micro-payment alternative to traditional monthly subscriptions and sign-up walls. 

Built on the community-developed [`fiber-pay` SDK](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/7), the project combines a JoyID passkey wallet running directly inside the browser as a light node to set up a direct payment link for readers. 

Instead of buying an entire article upfront, users read for free until they reach a paywall. As they scroll past it, the browser node automatically sends a micro-payment to unlock the next section. Writers can publish essays, set granular pricing per section, track realtime earnings, and withdraw their revenue to their personal wallets instantly.

- Check it out: [Forum Link](https://talk.nervos.org/t/scryve-reads-a-demo-on-pay-as-you-read-with-fiber/10304)
- Dive deeper: Read the Scryve team's take on the creator economy, micropayment, and pay-per-read models: *[Are Paywalls Killing the Creator Economy - or Saving It?](https://talk.nervos.org/t/are-paywalls-killing-the-creator-economy-or-saving-it/10299)*

### Fiber Desktop: Simplifying Local Node Management

Fiber Desktop is a community-developed graphical interface that wraps the official Fiber Network Node, removing the need for a virtual private server (VPS) or heavy command-line setups. It allows developers and power users to run an official Fiber node locally on their own hardware. 

Fiber Desktop includes:

- **Guided setup:** walks you through setup in order (network, data folder, configuration, and key material placement).
- **Dashboard:** the one place for starting/stopping the node, viewing logs, and interacting with the network.
- **Vault assistant:** stores the node's encryption password in your operating system's built-in secure storage (keychain or credential manager) instead of saving it in plaintext files.

This tool significantly improves the onboarding flow for testing and development. By replacing long terminal sequences with intuitive UI flows for connecting to public relays, opening channels, and generating invoices, it bridges the gap between core infrastructure and application developers. It is now much easier to quickly deploy a self-custodial node on a local machine and start interacting with the network topology right away.

- Check it out: [Forum Link](https://talk.nervos.org/t/fiber-desktop-run-fiber-fnn-on-your-laptop-without-the-public-node-headache/10247)

### Discussion | Mapping the LSP Link Between Bitcoin Lightning and Fiber

A community member recently mapped out how Fiber can seamlessly interact with the Bitcoin Lightning Network using LSPs (Lightning Service Providers). The core idea is that LSPs are essential for Fiber, not just to streamline wallet onboarding, but to allow BTC liquidity to flow between both networks.
The author points out that by using LNURL and LSPs, developers can build swap mechanics between Fiber wallets and Lightning wallets, allowing users to move BTC into the Fiber network imperceptibly. When you combine that flow with Fiber's on-chain programmability and WASM runtime, you get a "bridgeless" BTC → CKB cross-chain where native BTC can interact directly with CKB dApps. The author emphasizes that this achieves Lightning-level speed and execution rather than relying on heavy, traditional sidechain architectures.

Commenting on the post, another builder pointed out that this infrastructure reinforces Fiber's natural fit for **pay-as-you-use services** and **streaming payments**, rather than replicating traditional everyday payment apps. In these ongoing service relationships, the channel model—with its specific approach to managing liquidity and node reachability—feels completely native, with LSPs handling reliability and adoption on top of a channel-driven user experience.

- Join the conversation: [Forum Link](https://talk.nervos.org/t/fiber/10298)

### Proposal: Fiber Payjoin Kit for Native, Collaborative Privacy

ILE Labs has proposed `fiber-payjoin-kit`, an open-source, asynchronous Rust library designed to bring collaborative Payjoin privacy natively to the Fiber Network.

Currently, when a payment channel opens, blockchain tracking tools assume all input cells belong entirely to the initiator, permanently linking the sender and receiver. This project solves that privacy leak by allowing both parties to contribute inputs to the channel-funding transaction. To an outside observer looking at the CKB L1 blockchain, the transaction mimics a standard multi-party coinjoin, making it mathematically difficult to tell who funded the channel or who is sending and receiving.

The team is porting this architecture from their existing open-source Bitcoin Lightning Network library (`lightning-payjoin-kit`), mapping the logic onto CKB's Cell model to deliver a developer CLI, along with comprehensive documentation and integration examples for wallet integration.

- Check it out: [Forum Link](https://talk.nervos.org/t/dis-fiber-payjoin-kit-collaborative-privacy-for-the-nervos-fiber-network/10296)

### *Got an idea? Let’s Build It Together*

Fiber Network is a community-driven ecosystem, and we have real resources dedicated to backing builders. If you’ve been thinking about hacking on a tool, an application, or core infrastructure, we want to help you get it off the ground:

- [**Spark Program**](https://www.notion.so/1f424205dae080faad8de72a438d576f?pvs=21): A fast-track path for early prototypes, offering up to **$2,000** in funding to help turn ideas into working MVPs within 1–2 months.
- [**CKB Community Fund**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874): A DAO-backed grant program supporting a wide range of ecosystem work, from core development to tools, content, and community initiatives.

Share your idea on the [**Nervos Talk**](https://talk.nervos.org/) forum and reach out to the programs above. We’d love to feature your project in our next update!

Keep building 🏗️