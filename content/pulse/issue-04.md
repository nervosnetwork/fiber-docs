---
title: Pulse 04
description: Bi-weekly update tracking community contributions to the growth of the Fiber Network
author: Fiber Devs
date: 2026-04-27
---

*The most exciting work happens when builders take the lead.*


Ahead of Bitcoin 2026, here’s a quick snapshot of what’s been happening across community projects building with Fiber.

### Fiber-Checkout: Stripe-Style React Payment Library Now Completed

The fiber-checkout project has submitted its [completion report](https://talk.nervos.org/t/spark-program-fiber-checkout-a-stripe-style-react-payment-library-for-fiber-network/10045), marking the delivery of a new payment tool for Fiber Network. 

Built for React and Next.js, it wraps Fiber payment flows into a simple checkout component, replacing complex manual steps with a ready-to-use checkout component. 

**What shipped:**

- npm package
- live demo
- documentation
- tested integrations

It was delivered within the planned 4-week timeline and is now ready for developers to plug into real apps.

- **Support**: Spark Program

### Fiber Link: Testnet Keeps Running Smoothly

The Fiber Link team shared its latest [Milestone 3 update](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845/30). The long-running public Testnet demo remains stable and operational, with:

- 109 successful tips
- 32 successful withdrawals
- 1 channel rotation for replenishing liquidity.

Next up: improved operator-friendly deployment and plugin installation guides to support future handoff and independent operation.

- Support: CKB Community Fund

### Dular: Mobile Money Stablecoin Wallet on Fiber

Dular is building a stablecoin wallet designed for users in Africa, Southeast Asia, and Latin America, where mobile money is already the default payment experience. With Dular, instead of complex crypto wallets, users can:

- Send funds via phone numbers
- Deposit and withdraw through services like M-Pesa
- Access wallets via USSD on feature phones, without internet

Dular uses Fiber’s payment channel network to enables near-instant transfers with extremely low fees, while supporting native stablecoins and future local currency assets.

- **Status**: The project is currently updating its application based on reviewer feedback in order to proceed to formal committee review.
- **Check it out**: [Forum link](https://talk.nervos.org/t/spark-program-dular/10212)
- **Application for**: Spark Programme

### Backr: Creator Memberships Powered by Fiber

Backr is a creator platform that enables paid posts, subscriptions, and community interaction through wallet-based identities instead of traditional accounts. 

**How payments work:**

- Subscriptions and renewals are paid via Fiber Network
- Creators selling memberships run their Fiber Nodes and configure its JSON-RPC endpoint in the app
- Backr coordinates Fiber invoice creation and payment handling on the server side, keeping the browser out of the payment flow.

This keeps payments non-custodial while giving creators full control over their setup.

- Check it out: [Forum link](https://talk.nervos.org/t/introducing-backr-creator-memberships-and-paid-content-on-nervos-ckb/10191)

### LUME: Explores a Programmable Yield Layer

A community proposal LUME proposes a programmable yield layer built on top of RGB++, aiming to connect Bitcoin and CKB through yield, liquidity, and network participation 

**The idea:**

- Users lock assets like CKB into a reserve-backed system
- Earn yield based on network activity and fees
- Build liquidity between BTC and CKB

In this design, Fiber Network would serve as a bridge and liquidity layer, connecting flows across systems.  

- Check it out: [Forum link](https://talk.nervos.org/t/powerful-asset-complenting-ckb-and-btc-ai-generated-idea/10170)

### Idea Feasibility Check: AI Workflow Monetization

Creators of open-source AI image/video generation often face a recurring issue: they build high-quality workflows, where the key values lies in a few critical parameters (e.g. CFG, steps, shift). These are easy to copy and redistribute without permission.

This idea explores a way to monetize AI workflow (especially ComfyUI) by separating its key parameters:

**Concept:**

- Main workflow stays open-source and runs locally
- Key parameters (like CFG, steps, tuning values) are encrypted and stored cheaply on CKB
- Fiber handles parameter retrieval and delivery back to the users

This enables a pay-per-use or pay-per-generation monetization model for creators while preserving an open ecosystem.

- Check it out: [Forum link](https://talk.nervos.org/t/product-idea-hiding-monetizing-core-ai-workflow-parameters-on-ckb-fiber-feasibility-check-ckb-fiber-ai/10175)


The ecosystem is still early, and most of what matters is happening in public — in forum posts, prototypes, and half-finished ideas that slowly turn into real products.

If you’re building something, here’s how we can support you:

- **Spark Program**: up to $2,000 for early MVPs (1–2 months)
- **CKB Community Fund**: DAO grants for broader ecosystem work

Share your progress on [Nervos Talk](https://talk.nervos.org/), even if it’s just a rough idea. That’s usually where the interesting things start. We’ll likely feature more of these in the next Fiber Pulse.
