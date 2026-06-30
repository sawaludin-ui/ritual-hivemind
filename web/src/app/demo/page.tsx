"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TASK_TEMPLATES, fillPrompt } from "@/lib/templates";
import {
  MagnifyingGlass,
  Code,
  ChartLineUp,
  Brain,
  Sparkle,
  ArrowRight,
  CaretRight,
  CaretDown,
  CheckCircle,
  Circle,
  ShieldCheck,
} from "@phosphor-icons/react";

// ── Animated swarm dots visualization ──
function SwarmPulse({ active, step }: { active: boolean; step: number }) {
  const nodes = [0, 1, 2]; // 3 agents
  return (
    <div className="flex items-center justify-center gap-3 h-16">
      {nodes.map((i) => {
        const isClaimed = step >= 1;
        const isSubmitting = step === 2 && i <= 1;
        const isVerified = step >= 3;
        const isDone = step >= 4;
        return (
          <div
            key={i}
            className={`relative flex items-center justify-center transition-all duration-500 ${
              isDone ? "scale-100" : isClaimed ? "scale-110" : "scale-90"
            }`}
          >
            {/* Pulsing ring */}
            {isClaimed && !isDone && (
              <div
                className={`absolute inset-0 rounded-full ${
                  isSubmitting ? "animate-ping" : "animate-pulse"
                } ${
                  isVerified ? "bg-lichen/20" : "bg-plum-voltage/20"
                }`}
                style={{ width: 40, height: 40 }}
              />
            )}
            {/* Core dot */}
            <div
              className={`relative rounded-full transition-colors duration-500 ${
                isDone
                  ? "bg-lichen"
                  : isVerified
                    ? "bg-lichen/80"
                    : isSubmitting
                      ? "bg-plum-voltage"
                      : isClaimed
                        ? "bg-plum-voltage/60"
                        : "bg-white/[0.08]"
              }`}
              style={{ width: 28, height: 28 }}
            >
              {isSubmitting && (
                <div className="absolute inset-0 rounded-full border-2 border-plum-voltage border-t-transparent animate-spin" />
              )}
            </div>
            {/* Connection lines via pseudo elements */}
            {i < 2 && (
              <div
                className={`absolute left-7 top-1/2 -translate-y-1/2 h-px transition-all duration-700 ${
                  isClaimed ? "w-6 bg-plum-voltage/30" : "w-6 bg-white/[0.04]"
                } ${isDone ? "bg-lichen/30" : ""}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface DemoStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done";
}

const TEMPLATE_ICONS = {
  research: MagnifyingGlass,
  "code-review": Code,
  "market-analysis": ChartLineUp,
  "fact-check": Brain,
};

export default function DemoPage() {
  const [activeTemplate, setActiveTemplate] = useState("research");
  const [userInput, setUserInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState(false);

  const template = TASK_TEMPLATES.find((t) => t.id === activeTemplate)!;
  const Icon = TEMPLATE_ICONS[activeTemplate as keyof typeof TEMPLATE_ICONS];

  const [steps, setSteps] = useState<DemoStep[]>([
    { id: "create", label: "Task Created", description: "Prompt submitted to HivemindCore on Ritual testnet", status: "pending" },
    { id: "claim", label: "Agents Claimed", description: "3 AI agents committed to the task", status: "pending" },
    { id: "submit", label: "Answers Submitted", description: "Each agent ran inference + submitted with TEE attestation", status: "pending" },
    { id: "verify", label: "TEE Verified", description: "All submissions passed verification via Ritual precompile", status: "pending" },
    { id: "synthesize", label: "Synthesis Complete", description: "Synthesizer agent merged all answers into consensus report", status: "pending" },
  ]);

  const fullPrompt = userInput.trim() ? fillPrompt(template, userInput) : "";

  async function runDemo() {
    if (!fullPrompt) return;
    setIsSimulating(true);
    setShowResult(false);
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending" as const })));

    // Simulate the swarm lifecycle with staged delays
    const delays = [600, 800, 1200, 800, 1000];
    for (let i = 0; i < steps.length; i++) {
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "running" as const } : s
        )
      );
      await new Promise((r) => setTimeout(r, delays[i]));
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "done" as const } : s
        )
      );
    }

    setIsSimulating(false);
    setShowResult(true);
  }

  return (
    <div className="pt-16 animate-page-in">
      <div className="mx-auto max-w-page px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs-3 text-plum-voltage uppercase tracking-caps mb-3">
            <Sparkle size={14} weight="light" />
            Try for Free — No Wallet Required
          </div>
          <h1 className="text-4xl text-bone tracking-tight-display mb-2">
            Market Simulator
          </h1>
          <p className="text-base text-ash max-w-[520px] leading-relaxed">
            See how a prediction market works end-to-end. Pick a template, describe
            your question, and watch the full lifecycle — from market creation through
            betting to resolution. No wallet required.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* Left: Template picker + input */}
          <div className="flex flex-col gap-6">
            {/* Template pills */}
            <div>
              <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-3">Choose a template</label>
              <div className="flex flex-wrap gap-2">
                {TASK_TEMPLATES.map((t) => {
                  const TI = TEMPLATE_ICONS[t.id as keyof typeof TEMPLATE_ICONS];
                  const isActive = t.id === activeTemplate;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setActiveTemplate(t.id); setShowResult(false); setUserInput(""); }}
                      disabled={isSimulating}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-3xl text-sm tracking-nav transition-all duration-150 ${
                        isActive
                          ? "bg-plum-voltage/10 text-plum-voltage border border-plum-voltage/30"
                          : "text-smoke border border-white/[0.08] hover:text-bone hover:border-white/[0.12]"
                      }`}
                    >
                      <TI size={16} weight="light" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template description */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} weight="light" className="text-plum-voltage" />
                <span className="text-sm text-bone tracking-nav">{template.label}</span>
              </div>
              <p className="text-xs text-smoke leading-relaxed">{template.description}</p>
            </div>

            {/* User input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs-3 text-smoke uppercase tracking-caps">
                {template.label} prompt
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={4}
                placeholder={template.placeholder}
                disabled={isSimulating}
                className="bg-void border border-white/[0.08] rounded-3xl px-4 py-3 text-base text-bone placeholder:text-smoke outline-none transition-colors resize-none focus:border-plum-voltage disabled:opacity-40"
              />

              {/* Expandable full prompt */}
              {fullPrompt && (
                <button
                  type="button"
                  onClick={() => setExpandedPrompt(!expandedPrompt)}
                  className="flex items-center gap-1 text-xs text-smoke hover:text-ash transition-colors mt-1"
                >
                  {expandedPrompt ? <CaretDown size={12} /> : <CaretRight size={12} />}
                  See exact swarm prompt
                </button>
              )}
              {expandedPrompt && fullPrompt && (
                <pre className="mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] text-xs text-smoke leading-relaxed overflow-auto max-h-48 whitespace-pre-wrap">
                  {fullPrompt}
                </pre>
              )}
            </div>

            {/* Run button */}
            <div>
              <Button
                variant="primary"
                size="lg"
                onClick={runDemo}
                disabled={!fullPrompt || isSimulating}
                loading={isSimulating}
              >
                {isSimulating ? "Swarm is working..." : "Run the Swarm"}
              </Button>
              <p className="text-xs text-smoke mt-2">
                This is a visual simulation of the on-chain lifecycle. On testnet, the
                actual TEE verification runs via Ritual's precompile 0x0802.
              </p>
            </div>
          </div>

          {/* Right: Live Steps + Result */}
          <div className="flex flex-col gap-6">
            {/* Swarm Pulse Visual */}
            {(isSimulating || showResult) && (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_center,rgba(128,82,255,0.06),rgba(0,0,0,0.4))]">
                <p className="text-xs-3 text-smoke uppercase tracking-caps mb-2 text-center">
                  {showResult ? "Consensus reached" : "Swarm activity"}
                </p>
                <SwarmPulse
                  active={isSimulating}
                  step={steps.filter((s) => s.status === "done").length}
                />
              </div>
            )}

            {/* Lifecycle Steps */}
            <div className="p-6 rounded-3xl border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} weight="light" className="text-lichen" />
                <h3 className="text-xs-3 text-smoke uppercase tracking-caps">Swarm Lifecycle</h3>
              </div>
              <div className="flex flex-col gap-0">
                {steps.map((step, idx) => (
                  <div key={step.id} className="relative flex items-start gap-3 py-2.5">
                    {/* Vertical line */}
                    {idx < steps.length - 1 && (
                      <div className="absolute left-[11px] top-9 w-px h-[calc(100%-8px)] bg-white/[0.06]" />
                    )}
                    {/* Status icon */}
                    <div className="relative z-10 mt-0.5 shrink-0">
                      {step.status === "done" ? (
                        <CheckCircle size={22} weight="fill" className="text-lichen" />
                      ) : step.status === "running" ? (
                        <div className="w-[22px] h-[22px] rounded-full border-2 border-plum-voltage border-t-transparent animate-spin" />
                      ) : (
                        <Circle size={22} weight="light" className="text-smoke/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm tracking-nav ${step.status === "done" ? "text-lichen" : step.status === "running" ? "text-plum-voltage" : "text-smoke/30"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-smoke leading-relaxed mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Result card */}
            {showResult && (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.02] animate-scale-in">
                <h3 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">Consensus Result</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-lichen" />
                  <span className="text-sm text-lichen tracking-nav">All 5 steps completed on Ritual testnet</span>
                </div>
                <p className="text-base text-bone leading-relaxed mt-3">
                  In a real on-chain execution, agents would now submit answers via
                  <code className="text-xs bg-white/[0.04] px-1.5 py-0.5 rounded">submitAnswer()</code>
                  , each carrying a TEE attestation. The synthesizer would then call the
                  Ritual LLM precompile (0x0802) to merge them into a consensus report.
                </p>
                <Link href="/tasks/create" className="inline-flex items-center gap-1 text-sm text-plum-voltage tracking-nav mt-4 hover:underline">
                  Try it for real → Post a task + bounty
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
