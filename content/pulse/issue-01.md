---
title: Pulse 01
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-03-16
---

Hey Builders on Fiber,

While development on the protocol level continues to push forward (check the latest [**Devlog**](https://docs.fiber.world/blog/d/1994384f43a636e5) for the technical deep-dive), the ecosystem is rapidly evolving.

We’re kicking off **Pulse**—a bi-weekly series to highlight what’s happening across the network. It’s been an exciting few weeks as we watch community projects move from initial proposals to successful milestone deliveries.

Here’s a look at recent progress:

### Fiber Link: Keep Moving in the Final Stage

**Fiber Link** is an open-source payment layer that enables instant, low-fee tipping and micropayments inside online communities. Built on the Fiber Network, it abstracts away operational complexity by providing an always-online "hub" node and a lightweight account/ledger service.

**Status Update:** The contributors recently completed Milestone 2 (Discourse plugin + End-to-end tipping) and confirmed receipt of their first grant payout from the CKB Community Fund. To ensure better accessibility for the community, the project has transitioned its documentation and submission materials to a new [self-hosted repository](https://share.random-walk.co.jp/d/2dfc925ff48e48d1836c/), which will serve as the permanent home for all subsequent milestone artifacts.
They are now charging into Milestone 3, focusing on withdrawals, full documentation, and a mainnet-ready release.

- **Check it out:** [GitHub Repo](https://github.com/Keith-CY/fiber-link/)
- **Discussion**: [Nervos Talk Thread](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845/24)
- **Support:** Backed by the **CKB Community Fund**

### Fiber Audio Player: Self-Hosting a Micropayment-Based Podcast Service

**Fiber Audio Player** is a self-hosted podcast service that implements per second micropayments directly on user-controlled hardware. It is designed to run on consumer-grade hardware, allowing creators to distribute content and collect revenue without centralized intermediaries.

Highlights:

- **Infrastructure**: Runs on a home PC using Cloudflare Tunnel to expose the service without a public IP.
- **Payments Layer**: Integrates a Fiber node for real-time, multi-hop payment channels.
- **Media Stack**: Built with Next.js, Hono, and SQLite, using FFmpeg for HLS encrypted streaming.
- **Operations**: Managed via OpenClaw, a Discord-integrated AI agent that executes tasks through a custom CLI.

**Status Update:** The project is a functional prototype currently running on the Fiber testnet. The developer is refining the system for a future Mainnet release.

- **Check it out:** [GitHub Repo](https://fiber-audio-player.vercel.app/)
- **Discussion:** [Nervos Talk Thread](https://talk.nervos.org/t/make-self-host-great-again-how-i-use-fiber-and-openclaw-to-run-a-podcast-payment-service/10073/4)


### Fiber-Pay: Powering the AI Economy

**Fiber-pay** is a CLI tool designed to allow AI agents to interact directly with the Fiber Network. It automates the process of running a node: handling binary downloads, configuration, and peer connections, enabling agents to open channels and execute payments via terminal commands. The tool outputs data in JSON format, specifically designed for machine parsing and autonomous error handling.

**Status Update:** The latest v0.1.0 release targets FNN version 0.7.1 and is optimized for the testnet. Key features include:

- **Daemon Mode:** Start nodes in the background for persistent operation.
- **Profile Support:** Run and manage multiple independent nodes on a single machine using unique RPC and P2P ports.
- **Wallet Integration:** Quick commands for CKB balance retrieval and generating funding address QR codes.
- **Skill Integration:** Compatibility with the OpenClaw framework via a dedicated skill file.

- **Check it out:** [GitHub Repo](https://github.com/RetricSu/fiber-pay)
- **Discussion:** [Nervos Talk Thread](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/4)


### Fiber Node Installer: Easier Node Setup for Windows and Linux

**Fiber Node Installer** is designed to automate Fiber node deployment on Windows and Ubuntu/Debian systems. It simplifies the technical overhead of joining the CKB/Fiber payment ecosystem by handling firewall configuration, background service setup, and optional weekly auto-updates. The tool supports both testnet and mainnet environments, allowing users to transition from a sandbox setup to live funds within a standardized installation flow.

The installer includes an optional private web dashboard for managing channels, peers, and network visibility. Security is handled by keeping the node RPC and dashboard off the public internet, using an SSH tunnel for Linux access. 

The project is seeking community feedback on the first-time setup experience and dashboard UX to further reduce friction for new node operators and builders.

- **Check it out:** [GitHub Repo](https://github.com/tecmeup123/fiber-node-installer)
- **Discussion:** [Nervos Talk Thread](https://talk.nervos.org/t/fiber-node-installer-easier-fiber-node-setup-for-windows-and-linux-local-or-remote/10071)

### Fibe-Checkout: Stripe Experience on CKB

Integrating payments shouldn't be a bottleneck. **Fiber-checkout** is a proposed React component library and hooks package designed to simplify the integration of Fiber Network payments into web applications. Developed by SalmanDev, the project aims to replace manual JSON-RPC calls and hex encoding with a "Stripe-style" developer experience. 

By wrapping the recently released `@nervosnetwork/fiber-js`, the library provides ready-made user interface elements that automatically create invoices, display QR codes, and check the payment status every few seconds. This allows developers to accept CKB, RUSD, and SEAL payments without having to write the underlying logic themselves.

**Status Update:** The proposal is currently “Pending” in the Spark Program. Following committee feedback regarding long-term maintenance and the details of the deliverables, SalmanDev has replied, detailing the delivery and future support plan.

- **Discussion:** [Nervos Talk Thread](https://talk.nervos.org/t/spark-program-fiber-checkout-a-stripe-style-react-payment-library-for-fiber-network/10045/5)


### Nervos Brain: An Agentic RAG Hub for CKB & Fiber Developers

**Nervos Brain** is building a proactive intelligent engine to onboard and support developers across the Nervos ecosystem. It uses a dedicated MCP Server to read the latest RFCs, codebase docs, and bug records to directly assist with code. It also features a multi-step reasoning agentic RAG for generating tutorials. For instance, if you wanna know the prerequisites and steps to open a channel in the Fiber Network, it will give you a guide generated from synthesizing multiple available sources.

**Funding Update:** The project successfully secured **Spark Program** funding, and their first milestone ($400 USDI) has already been disbursed.

- **Discussion:** [Nervos Talk Thread](https://talk.nervos.org/t/spark-program-nervos-brain-a-global-developer-onboarding-engine-and-cross-language-hub-powered-by-agentic-rag/9995)


### Claw Hackathon: CKB AI Agent Hackathon

Open until 25th March (12:00 UTC), the **Claw Hackathon** is calling all builders to capitalize on the AI agent revolution. CKB is uniquely positioned for this: its lock scripts provide strict spending boundaries so autonomous agents can't drain funds, while the RISC-V based CKB-VM offers plug-and-play flexibility without cryptographic precompiles constraints. Combine that with high-frequency, low-cost micropayments on Fiber Network, and you have the perfect sandbox for the agentic economy.

- Details: [Forum link](https://talk.nervos.org/t/claw-order-ckb-ai-agent-hackathon-announcement/10038)


### Got an idea? Get it moving.

Fiber Network is more than a payment channel protocol. It's a community-driven ecosystem with the resources to back its builders. If you have a project idea that enhances the network, the Nervos ecosystem offers multiple paths for support:

- [**Spark Program**](https://www.notion.so/1f424205dae080faad8de72a438d576f?pvs=21): A fast-track initiative for prototyping. It provides up to $2,000 in rapid funding to help developers turn early-stage ideas into verifiable MVPs within 1–2 months.
- [**CKB Community Fund**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874): A community-driven DAO providing grants for a wide range of ecosystem contributions, from core code development to content production and event organizing.

Don't let a great idea stay stuck in your head. Whether you’re building a small utility or a complex platform, reach out to these programs or drop a post on the [Nervos Talk forum](https://talk.nervos.org/). We’d love to see your first milestone payout in the next update!

Have fun building! 🏗️

Fiber Devs