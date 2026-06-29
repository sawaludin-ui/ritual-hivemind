'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import Card from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/input';
import { truncateAddress, formatDeadline, formatEtherDisplay } from '@/lib/utils';
import {
  HIVEMIND_CORE_ADDRESS,
  HIVEMIND_CORE_ABI,
  SWARM_EXECUTION_ADDRESS,
  SWARM_EXECUTION_ABI,
} from '@/lib/contracts';

const STATUS_MAP: Record<number, { label: string; variant: 'open' | 'executing' | 'complete' | 'failed' | 'idle' }> = {
  0: { label: 'Open', variant: 'open' },
  1: { label: 'Executing', variant: 'executing' },
  2: { label: 'Synthesizing', variant: 'idle' },
  3: { label: 'Complete', variant: 'complete' },
  4: { label: 'Failed', variant: 'failed' },
};

export default function SwarmViewerPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { address } = useAccount();
  const [answer, setAnswer] = useState('');
  const [teeAttestation, setTeeAttestation] = useState('0x');
  const [claimHash, setClaimHash] = useState<`0x${string}` | undefined>();
  const [submitHash, setSubmitHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isSuccess: submitConfirmed } = useWaitForTransactionReceipt({ hash: submitHash });

  const { data: task, isLoading, isError, error } = useReadContract({
    address: HIVEMIND_CORE_ADDRESS,
    abi: HIVEMIND_CORE_ABI,
    functionName: 'getTask',
    args: [BigInt(taskId)],
  });

  const { data: submissions } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_EXECUTION_ABI,
    functionName: 'getSubmissions',
    args: [BigInt(taskId)],
  });

  const { data: synthesis } = useReadContract({
    address: SWARM_EXECUTION_ADDRESS,
    abi: SWARM_EXECUTION_ABI,
    functionName: 'getSynthesis',
    args: [BigInt(taskId)],
  });

  const canAct = useMemo(() => Boolean(address), [address]);

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded" />
          <div className="h-40 bg-white/5 rounded-2xl" />
          <div className="h-60 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <Card className="text-center py-16">
          <p className="text-[14px] text-swarm-fail mb-2">Failed to load task #{taskId}</p>
          <p className="text-[12px] text-smoke mb-6">{error?.message || 'Task not found'}</p>
          <Link href="/tasks">
            <Button variant="ghost">{"<-"} Back to Tasks</Button>
          </Link>
        </Card>
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

  const statusInfo = STATUS_MAP[status] || { label: 'Open', variant: 'open' as const };
  const deadlineStr = formatDeadline(deadline);
  const isExpired = Number(deadline) * 1000 < Date.now();
  const progressPercent = maxAgents > 0n ? Math.round((claimedAgents.length / Number(maxAgents)) * 100) : 0;

  async function handleClaim() {
    const hash = await writeContractAsync({
      address: HIVEMIND_CORE_ADDRESS,
      abi: HIVEMIND_CORE_ABI,
      functionName: 'claimTask',
      args: [BigInt(taskId)],
    });
    setClaimHash(hash);
  }

  async function handleSubmit() {
    const hash = await writeContractAsync({
      address: SWARM_EXECUTION_ADDRESS,
      abi: SWARM_EXECUTION_ABI,
      functionName: 'submitAnswer',
      args: [BigInt(taskId), answer.trim(), teeAttestation as `0x${string}`],
    });
    setSubmitHash(hash);
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      <Link
        href="/tasks"
        className="text-xs text-smoke hover:text-bone transition-colors mb-6 inline-block"
      >
        {"<-"} Back to Tasks
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-[14px] text-bounty font-medium">
            {formatEtherDisplay(bounty)} ETH bounty
          </span>
        </div>
        <h1 className="text-[36px] font-medium leading-[1.1] text-bone">
          Swarm #{taskId}: {prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt}
        </h1>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-smoke mb-2">
          <span>
            Agents: {claimedAgents.length}/{maxAgents.toString()}
          </span>
          <span>
            {deadlineStr} {isExpired && '(Expired)'}
          </span>
        </div>
        <div className="w-full h-1 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full bg-plum-voltage rounded-full transition-all duration-600 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      <Card className="mb-8">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <span className="text-xs tracking-[0.05em] uppercase text-smoke">Creator</span>
            <p className="font-mono text-[13px] text-bone mt-1">{truncateAddress(creator)}</p>
          </div>
          <div>
            <span className="text-xs tracking-[0.05em] uppercase text-smoke">Prompt</span>
            <p className="text-[14px] text-ash mt-1 leading-relaxed">{prompt}</p>
          </div>
          <div>
            <span className="text-xs tracking-[0.05em] uppercase text-smoke">Requirements</span>
            <p className="text-[14px] text-smoke mt-1">
              Min {minAgents.toString()} agents · Max {maxAgents.toString()} agents · Min{' '}
              {minSubmissions.toString()} submissions
            </p>
          </div>
          <div>
            <span className="text-xs tracking-[0.05em] uppercase text-smoke">Deadline</span>
            <p className="text-[14px] text-smoke mt-1">{deadlineStr}</p>
          </div>
        </div>
      </Card>

      {claimConfirmed && (
        <Card className="mb-8 border-lichen/30">
          <p className="text-[14px] text-lichen font-medium">Task claimed successfully.</p>
        </Card>
      )}

      {submitConfirmed && (
        <Card className="mb-8 border-lichen/30">
          <p className="text-[14px] text-lichen font-medium">Answer submitted successfully.</p>
        </Card>
      )}

      <Card className="mb-8">
        <h2 className="text-[18px] font-semibold text-bone mb-4">Actions</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
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
              Claim before submitting answers. Wallet connected: {address ? truncateAddress(address) : 'No'}
            </span>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-[0.05em] uppercase text-smoke">
                Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={5}
                placeholder="Write your contribution..."
                className="bg-void border border-border-card rounded-[12px] px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors resize-none focus:border-plum-voltage"
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
      </Card>

      <Card className="mb-8">
        <h2 className="text-[18px] font-semibold text-bone mb-4">
          Claimed Agents ({claimedAgents.length})
        </h2>
        {claimedAgents.length === 0 ? (
          <p className="text-[14px] text-smoke">No agents have claimed this task yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {claimedAgents.map((agent, i) => {
              const hasSubmitted = submissions?.some((s) => s.agent.toLowerCase() === agent.toLowerCase());
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-white/4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasSubmitted ? 'bg-lichen' : 'bg-swarm-active animate-pulse'
                      }`}
                    />
                    <span className="font-mono text-[13px] text-bone">
                      {truncateAddress(agent)}
                    </span>
                  </div>
                  <span className="text-xs text-smoke">
                    {hasSubmitted ? 'Submitted' : 'Thinking...'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {synthesis && synthesis.consensusReport && (
        <Card className="min-h-[320px] mb-8 border-plum-voltage/10">
          <h2 className="text-[18px] font-semibold text-bone mb-4">
            Synthesis Report - Task #{taskId}
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-smoke mb-2">
              <span>Consensus Score</span>
              <span>{synthesis.consensusScore.toString()}/100</span>
            </div>
            <div className="w-full h-1 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-plum-voltage rounded-full"
                style={{
                  width: `${Math.min(Number(synthesis.consensusScore), 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="mb-6">
            <span className="text-xs tracking-[0.05em] uppercase text-smoke">Consensus Report</span>
            <p className="text-[14px] text-ash mt-2 leading-relaxed whitespace-pre-wrap">
              {synthesis.consensusReport}
            </p>
          </div>

          {synthesis.dissents.length > 0 && (
            <div className="border-t border-border-card pt-4 mt-4">
              <span className="text-xs tracking-[0.05em] uppercase text-amber-spark">
                Dissenting Opinions ({synthesis.dissents.length})
              </span>
              <p className="text-[12px] text-smoke mt-2">
                {synthesis.dissents.length} agent(s) disagreed with the consensus. View their
                submissions below for alternative perspectives on this task.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border-card">
            <span className="text-xs text-smoke">
              Agents Contributed: {synthesis.contributors.length}
            </span>
          </div>
        </Card>
      )}

      {submissions && submissions.length > 0 && (
        <Card>
          <h2 className="text-[18px] font-semibold text-bone mb-4">
            All Submissions ({submissions.length})
          </h2>
          <div className="flex flex-col gap-4">
            {submissions.map((sub, i) => (
              <div key={i} className="border border-border-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[13px] text-bone">
                    {truncateAddress(sub.agent)}
                  </span>
                  <span className="text-xs text-smoke">
                    Verified: {sub.verified ? 'Yes' : 'No'} ·{' '}
                    {new Date(Number(sub.timestamp) * 1000).toLocaleString()}
                  </span>
                </div>
                <p className="text-[13px] text-ash leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {sub.answer}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
