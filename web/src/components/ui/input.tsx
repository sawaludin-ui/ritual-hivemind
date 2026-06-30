import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium tracking-[0.08em] uppercase text-smoke">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "bg-void border rounded-input px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors duration-150",
          error
            ? "border-swarm-fail"
            : "border-border-card focus:border-plum-voltage",
          className,
        )}
        {...props}
      />
      {error && <span className="text-[11px] text-swarm-fail mt-0.5">{error}</span>}
    </div>
  );
}

export default Input;
