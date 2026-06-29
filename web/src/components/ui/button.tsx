import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--color-plum-voltage)] text-white hover:brightness-110 active:brightness-95",
    outline: "border border-[var(--color-plum-voltage)] text-[var(--color-plum-voltage)] bg-transparent hover:bg-[var(--color-plum-voltage)]/10",
    ghost: "bg-transparent text-[var(--color-ash)] hover:text-[var(--color-bone)] hover:bg-[var(--color-surface-hover)]",
    danger: "bg-transparent border border-[var(--color-swarm-fail)] text-[var(--color-swarm-fail)] hover:bg-[var(--color-swarm-fail)]/10",
  };
  const sizes = { sm: "px-4 py-1.5 text-xs", md: "px-6 py-2 text-sm", lg: "px-8 py-3 text-base" };
  const radius = "rounded-[24px]";

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${radius} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : null}
      {children}
    </button>
  );
}
