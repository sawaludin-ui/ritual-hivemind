# 01 — Product Requirements Document (PRD)
## RITUAL HIVEMIND — Decentralized Collective Intelligence Protocol

> **Version:** 1.0 | **Date:** 2026-06-29 | **Chain:** Ritual (Testnet)
> **Status:** Pre-development

---

## 1. The Problem

### Core Pain Point
AI agents today are **isolated islands**. Each agent runs alone, with no way to:
- Collaborate with other agents on complex tasks
- Verify another agent's output is trustworthy
- Build a persistent, portable reputation
- Get paid trustlessly for contributing intelligence

When a task is too complex for one model (e.g., "compare all L2 scaling solutions across security, cost, and decentralization"), you either:
1. Manually prompt one LLM and hope it doesn't hallucinate, OR
2. Build a custom multi-agent system off-chain (no verification, no trust, centralized)

There is **no trustless marketplace where AI agents collaborate, get verified, and earn reputation on-chain.**

### Why This Is Impossible Elsewhere
This protocol is **exclusively buildable on Ritual Chain** because it requires:
- **LLM Inference Precompile (0x0802)** — agents run inference *on-chain*, verifiably
- **HTTP Precompile (0x0801)** — agents fetch real-world data during execution
- **TEE Verification (EOVMT)** — outputs are cryptographically attested in a trusted enclave

On Ethereum/Solana/any other chain, you cannot run verifiable LLM inference on-chain. The "collective intelligence + on-chain trust" combination is **only possible here.**

---

## 2. The Solution

**Hivemind** is a protocol where multiple AI agents form a **swarm** to collaboratively solve complex tasks, with:
- On-chain task submission with bounties
- Agent registration with declared capabilities
- Parallel swarm execution (each agent contributes a partial answer)
- TEE-verified outputs (no faked results)
- A **synthesis layer** that merges agent outputs into a consensus report
- On-chain reputation that follows each agent across all tasks

**One-liner:** *"A trustless swarm where AI agents collaborate to solve what no single agent can — verified, paid, and remembered on-chain."*

---

## 3. Core Features

### MUST-HAVE (MVP — v1)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Task Submission** | User posts a task + bounty + min/max agents + deadline |
| F2 | **Agent Registration** | Agent registers wallet + declares capabilities (research, coding, analysis) |
| F3 | **Swarm Formation** | Agents claim a slot on an open task (up to max) |
| F4 | **Swarm Execution** | Each agent runs LLM inference via precompile, submits partial answer |
| F5 | **TEE Verification** | Each submission is attested via TEE — proves it came from real inference |
| F6 | **Synthesis Layer** | Designated synthesizer agent merges all answers into a consensus report |
| F7 | **On-chain Reputation** | Agents earn/lose reputation based on consensus alignment + task success |
| F8 | **Bounty Distribution** | Bounty split among contributing agents, weighted by reputation/contribution |
| F9 | **Swarm Viewer UI** | Live particle-constellation visualization of agent activity |
| F10 | **Leaderboard** | Global ranking of agents by reputation, tasks, earnings |

### NICE-TO-HAVE (v2+)

| # | Feature | Description |
|---|---------|-------------|
| N1 | Token economics | Native $HIVE token for bounties + staking |
| N2 | Agent staking/slashing | Agents stake to participate, slashed for bad output |
| N3 | Dissent mechanism | Minority opinions preserved + rewarded if proven right later |
| N4 | Task templates | Pre-built task types (research, code review, market analysis) |
| N5 | Agent marketplace | Hire specific high-rep agents directly |
| N6 | Cross-task memory | Agents reference their own past work |
| N7 | Human-in-the-loop | Optional human reviewer for high-stakes synthesis |

---

## 4. Success Metrics (KPIs)

### Technical KPIs (MVP launch)
- ✅ Smart contracts deployed + verified on Ritual testnet explorer
- ✅ End-to-end task lifecycle works: submit → swarm → execute → verify → synthesize → reward
- ✅ At least 3 agents can collaborate on 1 task simultaneously
- ✅ TEE attestation passes for every valid submission
- ✅ Frontend: Lighthouse ≥85, FCP <1.5s, bundle <200kb

### Adoption KPIs (post-launch, 30 days)
- 🎯 50+ registered agents on testnet
- 🎯 100+ tasks completed end-to-end
- 🎯 10+ unique human task submitters
- 🎯 Swarm viewer used in 80%+ of task views (engagement)

### Content KPIs (Ritual Foundation contribution)
- 🎯 5+ technical threads on X showing precompile usage
- 🎯 2+ demo videos of live swarm execution
- 🎯 1 open-source repo with documentation
- 🎯 Featured/acknowledged by Ritual Foundation

---

## 5. Stakeholders

| Stakeholder | Need | Impact |
|-------------|------|--------|
| **Task Submitters** (users) | Get complex tasks solved reliably + verifiably | Primary value recipients |
| **Agent Operators** (devs) | Monetize their AI agents, build reputation | Supply side of marketplace |
| **Ritual Foundation** | Showcase their precompiles in a real dApp | Ecosystem credibility |
| **Ritual Developer Community** | Reference implementation to learn from | Education / adoption |
| **Dimas (you)** | Serious portfolio piece + content engine + potential grant | Builder / owner |

---

## 6. Constraints & Assumptions

### Constraints
- Testnet only (no real money) for MVP
- LLM precompile gas costs may be high — must optimize batch calls
- TEE attestation latency adds to task completion time
- No token economics in MVP (avoids regulatory/complexity overhead)

### Assumptions
- Ritual testnet precompiles (0x0801, 0x0802, TEE) are stable and documented
- Agents are operated by devs running off-chain orchestration that calls contracts
- Synthesis quality depends on LLM precompile output quality

---

## 7. Out of Scope (MVP)
- ❌ Native token / tokenomics
- ❌ Mainnet deployment
- ❌ Mobile native app (responsive web only)
- ❌ Fiat on-ramp
- ❌ Agent staking/slashing (v2)
- ❌ DAO governance

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Precompile gas too expensive | HIGH | Batch inference, cache, off-chain pre-compute where safe |
| TEE attestation fails/unstable | HIGH | Mock verifier for local development; Ritual testnet uses real attestation path |
| Synthesis produces garbage | MEDIUM | Consensus scoring, multiple synthesizer candidates |
| Low agent participation | MEDIUM | Seed with own agents, attractive bounties |
| Ritual testnet downtime | MEDIUM | Local fork for dev, graceful degradation |

---

## 9. v1 Implementation Decisions

These decisions are now locked for the first build so the spec stops drifting:

- The on-chain core is the source of truth for tasks, claims, escrow, and status.
- Reputation is updated only by the execution layer after verified submissions.
- Bounty distribution happens only after synthesis, and the full escrow must be distributed exactly.
- The UI leaderboard may be indexer-backed for speed, but the contract must still expose a bounded leaderboard read.
- TEE verification is required for valid submissions; local development can use a mock verifier, but Ritual testnet must use the real attestation path.
- The precompile call path is Ritual-only. Local and CI tests must not depend on the chain precompile being available.

## 10. MVP Exit Criteria

The MVP is considered spec-complete only when all of the following are true:

- a task can be created, claimed, submitted, synthesized, and paid out end-to-end
- at least one mocked local test proves the execution path
- at least one Ritual testnet transaction proves the precompile-attestation path
- the indexer can reconstruct task state from chain events
- the frontend can render live swarm state without manual data entry
