# PRD — RITUAL PREDIX v1.0

> **Status:** DRAFT | **Date:** 2026-06-30 | **Author:** NURUT
>
> "AI agents do the research. You make the call."

---

## 0. Executive Summary

Ritual Predix adalah **on-chain prediction market** di Ritual testnet yang
menggabungkan binary betting dengan **AI agent analysis terverifikasi**.

User bertaruh pada hasil pertandingan (mulai dari Piala Dunia 2026),
dibantu oleh AI agent yang memberikan data-driven prediction.
User bisa **trade posisi kapan saja** — exit early, lock profit, cut loss.

Fee 2% per transaksi → revenue Dimas.
Agent analysis via Ritual precompile LLM (0x0802) → on-chain verifiable.

### Why Now?
- Piala Dunia 2026: 32 besar sedang berjalan. Momentum community building.
- Bukan "demo" — ini fun, real use case, orang MAU bet.
- Ritual testnet: gas murah, token testnet abbundant, barrier to entry nol.

---

## 1. Product Vision

> Prediksi pasar pertama yang TIDAK cuma nebak — tapi dibackup sama
> **analisis AI agent yang on-chain verifiable.**

Bukan Polymarket killer. Bukan sportsbook.
Ritual Predix adalah **AI-augmented prediction market**.

---

## 2. User Persona

| Persona | Motivasi | Behavior |
|---------|----------|----------|
| **Punter** 🎲 | Main bet, have fun, menang RITUAL | Pasang 0.01-0.1 RIT, lihat odds, jual kalau panik |
| **Analyst** 📊 | Bikin agent, kasih prediksi, naikin reputation | Register agent, run analysis bot, jadi top predictor |
| **Spectator** 👀 | Ikut seru-seruan Piala Dunia | Gak bet banyak, tapi liat agent analysis, share ke temen |

---

## 3. Core Loop

```
┌─────────────────────────────────────────────────────┐
│  1. Dimas creates market                             │
│     "Brazil vs Germany — Who wins?"                  │
│     Deadline: kick-off time                          │
├─────────────────────────────────────────────────────┤
│  2. Agent analyzes                                   │
│     - Calls precompile LLM with match data           │
│     - Output: prediction + confidence + reasoning    │
│     - Result on-chain via synthesize() pattern       │
├─────────────────────────────────────────────────────┤
│  3. Users bet                                        │
│     - Buy YES (Brazil wins) or NO (not win)          │
│     - See agent predictions before deciding          │
│     - 2% fee taken per bet                           │
├─────────────────────────────────────────────────────┤
│  4. Users can TRADE anytime                          │
│     - Sell position before match ends                │
│     - Price fluctuates with market sentiment         │
│     - 1% exit fee                                    │
├─────────────────────────────────────────────────────┤
│  5. Match ends → Resolution                          │
│     - Oracle resolves market (manual/semi-auto)      │
│     - Winners claim payout                           │
│     - Fee treasury accumulates to Dimas              │
└─────────────────────────────────────────────────────┘
```

---

## 4. Revenue Model

| Fee Type | Rate | Collected |
|----------|------|-----------|
| **Bet fee** | 2% dari setiap bet | Saat user pasang |
| **Exit fee** | 1% dari trade value | Saat user jual posisi |
| **Market creation** | 0.01 RIT flat | Saat Dimas buat market |
| **Agent prompt** | 0.001 RIT | User prompt agent buat analisis |

Asumsi konservatif dengan 100 user, average 10 bets/orang:
- Volume: 100 × 10 × 0.01 RIT = 10 RIT
- Fee: 10 × 2% = **0.2 RIT revenue per market cycle**

SkalaWorld Cup: 64 pertandingan = potensi 12.8 RIT revenue.
Ini testnet, tapi proves revenue model.

---

## 5. Smart Contract Architecture

### 5.1 New Contracts (to build)

#### PredictionMarket.sol
```
struct Market {
  uint256 id;
  string question;         // "Brazil vs Germany — Who wins?"
  string optionA;          // "Brazil"
  string optionB;          // "Germany" 
  uint256 deadline;        // Kick-off timestamp (ms, Ritual chain)
  uint256 totalYesShares;  // Total shares for YES
  uint256 totalNoShares;   // Total shares for NO
  uint256 liquidity;       // Total RITUAL in pool
  uint8 status;            // 0=Active, 1=Resolved, 2=Cancelled
  uint8 outcome;           // 0=unresolved, 1=YES wins, 2=NO wins
  address creator;
  uint256 createdAt;
  uint256 agentAnalysisCount;
}

// User positions
struct Position {
  uint256 yesShares;
  uint256 noShares;
  uint256 invested;
  uint256 withdrawn;
}
```

Functions:
- `createMarket(question, optionA, optionB, deadline)` — Dimas only
- `betYes(marketId)` — payable, auto-convert to shares
- `betNo(marketId)` — payable
- `sellPosition(marketId)` — exit early at current price
- `resolveMarket(marketId, outcome)` — oracle only
- `claimWinnings(marketId)` — user claim after resolution
- `getMarketPrice(marketId)` → current implied probability

#### MarketFactory.sol
- Deploy individual market contracts (cleaner pattern)
- Track all markets
- Fee collector address (Dimas)

### 5.2 Existing Contracts (to reuse)

| Contract | Reuse |
|----------|-------|
| **AgentReputation** | Agent prediction accuracy → reputation |
| **HivemindCore** | Agent registry + identity |
| **PrecompileConsumer** | LLM inference via 0x0802 |
| **SwarmExecution** | synthesize() pattern for consensus analysis |

### 5.3 Fee Collection

```solidity
uint256 constant BET_FEE_BPS = 200;  // 2% = 200 basis points
uint256 constant EXIT_FEE_BPS = 100; // 1%
address public feeCollector;          // Dimas wallet
```

Fees auto-deducted on every bet/trade, sent to feeCollector.
No governance token needed yet. Simple, direct.

---

## 6. Agent Integration

### Flow
```
User action (optional): "Analyze Brazil vs Germany"
   ↓
HivemindCore.createTask(prompt, ...)
   ↓
Agent picks up task → calls precompile LLM → returns analysis
   ↓
SwarmExecution.synthesize() → consensus analysis on-chain
   ↓
Displayed on market page: "Agent consensus: Brazil 62% win probability"
```

### Agent Analysis Output Format
```json
{
  "match": "Brazil vs Germany",
  "prediction": "Brazil",
  "confidence": 62,
  "reasoning": "Brazil has 7W-2D-1L head-to-head, Neymar in form, Germany defense missing Rudiger...",
  "keyStats": [
    "Brazil avg 2.1 goals/match in group stage",
    "Germany conceded in 4/5 last matches",
    "Head-to-head: Brazil won last 3 meetings"
  ]
}
```

### Why Agent Matters (Differentiator)
- Bukan cuma "market odds" — user bisa lihat WHY agents predict this way
- On-chain immutable → agent gak bisa retroaktif ganti prediksi
- Reputation system → agent yang consistently benar → lebih dipercaya

---

## 7. Frontend (Web App)

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Hero + trending markets + live odds ticker |
| `/markets` | All active markets, filter by sport/status |
| `/markets/[id]` | Market detail: chart, agent analysis, bet form, positions |
| `/agents` | Agent leaderboard — who's the best predictor? |
| `/agents/[address]` | Agent profile: accuracy, predictions, reputation |
| `/create` | Create market (Dimas only) |
| `/history` | Past markets + settlement history |

### Key UI Components
- **Odds chart** — Implied probability over time (like Polymarket chart)
- **Agent panel** — Sidebar showing latest agent predictions for this market
- **Bet slider** — Simple: choose YES/NO, enter amount, see potential payout
- **Position manager** — My positions, P&L, exit button
- **Live indicator** — WebSocket-driven live odds update

### Design
- Reuse Hivemind design system: black void bg, plum-voltage #8052ff accent
- Sports/event theme: bold, energetic, scoreboard aesthetic
- Mobile-first — betting happens on phone

---

## 8. Phase Plan

### Phase 1: MVP — World Cup Ready (3-5 days)
**Goal:** Bisa bet di 1-2 match Piala Dunia.

- [ ] `PredictionMarket.sol` + compile + test
- [ ] `MarketFactory.sol` + deploy ke Ritual testnet
- [ ] Market creation script (Dimas creates "QF: X vs Y")
- [ ] Basic frontend: `/markets/[id]` with bet form
- [ ] Agent integration: 1 agent gives prediction
- [ ] Fee collection working
- [ ] E2E test: create market → bet → agent analyzes → resolve → claim

### Phase 2: Trading + Polish (2-3 days)
**Goal:** User bisa exit early, odds live update.

- [ ] Sell position (continuous trading)
- [ ] WebSocket live price updates
- [ ] Odds chart component
- [ ] Multiple agents analysis
- [ ] Agent leaderboard page

### Phase 3: Full Experience (2-3 days)
**Goal:** Complete, shareable, community-ready.

- [ ] All 64 matches loaded
- [ ] My positions page
- [ ] History + settlement archive
- [ ] Shareable links ("My prediction: Brazil, 62% confidence")
- [ ] Deploy to Vercel (public URL)

---

## 9. Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Market pattern | Fixed-product (like Polymarket) | Simpler than AMM, no IL, no LP needed |
| Pricing | Shares = bet / total pool | Standard binary market math |
| Resolution | Manual/semi-auto (Dimas) | No reliable sports oracle on Ritual |
| Chain | Ritual testnet (chain 1979) | Requirement from Dimas |
| RPC | `https://rpc.ritualfoundation.org` | Confirmed working |
| Timestamps | Milliseconds (Ritual chain behavior) | Already fixed in agent-kit |

### Binary Market Math
```
YES price = totalYesShares / (totalYesShares + totalNoShares)
NO price  = totalNoShares / (totalYesShares + totalNoShares)

User bets 1 RIT on YES:
  newYesShares = totalYesShares + (1 - fee) / YES_price
  totalPool += 1

User sells position:
  payout = userShares * currentPrice
  fee = payout * 0.01
  user receives: payout - fee
```

---

## 10. Risk & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Ritual chain down / RPC unreliable | High | Multi-RPC fallback |
| No real sports oracle | Medium | Dimas resolves manually (trusted) |
| Low liquidity (no one bets) | Medium | Seed with testnet RITUAL from Dimas wallet (1.47 RIT available) |
| Sybil agents farming reputation | Medium | Min stake to register (Phase 3) |
| Precompile 0x0802 rate limit / failure | Medium | Fallback to off-chain LLM analysis with TEE wrapper |
| World Cup ends → no events | Low | Expand to crypto predictions, daily events |

---

## 11. Success Metrics (Testnet Phase)

| Metric | Target | Why |
|--------|--------|-----|
| Markets created | 8+ (quarter-finals onward) | Sufficient content |
| Total bets | 50+ | Community engagement signal |
| Unique bettors | 10+ | Not just Dimas farming himself |
| Agent predictions | 16+ | At least 2 agents per market |
| Revenue collected | >1 RIT | Fee model proven |
| Ritual Foundation attention | Direct message or retweet | Grant application leverage |

---

## 12. Next Expansion (Post World Cup)

Kalau model ini jalan:
- **Crypto prediction** — "Will BTC hit $100k by EOY?" → perpetual markets
- **Daily events** — Esports, F1, Oscar predictions
- **Governance** — DAO vote outcomes prediction
- **Community markets** — Anyone can create market (with stake)

---

## 13. Key Addresses

| Purpose | Address |
|---------|---------|
| Dimas wallet | `0x04e276CFaFF694424Fc55327c5FbE7f7FEFD12fE` |
| HIVE_CORE (existing) | `0xa5284207c3DA247D2c986c8434d6c0336Aa7d725` |
| SWARM_EXECUTION | `0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08` |
| AGENT_REPUTATION | `0x884132e3bFC2c8A64f2f5DF32be0512b0B903D49` |
| PREDIX_MARKET (new) | TBD — deploy Phase 1 |
| PREDIX_FACTORY (new) | TBD — deploy Phase 1 |

---

**END PRD v1.0**
