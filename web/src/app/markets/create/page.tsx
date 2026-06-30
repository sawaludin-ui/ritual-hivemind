"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useChainId } from "wagmi";
import { parseAbi } from "viem";
import { Button } from "@/components/ui/button";
import {
  PREDIX_MARKET_ADDRESS,
  PREDIX_MARKET_ABI,
} from "@/lib/predix-contracts";
import {
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle,
} from "@phosphor-icons/react";

export default function CreateMarketPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-24 pb-20 px-6">
        <div className="mx-auto max-w-page">
          <div className="h-80 rounded-3xl border border-white/[0.08] animate-pulse" />
        </div>
      </div>
    }>
      <CreateMarketPage />
    </Suspense>
  );
}

function CreateMarketPage() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending, isSuccess, error, data: txHash } = useWriteContract();

  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill from URL params (e.g. from match cards)
  useEffect(() => {
    const q = searchParams.get("question");
    const a = searchParams.get("optionA");
    const b = searchParams.get("optionB");
    if (q) setQuestion(q);
    if (a) setOptionA(a);
    if (b) setOptionB(b);
  }, [searchParams]);

  const isWrongChain = chainId !== 1979;

  // Convert datetime-local to unix timestamp (uint64)
  function getDeadlineUnix(): bigint {
    if (!deadline) return 0n;
    return BigInt(Math.floor(new Date(deadline).getTime() / 1000));
  }

  function validate(): string | null {
    if (!address) return "Connect your wallet first.";
    if (isWrongChain) return "Switch to Ritual Testnet (chain 1979) to create a market.";
    if (!question.trim()) return "Enter a question for your market.";
    if (!optionA.trim()) return "Enter Option A.";
    if (!optionB.trim()) return "Enter Option B.";
    if (optionA.trim() === optionB.trim()) return "Options must be different.";
    if (!deadline) return "Set a deadline.";
    const dl = getDeadlineUnix();
    if (dl <= BigInt(Math.floor(Date.now() / 1000))) return "Deadline must be in the future.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }

    try {
      await writeContractAsync({
        address: PREDIX_MARKET_ADDRESS,
        abi: PREDIX_MARKET_ABI,
        functionName: "createMarket",
        args: [question.trim(), optionA.trim(), optionB.trim(), getDeadlineUnix()],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      setSubmitError(msg);
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 animate-page-in">
      <div className="mx-auto max-w-page">
        {/* Back link */}
        <a
          href="/markets"
          className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
        >
          <ArrowLeft size={14} weight="light" />
          Back to markets
        </a>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs-3 text-plum-voltage uppercase tracking-caps mb-3">
            <Tag size={14} weight="light" />
            New Market
          </div>
          <h1 className="text-4xl text-bone tracking-tight-display mb-2">
            Create a Prediction Market
          </h1>
          <p className="text-base text-ash max-w-[520px] leading-relaxed">
            Define a question with two outcomes and set a deadline. Once created, anyone
            can bet on either side. You&apos;ll be able to resolve the market after the deadline.
          </p>
        </div>

        {/* Success state */}
        {isSuccess && txHash ? (
          <div className="max-w-[560px] p-8 rounded-3xl border border-lichen/30 bg-lichen/[0.04]">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={28} weight="fill" className="text-lichen" />
              <h2 className="text-2xl text-bone">Market Created!</h2>
            </div>
            <p className="text-base text-ash mb-4">
              Your market is live on Ritual testnet. Share it with the community!
            </p>
            <p className="text-xs text-smoke mb-6">
              Transaction: <span className="text-plum-voltage">{txHash.slice(0, 18)}...</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/markets">
                <Button variant="primary">View All Markets</Button>
              </a>
              <a href="/markets/create">
                <Button variant="ghost" onClick={() => {
                  setQuestion(""); setOptionA(""); setOptionB(""); setDeadline("");
                }}>
                  Create Another
                </Button>
              </a>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="max-w-[560px] flex flex-col gap-6">
            {/* Wallet warning */}
            {!address && (
              <div className="p-4 rounded-2xl border border-amber-spark/30 bg-amber-spark/[0.04] text-sm text-ash">
                ⚠️ Connect your wallet to create a market.
              </div>
            )}

            {/* Wrong chain warning */}
            {address && isWrongChain && (
              <div className="p-4 rounded-2xl border border-amber-spark/30 bg-amber-spark/[0.04] text-sm text-ash">
                ⚠️ Switch to Ritual Testnet (chain 1979) to create a market.
              </div>
            )}

            {/* Question */}
            <div>
              <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-2">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Will Argentina win World Cup 2026?"
                maxLength={200}
                className="w-full px-4 py-3 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-bone text-base placeholder:text-smoke/40 focus:border-plum-voltage/40 focus:outline-none transition-colors"
              />
              <p className="text-xs text-smoke mt-1">{question.length}/200</p>
            </div>

            {/* Option A */}
            <div>
              <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-2">
                Option A
              </label>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="e.g. Yes"
                maxLength={100}
                className="w-full px-4 py-3 rounded-3xl bg-plum-voltage/[0.04] border border-plum-voltage/20 text-bone text-base placeholder:text-smoke/40 focus:border-plum-voltage/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Option B */}
            <div>
              <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-2">
                Option B
              </label>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="e.g. No"
                maxLength={100}
                className="w-full px-4 py-3 rounded-3xl bg-amber-spark/[0.04] border border-amber-spark/20 text-bone text-base placeholder:text-smoke/40 focus:border-amber-spark/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="text-xs-3 text-smoke uppercase tracking-caps block mb-2">
                <Calendar size={12} weight="light" className="inline mr-1" />
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-bone text-base focus:border-plum-voltage/40 focus:outline-none transition-colors"
              />
              <p className="text-xs text-smoke mt-1">
                Market closes at this time. Resolution can be done after.
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <div className="p-4 rounded-2xl border border-swarm-fail/30 bg-swarm-fail/[0.04] text-sm text-swarm-fail">
                {submitError}
              </div>
            )}
            {error && (
              <div className="p-4 rounded-2xl border border-swarm-fail/30 bg-swarm-fail/[0.04] text-sm text-swarm-fail">
                {error.message}
              </div>
            )}

            {/* Submit */}
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!address || isPending}
                loading={isPending}
              >
                {isPending ? "Creating Market..." : "Create Market"}
              </Button>
              <p className="text-xs text-smoke mt-2">
                Gas paid in RITUAL on Ritual testnet (chain 1979).
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
