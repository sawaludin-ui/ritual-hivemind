# 04 — Project Timeline & Milestones
## RITUAL HIVEMIND

> **Version:** 1.0 | **Date:** 2026-06-29 | **Target:** MVP in 6 weeks

---

## 1. Sprint Overview

| Sprint | Week | Focus | Deliverable |
|--------|------|-------|-------------|
| 0 | Pre | Planning + Design | ✅ 6 docs + DESIGN.md (DONE) |
| 1 | 1 | Smart Contracts | Core contracts + tests |
| 2 | 2 | Precompile Integration | LLM/HTTP/TEE working on testnet |
| 3 | 3 | Indexer + Backend | Event indexing, DB, WebSocket |
| 4 | 4 | Frontend Core | Landing, Task Board, Create Task |
| 5 | 5 | Swarm Viewer + Leaderboard | Live visualization, rankings |
| 6 | 6 | E2E + Polish + Deploy | Full lifecycle, QA, launch |

### Current Build State

- Planning and design docs are complete.
- Contract scaffold already exists in `repo/hardhat/contracts`.
- The next highest-value step is integration tests plus Ritual verifier/precompile wiring.
- `DESIGN.md` and the UI/UX direction stay locked.

---

## 2. Sprint Details

### Sprint 1 — Smart Contracts (Week 1)
**Goal:** Deployable, tested core contracts.

- [ ] `HivemindCore.sol` — task + agent registry
- [ ] `SwarmExecution.sol` — submission, verification stubs
- [ ] `AgentReputation.sol` — reputation + bounty logic
- [ ] Unit tests (Hardhat) — 90%+ coverage
- [ ] Deploy to local Hardhat network
- [ ] Deploy to Ritual testnet + verify on explorer

**Milestone M1:** Contracts live on testnet, basic task lifecycle (no precompiles yet).

---

### Sprint 2 — Precompile Integration (Week 2)
**Goal:** Ritual's unique features working.

- [ ] Study Ritual precompile ABIs (docs + source)
- [ ] Integrate LLM precompile (0x0802) in synthesize()
- [ ] Integrate HTTP precompile (0x0801) for agent data fetch
- [ ] Integrate TEE attestation in verifySubmission()
- [ ] Test inference output on testnet
- [ ] Gas profiling + optimization

**Milestone M2:** A real synthesis runs on-chain using LLM precompile. THE differentiator.

---

### Sprint 3 — Indexer + Backend (Week 3)
**Goal:** Off-chain data layer.

- [ ] Node.js indexer listening to contract events
- [ ] PostgreSQL + Prisma schema + migrations
- [ ] Redis cache (live swarm state, leaderboard)
- [ ] WebSocket server for real-time push
- [ ] REST API for frontend queries
- [ ] Seed script (test agents + tasks)

**Milestone M3:** Frontend can query indexed data + receive live updates.

---

### Sprint 4 — Frontend Core (Week 4)
**Goal:** Usable web app.

- [ ] Next.js 14 setup + DESIGN.md tokens (Tailwind v4)
- [ ] Wallet connect (wagmi + Ritual chain config)
- [ ] Landing page (hero + particle field + live counter)
- [ ] Task Board (filterable grid)
- [ ] Create Task form (with tx flow)
- [ ] Agent registration form
- [ ] Component library (Button, Card, Badge, Input per DESIGN.md)

**Milestone M4:** User can connect, create task, register agent via UI.

---

### Sprint 5 — Swarm Viewer + Leaderboard (Week 5)
**Goal:** The signature experience.

- [ ] Particle constellation renderer (canvas)
- [ ] Swarm Viewer — live agent nodes + connections
- [ ] Real-time updates via WebSocket
- [ ] Agent status animations (pulse, idle, done)
- [ ] Synthesis report card (consensus + dissent)
- [ ] Leaderboard table (sortable)
- [ ] Agent profile pages

**Milestone M5:** Live swarm visualization works end-to-end. Content-ready.

---

### Sprint 6 — E2E + Polish + Deploy (Week 6)
**Goal:** Launch-ready.

- [ ] Playwright E2E tests (full task lifecycle)
- [ ] Mobile responsive pass (all screens)
- [ ] Performance: Lighthouse ≥85, FCP <1.5s, bundle <200kb
- [ ] Accessibility: WCAG AA pass
- [ ] Error states + empty states for all screens
- [ ] Deploy FE (Vercel) + indexer/WS (Railway)
- [ ] Write docs (how to run an agent)
- [ ] Record demo video + write launch thread

**Milestone M6 (LAUNCH):** Full MVP live, documented, content published.

---

## 3. Critical Path & Dependencies

```
Sprint 1 (contracts) ──┐
                        ├──► Sprint 2 (precompiles) ──┐
                        │                              │
                        └──► Sprint 3 (indexer) ───────┼──► Sprint 4 (FE core)
                                                       │         │
                                                       │         ▼
                                                       └──► Sprint 5 (swarm viewer)
                                                                 │
                                                                 ▼
                                                          Sprint 6 (E2E + deploy)
```

**Blockers to watch:**
- Sprint 2 depends on Ritual precompile docs being accurate → verify early
- Sprint 5 swarm viewer depends on Sprint 3 WebSocket → build indexer solid first

---

## 4. Content Milestones (Ritual Foundation Contribution)

| When | Content | Platform |
|------|---------|----------|
| After M1 | "Building on Ritual — contract architecture" thread | X |
| After M2 | "On-chain LLM inference works! Here's how" + demo clip | X |
| After M5 | Swarm viewer demo video | X / YouTube |
| After M6 | Full launch thread + open-source repo | X / GitHub |
| Ongoing | Dev log updates | X |

---

## 5. Definition of Done (MVP)

✅ All contracts deployed + verified on Ritual testnet
✅ Full task lifecycle works: submit → swarm → execute → verify → synthesize → reward
✅ LLM precompile used in synthesis (the differentiator)
✅ TEE attestation on submissions
✅ Live swarm viewer with particle visualization
✅ Leaderboard + agent profiles
✅ Mobile responsive + accessible + performant
✅ Deployed to production (Vercel + Railway)
✅ Documentation + demo video + launch content published

---

## 6. Buffer & Risk

- Each sprint has ~1 day buffer built in
- If precompile integration (Sprint 2) slips → it's the highest-risk, highest-value item, protect its timeline
- If behind by Week 5 → cut Leaderboard sorting + agent profiles to v1.1, keep Swarm Viewer (it's the demo)
- Realistic timeline: **6 weeks focused, 8 weeks with life happening**
