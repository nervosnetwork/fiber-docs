---
title: Pulse 17
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-10-26
---
*The most exciting work happens when builders take the lead.*

Over the past two weeks, more community projects have moved into public testing, while others are turning hackathon feedback and technical discussions into practical improvements.

### Twine Opens P2P CKB Trading Prototype for Public Testing

[**Twine**](https://talk.nervos.org/t/twine-is-up-try-buying-and-selling-ckb-without-an-exchange-using-fiber-and-nostr/11043) is a peer-to-peer trading application that lets users buy and sell CKB directly without depositing funds on a centralized exchange. It uses Fiber hold invoices to conditionally lock CKB during trades, while orders and encrypted communication are handled through Nostr. Fiat payments take place directly between traders.

In its [latest technical update](https://talk.nervos.org/t/twine-buy-and-sell-ckb-without-depositing-on-an-exchange-fiber-p2p-poc/10741/9), the developer simplified the trading system to sell-only listings and introduced just-in-time inbound liquidity. If a buyer doesn't have enough inbound capacity to receive CKB, Twine can open a channel toward them when the seller releases the payment, reducing the setup work required before trading.

A few days later, **Twine's early [prototype](https://talk.nervos.org/t/twine-is-up-try-buying-and-selling-ckb-without-an-exchange-using-fiber-and-nostr/11043) is now available for public testing** on macOS, Windows, Linux, and Android. Users can connect through Fiber Studio and try the trading flow on testnet.

The application is still experimental, with dispute-resolution features and other improvements in development. The developer is looking for feedback from testers.

### Fiber Forge v0.4.0: Turning Hackathon Feedback Into Developer Tools

[Fiber Forge](https://talk.nervos.org/t/fiber-forge-launch-a-local-fiber-network-with-one-command/10700) is a development toolkit that lets builders launch a local Fiber network with funded nodes, open channels, and a monitoring interface using a single command.

After winning first place in the Node, Routing & Diagnostics category of the [*Gone in 60ms*](https://talk.nervos.org/t/gone-in-60ms-fiber-infrastructure-hackathon-roundup/10561) hackathon, the developer used the judges' feedback to guide the next release.

**Fiber Forge [v0.4.0](https://talk.nervos.org/t/fiber-forge-launch-a-local-fiber-network-with-one-command/10700/2) is now available on npm**, with several major additions:

- A TypeScript SDK and GitHub Action for integrating local Fiber networks into application development and CI.
- Reproducible failure tests, including node restarts, channel recovery checks, and shareable test scenarios.
- A routing inspector for exploring network connectivity, channel liquidity, and payment routes.
- A local Cross-Chain Hub (CCH) environment for testing payment flows between Fiber and Bitcoin Lightning.

Community feedback has also led to interface improvements around channel selection and available payment liquidity.

The release builds on the original hackathon prototype, making Fiber Forge a more complete environment for developing, testing, and debugging Fiber applications.

### FiberNuts Community Market Opens for Public Testnet Testing

[FiberNuts](https://talk.nervos.org/t/fibernuts-community-market-a-testnet-app-for-cashu-fiber/10792) combines Cashu ecash with Fiber payment channels. Fiber handles deposits and withdrawals of RUSD, while Cashu enables lightweight payments between participants.

Following the Community Market demo introduced in an earlier issue, **the application opened for public testing on CKB Testnet on October 21.**

Anyone can now try the attendee-to-vendor payment flow using a rate-limited faucet that provides 10 test RUSD, without needing to run their own Fiber node.

The project has already received positive community feedback, with testers reporting seamless payments. To prepare the application for this public test, the developer introduced several safety features beyond standard wallet functionality, including persistent network and asset validation, recovery states for interrupted deliveries, and a one-scan checkout flow.

The application remains experimental. Because the current vendor-locked payment flow lacks an automated attendee refund path, the developer is actively seeking tester feedback on preferred recovery and refund mechanisms before expanding beyond the testnet demo.

Try FiberNuts [Community Market](https://market.fibernuts.xyz/) & Join the [discussion](https://talk.nervos.org/t/fibernuts-community-market-a-testnet-app-for-cashu-fiber/10792/2)


### FNN Safeguard Publishes Recovery Evidence and Safety Checks

[FNN Safeguard](https://talk.nervos.org/t/dis-fnn-safeguard-recovery-verification-and-pre-upgrade-qualification-for-fiber-nodes/10712/1) is an open-source operator tool designed to verify that Fiber node backups can actually be restored. It also aims to help operators test upgrades against a copy of their existing node state before modifying a live node.

Following earlier technical feedback, the team has updated its MVP and published a more detailed safety specification, implementation, and recovery evidence. Read the [technical update](https://talk.nervos.org/t/dis-fnn-safeguard-recovery-verification-and-pre-upgrade-qualification-for-fiber-nodes/10712/10).

In tests involving two local Fiber devnet nodes running FNN v0.9.0, native backups completed successfully, but subsequent restore attempts failed. The team then demonstrated a separate checkpoint-based recovery method that passed database validation and matched the original node identities, channels, and payment records.

The updated implementation also introduces explicit checks for backup integrity and differences between the original and recovered states.

Although the project's DAO funding proposal did not advance to voting, the team has continued refining its technical approach and seeking feedback from Fiber developers and node operators.

### Cellula Wallet Begins Testnet Beta

[Cellula Wallet](https://talk.nervos.org/t/cellula-wallet-beta-on-testnet-testers-wanted-until-monday-26-october/11048) is a passkey-based wallet that lets users send and receive payments through human-readable `.cell` names instead of relying entirely on blockchain addresses.

Alongside broader CKB wallet features, it supports Fiber payments through Cellula's Fiber node, with wallet keys remaining on the user's device.

The team opened a [beta](https://talk.nervos.org/t/cellula-wallet-beta-on-testnet-testers-wanted-until-monday-26-october/11048) for Android and web browsers, with a testing window through October 26. Testers received a structured test plan covering basic wallet operations and more advanced functionality.

According to the developer, the first round of fixes was already deployed within a day of receiving tester reports. The wallet remains in its early testnet stage.

## Thinking about building something of your own?

Turning an idea into reality takes time, effort, and support. Whether you're improving an existing prototype or exploring a new use case for Fiber, there are several ways to get support from the Nervos ecosystem:

- [**Spark Program:**](https://talk.nervos.org/t/spark-program-mini-grant-initiative/8752) A fast-track initiative for early-stage concepts. Secure up to $2,000 to take your raw idea to a working MVP within 1–2 months.
- [**CKB Community Fund:**](https://talk.nervos.org/t/ckb-community-fund-dao-rules-and-process/6874) A community-governed DAO offering broad grants for everything from writing core code to creating educational content and organizing events.
- [**CKBuilders:**](https://nervoscatalyst.org/community-keeps-building) Microgrant-backed tracks for developers, creators, and organizers. Get access to monthly stipends, guided learning pipelines, and a supportive peer cohort to help shape your early prototypes. Join the **Build on CKB** [**Telegram group**](https://t.me/+FpFa74ubID4xNzg0) to stay in the loop.

Share your ideas, experiments, and progress on the Nervos Talk forum. We'd love to see what you're building and feature your updates in a future Pulse!

Fiber Devs
