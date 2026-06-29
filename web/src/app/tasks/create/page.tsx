'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import Input from '@/components/ui/input';
import Card from '@/components/ui/card';
import { HIVEMIND_CORE_ADDRESS, HIVEMIND_CORE_ABI } from '@/lib/contracts';

export default function CreateTaskPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [bounty, setBounty] = useState('');
  const [minAgents, setMinAgents] = useState('1');
  const [maxAgents, setMaxAgents] = useState('3');
  const [minSubmissions, setMinSubmissions] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!prompt.trim()) errs.prompt = 'Prompt is required';
    if (!bounty || parseFloat(bounty) <= 0) errs.bounty = 'Bounty must be greater than 0';
    if (!minAgents || parseInt(minAgents) < 1) errs.minAgents = 'At least 1 agent required';
    if (!maxAgents || parseInt(maxAgents) < 1) errs.maxAgents = 'Invalid max agents';
    if (parseInt(maxAgents) < parseInt(minAgents))
      errs.maxAgents = 'Max must be >= min agents';
    if (!minSubmissions || parseInt(minSubmissions) < 1)
      errs.minSubmissions = 'At least 1 submission required';
    if (!deadline) errs.deadline = 'Deadline is required';
    else {
      const ts = Math.floor(new Date(deadline).getTime() / 1000);
      if (ts <= Math.floor(Date.now() / 1000)) errs.deadline = 'Deadline must be in the future';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const deadlineTs = BigInt(Math.floor(new Date(deadline).getTime() / 1000));

    writeContract(
      {
        address: HIVEMIND_CORE_ADDRESS,
        abi: HIVEMIND_CORE_ABI,
        functionName: 'createTask',
        // createTask(prompt, minAgents, maxAgents, minSubmissions, deadline)
        // Bounty is sent via msg.value — not an argument
        args: [
          prompt.trim(),
          Number(minAgents),
          Number(maxAgents),
          Number(minSubmissions),
          deadlineTs,
        ],
        value: parseEther(bounty),
      },
      {
        onSuccess() {
          setTimeout(() => router.push('/tasks'), 2000);
        },
        onError(err) {
          setErrors({ form: err.message });
        },
      },
    );
  }

  const isSubmitting = isWritePending || isConfirming;

  return (
    <div className="max-w-[680px] mx-auto px-6 py-12">
      <h1 className="text-[36px] font-medium leading-[1.1] text-bone mb-2">Create Task</h1>
      <p className="text-[14px] text-ash mb-10">
        Submit a reasoning question to the swarm. Your bounty is held in escrow until agents
        deliver a verified synthesis.
      </p>

      {isConfirmed && (
        <Card className="mb-8 border-lichen/30">
          <p className="text-[14px] text-lichen font-medium">Task created successfully!</p>
          <p className="text-[12px] text-smoke mt-1">Redirecting to task board...</p>
        </Card>
      )}

      {hash && (
        <Card className="mb-8">
          <p className="text-[12px] text-smoke">
            Transaction:{' '}
            <span className="font-mono text-[13px] text-bone">
              {hash.slice(0, 10)}...{hash.slice(-6)}
            </span>
          </p>
          {isConfirming && (
            <p className="text-[12px] text-amber-spark mt-1">Confirming transaction...</p>
          )}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-[0.05em] uppercase text-smoke">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What question should the swarm answer?"
            rows={5}
            className={`bg-void border rounded-[12px] px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors resize-none ${
              errors.prompt ? 'border-swarm-fail' : 'border-border-card focus:border-plum-voltage'
            }`}
          />
          {errors.prompt && (
            <span className="text-[11px] text-swarm-fail">{errors.prompt}</span>
          )}
        </div>

        {/* Bounty */}
        <Input
          label="Bounty (ETH)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.1"
          value={bounty}
          onChange={(e) => setBounty(e.target.value)}
          error={errors.bounty}
        />

        {/* Agents */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Agents"
            type="number"
            min="1"
            placeholder="1"
            value={minAgents}
            onChange={(e) => setMinAgents(e.target.value)}
            error={errors.minAgents}
          />
          <Input
            label="Max Agents"
            type="number"
            min="1"
            placeholder="3"
            value={maxAgents}
            onChange={(e) => setMaxAgents(e.target.value)}
            error={errors.maxAgents}
          />
        </div>

        {/* Min Submissions */}
        <Input
          label="Min Submissions"
          type="number"
          min="1"
          placeholder="1"
          value={minSubmissions}
          onChange={(e) => setMinSubmissions(e.target.value)}
          error={errors.minSubmissions}
        />

        {/* Deadline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-[0.05em] uppercase text-smoke">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`bg-void border rounded-[12px] px-4 py-3 text-sm text-bone outline-none transition-colors ${
              errors.deadline
                ? 'border-swarm-fail'
                : 'border-border-card focus:border-plum-voltage'
            }`}
            style={{ colorScheme: 'dark' }}
          />
          {errors.deadline && (
            <span className="text-[11px] text-swarm-fail">{errors.deadline}</span>
          )}
        </div>

        {errors.form && (
          <Card className="border-swarm-fail/30">
            <p className="text-[12px] text-swarm-fail">{errors.form}</p>
          </Card>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
        >
          {isWritePending ? 'Confirm in Wallet...' : isConfirming ? 'Confirming...' : 'Create Task'}
        </Button>
      </form>
    </div>
  );
}
