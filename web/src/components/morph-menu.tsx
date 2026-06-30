"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MorphMenu — hamburger (three lines) that morphs DOWNWARD into a rounded
 * panel (Transitions.dev "plus to menu morph" pattern, adapted to open below).
 * The trigger icon cross-fades from three-lines to an X.
 * Outside-click / Escape close it.
 *
 * `panelClassName` lets the caller size the open panel.
 */
type MorphMenuProps = {
  children: React.ReactNode;
  panelClassName?: string;
  ariaLabel?: string;
};

export function MorphMenu({
  children,
  panelClassName = "",
  ariaLabel = "Open menu",
}: MorphMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" data-open={open ? "true" : "false"}>
      {/* Trigger */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-bone transition-colors hover:bg-white/[0.06]"
      >
        <span className="morph-burger" data-open={open ? "true" : "false"}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {/* Panel — opens downward */}
      <div
        role="menu"
        className={`morph-panel absolute right-0 top-12 origin-top-right overflow-hidden rounded-3xl border border-white/[0.08] bg-void/95 backdrop-blur-xl ${panelClassName}`}
        data-open={open ? "true" : "false"}
      >
        <div className="p-4">{children}</div>
      </div>

      <style jsx>{`
        /* burger -> X morph */
        .morph-burger {
          position: relative;
          display: inline-block;
          width: 20px;
          height: 14px;
        }
        .morph-burger span {
          position: absolute;
          left: 0;
          height: 1.75px;
          width: 100%;
          background: currentColor;
          border-radius: 2px;
          transition: transform 300ms cubic-bezier(0.34, 1.25, 0.64, 1),
            opacity 200ms ease;
        }
        .morph-burger span:nth-child(1) {
          top: 0;
        }
        .morph-burger span:nth-child(2) {
          top: 50%;
          transform: translateY(-50%);
        }
        .morph-burger span:nth-child(3) {
          bottom: 0;
        }
        .morph-burger[data-open="true"] span:nth-child(1) {
          top: 50%;
          transform: translateY(-50%) rotate(45deg);
        }
        .morph-burger[data-open="true"] span:nth-child(2) {
          opacity: 0;
        }
        .morph-burger[data-open="true"] span:nth-child(3) {
          bottom: 50%;
          transform: translateY(50%) rotate(-45deg);
        }

        /* panel morph (grow downward) */
        .morph-panel {
          opacity: 0;
          transform: translateY(-8px) scale(0.96);
          filter: blur(2px);
          pointer-events: none;
          transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 350ms cubic-bezier(0.34, 1.25, 0.64, 1),
            filter 200ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .morph-panel[data-open="true"] {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .morph-burger span,
          .morph-panel {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
