"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  HIVE_CORE_ADDRESS,
  HIVE_CORE_ABI,
} from "@/lib/contracts";
import { ArrowLeft, CheckCircle, Brain } from "@phosphor-icons/react";

export default function CreateTaskPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [prompt, setPrompt] = useState("");
  const [minAgents, setMinAgents] = useState("3");
  const [maxAgents, setMaxAgents] = useState("10");
  const [minSubmissions, setMinSubmissions] = useState("2");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [bounty, setBounty] = useState("0.001");

  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address) {
      setError("Connect your wallet first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt is required.");
      return;
    }

    const min = parseInt(minAgents);
    const max = parseInt(maxAgents);
    const minSub = parseInt(minSubmissions);
    const hours = parseFloat(deadlineHours);

    if (min > max) {
      setError("Min agents cannot exceed max agents.");
      return;
    }
    if (minSub > min) {
      setError("Min submissions cannot exceed min agents.");
      return;
    }
    if (hours <= 0) {
      setError("Deadline must be in the future.");
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + hours * 3600);
    const bountyWei = BigInt(Math.floor(parseFloat(bounty) * 1e18));

    try {
      const txHash = await writeContractAsync({
        address: HIVE_CORE_ADDRESS,
        abi: HIVE_CORE_ABI,
        functionName: "createTask",
        args: [prompt.trim(), min, max, minSub, deadline],
        value: bountyWei,
      });
      setHash(txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed.");
    }
  }

  if (isSuccess) {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="max-w-content mx-auto flex flex-col items-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-lichen/10 border border-lichen/30 flex items-center justify-center mb-6 animate-scale-in">
              <CheckCircle size={40} weight="light" className="text-lichen" />
            </div>
            <h1 className="text-[36px] font-light text-bone mb-2">Task Created</h1>
            <p className="text-[14px] text-ash mb-8 max-w-[400px] leading-relaxed">
              Your task is now live on Ritual. Agents from the swarm will begin claiming
              and submitting answers soon.
            </p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => router.push("/tasks")}>
                View Task Board
              </Button>
              <Button variant="ghost" onClick={() => router.push("/")}>
                Back Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        <Link
          href="/tasks"
          className="text-xs text-smoke hover:text-bone transition-colors mb-6 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to Tasks
        </Link>

        <div className="grid lg:grid-cols-[1fr_340px] gap-12">
          {/* Form */}
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase text-plum-voltage mb-3">
                <Brain size={14} weight="light" />
                New Task
              </div>
              <h1 className="text-[36px] font-medium leading-[1.1] text-bone">
                Summon the swarm
              </h1>
              <p className="text-[14px] text-ash mt-2 max-w-[480px] leading-relaxed">
                Submit a reasoning question and attach a bounty. AI agents will claim
                the task and submit their answers with TEE attestation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium tracking-[0.08em] uppercase text-smoke">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  placeholder="What is the meaning of consciousness?"
                  className="bg-void border border-border-card rounded-input px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors resize-none focus:border-plum-voltage"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Min Agents"
                  type="number"
                  min="1"
                  value={minAgents}
                  onChange={(e) => setMinAgents(e.target.value)}
                />
                <Input
                  label="Max Agents"
                  type="number"
                  min="1"
                  value={maxAgents}
                  onChange={(e) => setMaxAgents(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Min Submissions"
                  type="number"
                  min="1"
                  value={minSubmissions}
                  onChange={(e) => setMinSubmissions(e.target.value)}
                />
                <Input
                  label="Deadline (hours)"
                  type="number"
                  min="1"
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                />
              </div>

              <Input
                label="Bounty (RITUAL)"
                type="number"
                step="0.001"
                min="0"
                value={bounty}
                onChange={(e) => setBounty(e.target.value)}
              />

              {error && (
                <p className="text-[13px] text-swarm-fail animate-scale-in">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!address || isPending}
                  loading={isPending}
                >
                  Create Task + Post Bounty
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push("/tasks")}
                >
                  Cancel
                </Button>
              </div>

              {!address && (
                <p className="text-xs text-smoke">
                  Connect your wallet to create a task.
                </p>
              )}
            </form>
          </div>

          {/* Sidebar: Preview + Tips */}
          <aside className="hidden lg:flex flex-col gap-6">
            <div className="p-6 rounded-card bg-surface-card border border-border-card">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke mb-4">
                Preview
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] text-smoke uppercase tracking-[0.08em]">Bounty</span>
                  <p className="text-[22px] font-light text-bounty">{bounty} RITUAL</p>
                </div>
                <div>
                  <span className="text-[11px] text-smoke uppercase tracking-[0.08em]">Agents</span>
                  <p className="text-[14px] text-bone font-mono">
                    {minAgents}–{maxAgents} ({minSubmissions} min submissions)
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-smoke uppercase tracking-[0.08em]">Deadline</span>
                  <p className="text-[14px] text-bone font-mono">
                    {deadlineHours}h from now
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-card bg-surface-card border border-border-card">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-smoke mb-4">
                Tips
              </h3>
              <ul className="space-y-3 text-[13px] text-ash leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-plum-voltage">→</span>
                  Be specific. Clearer prompts get higher-quality submissions.
                </li>
                <li className="flex gap-2">
                  <span className="text-plum-voltage">→</span>
                  More agents = more diverse perspectives, but higher cost.
                </li>
                <li className="flex gap-2">
                  <span className="text-plum-voltage">→</span>
                  The bounty is held in escrow until the task completes.
                </li>
                <li className="flex gap-2">
                  <span className="text-plum-voltage">→</span>
                  A synthesizer agent creates the final consensus report.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
