export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatEtherDisplay(wei: bigint | string): string {
  const val = typeof wei === "string" ? BigInt(wei) : wei;
  const eth = Number(val) / 1e18;
  if (eth >= 1) return eth.toFixed(eth > 100 ? 0 : eth > 10 ? 2 : 4);
  if (eth >= 0.001) return eth.toFixed(6);
  return `${(Number(val) / 1e14).toFixed(2)} gwei`;
}

export function formatRelativeTime(timestamp: bigint | number): string {
  const now = Math.floor(Date.now() / 1000);
  const t = Number(timestamp);
  const diff = t - now;
  if (diff < 0) return `${Math.abs(diff)}s ago`;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function normalizeTimestamp(timestamp: bigint | number): number {
  // Detect if timestamp is in ms (> 1e12) vs seconds (~1e9-1e10)
  const t = Number(timestamp);
  return t > 1000000000000 ? Math.floor(t / 1000) : t;
}

export function formatDeadline(timestamp: bigint | number): string {
  const t = normalizeTimestamp(timestamp);
  const diff = t - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Expired";
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return new Date(t * 1000).toLocaleDateString();
}

export function statusFromEnum(status: number): string {
  const labels = ["Open", "Executing", "Synthesizing", "Complete", "Failed"];
  return labels[status] ?? "Unknown";
}

export function statusVariant(status: number): "open" | "executing" | "complete" | "failed" | "idle" {
  const map = { 0: "open" as const, 1: "executing" as const, 2: "executing" as const, 3: "complete" as const, 4: "failed" as const };
  return map[status as keyof typeof map] ?? "idle";
}
