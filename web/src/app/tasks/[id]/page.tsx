"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { SwarmViewer } from "@/components/swarm-viewer";
import { truncateAddress, formatDeadline, formatEtherDisplay } from "@/lib/utils";
import {
  HIVEMIND_CORE_ADDRESS,
  HIVEMIND_CORE_ABI,
  SWARM_EXECUTION_ADDRESS,
  SWARM_EXECUTION_ABI,
} from "@/lib/contracts";
import { ArrowLeft, CheckCircle, Warning, Brain, Share } from "@phosphor-icons/react";

const STATUS_MAP: Record<
  number,
  { label: string; variant: "open" | "executing" | "complete" | "failed" | "idle" }
> = {
  0: { label: "Open", variant: "open" },
  1: { label: "Executing", variant: "executing" },
  2: { label: "Synthesizing", variant: "idle" },
  3: { label: "Complete", variant: "complete" },
  4: { label: "Failed", variant: "failed" },
};

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { address } = useAccount();
  const [answer, setAnswer] = useState("");
  const [teeAttestation, setTeeAttestation] = useState("0x");
  const [claimHash, setClaimHash] = useState<`0x${string}` | undefined>();
  const [submitHash, setSubmitHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isSuccess: submitConfirmed } = useWaitForTransactionReceipt({ hash: submitHash });

  const { data: task, isLoading, isError, error } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  });

  const { data: submissions } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_EXECUTION_ABI,
    functionName: "getSubmissions",
    args: [BigInt(taskId)],
  });

  const { data: synthesis } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_EXECUTION_ABI,
    functionName: "getSynthesis",
    args: [BigInt(taskId)],
  });

  const canAct = useMemo(() => Boolean(address), [address]);

  if (isLoading) {
    return (
      <div className="pt-16 max-w-page mx-auto px-6 py-12 animate-page-in">
        <div className="space-y-6">
          <div className="h-8 w-48 rounded skeleton" />
          <div className="h-40 rounded-card skeleton" />
          <div className="h-96 rounded-card skeleton" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="pt-16 max-w-page mx-auto px-6 py-12 animate-page-in">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Warning size={48} weight="light" className="text-swarm-fail mb-4" />
          <p className="text-[14px] text-swarm-fail mb-2">Failed to load task #{taskId}</p>
          <p className="text-[12px] text-smoke mb-6">{error?.message || "Task not found"}</p>
          <Link href="/tasks">
            <Button variant="ghost">
              <ArrowLeft size={16} weight="bold" className="mr-1" />
              Back to Tasks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const [
    ,
    creator,
    prompt,
    bounty,
    minAgents,
    maxAgents,
    minSubmissions,
    deadline,
    status,
    claimedAgents = [],
  ] = task;

  const statusInfo = STATUS_MAP[status] || { label: "Open", variant: "open" as const };
  const deadlineStr = formatDeadline(deadline);
  const isExpired = Number(deadline) * 1000 < Date.now();
  const progressPercent = maxAgents > 0n ? Math.round((claimedAgents.length / Number(maxAgents)) * 100) : 0;

  async function handleClaim() {
    const hash = await writeContractAsync({
      address: HIVEMIND_CORE_ADDRESS,
      abi: HIVEMIND_CORE_ABI,
      functionName: "claimTask",
      args: [BigInt(taskId)],
    });
    setClaimHash(hash);
  }

  async function handleSubmit() {
    const hash = await writeContractAsync({
      address: SWARM_EXECUTION_ADDRESS,
      abi: SWARM_EXECUTION_ABI,
      functionName: "submitAnswer",
      args: [BigInt(taskId), answer.trim(), teeAttestation as `0x${string}`],
    });
    setSubmitHash(hash);
  }

  return (
    <div className="pt-16 animate-page-in">
      <div className="max-w-page mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/tasks"
          className="text-xs text-smoke hover:text-bone transition-colors mb-6 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to Tasks
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Badge variant={statusInfo.variant} pulse={status === 1}>
              {statusInfo.label}
            </Badge>
            <span className="text-[14px] text-bounty font-medium">
              {formatEtherDisplay(bounty)} RITUAL bounty
            </span>
            <span className="text-[12px] text-smoke font-mono">
              {deadlineStr} {isExpired && "(Expired)"}
            </span>
          </div>
          <h1 className="text-[36px] font-medium leading-[1.1] text-bone">
            Swarm #{taskId}:{" "}
            <span className="text-ash font-light">
              {prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt}
            </span>
          </h1>
        </div>

        {/* Swarm Viewer */}
        <div className="mb-8">
          <SwarmViewer
            taskId={taskId}
            prompt={prompt}
            deadline={deadline}
            claimedAgents={claimedAgents}
            status={status}
          />
        </div>

        {/* Task Details Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <DetailStat label="Creator" value={truncateAddress(creator)} mono />
          <DetailStat label="Min / Max Agents" value={`${minAgents} / ${maxAgents}`} mono />
          <DetailStat label="Min Submissions" value={minSubmissions.toString()} mono />
          <DetailStat label="Deadline" value={deadlineStr} mono />
        </div>

        {/* Success notifications */}
        {claimConfirmed && (
          <div className="mb-8 p-4 rounded-card bg-lichen/10 border border-lichen/30 flex items-center gap-3 animate-scale-in">
            <CheckCircle size={20} weight="light" className="text-lichen" />
            <p className="text-[14px] text-lichen font-medium">Task claimed successfully.</p>
          </div>
        )}
        {submitConfirmed && (
          <div className="mb-8 p-4 rounded-card bg-lichen/10 border border-lichen/30 flex items-center gap-3 animate-scale-in">
            <CheckCircle size={20} weight="light" className="text-lichen" />
            <p className="text-[14px] text-lichen font-medium">Answer submitted successfully.</p>
          </div>
        )}

        {/* Actions Card */}
        <div className="mb-8 p-6 rounded-card bg-surface-card border border-border-card">
          <h2 className="text-[18px] font-semibold text-bone mb-4 flex items-center gap-2">
            <Brain size={20} weight="light" className="text-plum-voltage" />
            Actions
          </h2>

          {/* Claim row */}
          <div className="flex flex-wrap gap-3 items-center mb-6 pb-6 border-b border-white/[0.04]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClaim}
              disabled={!canAct || isWriting}
              loading={isWriting}
            >
              Claim Task
            </Button>
            <span className="text-xs text-smoke">
              Wallet: {address ? truncateAddress(address) : "Not connected"}
            </span>
          </div>

          {/* Submit form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-[0.08em] uppercase text-smoke">
                Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                placeholder="Write your contribution..."
                className="bg-void border border-border-card rounded-input px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors resize-none focus:border-plum-voltage"
              />
            </div>
            <Input
              label="TEE Attestation"
              value={teeAttestation}
              onChange={(e) => setTeeAttestation(e.target.value)}
              placeholder="0x"
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={!canAct || !answer.trim() || isWriting}
              loading={isWriting}
            >
              Submit Answer
            </Button>
          </div>
        </div>

        {/* Claimed Agents */}
        <div className="mb-8 p-6 rounded-card bg-surface-card border border-border-card">
          <h2 className="text-[18px] font-semibold text-bone mb-4">
            Claimed Agents{" "}
            <span className="text-smoke font-mono">({claimedAgents.length})</span>
          </h2>
          {claimedAgents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-[14px] text-smoke mb-2">No agents have claimed this task yet.</p>
              <p className="text-[12px] text-smoke">The constellation is waiting.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {claimedAgents.map((agent, i) => {
                const hasSubmitted = submissions?.some(
                  (s) => s.agent.toLowerCase() === agent.toLowerCase()
                );
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 px-4 rounded-input bg-white/[0.02] border border-white/[0.04] transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasSubmitted ? "bg-lichen" : "bg-plum-voltage animate-pulse-dot"
                        }`}
                      />
                      <span className="font-mono text-[13px] text-bone">
                        {truncateAddress(agent)}
                      </span>
                    </div>
                    <span className="text-xs text-smoke font-mono">
                      {hasSubmitted ? "Submitted" : "Thinking..."}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Synthesis Report (DESIGN.md §6.12) */}
        {synthesis && synthesis.consensusReport && (
          <div className="mb-8 p-6 rounded-card bg-surface-card border border-plum-voltage/10 min-h-[320px] animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-semibold text-bone">
                Synthesis Report — Task #{taskId}
              </h2>
              <button className="text-xs text-smoke hover:text-bone transition-colors flex items-center gap-1">
                <Share size={14} weight="light" />
                Share
              </button>
            </div>

            {/* Consensus Score */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-smoke mb-2 font-mono">
                <span>Consensus Score</span>
                <span className="text-bone">{synthesis.consensusScore.toString()}/100</span>
              </div>
              <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-plum-voltage rounded-full transition-all duration-600 ease-out"
                  style={{
                    width: `${Math.min(Number(synthesis.consensusScore), 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Consensus Report Body */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke">
                Final Answer
              </span>
              <p className="text-[14px] text-ash mt-2 leading-relaxed whitespace-pre-wrap max-w-[80ch]">
                {synthesis.consensusReport}
              </p>
            </div>

            {/* Dissenting Opinions */}
            {synthesis.dissents.length > 0 && (
              <div className="border-t border-white/[0.06] pt-4 mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-spark">
                  Dissenting Opinions ({synthesis.dissents.length})
                </span>
                <div className="mt-3 space-y-2">
                  {synthesis.dissents.map((d, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-input bg-amber-spark/[0.04] border border-amber-spark/[0.08]"
                    >
                      <p className="text-[12px] text-ash leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-smoke font-mono">
                Agents Contributed: {synthesis.contributors.length}/{maxAgents.toString()}
              </span>
            </div>
          </div>
        )}

        {/* All Submissions */}
        {submissions && submissions.length > 0 && (
          <div className="p-6 rounded-card bg-surface-card border border-border-card">
            <h2 className="text-[18px] font-semibold text-bone mb-4">
              All Submissions{" "}
              <span className="text-smoke font-mono">({submissions.length})</span>
            </h2>
            <div className="flex flex-col gap-4">
              {submissions.map((sub, i) => (
                <div
                  key={i}
                  className="p-4 rounded-input border border-border-card bg-white/[0.02] hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[13px] text-bone">
                      {truncateAddress(sub.agent)}
                    </span>
                    <span className="text-xs text-smoke font-mono flex items-center gap-2">
                      {sub.verified && (
                        <CheckCircle size={12} weight="light" className="text-lichen" />
                      )}
                      {sub.verified ? "Verified" : "Unverified"} ·{" "}
                      {new Date(Number(sub.timestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[13px] text-ash leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {sub.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-4 rounded-input bg-surface-card border border-border-card">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke block mb-1">
        {label}
      </span>
      <span className={`text-[14px] text-bone ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}