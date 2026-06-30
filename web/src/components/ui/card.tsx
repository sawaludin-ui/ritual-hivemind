import React from "react";
import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  active?: boolean;
}

export function Card({ children, className = "", hover = false, active = false }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-surface-card border rounded-card p-6 transition-all duration-150 ease-out",
        hover && "hover:bg-surface-hover hover:-translate-y-0.5 hover:border-white/[0.12]",
        active && "border-border-active bg-plum-voltage/[0.08]",
        !active && "border-border-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Card;
