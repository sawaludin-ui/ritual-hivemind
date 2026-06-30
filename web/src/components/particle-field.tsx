"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  shape: "circle" | "triangle" | "diamond" | "square";
  pulse: number;
  pulseSpeed: number;
}

const SHAPES: Particle["shape"][] = ["circle", "triangle", "diamond", "square"];
const COLORS = [
  { rgba: "128,82,255", weight: 0.5 }, // Plum Voltage (dominant)
  { rgba: "255,184,41", weight: 0.15 }, // Amber Spark
  { rgba: "21,132,110", weight: 0.15 }, // Lichen
  { rgba: "255,255,255", weight: 0.2 }, // Bone (rare)
];

function pickColor(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const c of COLORS) {
    cumulative += c.weight;
    if (r < cumulative) return c.rgba;
  }
  return COLORS[0].rgba;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: Particle[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 40 : 90;
    const connectionDist = isMobile ? 80 : 140;

    for (let i = 0; i < count; i++) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const size = 1.5 + Math.random() * 4;
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size,
        alpha: 0.2 + Math.random() * 0.5,
        color: pickColor(),
        shape,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.005 + Math.random() * 0.01,
      });
    }

    function drawShape(ctx: CanvasRenderingContext2D, shape: Particle["shape"], x: number, y: number, size: number) {
      ctx.beginPath();
      switch (shape) {
        case "circle":
          ctx.arc(x, y, size, 0, Math.PI * 2);
          break;
        case "triangle":
          ctx.moveTo(x, y - size);
          ctx.lineTo(x - size, y + size);
          ctx.lineTo(x + size, y + size);
          ctx.closePath();
          break;
        case "diamond":
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          break;
        case "square":
          ctx.rect(x - size, y - size, size * 2, size * 2);
          break;
      }
    }

    function animate() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Draw connections first (behind particles)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(128,82,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Mouse influence (subtle attraction)
      for (const p of particles) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (1 - dist / 150) * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Position update
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Pulse
        p.pulse += p.pulseSpeed;
        const pulseScale = 1 + Math.sin(p.pulse) * 0.15;
        const drawSize = p.size * pulseScale;

        // Draw particle
        ctx.globalAlpha = p.alpha;
        drawShape(ctx, p.shape, p.x, p.y, drawSize);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
