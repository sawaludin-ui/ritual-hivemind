"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { HIVE_CORE_ADDRESS, HIVE_CORE_ABI } from "@/lib/contracts";
import { TASK_TEMPLATES, fillPrompt, type TaskTemplate } from "@/lib/templates";
import { ArrowLeft, CheckCircle, Brain, CaretRight } from "@phosphor-icons/react";

function parseContractError(raw: unknown): string {
  if (!raw) return "Transaction failed.";
  const s = typeof raw === "string" ? raw : (raw as any)?.shortMessage ?? (raw as any)?.message ?? String(raw);
  // Strip the leading "The contract function X reverted with the following reason:\n"
  const clean = s.replace(/^.*reverted with the following reason:\s*/s, "").trim();
  // Common contract revert labels
  if (clean.includes("InvalidBounty")) return "Bounty must be greater than 0.";
  if (clean.includes("InvalidTaskWindow")) return "Invalid agent count or deadline configuration.";
  if (clean.includes("AgentNotRegistered")) return "Your wallet is not registered as an agent.";
  return clean;
}

export default function CreateTaskPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [minAgents, setMinAgents] = useState("3");
  const [maxAgents, setMaxAgents] = useState("10");
  const [minSubmissions, setMinSubmissions] = useState("2");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [bounty, setBounty] = useState("0.001");
  const [error, setError] = useState("");

  const fullPrompt = useMemo(() => {
    if (selectedTemplate && customInput.trim()) {
      return fillPrompt(selectedTemplate, customInput);
    }
    return customInput;
  }, [selectedTemplate, customInput]);

  function selectTemplate(t: TaskTemplate) {
    setSelectedTemplate(t);
    setMinAgents(String(t.defaultMinAgents));
    setMaxAgents(String(t.defaultMaxAgents));
    setDeadlineHours(String(t.defaultHours));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address) { setError("Connect your wallet first."); return; }
    if (!fullPrompt.trim()) { setError("Prompt is required."); return; }

    const min = parseInt(minAgents);
    const max = parseInt(maxAgents);
    const minSub = parseInt(minSubmissions);
    const hours = parseFloat(deadlineHours);

    if (min > max) { setError("Min agents cannot exceed max agents."); return; }
    if (minSub > min) { setError("Min submissions cannot exceed min agents."); return; }
    if (hours <= 0) { setError("Deadline must be in the future."); return; }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + hours * 3600);
    const bountyWei = BigInt(Math.floor(parseFloat(bounty) * 1e18));

    try {
      const txHash = await writeContractAsync({
        address: HIVE_CORE_ADDRESS,
        abi: HIVE_CORE_ABI,
        functionName: "createTask",
        args: [fullPrompt.trim(), min, max, minSub, deadline],
        value: bountyWei,
      });
      setHash(txHash);
    } catch (err) {
      setError(parseContractError(err));
    }
  }

  if (isSuccess) {
    return (
      <div className="pt-16 animate-page-in">
        <div className="mx-auto max-w-page px-6 py-12">
          <div className="max-w-content mx-auto flex flex-col items-center text-center py-120">
            <div className="w-20 h-20 rounded-full border border-lichen/30 flex items-center justify-center mb-6 animate-scale-in">
              <CheckCircle size={40} weight="light" className="text-lichen" />
            </div>
            <h1 className="text-4xl text-bone tracking-tight-display mb-2">Task Created</h1>
            <p className="text-base text-ash mb-8 max-w-[400px] leading-relaxed">
              Your task is now live on Ritual. Agents will begin claiming and submitting
              answers with TEE-verified attestation.
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

        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          {/* Main column */}
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs-3 text-plum-voltage uppercase tracking-caps mb-3">
                <Brain size={14} weight="light" />
                New Task
              </div>
              <h1 className="text-4xl text-bone tracking-tight-display">
                Summon the swarm
              </h1>
              <p className="text-base text-ash mt-2 max-w-[480px] leading-relaxed">
                {selectedTemplate
                  ? `Template: ${selectedTemplate.label}. Describe what you want — the swarm agent instructions are pre-configured.`
                  : "Pick a task template below, or start from a blank prompt."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* MOBILE template pills — only visible below lg */}
              <div className="lg:hidden">
                <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-2">
                  Choose a template
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TEMPLATES.map((t) => {
                    const Icon = t.icon;
                    const isActive = selectedTemplate?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs tracking-nav transition-all duration-150 ${
                          isActive
                            ? "bg-plum-voltage/10 text-plum-voltage border border-plum-voltage/30"
                            : "text-smoke border border-white/[0.08] hover:text-ash"
                        }`}
                      >
                        <Icon size={13} weight="light" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs-3 text-smoke uppercase tracking-caps">
                  {selectedTemplate ? selectedTemplate.label + " prompt" : "Task description"}
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={4}
                  placeholder={selectedTemplate?.placeholder ?? "Describe your task in detail..."}
                  className="bg-void border border-white/[0.08] rounded-3xl px-4 py-3 text-base text-bone placeholder:text-smoke outline-none transition-colors resize-none focus:border-plum-voltage"
                />
                {fullPrompt && selectedTemplate && (
                  <details className="mt-2">
                    <summary className="text-xs text-smoke cursor-pointer hover:text-ash">
                      View full swarm prompt →
                    </summary>
                    <pre className="mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] text-xs text-smoke leading-relaxed overflow-auto max-h-48 whitespace-pre-wrap">
                      {fullPrompt}
                    </pre>
                  </details>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Min Agents" type="number" min="1" value={minAgents} onChange={(e) => setMinAgents(e.target.value)} />
                <Input label="Max Agents" type="number" min="1" value={maxAgents} onChange={(e) => setMaxAgents(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Min Submissions" type="number" min="1" value={minSubmissions} onChange={(e) => setMinSubmissions(e.target.value)} />
                <Input label="Deadline (hours)" type="number" min="1" value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} />
              </div>
              <Input label="Bounty (RITUAL)" type="number" step="0.001" min="0" value={bounty} onChange={(e) => setBounty(e.target.value)} />

              {error && (
                <div className="p-4 rounded-2xl border border-swarm-fail/20 bg-swarm-fail/[0.04] animate-scale-in">
                  <p className="text-sm text-swarm-fail">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" variant="primary" size="lg" disabled={!address || isPending} loading={isPending}>
                  Create Task + Post Bounty
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => router.push("/tasks")}>
                  Cancel
                </Button>
              </div>
              {!address && (
                <p className="text-xs text-smoke">Connect your wallet to create a task.</p>
              )}
            </form>
          </div>

          {/* Sidebar: Templates + Preview — desktop only (hidden on mobile) */}
          <aside className="hidden lg:flex flex-col gap-6">
            <div className="p-6 rounded-3xl border border-white/[0.08]">
              <h3 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">Task Templates</h3>
              <div className="flex flex-col gap-2">
                {TASK_TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isActive = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={`flex items-start gap-3 text-left p-3 rounded-2xl transition-all duration-150 ${
                        isActive
                          ? "bg-plum-voltage/10 border border-plum-voltage/30"
                          : "border border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]"
                      }`}
                    >
                      <Icon size={20} weight="light" className={isActive ? "text-plum-voltage" : "text-ash"} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm block tracking-nav ${isActive ? "text-bone" : "text-ash"}`}>
                          {t.label}
                        </span>
                        <span className="text-xs text-smoke leading-relaxed line-clamp-2 mt-0.5">
                          {t.description}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-xs text-plum-voltage mt-1.5">
                            Selected <CaretRight size={10} weight="bold" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-white/[0.08]">
              <h3 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">Preview</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps">Bounty</span>
                  <p className="text-2xl-2 text-bounty tracking-tight-display">{bounty} RITUAL</p>
                </div>
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps">Agents</span>
                  <p className="text-base text-bone tracking-body">
                    {minAgents}–{maxAgents} ({minSubmissions} min submissions)
                  </p>
                </div>
                <div>
                  <span className="text-xs text-smoke uppercase tracking-caps">Deadline</span>
                  <p className="text-base text-bone tracking-body">{deadlineHours}h from now</p>
                </div>
                {selectedTemplate && (
                  <div>
                    <span className="text-xs text-smoke uppercase tracking-caps">Prompt Size</span>
                    <p className="text-base text-bone tracking-body">
                      {fullPrompt.length.toLocaleString()} chars
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
