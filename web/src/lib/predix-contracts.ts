import { parseAbi } from "viem";
import { ritualTestnet } from "@/lib/config";

/**
 * Ritual Predix — contract addresses on Ritual testnet (chain 1979).
 * Deployed 2026-06-30.
 */
export const PREDIX_MARKET_ADDRESS =
  "0xf122fcaed28155c3f8730e02787d802e97ecdb57" as const;

export const RITUAL_CHAIN_ID = 1979;

/**
 * PredictionMarket ABI — minimal subset for frontend reads + writes.
 */
export const PREDIX_MARKET_ABI = parseAbi([
  // Views
  "function marketCount() view returns (uint256)",
  "function getMarketIds() view returns (uint256[])",
  "function getMarket(uint256 marketId) view returns ((uint256 id, string question, string optionA, string optionB, uint64 deadline, uint256 stakedA, uint256 stakedB, uint256 sharesA, uint256 sharesB, uint8 status, uint8 outcome, address creator, uint256 createdAt, uint256 resolvedAt))",
  "function getPosition(uint256 marketId, address user) view returns ((uint256 sharesA, uint256 sharesB, uint256 invested, bool claimed))",
  "function getOdds(uint256 marketId) view returns (uint256 probA, uint256 probB)",
  "function getBettors(uint256 marketId) view returns (address[])",
  "function getBettorCount(uint256 marketId) view returns (uint256)",
  "function previewPayout(uint256 marketId, uint8 side, uint256 betAmount) view returns (uint256)",
  "function feeCollector() view returns (address)",
  "function betFeeBps() view returns (uint256)",
  "function exitFeeBps() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)",
  // Writes
  "function bet(uint256 marketId, uint8 side) payable",
  "function sellPosition(uint256 marketId, uint8 side, uint256 sharesToSell)",
  "function closeMarket(uint256 marketId)",
  "function resolveMarket(uint256 marketId, uint8 outcome)",
  "function cancelMarket(uint256 marketId)",
  "function claimWinnings(uint256 marketId)",
  "function claimRefund(uint256 marketId)",
  "function createMarket(string question, string optionA, string optionB, uint64 deadline)",
  // Events
  "event MarketCreated(uint256 indexed marketId, address indexed creator, string question, string optionA, string optionB, uint64 deadline)",
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, uint8 side, uint256 grossAmount, uint256 netAmount, uint256 sharesMinted, uint256 fee)",
  "event PositionSold(uint256 indexed marketId, address indexed bettor, uint8 side, uint256 sharesSold, uint256 payout, uint256 fee)",
  "event MarketClosed(uint256 indexed marketId)",
  "event MarketResolved(uint256 indexed marketId, uint8 outcome)",
  "event MarketCancelled(uint256 indexed marketId)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount)",
  "event RefundClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount)",
]);

// Enums mirror (must match contract)
export const MarketStatus = {
  Active: 0,
  Closed: 1,
  Resolved: 2,
  Cancelled: 3,
} as const;

export const MarketOutcome = {
  Unresolved: 0,
  OptionA: 1,
  OptionB: 2,
} as const;

export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];
export type MarketOutcome = (typeof MarketOutcome)[keyof typeof MarketOutcome];

// Type for getMarket return
export interface Market {
  id: bigint;
  question: string;
  optionA: string;
  optionB: string;
  deadline: bigint;
  stakedA: bigint;
  stakedB: bigint;
  sharesA: bigint;
  sharesB: bigint;
  status: number;
  outcome: number;
  creator: string;
  createdAt: bigint;
  resolvedAt: bigint;
}

// Type for getPosition return
export interface Position {
  sharesA: bigint;
  sharesB: bigint;
  invested: bigint;
  claimed: boolean;
}

// Ritual chain config — re-exported from config.ts (single source of truth)
export const ritualChain = ritualTestnet;
