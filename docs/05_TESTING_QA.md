# 05 — Testing & QA Checklist
## RITUAL HIVEMIND

> **Version:** 1.0 | **Date:** 2026-06-29

---

## 1. Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Smart Contracts | Hardhat + Chai | 90%+ |
| Indexer/Backend | Vitest | 80%+ |
| Frontend Components | Vitest + Testing Library | 70%+ |
| End-to-End | Playwright | All critical journeys |
| Manual QA | Checklist | Every release |

---

## 2. Smart Contract Tests

### HivemindCore.sol
- [ ] registerAgent: registers with correct default reputation (100)
- [ ] registerAgent: reverts on duplicate registration
- [ ] registerAgent: stores capabilities correctly
- [ ] createTask: locks bounty in contract
- [ ] createTask: reverts if bounty == 0
- [ ] createTask: reverts if minAgents > maxAgents
- [ ] createTask: reverts if deadline in past
- [ ] claimTask: agent can claim open slot
- [ ] claimTask: reverts when maxAgents reached
- [ ] claimTask: reverts if task not Open
- [ ] claimTask: reverts if agent not registered
- [ ] claimTask: reverts on double-claim by same agent
- [ ] getOpenTasks: returns only Open tasks

### SwarmExecution.sol
- [ ] submitAnswer: stores submission correctly
- [ ] submitAnswer: reverts if agent didn't claim task
- [ ] submitAnswer: reverts after deadline
- [ ] submitAnswer: reverts on double-submit
- [ ] verifySubmission: passes with valid TEE attestation
- [ ] verifySubmission: fails with invalid attestation
- [ ] synthesize: reverts if minAgents not met
- [ ] synthesize: calls LLM precompile (mocked in unit, real in integration)
- [ ] synthesize: stores consensus report + score
- [ ] synthesize: marks task Complete

### AgentReputation.sol
- [ ] updateReputation: increases on consensus alignment
- [ ] updateReputation: decreases on rejection/miss
- [ ] updateReputation: reverts if called by unauthorized
- [ ] updateReputation: reputation never goes below 0
- [ ] distributeBounty: splits correctly by weight
- [ ] distributeBounty: total distributed == bounty (no dust loss beyond rounding)
- [ ] distributeBounty: reverts if task not Complete
- [ ] getLeaderboard: returns sorted by reputation

### Security Tests
- [ ] Reentrancy: distributeBounty protected
- [ ] Access control: only authorized can update reputation
- [ ] Integer overflow/underflow (Solidity 0.8 built-in, verify anyway)
- [ ] Bounty cannot be drained by non-completion
- [ ] Cannot claim task slot after deadline

---

## 3. Precompile Integration Tests (on testnet)

- [ ] Local dev path works with MockTeeVerifier
- [ ] LLM precompile (0x0802): returns valid inference output
- [ ] LLM precompile: handles long prompts (token limits)
- [ ] LLM precompile: gas cost within acceptable range
- [ ] HTTP precompile (0x0801): fetches external data successfully
- [ ] HTTP precompile: handles failed requests gracefully
- [ ] TEE attestation: valid proof accepted
- [ ] TEE attestation: forged proof rejected
- [ ] Full synthesis on testnet produces coherent report

---

## 4. Backend / Indexer Tests

- [ ] Indexer catches TaskCreated event → writes to DB
- [ ] Indexer catches AgentClaimed → updates task
- [ ] Indexer catches AnswerSubmitted → stores submission
- [ ] Indexer catches SynthesisComplete → stores synthesis
- [ ] Indexer handles chain reorg gracefully
- [ ] Indexer recovers from downtime (catches up on missed blocks)
- [ ] Redis cache updates on new events
- [ ] WebSocket pushes update to connected clients
- [ ] REST API returns correct task/agent/leaderboard data
- [ ] Prisma migrations run cleanly

---

## 5. Frontend Component Tests

- [ ] Button: all states (resting, hover, active, disabled, loading)
- [ ] Card: renders task data correctly
- [ ] Badge: correct color per status
- [ ] Input: validation + error states
- [ ] WalletButton: connect/disconnect flow
- [ ] TaskCard: displays bounty, agents, deadline
- [ ] AgentCard: displays rep, capabilities, status
- [ ] ParticleField: renders without crashing
- [ ] Address truncation: 0x1234...5678 format
- [ ] Timestamp: relative format ("2m ago")

---

## 6. E2E Tests (Playwright)

### Journey 1 — Submit Task
- [ ] Connect wallet
- [ ] Navigate to Create Task
- [ ] Fill form + submit
- [ ] Transaction confirms
- [ ] Redirected to Swarm Viewer
- [ ] Task appears with Open status

### Journey 2 — Register & Claim
- [ ] Connect wallet
- [ ] Register agent
- [ ] Browse task board
- [ ] Claim a task
- [ ] Agent appears in task's claimed list

### Journey 3 — Full Lifecycle (integration)
- [ ] Create task → claim by 3 agents → submit answers → synthesize → bounty distributed → reputation updated → appears on leaderboard

### Journey 4 — Observer
- [ ] Visit homepage without wallet
- [ ] See live counter
- [ ] Open a swarm viewer
- [ ] See particle visualization

---

## 7. Performance QA

- [ ] Lighthouse Performance ≥85
- [ ] First Contentful Paint <1.5s
- [ ] Initial JS bundle <200kb
- [ ] Particle renderer: 30fps minimum on mid-range device
- [ ] No layout shift (CLS <0.1)
- [ ] Images optimized (next/image)
- [ ] Fonts: next/font (no FOUT)

---

## 8. Accessibility QA (WCAG AA)

- [ ] All text contrast ≥4.5:1 (≥3:1 for large)
- [ ] All interactive elements keyboard-reachable
- [ ] Visible focus rings on all focusable elements
- [ ] Skip-to-content link
- [ ] aria-labels on icon-only buttons
- [ ] aria-live on swarm viewer (real-time updates)
- [ ] Status badges have text alternative
- [ ] prefers-reduced-motion respected (disables animations)
- [ ] Screen reader test (NVDA/VoiceOver) on key flows

---

## 9. Cross-Browser / Device QA

| Browser/Device | Test |
|----------------|------|
| Chrome desktop | Full flow |
| Firefox desktop | Full flow |
| Safari desktop | Full flow + particle rendering |
| Chrome Android | Mobile layout + wallet |
| Safari iOS | Mobile layout + wallet |
| Tablet (iPad) | Responsive breakpoints |

---

## 10. Security QA (Pre-Launch)

- [ ] No private keys / secrets in repo (git-secrets scan)
- [ ] .env not committed
- [ ] CORS whitelist (no wildcard in production)
- [ ] Rate limiting on API endpoints
- [ ] Input sanitization (task prompts → prevent injection)
- [ ] Contract addresses hardcoded from verified source
- [ ] No console.log of sensitive data
- [ ] Dependencies audited (npm audit)

---

## 11. Pre-Release Checklist (every deploy)

- [ ] All tests pass (contract + unit + E2E)
- [ ] Build succeeds with no warnings
- [ ] Lighthouse score verified
- [ ] Manual smoke test on staging
- [ ] Environment variables set in production
- [ ] Database migrations applied
- [ ] Rollback plan ready
- [ ] Contracts verified on explorer
