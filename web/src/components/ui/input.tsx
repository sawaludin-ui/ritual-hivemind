import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium tracking-[0.05em] uppercase text-smoke">
          {label}
        </label>
      )}
      <input
        className={`bg-void border rounded-[12px] px-4 py-3 text-sm text-bone placeholder:text-smoke outline-none transition-colors duration-150 ${
          error ? 'border-swarm-fail' : 'border-border-card focus:border-plum-voltage'
        } focus:shadow-[0_0_0_1px_rgba(128,82,255,0.18)] ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-swarm-fail mt-0.5">{error}</span>}
    </div>
  );
}
