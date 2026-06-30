import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        bone: "#ffffff",
        ash: "#bdbdbd",
        smoke: "#9a9a9a",
        "plum-voltage": "#8052ff",
        "amber-spark": "#ffb829",
        lichen: "#15846e",
        "swarm-active": "#8052ff",
        "swarm-idle": "#3a3a3a",
        "swarm-success": "#15846e",
        "swarm-fail": "#ff4444",
        bounty: "#ffb829",
        "reputation-gold": "#ffb829",
        "surface-card": "rgba(255,255,255,0.03)",
        "surface-hover": "rgba(255,255,255,0.06)",
        "border-card": "rgba(255,255,255,0.08)",
        "border-active": "rgba(128,82,255,0.30)",
      },
      fontFamily: {
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        hero: ["72px", { lineHeight: "0.9", letterSpacing: "-0.04em", fontWeight: "300" }],
        display: ["48px", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "300" }],
        "heading-lg": ["36px", { lineHeight: "1.1", fontWeight: "500" }],
        heading: ["24px", { lineHeight: "1.2", fontWeight: "500" }],
        "heading-sm": ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        subheading: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        mono: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "mono-sm": ["11px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      borderRadius: {
        pill: "24px",
        card: "16px",
        input: "12px",
        tooltip: "8px",
      },
      spacing: {
        18: "18px",
        30: "30px",
        60: "60px",
        96: "96px",
        120: "120px",
      },
      maxWidth: {
        page: "1400px",
        content: "680px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "300ms",
        slow: "600ms",
        swarm: "800ms",
      },
      transitionTimingFunction: {
        smooth: "ease-out",
        swarm: "ease-in-out",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        softPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        scaleIn: {
          from: { transform: "scale(0.98)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "page-in": "fadeUp 400ms ease-out both",
        "fade-in": "fadeIn 400ms ease-out both",
        "scale-in": "scaleIn 300ms ease-out both",
        "soft-pulse": "softPulse 2s ease-in-out infinite",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
