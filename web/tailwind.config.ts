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
      },
      fontFamily: {
        sans: ['Satoshi', 'Acronym', 'system-ui', 'sans-serif'],
        acronym: ['Satoshi', 'Acronym', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Exact from tokens JSON
        "xs": ["12px", { lineHeight: "1.5", fontWeight: "400" }],
        "xs-2": ["12px", { lineHeight: "1", fontWeight: "600" }],
        "xs-3": ["12px", { lineHeight: "1.2", fontWeight: "600" }],
        "sm": ["14px", { lineHeight: "1.2", fontWeight: "600" }],
        base: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "base-2": ["15px", { lineHeight: "1.5", fontWeight: "600" }],
        lg: ["18px", { lineHeight: "1.5", fontWeight: "200" }],
        "lg-2": ["18px", { lineHeight: "1.5", fontWeight: "400" }],
        "2xl": ["24px", { lineHeight: "1.5", fontWeight: "700" }],
        "2xl-2": ["24px", { lineHeight: "1.25", fontWeight: "400" }],
        "2xl-3": ["27px", { lineHeight: "1", fontWeight: "400" }],
        "4xl": ["36px", { lineHeight: "1.2", fontWeight: "400" }],
        "4xl-2": ["42px", { lineHeight: "1.2", fontWeight: "400" }],
        "5xl": ["48px", { lineHeight: "1.1", fontWeight: "400" }],
        "5xl-2": ["78px", { lineHeight: "1.1", fontWeight: "400" }],
        "5xl-3": ["78px", { lineHeight: "0.9", fontWeight: "400" }],
        "5xl-4": ["113px", { lineHeight: "1.1", fontWeight: "400" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        body: "0.021em",
        nav: "0.021em",
        wide: "0.05em",
        caps: "0.08em",
      },
      borderRadius: {
        "3xl": "24px",
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
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.98)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.5" },
        },
        softPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
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
