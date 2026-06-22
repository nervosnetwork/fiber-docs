---
title: Pulse 08
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-06-22
---

*The most exciting work happens when builders take the lead.*

### Dular Milestone 2: Bringing Fiber Payments to Feature Phones

**Dular**, a Spark Program recipient focused on bringing Fiber-powered payments to mobile money users, has completed Milestone 2 with a working USSD interface for feature phones. Tested through the Africa’s Talking simulator, as [this demo](https://drive.google.com/file/d/1RTkMGAZYImQK6vziX8Scy2EaTxhRUDtc/view) shows, the implementation now supports balance checks, PIN setup, phone-number payments, receiving details, and M-Pesa deposit initiation. The next step is deployment through a live shortcode, while withdrawal functionality awaits Safaricom B2C activation.

The milestone also sparked discussion around Dular and Fiber. The team explained that the current prototype relies on operator-managed testnet nodes and a phone-to-pubkey registry that maps a verified phone number to the Fiber identity/receiving endpoint, while a community member emphasized the importance of future interoperability with external non-Dular Fiber users to ensure assets can move freely across the broader Fiber ecosystem.

Dular's progress was also highlighted in the Spark Program's [Q2 report](https://talk.nervos.org/t/spark-program-q2-2026-what-the-ecosystem-is-building/10396) as an example of bringing Fiber into practical, real-world payment contexts. The report identified Fiber payment integration in real-world scenarios as an anticipated direction, with Dular’s mobile money pilot demonstrating how Fiber can extend beyond crypto-native users and support everyday payment applications.

- **Check it out**: [Forum link](https://talk.nervos.org/t/spark-program-dular/10212/13)
- **Support**: Backed by the Spark Program

### Fiber Desktop Evolves into Fiber Studio as v1 Development Begins

The proposal for **Fiber Studio** recently passed a Community Fund DAO vote with 100% approval, securing support for the next stage of development. Building on the earlier Fiber Desktop prototype, Fiber Studio aims to make running and using a Fiber Network Node (FNN) as simple as installing a desktop application. Planned features include guided node setup, channel and peer management, payment and invoice workflows, network visualization tools, and cross-platform support for macOS, Windows, and Linux.

The project represents an evolution from a proof-of-concept interface into a more complete user environment for the Fiber Network. By the end of the roadmap, users should be able to install the application, connect to the network, open channels, send and receive payments, and manage their node through a graphical interface rather than command-line tools.

- **Check it out**: [Forum link](https://talk.nervos.org/t/dis-fiber-desktop-v1-ground-up-rebuild-and-launch-fnn-desktop-app/10317/1) & [GitHub repo](https://github.com/chukwuma619/fiber-studio)
- **Support**: Backed by the CKB Community Fund

### Infern: A Fiber-Powered Marketplace for AI Inference

Community developer truthixify introduced **Infern**, an open-source project exploring a marketplace where individuals can serve AI models from their own hardware and earn payments per request through Fiber. 

The project targets the growing number of independent AI operators with spare compute capacity or specialized models, providing a way to monetize inference without traditional accounts, billing systems, or centralized platforms.

Infern combines CKB’s shared state capabilities with Fiber's fast micropayments: CKB tracks provider listings, reputation, and staking, while Fiber enables low-cost payment channels for AI inference requests. The project is currently running on testnet with a working flow for registering models, connecting providers, and paying for inference requests. The community is now discussing topics including provider verification, routing, and the long-term design of a decentralized AI compute marketplace.

- **Check it out**: [Forum link](https://talk.nervos.org/t/introducing-infern-serve-an-ai-model-from-your-own-machine-and-get-paid-per-request-over-fiber/10408) & [GitHub](https://github.com/truthixify/infern)

One theme stood out this cycle: **accessibility**. Whether it's making payments available on feature phones, turning node management into a desktop experience, or enabling individuals to monetize AI models, builders are finding ways to lower barriers and expand what Fiber can be used for. We'll continue tracking these projects as they evolve and sharing the latest developments from across the ecosystem.

These projects also highlight something else: the ecosystem is becoming increasingly supportive of experimentation. From early prototypes to production-focused applications, builders have access to funding, feedback, and an active community willing to help refine ideas and test new approaches.

If you're working on a project of your own, there are multiple ways to get support:

- **Spark Program**: A fast-track initiative for early ideas—up to $2,000 USD to get from concept to a working MVP in ~1–2 months.
- **CKB Community Fund**: A broader, community-driven DAO providing grants for a wide range of Nervos contributions, from code development to content production and event organizing.

Every project featured in this update started as an idea shared with the community. If you're building something with Fiber, consider posting it on the [**Nervos Talk forum**](https://talk.nervos.org/)--we'd love to follow its progress and feature it in a future update.

**Enjoy building!**

**Fiber Devs**