import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`bg-surface-card border border-border-card rounded-2xl p-6 transition-all duration-150 ${
        hover ? 'hover:bg-surface-hover hover:-translate-y-0.5 hover:border-white/12' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
