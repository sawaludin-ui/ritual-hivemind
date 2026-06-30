import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ParticleField } from "@/components/particle-field";

const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="en" className={`${sans.variable} ${mono.variable} dark`}>
      <body className="bg-void text-bone font-sans antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <ParticleField />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Header />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
