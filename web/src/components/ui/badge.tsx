import { clsx } from "clsx";

type BadgeVariant =
  | "open"
  | "executing"
  | "complete"
  | "failed"
  | "idle"
  | "active"
  | "gold";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
}

const styles: Record<BadgeVariant, string> = {
  open: "border border-plum-voltage/40 text-plum-voltage bg-transparent",
  executing: "bg-plum-voltage/15 text-plum-voltage",
  complete: "bg-lichen/15 text-lichen",
  failed: "bg-swarm-fail/15 text-swarm-fail",
  idle: "bg-transparent text-smoke border border-white/[0.08]",
  active: "bg-plum-voltage/15 text-plum-voltage",
  gold: "text-amber-spark bg-amber-spark/10",
};

export function Badge({ variant, children, pulse = false }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium tracking-[0.021em] rounded-pill transition-transform duration-150",
        styles[variant],
      )}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {children}
    </span>
  );
}