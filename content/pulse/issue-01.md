---
title: Pulse 01
description: A bi-weekly update tracking community contributions to the growth of the Fiber Network
author: DevRel
date: 2026-03-12
---

Hey Builders on Fiber,

While development on the protocol level continues to push forward (check the latest [**Devlog**](https://docs.fiber.world/blog/d/1994384f43a636e5) for the technical deep-dive), the ecosystem is rapidly evolving.

We’re kicking off **Pulse**—a bi-weekly series to highlight what’s happening across the network. It’s been an exciting few weeks as we watch community projects move from initial proposals to successful milestone deliveries.

Here’s a look at recent progress:

### Fiber Link: The Final Milestone in Sight

**Fiber Link** is an open-source payment layer that enables instant, low-fee tipping and micropayments inside online communities. Built on the Fiber Network, it abstracts away operational complexity by providing an always-online "hub" node and a lightweight account/ledger service.
The contributors recently completed Milestone 2 (Discourse plugin + End-to-end tipping) and confirmed receipt of their first grant payout from the CKB Community Fund. They are now charging ahead into Milestone 3, focusing on withdrawals, full documentation, and a mainnet-ready release.

- **Check it out:** [Forum link](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845)
- **Support:** Backed by the **CKB Community Fund**.


### Fiber-Pay: Powering the AI Economy

**Fiber-pay** is an AI-friendly command-line tool that lets AI agents handle payments on the network. 

Recent commits show a balance of UX and performance polish. You can now easily generate a QR code for your wallet address, and they've totally revamped how the app handles its background logs so it runs much faster without slowing down your system.

- **Check it out:** [Forum link](https://github.com/RetricSu/fiber-pay)


### Fibe-Checkout: The Stripe Experience for CKB

Integrating payments shouldn't be a bottleneck. **Fiber-checkout** is proposing a React library designed to bring a "Stripe-style" flow to the Fiber Network, giving developers high-level UI components to abstract away HTLCs and state management.

- **Status Update:** The proposal is currently in the Pending for the Spark Program. Reviewers have provided constructive feedback, inviting the creator to refine their long-term maintenance plan and clarify concrete deliverables (like TypeScript coverage and live demo specifics).
- **Check it out:** [Forum link](https://talk.nervos.org/t/spark-program-fiber-checkout-a-stripe-style-react-payment-library-for-fiber-network/10045/6)


### Nervos Brain: An Agentic RAG Hub for CKB & Fiber Developers

**Nervos Brain** is building a proactive intelligent engine to onboard and support developers across the Nervos ecosystem. It uses a dedicated MCP Server to read the latest RFCs, codebase docs, and bug records to directly assist with code. It also features a multi-step reasoning agentic RAG for generating tutorials. For instance, if you wanna know the prerequisites and steps to open a channel in the Fiber Network, it will give you a guide generated from synthesizing multiple available sources.

- **Funding Update:** The project successfully secured **Spark Program** funding, and their first milestone ($400 USDI) has already been disbursed.
- **Check it out:** [Forum link](https://talk.nervos.org/t/spark-program-nervos-brain-a-global-developer-onboarding-engine-and-cross-language-hub-powered-by-agentic-rag/9995)


### Claw Hackathon: AI Agent Hackathon on CKB

Open until 25th March (12:00 UTC), the **Claw Hackathon** is calling all builders to capitalize on the AI agent revolution. CKB is uniquely positioned for this: its lock scripts provide strict spending boundaries so autonomous agents can't drain funds, while the RISC-V based CKB-VM offers plug-and-play flexibility without cryptographic precompiles constraints. Combine that with high-frequency, low-cost micropayments on Fiber Network, and you have the perfect sandbox for the agentic economy.

- Details: [Forum link](https://talk.nervos.org/t/claw-order-ckb-ai-agent-hackathon-announcement/10038)


### ScryveHQ | Discussing The Future of Tipping: Cell-Model or Fiber?

**ScryveHQ** is an evolving CKB-anchored publishing platform. Currently, it uses CKB’s on‑chain Cell Model for tipping, which limits how small individual tips can be due to minimum capacity requirements. To unlock true, frictionless micro-tipping, the contributors are exploring a transition to Fiber Network's payment channels. They’ve opened up a discussion to gather community input on this roadmap shift.

- Join the [discussion](https://talk.nervos.org/t/scryvehq-tipping-roadmap-discussion-cell-model-vs-fiber-micropayments/10010)


### Got an idea? Get it moving.

Fiber Network is more than a payment channel protocol. It's a community-driven ecosystem with the resources to back its builders. If you have a project idea that enhances the network, the Nervos ecosystem offers multiple paths for support:

- [**Spark Program**](https://www.notion.so/1f424205dae080faad8de72a438d576f?pvs=21): A fast-track initiative for prototyping. It provides up to $2,000 in rapid funding to help developers turn early-stage ideas into verifiable MVPs within 1–2 months.
- [**CKB Community Fund**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874): A community-driven DAO providing grants for a wide range of ecosystem contributions, from core code development to content production and event organizing.

Don't let a great idea stay stuck in your head. Whether you’re building a small utility or a complex platform, reach out to these programs or drop a post on the [Nervos Talk forum](https://talk.nervos.org/). We’d love to see your first milestone payout in the next update!

Have fun building! 🏗️

Fiber Devs