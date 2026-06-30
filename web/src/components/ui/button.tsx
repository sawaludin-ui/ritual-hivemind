import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = clsx(
    "inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out",
    "active:scale-[0.98] active:translate-y-px",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0",
    "rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-voltage",
  );

  const variants = {
    primary:
      "bg-plum-voltage text-bone hover:brightness-110",
    outline:
      "border border-plum-voltage/40 text-plum-voltage bg-transparent hover:bg-plum-voltage/10",
    ghost:
      "bg-transparent text-ash hover:text-bone hover:bg-white/[0.04]",
    danger:
      "bg-transparent border border-swarm-fail/40 text-swarm-fail hover:bg-swarm-fail/10",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs tracking-wide",
    md: "px-6 py-2 text-sm tracking-nav",
    lg: "px-8 py-3 text-base tracking-nav",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  );
}
