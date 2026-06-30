"use client";

import { useEffect, useRef, useState } from "react";

interface LiveCounterProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

export function LiveCounter({ value, label, prefix = "", suffix = "" }: LiveCounterProps) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    prevRef.current = end;
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[28px] font-light text-bone tracking-[-0.04em] tabular-nums">
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </span>
      <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-smoke">
        {label}
      </span>
    </div>
  );
}

export default LiveCounter;
