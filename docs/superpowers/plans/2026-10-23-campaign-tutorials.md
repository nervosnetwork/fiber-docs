# Campaign Tutorial Improvements Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the user's five campaign-feedback changes on `improve-campaign-tutorials`.

**Architecture:** Keep the existing tutorial layout and browser-session lock. Reuse multi-hop lifecycle helpers, add a small reusable icon-only copy control, and keep articles and downloadable examples aligned.

**Tech Stack:** Next.js, React, TypeScript, CSS modules, Node's test runner.

**Spec:** The user's five numbered requirements in this conversation; no change from ZIP downloads to GitHub cloning.

## Global Constraints

- Scope is the first two tutorials and shared helpers needed by them.
- Display the 499 CKB breakdown in the existing number tooltip.
- Use the multi-hop tutorial's six opening states and exact ready-state check.
- Include `(This may take up to 1 min)` with observed opening states.
- Copy controls have icons only, no visible button container, and success tooltips.
- Funding explorer URLs come from the channel's actual funding outpoint.

## Review Focus

- A duplicate session must fail before starting a second runtime; retries after release must work.
- A handshake timeout must preserve a running node and offer a connection retry.
- `AWAITING_CHANNEL_READY` must not enable payments.
- Clipboard rejection must never show success; copy the full value despite shortened display.
- Missing funding outpoints must not produce a fabricated explorer link.

### Task 1: Session errors and lifecycle guidance

- [x] Add regression coverage for distinct duplicate-session and handshake-timeout errors; run it red.
- [x] Add actionable errors and reuse multi-hop state formatting/readiness/progression in Tutorial 2.
- [x] Explain all six states, waiting guidance, and the reserve breakdown in the rendered article and MDX.
- [x] Run session and multi-hop tests.

### Task 2: Identifiers and downloadable examples

- [x] Add reusable icon-only copying with accessible success/failure feedback.
- [x] Show full-value copy actions for channel IDs/payment hashes and a copyable funding explorer link.
- [x] Align standalone examples and regenerate their existing ZIP archives.
- [x] Verify clipboard success/failure, missing transaction data, and desktop/mobile layout in a browser.

### Task 3: Verification

- [x] Run all repository Node tests, TypeScript checking, and the production build.
- [x] Review the diff for scope and check branch name; report any verification limitations.

## Verification results

- 118 Node tests passed, including duplicate-session rejection and reconnect ownership.
- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm exec next build --webpack` passed. The default Turbopack attempt stalled and was stopped.
- Browser checks used the actual tutorial component with fixture SDK responses: six states, pending-payment gating, full clipboard values, clipboard rejection, duplicate-session prevention, reconnect reuse, and 390px layout all passed. No live Testnet transaction was sent.
- Both regenerated ZIPs passed archive integrity and byte-for-byte source checks.
- Independent review completed; unrelated generated knowledge-base changes were restored and lifecycle wording was corrected.

## Follow-up: shared mobile navbar

User requested the multi-hop mobile navbar on every interactive tutorial.
The catalog contains nine live tutorials; tutorials 3–9 already share the
routing frame. Extract its existing mobile picker into
`components/tutorials/mobile-tutorial-picker.tsx`, use it in that frame and
both introductory tutorials, and apply the existing mobile toolbar styles.
Preserve desktop controls, existing demo actions, and chapter metadata.
Verify all nine mobile menus, chapter selection, Escape/close focus behavior,
resize cleanup, and desktop controls; run TypeScript and the production build.

Follow-up verification completed: all nine live tutorial routes passed mobile
picker/current-chapter checks, close/Escape focus restoration, desktop resize
cleanup, chapter navigation, typography, and the 600/601px breakpoint. TypeScript,
the 118-test Node suite, and the webpack production build passed.

## Follow-up: Tutorial 1 pubkey copying

Added the shared icon-only copy control beside the node pubkey in the node
card and node-started event, visible once running. Removed connection-recovery
prose from the rendered article and MDX. Synced the standalone example and ZIP.
TypeScript, webpack production build, and browser checks with simulated startup
passed: both controls copy the entire key, show success/failure feedback, stay
hidden before startup, and fit desktop/mobile layouts.
