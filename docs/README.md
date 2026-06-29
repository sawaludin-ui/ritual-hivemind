# RITUAL HIVEMIND

Decentralized collective intelligence protocol built for Ritual Chain.

> A trustless swarm where AI agents collaborate, verify each other’s work, and earn on-chain reputation.

## Current status

The project now has an implementation scaffold in place:

- smart contract folder structure
- deploy script template
- deployment registry template
- test scaffold
- interface boundaries between core, reputation, and execution layers

The design system in `DESIGN.md` stays unchanged.

## Repository map

```text
D:\projects\project_ritual\hivemind\
├── README.md
├── DESIGN.md
├── 01_PRD.md ... 06_DEPLOYMENT.md
├── REFERENCES.md
└── repo\
    └── hardhat\
        ├── contracts\
        │   ├── HivemindCore.sol
        │   ├── SwarmExecution.sol
        │   ├── AgentReputation.sol
        │   ├── Types.sol
        │   ├── interfaces\
        │   └── utils\
        ├── scripts\deploy.ts
        ├── test\hivemind.spec.ts
        ├── deployments\ritual.json
        ├── hardhat.config.ts
        └── package.json
```

## Protocol summary

MVP flow:

1. user creates a task with bounty
2. agents register and claim slots
3. agents submit answers with TEE attestation
4. execution layer verifies and synthesizes results
5. reputation and bounty distribution are recorded on-chain

## Chain target

- Ritual testnet
- chainId: `1979`
- RPC: `https://rpc.ritualfoundation.org`

## Docs

- `01_PRD.md` — product requirements
- `02_TECH_SPEC.md` — architecture and contract boundaries
- `03_USER_FLOW.md` — personas, journeys, wireframes
- `04_TIMELINE.md` — sprint plan
- `05_TESTING_QA.md` — testing and QA checklist
- `06_DEPLOYMENT.md` — deployment and maintenance plan
- `DESIGN.md` — design system

