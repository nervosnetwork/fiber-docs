---
title: Pulse 09
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-07-06
---

*The most exciting work happens when builders take the lead.*

### Dular | Navigating USSD Blockers and System Architecture

**Dular**, an in-progress Spark Program project, is building a Fiber-based stablecoin wallet designed for mobile users.

The team is currently navigating a milestone blocker regarding production USSD access. Their original plan relied on Africa's talking shared USSD service; However, they recently learned that crypto-related applications require a dedicated USSD setup. This requirement pushes costs significantly beyond the current milestone budget. Dular is actively evaluating alternative solutions, has set a strict deadline for the coming week to finalize their USSD path, and has committed to resuming weekly updates to keep the community informed.

Meanwhile, active discussions are diving into core implementation details. The community is reviewing how the system will work in practice, focusing on custody models, operator dependence, liquidity management, and Fiber channel architecture.

As a result, the project's immediate focus has shifted from delivering new features to resolving this foundational access blocker and refining the system design alongside the community.

- **Join the conversation**: [Dular update](https://talk.nervos.org/t/spark-program-dular/10212/21)
- **Support**: Spark Program

### Fiber Desktop | Reaches Milestone 2: Full UI for Testnet Payments

**Fiber Desktop v1** has completed Milestone 2. Essential features—including wallet, peers, channels, and network features—are now live on top of the official FNN node. The application now supports end-to-end testnet payments through a desktop UI, delivering seamless invoice handling, channel management, relay connectivity, and network browsing. With this release, Fiber Desktop is positioned as a highly accessible, ready-to-use testing tool for builders who want to send and receive payments without relying on terminal commands. 

The upcoming Milestone 3 will shift focus from core functionality to product launch and final polish. Remaining deliverables include: cross-platform testing, signed distribution, enhanced operational tooling, mainnet readiness, rebranding, website rollout, and the v1.0.0 release.

- **Check it out**: [Milestone 2 update](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/19)
- **Support**:  CKB Community Fund

### Fiber-Pay v0.2.7 | FNN Adaptation and New Developer Landing Page

Fiber-pay, the CLI and SDK toolchain designed for the Fiber network, has released [v0.2.7](https://github.com/RetricSu/fiber-pay/releases/tag/v0.2.7). This update primarily focuses on adapting the tools to ensure compatibility with the 0.9.0-rc4 version of FNN. Additionally, it resolves a bug that previously caused the CLI to mistakenly download the pre-release FNN binary.

Beyond technical fixes, a [landing page](https://retricsu.github.io/fiber-pay/) was launched. Designed as a dedicated entry point, the site helps developers quickly learn about the toolchain and get started with their builds. Fiber-pay’s mission continues to be providing builders with a robust, AI-friendly CLI and SDK option for the Fiber network.

- **Landing page**: [Fiber-Pay](https://retricsu.github.io/fiber-pay/)
- **Join the conversation**: [Forum discussion](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/10)

### Proposal | FiberLatch Access: Open-Source Access Control for Fiber Payments

**FiberLatch Access** is a open-source access-control layer proposal, designed to work alongside existing Fiber payment tools, such as fiber-pay. While the payment tool handles the transaction, FiberLatch Access manages what happens *after* the payment—specifically, granting and managing access to gated resources like premium content, APIs, or private files. Instead of requiring developers to build access logic from scratch, FiberLatch Access will provide a lightweight Node.js package, featuring a standardized access receipt format, clear expiration rules, replay protection to prevent receipt reuse, and a working paid-resource example.  

Built upon the developer's earlier work [**FiberLatch**](https://github.com/Nervos-Community-Catalyst/CKBuilder-projects/issues/17) in the [CKBuilder program](https://nervoscatalyst.org/community-keeps-building), FiberLatch Access has submitted a $3,000 grant proposal to the CKB Community Fund DAO. The project is currently in the active DAO voting stage.

- **Vote**: [Link](https://dao.ckb.community/thread/vot-fiberlatch-access-open-source-access-control-for-fiber-payments-74170)
- **Join the conversation:** [FiberLatch Access Proposal](https://talk.nervos.org/t/dis-fiberlatch-access-open-source-access-control-for-fiber-payments/10414)

### Proposal | Fiber Python SDK: Native Library for Fiber Network Payments

The **Fiber Python SDK** is a proposed library designed to bring native Python support to the Fiber Network. Currently, Fiber's developer tooling is primarily built for TypeScript or JavaScript. This project aims to provide a fully typed, asynchronous Python package fiber-sdk that wraps the Fiber Network Node JSON-RPC interface. The proposed SDK would cover the entire payment lifecycle, including channels, peers, invoices, and Bitcoin cross-chain interoperability, making it straightforward for Python developers and AI agent frameworks to interact with Fiber without needing to write raw JSON-RPC from scratch.

The project is currently an active grant proposal. The developer is requesting $5,000 (equivalent in CKB) to fund an eight-week development timeline. 

- **Join the conversation**: [Fiber Python SDK Proposal](https://talk.nervos.org/t/dis-fiber-python-sdk-native-python-library-for-fiber-network-payments/10462)

### Proposal | VibeQuest: Turning AI-Assisted Coding Into Real Learning

**VibeQuest** is a proposal for an AI-assisted learning product that aims to turn vibe coding into actual understanding. Its goal is to help users learn CKB and Fiber by guiding them through structured lessons, quests, code verification, and challenge-based checkpoints, instead of letting them rely on AI-generated code without comprehension. The project proposes an interactive learning loop featuring AI-generated educational content, a quest/challenge system, and a workbench to ensure developers can practically verify and prove their understanding of the ecosystem.

The project is currently under early review for a $1,000 grant. The team is updating the proposal to address initial feedback and suggestions from the community.

- **Join the conversation:** [VibeQuest Proposal](https://talk.nervos.org/t/spark-program-vibequest-turning-ai-assisted-coding-into-real-learning/10446)


**Building something of your own?**

If you have an idea in progress, there are a few pathways to get educational and financial backing from the Nervos ecosystem:

- **Spark Program:** A fast-track initiative tailored for early-stage concepts. It offers up to $2,000 USD to help you move from a raw idea to a working MVP within one to two months.
- **CKB Community Fund:** A broader, community-governed DAO that provides grants for a wide range of contributions, whether you are writing core code, creating educational content, or organizing community events.
- **CKBuilders**: A structured initiative offering microgrant-backed tracks for developers, content creators, and organizers. It provides monthly stipends, guided learning pipelines, and a supportive peer cohort to help you shape early prototypes.

Every project featured in our ecosystem updates began as an idea shared openly on the forum. If you are building with Fiber, we highly encourage you to share your journey on the [Nervos Talk](https://talk.nervos.org/) forum. We would love to follow your progress and feature your work in an upcoming issue.

Enjoy the process,

Fiber Devs