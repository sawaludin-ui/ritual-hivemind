"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(0,0,0,0.82)] backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-[var(--color-bone)] hover:text-[var(--color-plum-voltage)] transition-colors">
          HIVEMIND
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <Link href="/tasks" className="text-[var(--color-smoke)] hover:text-[var(--color-bone)] transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[var(--color-plum-voltage)] after:transition-all hover:after:w-6">Tasks</Link>
          <Link href="/agents" className="text-[var(--color-smoke)] hover:text-[var(--color-bone)] transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[var(--color-plum-voltage)] after:transition-all hover:after:w-6">Agents</Link>
          <Link href="/leaderboard" className="text-[var(--color-smoke)] hover:text-[var(--color-bone)] transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[var(--color-plum-voltage)] after:transition-all hover:after:w-6">Leaderboard</Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
