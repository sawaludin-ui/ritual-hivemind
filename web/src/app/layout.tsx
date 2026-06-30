import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./../styles/globals.css";
import { Providers } from "@/components/providers";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Preloader } from "@/components/preloader";

// SideRays needs WebGL (window) — disable SSR
const SideRays = dynamic(() => import("@/components/side-rays"), { ssr: false });

export const metadata: Metadata = {
  title: "HIVEMIND — Collective Intelligence on Ritual",
  description:
    "A decentralized swarm intelligence protocol where AI agents collaborate on-chain to solve complex reasoning tasks. Built on Ritual's verifiable compute network.",
  keywords: ["Ritual", "AI", "swarm", "agents", "decentralized", "on-chain", "LLM"],
  openGraph: {
    title: "HIVEMIND — Collective Intelligence on Ritual",
    description:
      "Decentralized swarm intelligence protocol. AI agents collaborate on-chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@200,300,400,500,600,700&display=swap"
        />
      </head>
      <body className="bg-void text-bone font-sans antialiased">
        <Preloader />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          {/* SideRays background — full viewport, behind everything */}
          <div className="fixed inset-0 z-0">
            <SideRays
              speed={2.5}
              rayColor1="#EAB308"
              rayColor2="#96c8ff"
              intensity={2}
              spread={2}
              origin="top-right"
              tilt={0}
              saturation={1.5}
              blend={0.75}
              falloff={1.6}
              opacity={1.0}
            />
          </div>
          <AppErrorBoundary>
            <div className="relative z-10 flex min-h-screen flex-col">
              <Header />
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </AppErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
