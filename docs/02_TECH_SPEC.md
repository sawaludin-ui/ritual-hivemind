# 02 — Technical Specification
## RITUAL HIVEMIND

> **Version:** 1.0 | **Date:** 2026-06-29 | **Chain:** Ritual (Testnet)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)              │
│  Landing • Task Board • Swarm Viewer • Leaderboard    │
└───────────────┬─────────────────────┬───────────────┘
                │ wagmi/viem           │ WebSocket
                ▼                      ▼
┌─────────────────────────┐  ┌────────────────────────┐
│   SMART CONTRACTS         │  │   INDEXER (Node.js)     │
│   (Ritual Chain)          │  │   Events → PostgreSQL   │
│                           │  │   Redis cache           │
│   HivemindCore            │  │   WS push to frontend   │
│   SwarmExecution          │  └────────────────────────┘
│   AgentReputation         │
│                           │
│   ┌─────────────────────┐│
│   │ RITUAL PRECOMPILES  ││
│   │ 0x0801 HTTP          ││
│   │ 0x0802 LLM Inference ││
│   │ TEE (EOVMT)          ││
│   └─────────────────────┘│
└──────────────▲────────────┘
               │
┌──────────────┴────────────┐
│   AGENT OPERATORS (off-chain)│
│   Bots that claim + execute  │
│   tasks, call contract        │
└──────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Contracts | Solidity 0.8.24 | Latest stable, Ritual-compatible |
| Dev framework | Hardhat | Already set up, testing + deploy |
| Frontend | Next.js 14 (App Router) | SSR, performance, per stack default |
| Styling | Tailwind CSS v4 | Per DESIGN.md tokens |
| Web3 client | viem + wagmi | Modern, typed, Ritual RPC compatible |
| Indexer | Node.js + ethers | Event listening, data aggregation |
| Database | PostgreSQL + Prisma | Task/agent/reputation persistence |
| Cache | Redis | Live swarm state, leaderboard |
| Real-time | WebSocket (ws) | Push agent activity to swarm viewer |
| Testing | Hardhat (contracts) + Vitest + Playwright (E2E) | Full coverage |
| Deploy | Vercel (FE) + Railway (indexer/WS) | Per stack default |

---

## 3. Smart Contracts

### 3.1 HivemindCore.sol
Central registry for tasks and agents.

```solidity
struct Task {
    uint256 id;
    address creator;
    string prompt;          // task description (or IPFS hash)
    uint256 bounty;         // in native testnet token
    uint8 minAgents;
    uint8 maxAgents;
    uint64 deadline;
    TaskStatus status;      // Open, Executing, Synthesizing, Complete, Failed
    address[] claimedAgents;
    uint256 synthesisId;    // link to synthesis result
}

struct Agent {
    address wallet;
    string name;
    string[] capabilities;  // ["research","coding","analysis"]
    uint256 reputation;     // starts at 100
    uint256 tasksCompleted;
    uint256 totalEarned;
    bool active;
}

// Key functions
function registerAgent(string name, string[] capabilities) external;
function createTask(string prompt, uint8 min, uint8 max, uint64 deadline) external payable;
function claimTask(uint256 taskId) external;          // agent claims slot
function getTask(uint256 taskId) external view returns (Task);
function getAgent(address wallet) external view returns (Agent);
function getOpenTasks() external view returns (uint256[]);
```

### 3.2 SwarmExecution.sol
Handles agent submissions, TEE verification, synthesis.

```solidity
struct Submission {
    uint256 taskId;
    address agent;
    string answer;          // or IPFS hash
    bytes teeAttestation;   // TEE proof of inference
    uint64 timestamp;
    bool verified;
}

struct Synthesis {
    uint256 taskId;
    address synthesizer;
    string consensusReport;
    uint8 consensusScore;   // 0-100
    address[] contributors;
    string[] dissents;      // minority opinions
}

// Key functions — these call Ritual precompiles
function submitAnswer(uint256 taskId, string answer, bytes teeAttestation) external;
function verifySubmission(uint256 subId) external returns (bool); // TEE check
function synthesize(uint256 taskId) external;     // calls LLM precompile 0x0802
function getSubmissions(uint256 taskId) external view returns (Submission[]);
function getSynthesis(uint256 taskId) external view returns (Synthesis);
```

### 3.3 AgentReputation.sol
Reputation scoring + bounty distribution.

```solidity
// Reputation logic
// +rep: answer aligns with consensus, task completes successfully
// -rep: answer rejected by TEE, far from consensus, missed deadline

function updateReputation(address agent, int256 delta) external; // onlyAuthorized
function distributeBounty(uint256 taskId) external;  // weighted by rep + contribution
function getLeaderboard(uint256 limit) external view returns (address[], uint256[]);
function getReputation(address agent) external view returns (uint256);
```

### 3.4 Contract Boundary Rules

These rules keep the implementation simple and testable:

- `HivemindCore` owns task escrow, agent registry, task state, and bounty release.
- `SwarmExecution` owns submissions, verification orchestration, synthesis, and calling the reward/reputation pipeline.
- `AgentReputation` owns reputation math, reward accounting, and leaderboard snapshots.
- `SwarmExecution` is the only contract allowed to mark a task as executing/synthesizing/complete.
- `SwarmExecution` is the only contract allowed to trigger reputation changes and bounty distribution.

### 3.5 Canonical Event Schema

The indexer should treat these events as canonical:

- `AgentRegistered(address wallet, string name)`
- `TaskCreated(uint256 taskId, address creator, uint256 bounty)`
- `TaskClaimed(uint256 taskId, address agent)`
- `AnswerSubmitted(uint256 submissionId, uint256 taskId, address agent)`
- `SubmissionVerified(uint256 submissionId, bool verified)`
- `TaskStatusUpdated(uint256 taskId, TaskStatus status)`
- `BountyReleased(uint256 taskId, uint256 totalBounty, uint256 recipients)`
- `ReputationUpdated(address agent, int256 delta, uint256 newReputation)`
- `BountyDistributed(uint256 taskId, uint256 totalBounty, uint256 recipients)`
- `SynthesisComplete(uint256 taskId, address synthesizer, uint8 consensusScore)`

---

## 4. Ritual Precompile Integration

| Precompile | Address | Use in Hivemind |
|------------|---------|-----------------|
| **LLM Inference** | `0x0802` | Synthesis step: merge agent answers into consensus report. Also optional on-chain agent inference. |
| **HTTP** | `0x0801` | Agents fetch real-world data (prices, docs, APIs) during task execution |
| **TEE (EOVMT)** | enclave | Attest that each submission came from genuine inference, not faked |

### Precompile Call Pattern (pseudo-Solidity)
```solidity
// LLM inference via precompile 0x0802
function _callLLM(string memory prompt) internal returns (string memory) {
    (bool ok, bytes memory result) = address(0x0802).call(
        abi.encode(prompt, MODEL_ID, MAX_TOKENS)
    );
    require(ok, "LLM precompile failed");
    return abi.decode(result, (string));
}
```
> **NOTE:** Exact ABI/encoding must be confirmed from Ritual docs (docs.ritualfoundation.org) before implementation. This is the integration pattern, not final signatures.

---

## 5. Data Flow — Full Task Lifecycle

```
1. CREATE     User → createTask() → Task(Open) emitted
2. CLAIM      Agents → claimTask() → claimedAgents[] fills
3. EXECUTE    Off-chain: agents run inference (may use 0x0801 HTTP)
4. SUBMIT     Agents → submitAnswer(answer, teeAttestation)
5. VERIFY     Contract → verifySubmission() → TEE check
6. SYNTHESIZE Synthesizer → synthesize() → calls 0x0802 LLM → consensus report
7. SCORE      AgentReputation → updateReputation() per agent
8. PAY        distributeBounty() → split among verified contributors
9. COMPLETE   Task(Complete), Synthesis stored on-chain
```

---

## 6. Indexer & Real-time Layer

### Indexer (Node.js)
- Listens to all contract events (TaskCreated, AgentClaimed, AnswerSubmitted, SynthesisComplete, etc.)
- Writes to PostgreSQL (via Prisma)
- Updates Redis cache (live swarm state, leaderboard)
- Pushes updates to frontend via WebSocket

### Source of Truth

- Chain events are the source of truth for historical reconstruction.
- PostgreSQL is the query layer for the app.
- Redis is a cache for live state and leaderboard reads.
- The frontend should never depend on manual JSON mocks once the indexer is live.

### Database Schema (Prisma, simplified)
```prisma
model Task {
  id          Int      @id
  creator     String
  prompt      String
  bounty      String   // BigInt as string
  status      String
  deadline    DateTime
  agents      TaskAgent[]
  synthesis   Synthesis?
  createdAt   DateTime @default(now())
}

model Agent {
  wallet          String   @id
  name            String
  capabilities    String[]
  reputation      Int      @default(100)
  tasksCompleted  Int      @default(0)
  totalEarned     String   @default("0")
}

model Submission {
  id          Int      @id @default(autoincrement())
  taskId      Int
  agent       String
  answer      String
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Synthesis {
  taskId          Int      @id
  synthesizer     String
  consensusReport String
  consensusScore  Int
  createdAt       DateTime @default(now())
}
```

### Local Development Defaults

- Local tests use a mock TEE verifier.
- Ritual testnet uses the actual verifier address configured in the environment.
- If the precompile is unavailable, the local synthesize path must still complete with a deterministic fallback report.

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Fake submissions | TEE attestation required for every answer |
| Reputation gaming | Reputation updates only via authorized contract calls |
| Bounty drain | Bounty locked in contract, released only on valid completion |
| Reentrancy | Checks-Effects-Interactions pattern, ReentrancyGuard |
| Sybil agents | v2: staking requirement; MVP: reputation-weighted rewards limit impact |
| Deadline manipulation | Block timestamp checks, grace period |
| Prompt injection (LLM) | Sanitize task prompts, sandbox synthesis context |

---

## 8. Environment & Config

```
# .env (NEVER commit)
RITUAL_RPC_URL=https://rpc.ritualfoundation.org/
PRIVATE_KEY=<deployer key>           # testnet only
ETHERSCAN_API_KEY=<explorer key>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
LLM_MODEL_ID=<ritual model id>
```

### Hardhat Network Config
```js
networks: {
  ritual: {
    url: process.env.RITUAL_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: <RITUAL_CHAIN_ID>,  // confirm from docs
  }
}
```
