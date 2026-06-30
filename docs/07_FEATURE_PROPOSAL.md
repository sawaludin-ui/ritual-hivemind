# 07 — Feature Proposal (Utility Layer)
## RITUAL HIVEMIND — Beyond UI, what makes this USEFUL

> **Date:** 2026-06-30 | **Status:** Proposal — awaiting Dimas approval
> **Why:** MVP contracts work (task lifecycle, reputation, bounty, precompile),
> but there is no reason for the Ritual community to show up and come back.
> This doc proposes the *utility layer* that turns a working demo into a
> protocol people actually use — and gives us a continuous content engine.

---

## The honest gap

What we have: a generic on-chain task marketplace with verified AI answers.
What's missing: a *reason to participate* and a *reason to return*.

A protocol is only "useful to a community" when it solves a recurring,
felt need for that specific community. The Ritual community is **builders
and AI/crypto people** who want to (a) see precompiles used for real, and
(b) get something back for participating.

So every feature below is judged by one question:
**"Does this give a Ritual community member a concrete reason to use it twice?"**

---

## Proposed features (priority order)

### ⭐ F-A — Public Task Templates + "Ask the Swarm" (highest leverage)
**What:** Pre-built, one-click task types instead of a blank prompt box:
- `Research` — "Compare X vs Y across <criteria>"
- `Code Review` — paste a contract/snippet, swarm audits it
- `Market Analysis` — token/protocol due-diligence
- `Fact Check` — verify a claim with cited sources (uses HTTP precompile 0x0801)

**Why useful:** Lowers the barrier from "I must design a multi-agent task"
to "I click "Audit my contract" and get a verified, multi-agent answer."
This is the single biggest adoption unlock.

**Community hook:** Free "Ask the Swarm" demo task on testnet — anyone can
try it without running an agent. This is the funnel.

**Content angle:** "Paste your contract, watch 3 AI agents audit it on-chain,
TEE-verified. Try it 👇" — extremely shareable.

---

### ⭐ F-B — Agent Operator Kit (supply side)
**What:** A tiny open-source agent runner (Node script) that:
1. Watches `TaskCreated` events
2. Auto-claims tasks matching its declared capability
3. Calls an LLM, submits the answer + (mock/real) TEE attestation
4. Earns reputation + bounty

**Why useful:** Right now "agents register" is theoretical. Nobody can
actually run one in 5 minutes. This kit makes the supply side real —
a dev clones the repo, sets an API key, and their agent is live in the swarm.

**Community hook:** "Run a Hivemind agent in 5 minutes" tutorial. This is
exactly what the Ritual dev community wants — a reference implementation.

**Content angle:** Step-by-step thread + repo. Recurring (each capability
type = one post).

---

### F-C — Live Swarm Activity Feed + Verifiable Receipts
**What:** A public feed of completed tasks, each with:
- The consensus report
- Which agents contributed
- The TEE attestation / tx hash as a "verifiable receipt" link to explorer

**Why useful:** Proof the thing works, publicly, every time. Turns each
completed task into evidence + a mini case study.

**Community hook:** "Every answer comes with a receipt you can verify
on-chain." Trust = the whole Ritual thesis.

**Content angle:** Screenshot a real receipt per notable task. Endless content.

---

## Deliberately deferred (not now)
- Native token / staking / slashing (regulatory + complexity; PRD already defers)
- Mainnet
- DAO governance
- Agent marketplace hire-by-name (needs liquidity first)

---

## Suggested build order
1. **F-A Task Templates + Ask-the-Swarm demo** (frontend + light contract read; biggest funnel)
2. **F-B Agent Operator Kit** (makes supply real; best dev-community content)
3. **F-C Activity Feed + Receipts** (compounding proof + content)

Each ships as: working code → build/run verified → one Twitter content file.

---

## Open decisions for Dimas
1. Approve this direction? (Y/N, or reorder)
2. For F-A: which 4 templates matter most to the Ritual crowd?
3. For F-B: language for the agent kit — Node/TS (matches repo) or Python?
4. Should "Ask the Swarm" demo use a real bounty (tiny testnet) or be free/sponsored?
