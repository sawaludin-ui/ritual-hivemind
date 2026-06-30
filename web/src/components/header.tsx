"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shuffle } from "@/components/shuffle";
import { MorphMenu } from "@/components/morph-menu";

const NAV_LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/markets/create", label: "Create" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/demo", label: "Demo" },
] as const;

/** Toned-down wallet button — minimal hairline pill, no flashy gradient. */
function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="h-9 px-4 inline-flex items-center text-sm tracking-nav text-ash rounded-full border border-white/[0.10] bg-transparent transition-colors duration-200 hover:text-bone hover:border-white/20"
                  >
                    Connect Wallet
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="h-9 px-4 inline-flex items-center text-sm tracking-nav text-swarm-fail rounded-full border border-hairline-fail bg-transparent transition-colors hover:bg-white/[0.04]"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="h-9 px-4 inline-flex items-center gap-2 text-sm tracking-nav text-ash rounded-full border border-white/[0.10] bg-transparent transition-colors duration-200 hover:text-bone hover:border-white/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-lichen" />
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const pathname = usePathname();

  // Match the most specific route first so /markets/create highlights
  // "Create", not "Markets". Order matters: check create before markets.
  const isActive = (href: string) => {
    if (href === "/markets/create") return pathname.startsWith("/markets/create");
    if (href === "/markets")
      return pathname.startsWith("/markets") && !pathname.startsWith("/markets/create");
    if (href === "/leaderboard") return pathname.startsWith("/leaderboard");
    if (href === "/demo") return pathname.startsWith("/demo");
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4">
      <nav className="relative mx-auto max-w-page h-14 flex items-center justify-between rounded-full border border-white/[0.08] bg-void/70 backdrop-blur-xl pl-4 pr-2 sm:pl-5 sm:pr-2.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="HIVEMIND home"
        >
          <Image
            src="/logo.jpg"
            alt="HIVEMIND"
            width={28}
            height={28}
            priority
            className="rounded-lg transition-transform duration-300 group-hover:scale-110"
          />
          <Shuffle
            text="HIVEMIND"
            className="text-xl text-bone tracking-tight-display"
          />
        </Link>

        {/* Right side — nav links + CTA grouped (desktop) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Nav links — desktop only (md+) */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full text-sm tracking-nav transition-colors duration-200 ${
                    active
                      ? "text-bone bg-white/[0.08]"
                      : "text-ash hover:text-bone"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet — desktop only (md+) */}
          <div className="hidden md:block">
            <WalletButton />
          </div>

          {/* Hamburger menu — mobile only (< md). Holds nav links + wallet. */}
          <div className="md:hidden">
            <MorphMenu panelClassName="w-56" ariaLabel="Open menu">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={`px-3 py-2 rounded-2xl text-base tracking-nav transition-colors ${
                        active
                          ? "text-bone bg-white/[0.06]"
                          : "text-ash hover:text-bone hover:bg-white/[0.04]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* Wallet inside menu — the header wallet is hidden on mobile,
                    so this is the only way to connect at this width. */}
                <div className="mt-1 pt-3 border-t border-white/[0.06]">
                  <WalletButton />
                </div>
              </div>
            </MorphMenu>
          </div>
        </div>
      </nav>
    </header>
  );
}
