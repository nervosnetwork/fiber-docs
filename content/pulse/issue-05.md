---
title: Pulse 05
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-05-11
---

*The most exciting work happens when builders take the lead.*

### Fiber Link: From Prototype to Product-Ready

**Fiber Link** has published its latest product delivery report, marking its transition from an engineering prototype toward a product-ready, deployable release.

Built as an open-source tipping layer for online communities, Fiber Link lets users tip posts or replies directly from familiar forum interfaces (starting with [Discourse](https://demo.fiberlink.me/latest)), without requiring members to run their own Fiber nodes. 

This milestone includes a [ video demo](https://youtu.be/xdPp42APukw) with comprehensive documentation for administrators and operators to deploy the service.

- **Product Overview**: [GitHub Repo](https://github.com/Keith-CY/fiber-link/blob/main/README.md)
- **Check it out**: [Forum link](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845/34)
- **Support**: CKB Community Fund

### Fiber-Pay v0.2.5: Simplified Connect Flow & New Demos

**Fiber Pay** is a toolkit that allows AI agents to manage Fiber Network operations like opening channels and making payments. Its latest release  introduces `ConnectButton`, a simplified way for frontend apps to connect to a Fiber browser node using passkey or password authentication with minimal setup.

This update also includes stability fixes for `useFiberNode` under React `StrictMode`, a refreshed [browser-wallet demo](https://github.com/RetricSu/fiber-pay/tree/master/apps/browser-wallet) with the new connect flow, and a [quick-card demo](https://github.com/RetricSu/fiber-pay/tree/master/apps/react-quick-card) showing payment integration and UI customization.

- **v0.2.5** [Release note](https://github.com/RetricSu/fiber-pay/releases/tag/v0.2.1)
- **Check it out:** [Forum Link](**https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/8?u=sss_is_me**)**

### Decentralized AI Agent Calling Experiment via Fiber

Built on top of the latest Fiber-Pay release, this experiment explores a **decentralized AI Agent calling platform**. Users can invoke agents running on remote hardware from their browsers, with peer-to-peer payments, similar in experience to cloud-based agent services.

Key aspects include:

- **Instant Micropayments:** L402-style payment flow currently with per-call pricing (currently 0.1 CKB on testnet) via Fiber.
- **Decentralized design:** Agents are hosted by anonymous operators, reducing reliance on centralized APIs and allowing users to access the latest agent capabilities by updating their local clients.
- **Technical Implementation:** Focuses on containerized agent runtime for isolation, the `acpx` library to support multiple agent types, and environment variable control to prevent sensitive API key leakage.

- **Try the Demo**: https://calling-agent-kappa.vercel.app/
- **Check it out**: [Forum link](https://talk.nervos.org/t/a-paid-ai-agent-calling-experiment-via-fiber/10229)

### Spark Proposal: Dular—Mobile Money Stablecoin Wallet

**Dular** is a stablecoin wallet designed to bridge Fiber with the mobile money ecosystem. It replaces hex addresses with phone number identities and supports USSD access for feature phones. It leverages Fiber’s low-fee, native multi-asset channels to enable instant payments, with integrated [M-Pesa](https://en.wikipedia.org/wiki/M-Pesa) on/off ramps.

- **Status**: Additional evidence and documentation submitted; currently under committee review.
- **Check it out**: [Forum link](https://talk.nervos.org/t/spark-program-dular/10212/4)

### Upcoming Reddit AMA on Fiber

The latest Nervos AMA focuses on the Fiber Network! Join us to chat with DevRel engineer Retric about his recent experiments with paywalled applications, including the Fiber Audio Player and L402 blog prototype.

Join the discussion or drop questions in advance [here](https://www.reddit.com/r/NervosNetwork/comments/1t3bc8s/the_fiber_network_ama/) before **May 12th at 11 GMT**!

### Got an idea? Let’s see it take shape.

Fiber Network is a community-driven ecosystem with real support behind its builders. If you’re thinking about building something, here is how we can help:

- [**Spark Program**](https://www.notion.so/1f424205dae080faad8de72a438d576f?pvs=21): A fast-track path for early prototypes, offering up to **$2,000** in funding to help turn ideas into working MVPs within 1–2 months.
- [**CKB Community Fund**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874): A DAO-backed grant program supporting a wide range of ecosystem work, from core development to tools, content, and community initiatives.

Share your idea on the [Nervos Talk](https://talk.nervos.org/) forum and reach out to the programs above. We’d  love to see what you build show up in our next update!

Keep building 🏗️