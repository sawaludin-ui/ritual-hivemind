"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Shuffle — per-character scramble-reveal text.
 *
 * Visual parity with React Bits <Shuffle/>: each letter rolls through a few
 * scrambled glyphs before settling on the final char, staggered evenodd.
 * Built without GSAP SplitText (a paid GreenSock Club plugin) — pure React
 * timers, so no premium dep and no build risk. Replays on hover.
 */
type ShuffleProps = {
  text: string;
  className?: string;
  /** stagger between letters, ms */
  stagger?: number;
  /** how long each letter scrambles before settling, ms */
  scrambleDuration?: number;
  /** ms between scramble frames */
  frameInterval?: number;
  triggerOnHover?: boolean;
};

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#@%&";

export function Shuffle({
  text,
  className = "",
  stagger = 45,
  scrambleDuration = 350,
  frameInterval = 45,
  triggerOnHover = true,
}: ShuffleProps) {
  const [display, setDisplay] = useState<string[]>(() => text.split(""));
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runningRef = useRef(false);

  const clearAll = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timeoutsRef.current.forEach(clearTimeout);
    timersRef.current = [];
    timeoutsRef.current = [];
  }, []);

  const run = useCallback(() => {
    if (runningRef.current) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(text.split(""));
      return;
    }

    runningRef.current = true;
    clearAll();
    const chars = text.split("");

    chars.forEach((finalChar, i) => {
      // spaces stay put
      if (finalChar === " ") return;

      const startDelay = i * stagger;
      const startTo = setTimeout(() => {
        const interval = setInterval(() => {
          setDisplay((prev) => {
            const next = [...prev];
            next[i] = CHARSET[Math.floor(Math.random() * CHARSET.length)];
            return next;
          });
        }, frameInterval);
        timersRef.current.push(interval);

        const settle = setTimeout(() => {
          clearInterval(interval);
          setDisplay((prev) => {
            const next = [...prev];
            next[i] = finalChar;
            return next;
          });
          if (i === chars.length - 1) runningRef.current = false;
        }, scrambleDuration);
        timeoutsRef.current.push(settle);
      }, startDelay);
      timeoutsRef.current.push(startTo);
    });
  }, [text, stagger, scrambleDuration, frameInterval, clearAll]);

  // Run once on mount
  useEffect(() => {
    run();
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className={className}
      style={{ display: "inline-block", whiteSpace: "pre" }}
      aria-label={text}
      onMouseEnter={triggerOnHover ? run : undefined}
    >
      {display.map((ch, i) => (
        <span key={i} aria-hidden="true" style={{ display: "inline-block" }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
