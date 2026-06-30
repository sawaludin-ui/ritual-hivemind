import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Markets",
    links: [
      { label: "Browse Markets", href: "/markets" },
      { label: "Create Market", href: "/markets/create" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "https://docs.ritual.net/" },
      { label: "GitHub", href: "https://github.com/sawaludin-ui/ritual-hivemind" },
      { label: "Ritual Network", href: "https://ritual.net" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "https://discord.gg/ritualnet" },
      { label: "Twitter", href: "https://twitter.com/ritual_net" },
      { label: "Blog", href: "https://medium.com/@ritualnet" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-void">
      <div className="mx-auto max-w-page px-6 py-60">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <svg width="24" height="24" viewBox="0 0 28 28" className="text-plum-voltage">
                <circle cx="6" cy="8" r="2" fill="currentColor" />
                <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
                <circle cx="22" cy="10" r="2" fill="currentColor" />
                <line x1="6" y1="8" x2="14" y2="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                <line x1="14" y1="5" x2="22" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
              </svg>
              <span className="text-2xl-2 text-bone tracking-tight-display">
                PREDIX
              </span>
            </div>
            <p className="text-base text-smoke leading-relaxed max-w-[280px]">
              Decentralized prediction market on Ritual. Bet on anything, on-chain.
            </p>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs-3 text-smoke uppercase tracking-caps mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-base text-ash hover:text-bone transition-colors duration-150 link-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-smoke tracking-body">
            Built on Ritual · chainId 1979
          </p>
          <p className="text-xs text-smoke">
            © 2026 PREDIX
          </p>
        </div>
      </div>
    </footer>
  );
}
