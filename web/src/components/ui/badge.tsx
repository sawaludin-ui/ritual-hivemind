interface BadgeProps {
  variant: "open" | "executing" | "complete" | "failed" | "idle" | "active" | "gold";
  children: React.ReactNode;
}

const styles: Record<string, string> = {
  open: "border border-[var(--color-plum-voltage)] text-[var(--color-plum-voltage)]",
  executing: "bg-[var(--color-swarm-active)]/10 text-[var(--color-swarm-active)]",
  complete: "bg-[var(--color-lichen)]/10 text-[var(--color-lichen)]",
  failed: "bg-[var(--color-swarm-fail)]/10 text-[var(--color-swarm-fail)]",
  idle: "bg-[var(--color-swarm-idle)]/10 text-[var(--color-smoke)]",
  active: "bg-[var(--color-plum-voltage)]/10 text-[var(--color-plum-voltage)]",
  gold: "text-[var(--color-reputation-gold)] bg-[var(--color-reputation-gold)]/10",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-0.5 text-xs font-medium rounded-[24px] transition-transform duration-150 hover:scale-[1.02] ${styles[variant] ?? ""}`}>
      {children}
    </span>
  );
}
