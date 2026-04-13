---

title: Pulse 03

description: Bi-weekly update tracking community contributions to the growth of the Fiber Network

author: Fiber Devs

date: 2026-04-13

---

**The most exciting work happens when builders take the lead.**

Over the past two weeks, the hackathon has brought in a new wave of projects. We’ve seen more builders step in and try things out.

Beyond the hackathon, projects continue to evolve and move forward.

### Claw & Order Hackathon: When AI Agents Meet Fiber

The [Claw & Order: CKB AI Agent Hackathon](https://talk.nervos.org/t/claw-order-hackathon-roundup/10154) (Mar 11–25) recently wrapped up. 22 projects explored a simple but ambitious idea: **What happens when AI agents can own wallets and make payments natively?**

By combining CKB’s cell model with Fiber’s micropayment capabilities, our community built agents that can coordinate, transact, and operate autonomously. Judging is still in progress, but we did’t want to wait to highlight what’s been built on Fiber:

**Agent Coordination, Execution, and Safety**

- [**Omniflow**](https://github.com/FadhilMulinya/Omniflow): Visual drag-and-drop builder to create AI agents and automate CKB/Fiber workflows without writing complex code.
- [**CKB Alpha Agent**](https://github.com/JouahriAli/Ckb-alpha-agent): Oracle agent providing statistical token analysis; users pay via Fiber micropayments for verifiable on-chain proofs.

**Payment and Commerce Solutions:**

- [**Fiber-pilot**](https://github.com/RaheemJnr/fiber-pilot): AI agent for Fiber node management using a 17-tool MCP server to automate channel and liquidity operations.
- [**Fiber Agent Pay**](https://github.com/Jeremicarose/FiberAgentPay): SDK and demo showing a self-sustaining agent economy where bots buy/sell services autonomously within CKB lock script limits.
- [**Fiber402**](https://github.com/David-Pjs/fiber402): Implementation of HTTP 402 for “pay-per-use” API access, enabling AI agents to pay for data instantly via Fiber.

**Gaming, Social, and Local Tools:**

- [**FiberQuest**](https://github.com/toastmanAu/fiberquest): Tournament agent for retro games that polls RAM in real-time to score players and pay winners autonomously via Fiber.
- [**SliceStream**](https://github.com/qrwd/SliceStream): Desktop-first local tool for CKB/Fiber workflows, providing a transparent, “fail-closed” environment for non-custodial execution.

We’ve seen a real burst of creativity here—especially from developers relatively new to CKB through the CKBuilders program!

All submissions are open-sourced, meaning these aren’t just hackathon demos, but are starting points others can fork and push further.

We’re looking forward to the judges’ feedback. But regardless of rankings, it’s already clear: this is the kind of experimentation that moves the ecosystem forward.

### Fiber Checkout is Live: Add Fiber Payment to Web Apps

A React component library that simplifies integrating Fiber payments into web applications, **Fiber Checkout** is now complete and published.

Web developers can now add a full Fiber payment flow to React or Next.js apps with a single component. Drop it in and you get: invoice generation, QR code rendering, payment status polling, expiry detection, and error handling out of the box. No Rust. No complex RPC knowledge. Just install and go. The full flow from npm installation, to component rendering and payment confirmation on testnet—can be done in under 10 minutes.

- **Check it out**: [Forum Link](https://talk.nervos.org/t/spark-program-fiber-checkout-a-stripe-style-react-payment-library-for-fiber-network/10045/15)
- **npm**: https://www.npmjs.com/package/fiber-checkout
- **GitHub Repo**: https://github.com/salmansarwarr/Fiber-checkout
- Demo: https://fiber-checkout.vercel.app/
- Demo video: https://www.youtube.com/watch?v=Jexw2F-P7fM
- **Support**: Spark Program

### Fiber Link: Public Testing Now Open

The open-source micropayment tipping layer—**Fiber Link**—is moving into broader public testing.

Current Status:

- Creator flow is live (receive tips, check balance, withdraw)
- Reader-side tipping depends on shared node liquidity (still evolving)

The team is actively accepting demo requests if you want early access: https://fiberlink.me/en/request-demo.

- **Check it out**: [Forum Link](https://talk.nervos.org/t/dis-fiber-link-a-ckb-fiber-based-pay-layer-tipping-micropayments-for-communities/9845/29)
- **Support**: CKB Community Fund

### Fiber Audio Player: Pay-Per-Second, Now in the Browser

The self-hosted podcast platform with per-second micropayments—**Fiber Audio Player**—now supports Fiber WASM node with a passkey experience:

- Runs a Fiber node directly in the browser (WASM)
- Uses passkeys (WebAuthn PRF) for key management
- No standalone node required

So yes, you can now *pay per second* for audio, directly from the browser, with full control over your keys.

- **Check it out**: [Forum Link](https://talk.nervos.org/t/make-self-host-great-again-how-i-use-fiber-and-openclaw-to-run-a-podcast-payment-service/10073/6)
- **Demo**: https://fiber-audio-player.vercel.app/

### Fiber Pay (v0.2.1): AI-Friendly Payments Getting Simpler

As a tool that enables AI to interact with the Fiber Network, Fiber Pay continues to move toward a more developer-friendly integration experience.

Latest release (v0.2.1):

- Introduced the Fiber WASM + passkey component in @fiber-pay/sdk

Developers can now integrate Fiber payments directly in the browser, with Passkey support built in. No standalone node needed. It’s a much simpler setup—and feels closer to a Stripe-like integration.

- Check it out: [Forum Link](https://talk.nervos.org/t/fiber-pay-an-ai-friendly-cli-for-fiber-network/9974/7)
- GitHub Repo: https://github.com/RetricSu/fiber-pay

The Nervos and Fiber community isn’t waiting for a perfect moment to start—and neither should you. Whether you’re interested in AI agents, micropayment APIs, or user-facing apps, you don't have to build in a vacuum. We’re here to back you:

- **Spark Program:** Perfect for early-stage ideas. Get up to **$2,000 USD** to take your concept to a working MVP in 1–2 months.
- **CKB Community Fund**: A community-driven DAO offering grants for development, content, and broader ecosystem initiatives.

If you’ve got something in progress—even an early draft—share it on the Nervos Talk forum. We care about the problems you are solving, and we’d love to feature your progress in the next Fiber Pulse.

**Enjoy building!**

Fiber Devs