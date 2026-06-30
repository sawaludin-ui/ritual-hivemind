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
        "border rounded-3xl p-6 transition-all duration-150 ease-out",
        hover && "hover:-translate-y-0.5 hover:border-white/[0.12]",
        active ? "border-plum-voltage/30" : "border-white/[0.08]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Card;
