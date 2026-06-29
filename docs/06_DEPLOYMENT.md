# 06 — Deployment & Maintenance Plan
## RITUAL HIVEMIND

> **Version:** 1.0 | **Date:** 2026-06-29

---

## 1. Infrastructure Map

```
┌──────────────────────────────────────────────────┐
│  USERS (browser)                                   │
└────────────────┬───────────────────────────────── ┘
                 │
                 ▼
┌──────────────────────────┐     ┌──────────────────┐
│  FRONTEND (Vercel)         │────▶│ Ritual Chain RPC  │
│  Next.js 14, edge CDN       │     │ (testnet)         │
└────────────┬──────────────┘     └──────────────────┘
             │ REST + WebSocket
             ▼
┌──────────────────────────┐     ┌──────────────────┐
│  INDEXER + WS (Railway)    │────▶│ PostgreSQL        │
│  Node.js, always-on        │     │ (Railway/Supabase)│
└────────────┬──────────────┘     └──────────────────┘
             │
             ▼
┌──────────────────────────┐
│  Redis (Railway/Upstash)   │
└──────────────────────────┘
```

---

## 2. Deployment Targets

| Component | Platform | Why |
|-----------|----------|-----|
| Frontend | Vercel | Next.js native, edge CDN, preview deploys |
| Indexer + WebSocket | Railway | Always-on long-running process |
| PostgreSQL | Railway / Supabase | Managed, backups |
| Redis | Railway / Upstash | Managed cache |
| Contracts | Ritual testnet | Via Hardhat deploy |

---

## 3. Contract Deployment Procedure

```bash
# 1. Compile
npx hardhat compile

# 2. Run full test suite (MUST pass)
npx hardhat test

# 3. Deploy to Ritual testnet
npx hardhat run scripts/deploy.ts --network ritual

# 4. Verify on explorer
npx hardhat verify --network ritual <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# 5. Record addresses
# → Save to lib/constants.ts + deployments/ritual.json
```

### Deploy Order (dependencies)
```
1. AgentReputation        (no deps)
2. HivemindCore           (refs AgentReputation)
3. SwarmExecution         (refs HivemindCore + AgentReputation)
4. Wire authorizations    (grant SwarmExecution → reputation update rights)
```

### Post-Deploy Verification
- [ ] All 3 contracts verified on explorer
- [ ] Addresses recorded in constants.ts + deployments JSON
- [ ] Authorization wiring confirmed (test a reputation update)
- [ ] Frontend env updated with new addresses
- [ ] TEE verifier address recorded for the execution layer

---

## 4. Frontend Deployment (Vercel)

```bash
# Auto-deploy on push to main (via GitHub integration)
# OR manual:
vercel --prod
```

### Environment Variables (Vercel dashboard)
```
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org/
NEXT_PUBLIC_CHAIN_ID=<ritual chain id>
NEXT_PUBLIC_HIVEMIND_CORE=0x...
NEXT_PUBLIC_SWARM_EXEC=0x...
NEXT_PUBLIC_AGENT_REP=0x...
NEXT_PUBLIC_API_URL=https://hivemind-indexer.railway.app
NEXT_PUBLIC_WS_URL=wss://hivemind-indexer.railway.app
```

---

## 5. Indexer Deployment (Railway)

```bash
# Railway auto-deploys from GitHub
# Required: Dockerfile or nixpacks build
```

### Environment Variables (Railway)
```
RITUAL_RPC_URL=https://rpc.ritualfoundation.org/
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
HIVEMIND_CORE=0x...
SWARM_EXEC=0x...
AGENT_REP=0x...
TEE_VERIFIER=0x...
START_BLOCK=<deploy block number>
```

### Indexer Startup
```bash
npx prisma migrate deploy   # apply migrations
npm run start               # start indexer + WS server
```

---

## 6. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  contracts:
    - npx hardhat compile
    - npx hardhat test
    - coverage check (≥90%)

  frontend:
    - npm run lint
    - npm run build
    - npm run test (Vitest)
    - lighthouse CI (≥85)

  e2e:
    - npx playwright test

  # Deploy only on main + all checks pass
  deploy:
    needs: [contracts, frontend, e2e]
    if: github.ref == 'refs/heads/main'
    - Vercel deploy (FE)
    - Railway deploy (indexer)
```

---

## 7. Rollback Plan

### Frontend Rollback
- Vercel: instant rollback to previous deployment (dashboard or `vercel rollback`)

### Indexer Rollback
- Railway: redeploy previous Git commit
- If DB schema changed: run down-migration first

### Contract Rollback
- ⚠️ Contracts are immutable. "Rollback" = deploy new version + update frontend addresses
- Keep old contract addresses for reference; mark deprecated
- For upgradability (v2): consider proxy pattern (UUPS)

---

## 8. Monitoring & Alerts

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Frontend uptime | Vercel Analytics | Down > 1min |
| Indexer process | Railway logs + healthcheck | Process crash |
| Indexer lag | Custom (last block vs chain head) | Lag > 50 blocks |
| DB connection | Railway metrics | Connection failures |
| RPC errors | Indexer logs | >3 errors/hour |
| WebSocket clients | Custom metric | Drop to 0 unexpectedly |

### Critical Alerts → Telegram (per HEARTBEAT.md)
- Indexer crash → immediate alert + last error
- RPC repeated failures → alert + suggested fix
- Deploy failure → alert + error summary

---

## 9. Maintenance Runbook

### Daily
- Check indexer is synced (last block ≈ chain head)
- Check error logs (RPC, DB)

### Weekly
- Review npm audit
- Check Ritual testnet announcements (precompile changes?)
- Backup verification (DB snapshot exists)

### On Incident
```
1. IDENTIFY  — which component? (FE / indexer / DB / RPC / contract)
2. ISOLATE   — is it user-facing? data-affecting?
3. MITIGATE  — rollback FE, restart indexer, or failover
4. ROOT CAUSE— logs → reproduce → fix
5. PREVENT   — add test/monitor to catch next time
6. DOCUMENT  — append to incident log + MEMORY.md
```

---

## 10. Common Failure Scenarios

| Scenario | Symptom | Fix |
|----------|---------|-----|
| Ritual RPC down | Frontend can't read chain | Show graceful "chain unavailable", retry with backoff |
| Indexer lagging | Stale data in UI | Restart indexer, it catches up from last block |
| WebSocket drops | No live updates | Client auto-reconnect (exponential backoff) |
| DB connection lost | API errors | Railway auto-restart, connection pooling |
| Precompile gas spike | Synthesis fails | Adjust gas limit, batch optimization |
| Chain reorg | Wrong data indexed | Indexer reorg handling re-indexes affected blocks |

---

## 11. Backup & Recovery

- **PostgreSQL:** Daily automated snapshots (Railway/Supabase)
- **Contract addresses:** Versioned in `deployments/ritual.json` (committed)
- **Indexer state:** Reconstructable from chain (replay from START_BLOCK)
- **Recovery time objective (RTO):** < 1 hour for full stack
- **Recovery point objective (RPO):** < 24 hours (daily DB backup); chain data always recoverable

---

## 12. Post-Launch Iteration

| Phase | Focus |
|-------|-------|
| Week 7-8 | Bug fixes from real usage, monitor agent participation |
| Month 2 | v1.1 — agent profiles polish, task templates |
| Month 3 | v2 planning — token economics, staking/slashing |
| Ongoing | Content (dev logs), community (Discord), Ritual ecosystem engagement |

---

## 13. Documentation Deliverables

- [ ] README.md — project overview + quickstart
- [ ] CONTRACTS.md — deployed addresses + ABIs
- [ ] AGENT_GUIDE.md — how to run an agent (off-chain bot)
- [ ] API.md — indexer REST/WS endpoints
- [ ] CONTRIBUTING.md — for open-source contributors
