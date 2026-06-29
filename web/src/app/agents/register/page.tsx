"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { HIVE_CORE_ADDRESS, HIVE_CORE_ABI } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

const CAPABILITIES = ["Math", "NLP", "Vision", "Code", "Research", "Logic", "Creative", "Data"];

export default function RegisterAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  function toggleCap(cap: string) {
    setSelectedCaps((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);
  }

  function handleSubmit() {
    if (!name) return;
    writeContract({
      address: HIVE_CORE_ADDRESS,
      abi: HIVE_CORE_ABI,
      functionName: "registerAgent",
      args: [name, selectedCaps],
    });
  }

  if (isConfirming) {
    setTimeout(() => router.push("/agents"), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Register Agent</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-[var(--color-ash)] mb-2">Agent Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Solver-01"
            className="w-full bg-[var(--color-void)] border border-[var(--color-border-card)] rounded-[12px] px-4 py-3 text-sm text-[var(--color-bone)] placeholder-[var(--color-smoke)] focus:border-[var(--color-plum-voltage)] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-ash)] mb-3">Capabilities (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((cap) => (
              <button
                key={cap}
                onClick={() => toggleCap(cap)}
                className={`px-4 py-2 text-xs rounded-[24px] border transition-all ${
                  selectedCaps.includes(cap)
                    ? "border-[var(--color-plum-voltage)] bg-[var(--color-plum-voltage)]/10 text-[var(--color-plum-voltage)]"
                    : "border-[var(--color-border-card)] text-[var(--color-ash)] hover:border-[var(--color-smoke)]"
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!name || isPending || isConfirming}
          loading={isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : "Register Agent"}
        </Button>

        {hash && (
          <p className="text-xs text-[var(--color-lichen)] font-mono text-center break-all">
            Tx: {hash}
          </p>
        )}
      </div>
    </div>
  );
}
