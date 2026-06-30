"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatDeadline, truncateAddress } from "@/lib/utils";

type SwarmNode = {
  address: string;
  label: string;
  status: "active" | "idle" | "complete";
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulse: number;
};

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function stringSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function SwarmViewer({
  taskId,
  prompt,
  deadline,
  claimedAgents,
  status,
}: {
  taskId: string;
  prompt: string;
  deadline: bigint;
  claimedAgents: readonly string[];
  status: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seed = useMemo(() => stringSeed(`${taskId}:${prompt}`), [taskId, prompt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const rand = seeded(seed);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let isMobile = window.innerWidth < 768;

    function resize() {
      if (!canvas || !ctx) return;
      isMobile = window.innerWidth < 768;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const nodes: SwarmNode[] = [];
    const nodeCount = Math.max(4, Math.min(claimedAgents.length || 4, isMobile ? 8 : 12));

    function statusFor(index: number): SwarmNode["status"] {
      if (index < claimedAgents.length) {
        return index === 0 || status >= 2 ? "complete" : "active";
      }
      return "idle";
    }

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (Math.PI * 2 * i) / nodeCount;
      const radius = isMobile ? 60 + rand() * 60 : 100 + rand() * 140;
      nodes.push({
        address: claimedAgents[i] ?? `0x${(seed + i).toString(16).padStart(40, "0").slice(0, 40)}`,
        label: claimedAgents[i] ? truncateAddress(claimedAgents[i], 8, 6) : `Agent-${i + 1}`,
        status: statusFor(i),
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * (isMobile ? 0.7 : 1),
        vx: (rand() - 0.5) * 0.25,
        vy: (rand() - 0.5) * 0.25,
        size: i < claimedAgents.length ? 5 : 3.5,
        pulse: rand() * Math.PI * 2,
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const outerRadius = isMobile
        ? Math.min(rect.width, rect.height) * 0.26
        : Math.min(rect.width, rect.height) * 0.32;

      // Orbital rings
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${0.04 - ring * 0.008})`;
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, outerRadius * (ring / 3), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Connection lines between active nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (isMobile ? 100 : 160)) {
            const alpha = Math.max(0, 0.15 - dist / 1000);
            const color =
              a.status === "complete" && b.status === "complete"
                ? "21,132,110"
                : "128,82,255";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${color},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const node of nodes) {
        node.pulse += node.status === "active" ? 0.04 : 0.015;
        const drift = node.status === "idle" ? 0.2 : 0.35;
        node.x += node.vx * drift;
        node.y += node.vy * drift;

        // Gravity toward orbit
        const dx = node.x - cx;
        const dy = node.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        node.x -= (dist - outerRadius) * (dx / dist) * 0.002;
        node.y -= (dist - outerRadius) * (dy / dist) * 0.002;

        // Wrap
        if (node.x < 0) node.x = rect.width;
        if (node.x > rect.width) node.x = 0;
        if (node.y < 0) node.y = rect.height;
        if (node.y > rect.height) node.y = 0;

        const isActive = node.status !== "idle";
        const alpha = isActive ? 0.95 : 0.4;
        const color =
          node.status === "complete"
            ? "21,132,110"
            : node.status === "active"
            ? "128,82,255"
            : "154,154,154";
        const pulse = node.size + Math.sin(node.pulse) * (node.status === "complete" ? 1.2 : 0.8);

        // Core
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.arc(node.x, node.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Ring around active nodes
        if (isActive) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color},0.2)`;
          ctx.lineWidth = 1;
          ctx.arc(node.x, node.y, pulse + (node.status === "active" ? 8 : 5), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      raf = window.setTimeout(draw, isMobile ? 40 : 32);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.clearTimeout(raf);
    };
  }, [seed, taskId, prompt, deadline, claimedAgents, status]);

  const activeCount = claimedAgents.length;
  const statusLabel = ["Open", "Executing", "Synthesizing", "Complete", "Failed"][status] ?? "Open";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_center,rgba(128,82,255,0.10),rgba(0,0,0,0.92)_42%)]">
      <div className="grid lg:grid-cols-[260px_1fr_280px] gap-0 min-h-[420px] lg:min-h-[560px]">
        {/* Left: Agent List */}
        <aside className="relative p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-white/[0.05]">
          <div className="mb-6">
            <p className="text-xs-3 text-smoke uppercase tracking-caps">
              Swarm
            </p>
            <h2 className="text-2xl-3 text-bone tracking-tight-display mt-1">
              Live constellation
            </h2>
            <p className="text-base text-ash mt-2 max-w-[220px] leading-relaxed">
              Agents light up as they claim work and move toward synthesis.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-smoke tracking-body">
              <span>Status</span>
              <span className="text-bone">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-smoke tracking-body">
              <span>Active nodes</span>
              <span className="text-bone">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-smoke tracking-body">
              <span>Claimed</span>
              <span className="text-bone">{claimedAgents.length}</span>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs-3 text-smoke uppercase tracking-caps mb-3">
              Claimed agents
            </p>
            <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
              {claimedAgents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/[0.08] px-4 py-6 text-base text-smoke text-center">
                  No agents yet. The constellation is waiting.
                </div>
              ) : (
                claimedAgents.map((agent, index) => (
                  <div
                    key={agent}
                    className="flex items-center gap-3 rounded-3xl border border-white/[0.04] px-3 py-2 transition-colors hover:border-white/[0.08]"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        index === 0 || status >= 2
                          ? "bg-lichen"
                          : "bg-plum-voltage animate-pulse-dot"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-bone tracking-body truncate">
                        {truncateAddress(agent, 8, 6)}
                      </p>
                      <p className="text-xs text-smoke">Node {index + 1}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center: Canvas */}
        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            aria-label="Swarm constellation"
          />
          {/* Prompt overlay */}
          <div className="absolute left-3 top-3 lg:left-6 lg:top-6 rounded-2xl lg:rounded-3xl border border-white/[0.08] bg-black/30 px-3 py-2 lg:px-4 lg:py-3 backdrop-blur-md max-w-[calc(100%-1.5rem)] lg:max-w-[540px]">
            <p className="text-xs-3 text-smoke uppercase tracking-caps">
              Prompt
            </p>
            <p className="mt-1 text-base text-bone leading-relaxed">{prompt}</p>
          </div>
        </div>

        {/* Right: Task Pulse */}
        <aside className="relative p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-white/[0.05]">
          <p className="text-xs-3 text-smoke uppercase tracking-caps">
            Task Pulse
          </p>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-smoke mb-2 tracking-body">
              <span>Agents</span>
              <span>{claimedAgents.length}</span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-plum-voltage transition-all duration-600 ease-out"
                style={{
                  width: `${Math.min(100, claimedAgents.length * 18)}%`,
                }}
              />
            </div>
          </div>

          {/* Deadline card */}
          <div className="mt-8 rounded-3xl border border-white/[0.08] p-5">
            <p className="text-xs-3 text-smoke uppercase tracking-caps">
              Deadline
            </p>
            <p className="mt-2 text-2xl-3 text-bone tracking-tight-display">
              {formatDeadline(deadline)}
            </p>
            <p className="mt-2 text-base text-ash leading-relaxed">
              Live updates reflect claim, submit, and synthesis events via the indexer.
            </p>
          </div>

          {/* Mode + Visual */}
          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-white/[0.08] px-4 py-3">
              <p className="text-xs-3 text-smoke uppercase tracking-caps">
                Mode
              </p>
              <p className="mt-1 text-base text-bone">
                {status >= 2 ? "Consensus forming" : "Gathering agents"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/[0.08] px-4 py-3">
              <p className="text-xs-3 text-smoke uppercase tracking-caps">
                Visual
              </p>
              <p className="mt-1 text-base text-bone">
                Particle constellation, deterministic seed
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
