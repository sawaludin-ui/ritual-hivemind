"use client";

import { motion } from "framer-motion";

/**
 * SplitText — per-character entrance animation.
 *
 * Visual parity with React Bits <SplitText/> (chars fade + slide up, staggered),
 * but built on framer-motion (already in this project) instead of GSAP SplitText,
 * which is a paid GreenSock Club plugin. No premium dep, no build risk.
 */
type SplitTextProps = {
  text: string;
  className?: string;
  /** stagger between chars, ms */
  delay?: number;
  /** start delay before first char, ms */
  startDelay?: number;
  /** duration per char, seconds */
  duration?: number;
  /** px the char travels up from */
  y?: number;
  onComplete?: () => void;
};

export function SplitText({
  text,
  className = "",
  delay = 45,
  startDelay = 0,
  duration = 0.6,
  y = 40,
  onComplete,
}: SplitTextProps) {
  const chars = Array.from(text);

  return (
    <span
      className={className}
      style={{ display: "inline-block", overflow: "hidden", whiteSpace: "pre" }}
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden="true"
          style={{ display: "inline-block", willChange: "transform, opacity" }}
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration,
            delay: startDelay / 1000 + (i * delay) / 1000,
            ease: [0.16, 1, 0.3, 1], // power3.out-ish
          }}
          onAnimationComplete={
            i === chars.length - 1 ? onComplete : undefined
          }
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}
