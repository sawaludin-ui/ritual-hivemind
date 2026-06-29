import { http, createConfig } from "wagmi";
import { type Chain } from "viem";
import { QueryClient } from "@tanstack/react-query";

export const ritualTestnet = {
  id: 1979,
  name: "Ritual Testnet",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ritualfoundation.org"] },
  },
  blockExplorers: {
    default: { name: "Ritual Explorer", url: "https://explorer.ritualfoundation.org" },
  },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = createConfig({
  chains: [ritualTestnet],
  transports: {
    [ritualTestnet.id]: http(),
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 2 },
  },
});

// Backend API (indexer + database)
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
