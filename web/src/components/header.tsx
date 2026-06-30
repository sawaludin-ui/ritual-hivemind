"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { List, X } from "@phosphor-icons/react";

const NAV_LINKS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/tasks") return pathname.startsWith("/tasks");
    if (href === "/agents") return pathname.startsWith("/agents");
    if (href === "/leaderboard") return pathname.startsWith("/leaderboard");
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-void/80 backdrop-blur-xl border-b border-white/[0.06]">
      <nav className="mx-auto max-w-page px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="HIVEMIND home">
          <svg width="28" height="28" viewBox="0 0 28 28" className="text-plum-voltage transition-transform duration-300 group-hover:scale-110">
            <circle cx="6" cy="8" r="2" fill="currentColor" />
            <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
            <circle cx="22" cy="10" r="2" fill="currentColor" />
            <circle cx="10" cy="18" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.7" />
            <line x1="6" y1="8" x2="14" y2="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1="14" y1="5" x2="22" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1="6" y1="8" x2="10" y2="18" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="22" y1="10" x2="20" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="10" y1="18" x2="20" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          </svg>
          <span className="text-2xl-2 text-bone tracking-tight-display">
            HIVEMIND
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-sm tracking-nav transition-colors duration-150 ${
                isActive(link.href)
                  ? "text-bone"
                  : "text-smoke hover:text-bone"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 w-6 h-[2px] bg-plum-voltage rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* Right: Wallet + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus="avatar"
            />
          </div>
          <button
            className="md:hidden text-bone p-2 -mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} weight="light" /> : <List size={24} weight="light" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-void/95 backdrop-blur-xl border-b border-white/[0.06] animate-fade-in">
          <div className="px-6 py-6 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base tracking-nav transition-colors ${
                  isActive(link.href) ? "text-plum-voltage" : "text-ash hover:text-bone"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/[0.06]">
              <ConnectButton
                chainStatus="icon"
                showBalance={false}
                accountStatus="avatar"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
