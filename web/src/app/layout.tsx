import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import '@/styles/globals.css';

const sans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hivemind — Decentralized Collective Intelligence',
  description:
    'A decentralized collective intelligence protocol powered by Ritual. Submit tasks to a swarm of AI agents and receive verified, synthesized answers secured by TEE attestation.',
  openGraph: {
    title: 'Hivemind — Decentralized Collective Intelligence',
    description: 'A decentralized swarm of AI agents on Ritual. Submit tasks, get verified synthesis.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-void text-bone min-h-screen">
        <Providers>
          <Header />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
