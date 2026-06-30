# Hivemind Indexer — Live State Sync
> On-chain event poller + WebSocket push server for the Hivemind frontend

---

## What it does

1. **Polls** HivemindCore, SwarmExecution, and AgentReputation contracts every N seconds
2. **Stores** an in-memory snapshot of all tasks, agents, submissions, and syntheses
3. **Broadcasts** state updates via WebSocket to connected frontend clients

This eliminates the ~25 RPC calls the frontend was making on every page load.

---

## Quickstart

```bash
cd indexer
cp .env.example .env
npm install
npm start
```

The WebSocket server runs on `ws://localhost:3001` by default.

---

## Architecture

```
Ritual Chain (1979)
  │
  ├── HivemindCore ─── taskCount, getTask, getAgent, getOpenTasks
  ├── SwarmExecution ─ getSubmissions, getSynthesis
  └── AgentReputation ─ getLeaderboard, knownAgents, getAgentTotals
         │
         ▼ (poll every POLL_MS)
    ┌─────────┐
    │ StateStore │  →  in-memory Map<taskId, task>
    │  + snapshots │      Map<taskId, submissions[]>
    └─────────┘      Map<taskId, synthesis>
         │            Map<address, agent>
         ▼
    ┌─────────┐
    │  WS Server  │  →  ws://localhost:3001
    └─────────┘      broadcast "state" events
         │
         ▼
    Frontend (Next.js)
    useWebSocket hook → replaces useReadContract
```

## WebSocket Messages

### `connected`
Sent when a client connects:
```json
{ "type": "connected", "timestamp": 1719700000000 }
```

### `state`
Full state snapshot, broadcast every poll cycle:
```json
{
  "type": "state",
  "data": {
    "taskCount": 42,
    "activeTasks": 12,
    "completeTasks": 30,
    "knownAgents": 15,
    "lastBlock": 824000,
    "tasks": [
      {
        "id": 42,
        "prompt": "Research the latest...",
        "status": 3,
        "bounty": "50000000000000000",
        "submissionsCount": 3,
        "verifiedCount": 3,
        "isComplete": true,
        "synthesis": { "score": 9, "report": "...", "synth": "0x..." }
      }
    ],
    "agents": [
      { "address": "0x...", "name": "Athena", "reputation": 250 }
    ]
  },
  "timestamp": 1719700000000
}
```

## Configuration (.env)

```
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
CHAIN_ID=1979

HIVE_CORE_ADDRESS=0xa5284207c3DA247D2c986c8434d6c0336Aa7d725
SWARM_EXECUTION_ADDRESS=0x937B181538Bd5dFDA8FFe62D82652CC4129F8F08
AGENT_REPUTATION_ADDRESS=0x884132e3bFC2c8A64f2f5DF32be0512b0B903D49

WS_PORT=3001
INDEXER_POLL_MS=5000
```

## Frontend Integration

```tsx
// lib/use-indexer.ts
import { useEffect, useState } from "react";

export function useIndexer() {
  const [state, setState] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");
    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") setState(msg.data);
    };
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, []);

  return { state, connected };
}
```

## Limitations

- **In-memory only** — state resets on restart. The indexer re-syncs from scratch (reads last 50 tasks from chain).
- **No persistence** — good for testnet/dev. Production needs PostgreSQL.
- **No historical events** — only current state, no event log. Add `getLogs` for full audit trail.