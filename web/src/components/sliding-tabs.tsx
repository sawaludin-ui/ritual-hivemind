"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * SlidingTabs — pill that slides between tabs (Transitions.dev pattern),
 * adapted to the Hivemind design system (plum-voltage pill on void).
 * Used for the centered primary nav. Active tab is driven by route.
 */
type Tab = { href: string; label: string };

type SlidingTabsProps = {
  tabs: Tab[];
  activeIndex: number;
};

export function SlidingTabs({ tabs, activeIndex }: SlidingTabsProps) {
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const moveTo = (idx: number, animate: boolean) => {
    const pill = pillRef.current;
    if (!pill) return;

    // No active tab (e.g. homepage) → hide the pill entirely.
    if (idx < 0) {
      pill.style.opacity = "0";
      pill.style.width = "0px";
      return;
    }

    const tab = tabRefs.current[idx];
    if (!tab) return;
    pill.style.opacity = "1";
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${left}px)`;
      pill.style.width = `${width}px`;
    }
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(() => moveTo(activeIndex, true));
    const onResize = () => moveTo(activeIndex, false);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div
      className="relative inline-flex items-center gap-1 p-1 rounded-full border border-white/[0.06] bg-white/[0.03]"
      role="tablist"
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="absolute top-1 left-0 h-8 w-0 rounded-full bg-plum-voltage pointer-events-none shadow-[0_0_20px_-4px_rgba(128,82,255,0.55)]"
        style={{
          transform: "translateX(0)",
          transition:
            "transform 420ms cubic-bezier(0.34,1.4,0.4,1), width 420ms cubic-bezier(0.34,1.4,0.4,1), opacity 260ms ease",
          willChange: "transform, width",
          zIndex: 0,
        }}
      />
      {tabs.map((tab, i) => (
        <Link
          key={tab.href}
          href={tab.href}
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          role="tab"
          aria-selected={i === activeIndex}
          className={`relative z-[1] h-8 px-4 inline-flex items-center text-sm tracking-nav rounded-full transition-colors duration-300 ${
            i === activeIndex ? "text-bone" : "text-smoke hover:text-bone"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
