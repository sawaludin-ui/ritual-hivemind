'use client';

import { useEffect, useMemo, useRef } from 'react';
import { formatDeadline, truncateAddress } from '@/lib/utils';

type SwarmNode = {
  address: string;
  label: string;
  status: 'active' | 'idle' | 'complete';
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const rand = seeded(seed);
    const mobile = window.innerWidth < 768;
    const nodes: SwarmNode[] = [];
    const nodeCount = Math.max(4, Math.min(claimedAgents.length || 4, mobile ? 8 : 12));
    const width = () => canvas.width;
    const height = () => canvas.height;

    function resize() {
      if (!canvas) return;
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * window.devicePixelRatio);
      canvas.height = Math.round(rect.height * window.devicePixelRatio);
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function statusFor(index: number): SwarmNode['status'] {
      if (index < claimedAgents.length) {
        return index === 0 || status >= 2 ? 'complete' : 'active';
      }
      return 'idle';
    }

    resize();
    window.addEventListener('resize', resize);

    const centerX = () => canvas.getBoundingClientRect().width / 2;
    const centerY = () => canvas.getBoundingClientRect().height / 2;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (Math.PI * 2 * i) / nodeCount;
      const radius = mobile ? 70 + rand() * 80 : 110 + rand() * 170;
      nodes.push({
        address: claimedAgents[i] ?? `0x${(seed + i).toString(16).padStart(40, '0').slice(0, 40)}`,
        label: claimedAgents[i] ? truncateAddress(claimedAgents[i], 8, 6) : `Agent-${i + 1}`,
        status: statusFor(i),
        x: centerX() + Math.cos(angle) * radius,
        y: centerY() + Math.sin(angle) * radius * (mobile ? 0.7 : 1),
        vx: (rand() - 0.5) * 0.35,
        vy: (rand() - 0.5) * 0.35,
        size: i < claimedAgents.length ? 5.5 : 4,
        pulse: rand() * Math.PI * 2,
      });
    }

    function draw() {
      if (!canvas) return;
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const outer = mobile ? Math.min(rect.width, rect.height) * 0.28 : Math.min(rect.width, rect.height) * 0.34;

      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${0.05 - ring * 0.01})`;
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, outer * (ring / 3), 0, Math.PI * 2);
        ctx.stroke();
      }

      const deadlineText = formatDeadline(deadline);

      ctx.font = '600 12px var(--font-sans), system-ui';
      ctx.fillStyle = 'rgba(214,214,214,0.8)';
      ctx.fillText(`Task #${taskId}`, 18, 22);
      ctx.fillStyle = 'rgba(154,154,154,0.9)';
      ctx.fillText(deadlineText, 18, 40);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (mobile ? 120 : 170)) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(128,82,255,${Math.max(0, 0.18 - dist / 1000)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        node.pulse += node.status === 'active' ? 0.05 : 0.02;
        const drift = node.status === 'idle' ? 0.28 : 0.48;
        node.x += node.vx * drift;
        node.y += node.vy * drift;

        const dx = node.x - cx;
        const dy = node.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = outer;
        node.x -= (dist - target) * (dx / dist) * 0.003;
        node.y -= (dist - target) * (dy / dist) * 0.003;

        if (node.x < 0) node.x = rect.width;
        if (node.x > rect.width) node.x = 0;
        if (node.y < 0) node.y = rect.height;
        if (node.y > rect.height) node.y = 0;

        const isActive = node.status !== 'idle';
        const alpha = isActive ? 0.95 : 0.5;
        const color = node.status === 'complete' ? '21,132,110' : node.status === 'active' ? '128,82,255' : '154,154,154';
        const pulse = node.size + Math.sin(node.pulse) * (node.status === 'complete' ? 1.2 : 0.8);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.arc(node.x, node.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = node.status === 'active' ? 'rgba(128,82,255,0.24)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.arc(node.x, node.y, pulse + (node.status === 'active' ? 6 : 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = window.setTimeout(draw, mobile ? 40 : 32);
    }

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(raf);
    };
  }, [seed, taskId, prompt, deadline, claimedAgents, status]);

  const activeCount = claimedAgents.length;
  const statusLabel = ['Open', 'Executing', 'Synthesizing', 'Complete', 'Failed'][status] ?? 'Open';

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-border-card bg-[radial-gradient(circle_at_center,rgba(128,82,255,0.12),rgba(0,0,0,0.92)_42%)]">
      <div className="grid lg:grid-cols-[260px_1fr_300px] gap-0 min-h-[560px]">
        <aside className="relative p-6 border-b lg:border-b-0 lg:border-r border-white/5">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Swarm</p>
            <h2 className="text-[28px] font-light leading-tight text-bone mt-1">Live constellation</h2>
            <p className="text-[13px] text-ash mt-2 max-w-[220px]">
              Agents light up as they claim work and move toward synthesis.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[12px] text-smoke">
              <span>Status</span>
              <span className="text-bone">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-smoke">
              <span>Active nodes</span>
              <span className="text-bone">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-smoke">
              <span>Claimed</span>
              <span className="text-bone">{claimedAgents.length}</span>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.08em] text-smoke mb-3">Claimed agents</p>
            <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
              {claimedAgents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-6 text-[13px] text-smoke">
                  No agents yet. The constellation is waiting.
                </div>
              ) : (
                claimedAgents.map((agent, index) => (
                  <div
                    key={agent}
                    className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 px-3 py-2"
                  >
                    <span
                    className={`h-2.5 w-2.5 rounded-full ${
                        index === 0 || status >= 2 ? 'bg-lichen' : 'bg-plum-voltage'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] text-bone font-mono truncate">{truncateAddress(agent, 8, 6)}</p>
                      <p className="text-[11px] text-smoke">Node {index + 1}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Swarm constellation" />
          <div className="absolute left-6 top-6 rounded-[24px] border border-white/8 bg-black/30 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Prompt</p>
            <p className="mt-1 max-w-[540px] text-[14px] text-bone leading-relaxed">{prompt}</p>
          </div>
        </div>

        <aside className="relative p-6 border-t lg:border-t-0 lg:border-l border-white/5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Task Pulse</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[12px] text-smoke mb-2">
              <span>Agents</span>
              <span>{claimedAgents.length}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
              <div
                className="h-full rounded-full bg-plum-voltage transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, claimedAgents.length * 18)}%` }}
              />
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-white/3 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Deadline</p>
            <p className="mt-2 text-[22px] font-light text-bone">{formatDeadline(deadline)}</p>
            <p className="mt-2 text-[13px] text-ash">
              Live updates reflect claim, submit, and synthesis events via the indexer.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/8 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Mode</p>
              <p className="mt-1 text-[13px] text-bone">{status >= 2 ? 'Consensus forming' : 'Gathering agents'}</p>
            </div>
            <div className="rounded-2xl border border-white/8 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-smoke">Visual</p>
              <p className="mt-1 text-[13px] text-bone">Particle constellation, deterministic seed</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
