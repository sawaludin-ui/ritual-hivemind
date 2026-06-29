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
        sans: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
