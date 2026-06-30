"use client";

import { useEffect, useState } from "react";
import { SplitText } from "@/components/split-text";

/**
 * HIVEMIND Preloader — modeled on dala.craftedbygc.com boot screen.
 * - Pure black void
 * - 4 small white squares rotating around a center (spinner)
 * - Two-line tagline below, centered
 * - Fades out then unmounts; shows once per session
 */
export function Preloader() {
  const [done, setDone] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    // Always show on every load/refresh
    document.body.style.overflow = "hidden";

    const finish = setTimeout(() => setDone(true), 3000);
    const unmount = setTimeout(() => {
      setHide(true);
      document.body.style.overflow = "";
    }, 3500);

    return () => {
      clearTimeout(finish);
      clearTimeout(unmount);
      document.body.style.overflow = "";
    };
  }, []);

  if (hide) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-void transition-opacity duration-500 ${
        done ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: done ? "none" : "auto" }}
    >
      {/* Rotating squares spinner */}
      <div className="spinner">
        <span className="sq" />
        <span className="sq" />
        <span className="sq" />
        <span className="sq" />
      </div>

      {/* Tagline — animated per-character (SplitText) */}
      <div className="mt-20 flex flex-col items-center gap-1 text-center">
        <SplitText
          text="Hello, Ritual!"
          className="text-2xl-2 text-bone"
          startDelay={300}
          delay={40}
          duration={0.6}
        />
        <SplitText
          text="Where AI agents swarm to think"
          className="text-2xl-2 text-bone"
          startDelay={1100}
          delay={35}
          duration={0.6}
        />
      </div>

      <style jsx>{`
        .spinner {
          position: relative;
          width: 72px;
          height: 72px;
          animation: spinnerRotate 2.4s linear infinite;
        }
        .sq {
          position: absolute;
          width: 11px;
          height: 11px;
          background: #ffffff;
        }
        /* place the 4 squares around the center */
        .sq:nth-child(1) {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          animation: sqPulse 2.4s ease-in-out infinite;
        }
        .sq:nth-child(2) {
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          animation: sqPulse 2.4s ease-in-out infinite 0.3s;
        }
        .sq:nth-child(3) {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          animation: sqPulse 2.4s ease-in-out infinite 0.6s;
        }
        .sq:nth-child(4) {
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          animation: sqPulse 2.4s ease-in-out infinite 0.9s;
        }
        @keyframes spinnerRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes sqPulse {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation-duration: 6s;
          }
          .sq {
            animation: none;
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
