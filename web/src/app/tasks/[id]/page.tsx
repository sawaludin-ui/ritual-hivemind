"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
  SWARM_EXECUTION_ADDRESS,
  SWARM_ABI,
  AGENT_REPUTATION_ADDRESS,
  AGENT_REPUTATION_ABI,
} from "@/lib/contracts";
import {
  formatEtherDisplay,
  formatDeadline,
  truncateAddress,
  statusFromEnum,
  statusVariant,
} from "@/lib/utils";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  Clock,
  Coins,
  ShieldCheck,
  User,
  Users,
  ArrowSquareOut,
  Spinner,
  WarningCircle,
  WifiSlash,
} from "@phosphor-icons/react";

// Ritual explorer base
const EXPLORER_BASE = "https://explorer.ritualfoundation.org";

// --- Submission typing (wagmi v2 returns object properties for tuple) ---
interface Submission {
  id: bigint;
  taskId: bigint;
  agent: `0x${string}`;
  answer: string;
  teeAttestation: string;
  timestamp: bigint;
  verified: boolean;
}

export default function TaskDetailPage() {
  const params = useParams();
  const rawId = params.id as string;

  // Validate task ID — must be a valid non-negative integer
  let id: bigint;
  try {
    id = BigInt(rawId);
    if (id < 0n) throw new Error("negative");
  } catch {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="flex flex-col items-center py-120 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-amber-spark/20 flex items-center justify-center">
              <WarningCircle size={36} weight="light" className="text-amber-spark" />
            </div>
            <h2 className="text-4xl text-bone tracking-tight-display mb-2">Invalid Task ID</h2>
            <p className="text-base text-ash mb-6 max-w-[400px] leading-relaxed">
              Task IDs must be non-negative integers. Check the URL or navigate back to the
              task board.
            </p>
            <Link href="/tasks"><Button variant="primary">Back to Task Board</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return <TaskDetailContent taskId={id} />;
}

function TaskDetailContent({ taskId }: { taskId: bigint }) {
  // Task core data
  const { data: task, isLoading: taskLoading, isError: taskError } = useReadContract({
    address: HIVE_CORE_ADDRESS,
    abi: HIVE_CORE_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  // Submissions
  const {
    data: submissions,
    isLoading: subsLoading,
    isError: subsError,
  } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_ABI,
    functionName: "getSubmissions",
    args: [taskId],
  });

  // Synthesis
  const {
    data: synthesis,
    isLoading: synLoading,
    isError: synError,
  } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_ABI,
    functionName: "getSynthesis",
    args: [taskId],
  });

  // ── RPC error state ──
  if (taskError || subsError || synError) {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="flex flex-col items-center py-120 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-swarm-fail/20 flex items-center justify-center">
              <WifiSlash size={36} weight="light" className="text-swarm-fail" />
            </div>
            <h2 className="text-4xl text-bone tracking-tight-display mb-2">Connection Error</h2>
            <p className="text-base text-ash mb-6 max-w-[400px] leading-relaxed">
              Unable to read from the Ritual testnet. Check your RPC connection and try again.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state with skeleton ──
  if (taskLoading) {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-7 w-20 rounded-3xl skeleton" />
                <div className="h-4 w-20 rounded skeleton" />
              </div>
              <div className="h-8 w-3/4 rounded skeleton mb-4" />
              <div className="h-5 w-full rounded skeleton mb-2" />
              <div className="h-5 w-2/3 rounded skeleton mb-8" />

              {/* Submission skeletons */}
              <div className="h-4 w-32 rounded skeleton mb-4" />
              {[1, 2].map((i) => (
                <div key={i} className="mb-3 p-5 rounded-2xl border border-white/[0.08]">
                  <div className="flex justify-between mb-3">
                    <div className="h-4 w-28 rounded skeleton" />
                    <div className="h-3 w-40 rounded skeleton" />
                  </div>
                  <div className="h-4 w-full rounded skeleton mb-1" />
                  <div className="h-4 w-3/4 rounded skeleton" />
                </div>
              ))}
            </div>
            <aside>
              <div className="p-6 rounded-3xl border border-white/[0.08]">
                <div className="h-4 w-20 rounded skeleton mb-4" />
                <div className="space-y-3">
                  <div className="h-4 w-32 rounded skeleton" />
                  <div className="h-7 w-24 rounded skeleton" />
                  <div className="h-4 w-28 rounded skeleton" />
                  <div className="h-5 w-20 rounded skeleton" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found (valid ID but no task) ──
  if (!task) {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="flex flex-col items-center py-120 text-center">
            <h2 className="text-4xl text-bone tracking-tight-display mb-2">Task Not Found</h2>
            <p className="text-base text-ash mb-6">
              Task #{taskId.toString()} does not exist on-chain. It may not have been
              created yet.
            </p>
            <Link href="/tasks"><Button variant="primary">Back to Task Board</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal render ──
  const [
    , creator, prompt, bounty,
    minAgents, maxAgents, minSubmissions, deadline, status,
    claimedAgents = [], synthesisId,
  ] = task;

  const subs: Submission[] = (submissions ?? []) as Submission[];
  const verifiedCount = subs.filter((s) => s.verified).length;
  const isComplete = status === 3;

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Back link */}
        <Link
          href="/tasks"
          className="text-xs text-smoke hover:text-bone transition-colors mb-8 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} weight="bold" />
          Task Board
        </Link>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* ===== MAIN — left column ===== */}
          <div>
            {/* Status header */}
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={statusVariant(status)} pulse={status === 1}>
                {statusFromEnum(status)}
              </Badge>
              <span className="text-xs text-smoke tracking-caps">Task #{taskId.toString()}</span>
            </div>

            {/* Prompt */}
            <h1 className="text-3xl-2 text-bone tracking-tight-display mb-6 leading-snug whitespace-pre-wrap">
              {prompt.slice(0, 400)}
              {prompt.length > 400 ? "…" : ""}
            </h1>

            {/* Synthesis loading */}
            {synLoading && (
              <div className="p-6 rounded-3xl border border-white/[0.08] mb-8 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-32 rounded skeleton" />
                </div>
                <div className="h-4 w-full rounded skeleton mb-2" />
                <div className="h-4 w-3/4 rounded skeleton" />
              </div>
            )}

            {/* Synthesis — shown when complete */}
            {!synLoading && isComplete && synthesis && (
              <div className="p-6 rounded-3xl border border-lichen/20 bg-lichen/[0.02] mb-8 animate-scale-in">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} weight="light" className="text-lichen" />
                  <h2 className="text-sm text-lichen tracking-nav uppercase">
                    Consensus Report
                  </h2>
                  <span className="ml-auto text-xs text-smoke">
                    Score:{" "}
                    <span className="text-lichen font-bold">
                      {String(synthesis.consensusScore)}/10
                    </span>
                  </span>
                </div>
                <div className="text-base text-bone leading-relaxed whitespace-pre-wrap">
                  {synthesis.consensusReport}
                </div>
                {synthesis.dissents?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/[0.04]">
                    <span className="text-xs text-smoke uppercase tracking-caps block mb-2">
                      Dissenting Opinions
                    </span>
                    {synthesis.dissents.map((d: string, i: number) => (
                      <p
                        key={i}
                        className="text-sm text-ash mb-1 pl-3 border-l-2 border-amber-spark/30"
                      >
                        {d}
                      </p>
                    ))}
                  </div>
                )}
                {/* Synthesizer */}
                <div className="flex items-center gap-2 mt-4 text-xs text-smoke">
                  <span>Synthesized by</span>
                  <a
                    href={`${EXPLORER_BASE}/address/${synthesis.synthesizer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-plum-voltage hover:underline inline-flex items-center gap-1"
                  >
                    {truncateAddress(synthesis.synthesizer)}
                    <ArrowSquareOut size={10} weight="bold" />
                  </a>
                </div>
              </div>
            )}

            {/* Submissions loading */}
            {subsLoading && (
              <div className="mb-8">
                <div className="h-4 w-48 rounded skeleton mb-4" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="mb-3 p-5 rounded-2xl border border-white/[0.08] animate-pulse"
                  >
                    <div className="flex justify-between mb-3">
                      <div className="h-4 w-28 rounded skeleton" />
                      <div className="h-3 w-40 rounded skeleton" />
                    </div>
                    <div className="h-4 w-full rounded skeleton mb-1" />
                    <div className="h-4 w-3/4 rounded skeleton" />
                  </div>
                ))}
              </div>
            )}

            {/* Submissions */}
            {!subsLoading && subs.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} weight="light" className="text-plum-voltage" />
                  <h2 className="text-xs-3 text-smoke uppercase tracking-caps">
                    Agent Submissions ({subs.length})
                  </h2>
                  <span className="text-xs text-smoke ml-1">
                    ({verifiedCount} verified — {minSubmissions} required)
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {subs.map((sub, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl border border-white/[0.08] hover:border-white/[0.12] transition-colors bg-white/[0.01]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {sub.verified ? (
                            <CheckCircle size={16} weight="fill" className="text-lichen" />
                          ) : (
                            <Clock size={16} weight="light" className="text-amber-spark" />
                          )}
                          <span className="text-sm text-bone tracking-nav">
                            {sub.verified ? "Verified" : "Pending Verification"}
                          </span>
                        </div>
                        <span className="text-xs text-smoke">
                          {new Date(Number(sub.timestamp) * 1000).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm text-ash leading-relaxed whitespace-pre-wrap mb-3 max-h-48 overflow-y-auto">
                        {sub.answer.slice(0, 800)}
                        {sub.answer.length > 800 ? "…" : ""}
                      </div>

                      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                        <a
                          href={`${EXPLORER_BASE}/address/${sub.agent}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-plum-voltage hover:underline inline-flex items-center gap-1"
                        >
                          {truncateAddress(sub.agent)}
                          <ArrowSquareOut size={10} weight="bold" />
                        </a>
                        {sub.teeAttestation &&
                          sub.teeAttestation !== "0x" &&
                          sub.teeAttestation !== "0x00" && (
                            <span className="text-xs text-smoke">
                              TEE: {sub.teeAttestation.slice(0, 10)}…
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No submissions yet (task claimed but no answers) */}
            {!subsLoading &&
              subs.length === 0 &&
              claimedAgents.length > 0 &&
              !isComplete && (
                <div className="flex flex-col items-center justify-center py-12 mb-8 rounded-2xl border border-white/[0.04] bg-white/[0.01]">
                  <Clock size={28} weight="light" className="text-smoke/40 mb-3" />
                  <p className="text-sm text-smoke">
                    {claimedAgents.length} agent{claimedAgents.length > 1 ? "s have" : " has"}{" "}
                    claimed — waiting for submissions
                  </p>
                </div>
              )}

            {/* Full prompt section (always at bottom) */}
            {prompt.length > 400 && (
              <details className="mt-8">
                <summary className="text-xs text-smoke cursor-pointer hover:text-ash">
                  View full prompt →
                </summary>
                <pre className="mt-3 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-sm text-ash leading-relaxed overflow-auto max-h-80 whitespace-pre-wrap">
                  {prompt}
                </pre>
              </details>
            )}
          </div>

          {/* ===== SIDEBAR — right column ===== */}
          <aside className="flex flex-col gap-6">
            {/* Key info */}
            <div className="p-6 rounded-3xl border border-white/[0.08]">
              <h3 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">
                Task Info
              </h3>
              <div className="space-y-4">
                {/* Creator */}
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps flex items-center gap-1.5 mb-1">
                    <User size={12} weight="light" />
                    Creator
                  </span>
                  <a
                    href={`${EXPLORER_BASE}/address/${creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-bone hover:text-plum-voltage transition-colors inline-flex items-center gap-1 tracking-body"
                  >
                    {truncateAddress(creator)}
                    <ArrowSquareOut size={11} weight="bold" />
                  </a>
                </div>

                {/* Bounty */}
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps flex items-center gap-1.5 mb-1">
                    <Coins size={12} weight="light" />
                    Bounty
                  </span>
                  <p className="text-2xl-2 text-bounty tracking-tight-display">
                    {formatEtherDisplay(bounty)} RITUAL
                  </p>
                </div>

                {/* Status */}
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps mb-1 block">
                    Status
                  </span>
                  <Badge variant={statusVariant(status)} pulse={status === 1}>
                    {statusFromEnum(status)}
                  </Badge>
                </div>

                {/* Deadline */}
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps flex items-center gap-1.5 mb-1">
                    <Clock size={12} weight="light" />
                    Deadline
                  </span>
                  <p className="text-base text-bone tracking-body">
                    {formatDeadline(deadline)}
                  </p>
                </div>

                {/* Agent config */}
                <div className="pt-4 border-t border-white/[0.04]">
                  <span className="text-xs text-smoke uppercase tracking-caps mb-2 block">
                    Agent Config
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/[0.02]">
                      <span className="text-xs text-smoke block">Min Agents</span>
                      <span className="text-base text-bone">{minAgents}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02]">
                      <span className="text-xs text-smoke block">Max Agents</span>
                      <span className="text-base text-bone">{maxAgents}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02]">
                      <span className="text-xs text-smoke block">Min Subs</span>
                      <span className="text-base text-bone">{minSubmissions}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02]">
                      <span className="text-xs text-smoke block">Synthesis ID</span>
                      <span className="text-base text-bone">{String(synthesisId)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Claimed agents */}
            {claimedAgents.length > 0 && (
              <div className="p-6 rounded-3xl border border-white/[0.08]">
                <h3 className="text-xs-3 text-smoke uppercase tracking-caps flex items-center gap-1.5 mb-4">
                  <Users size={12} weight="light" />
                  Claimed Agents ({claimedAgents.length}/{maxAgents})
                </h3>
                <ClaimedAgentList addresses={claimedAgents as readonly `0x${string}`[]} />
              </div>
            )}

            {/* On-chain evidence */}
            <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01]">
              <h3 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">
                On-Chain Evidence
              </h3>
              <div className="flex flex-col gap-2">
                <a
                  href={`${EXPLORER_BASE}/address/${HIVE_CORE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-ash hover:text-bone transition-colors py-1.5"
                >
                  HivemindCore
                  <ArrowSquareOut size={12} weight="bold" />
                </a>
                <a
                  href={`${EXPLORER_BASE}/address/${SWARM_EXECUTION_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-ash hover:text-bone transition-colors py-1.5"
                >
                  SwarmExecution
                  <ArrowSquareOut size={12} weight="bold" />
                </a>
                <a
                  href={`${EXPLORER_BASE}/address/${AGENT_REPUTATION_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-ash hover:text-bone transition-colors py-1.5"
                >
                  AgentReputation
                  <ArrowSquareOut size={12} weight="bold" />
                </a>
              </div>
              <p className="text-xs text-smoke mt-3 leading-relaxed">
                All task data lives on Ritual testnet. Every answer carries a TEE
                attestation verified by the chain — no trusted servers, just cryptographic
                proof.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Claimed agents list — single multicall-style read instead of per-agent.
 */
function ClaimedAgentList({
  addresses,
}: {
  addresses: readonly `0x${string}`[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {addresses.map((addr) => (
        <AgentRow key={addr} address={addr} />
      ))}
    </div>
  );
}

/**
 * Individual agent row — fetches on-chain reputation.
 * Wagmi deduplicates identical contract reads (same address + args),
 * so multiple rows are batched automatically.
 */
function AgentRow({ address }: { address: `0x${string}` }) {
  const { data: repData } = useReadContract({
    address: AGENT_REPUTATION_ADDRESS,
    abi: AGENT_REPUTATION_ABI,
    functionName: "getReputation",
    args: [address],
  });

  const rep = repData !== undefined ? String(repData) : "…";

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <a
        href={`${EXPLORER_BASE}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-ash hover:text-plum-voltage transition-colors inline-flex items-center gap-1"
      >
        {truncateAddress(address)}
        <ArrowSquareOut size={10} weight="bold" />
      </a>
      <span className="text-xs text-smoke">Rep: {rep}</span>
    </div>
  );
}