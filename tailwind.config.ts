import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Gold
        primary: {
          DEFAULT: "#FBDC7B",
          glow: "#FDE9A0",
          dark: "#D4B85A",
          muted: "rgba(251, 220, 123, 0.15)",
        },
        // Backgrounds
        bg: {
          base: "#050508",
          raised: "#0D0D12",
          elevated: "#141419",
          surface: "#1A1A21",
          hover: "#22222B",
          active: "#2A2A35",
        },
        // Semantic
        success: {
          DEFAULT: "#00D4AA",
          muted: "rgba(0, 212, 170, 0.15)",
        },
        error: {
          DEFAULT: "#FF4757",
          muted: "rgba(255, 71, 87, 0.15)",
        },
        warning: {
          DEFAULT: "#FFB347",
          muted: "rgba(255, 179, 71, 0.15)",
        },
        info: {
          DEFAULT: "#4A9FFF",
          muted: "rgba(74, 159, 255, 0.15)",
        },
        // Text - Warm cream tones for legibility on dark backgrounds
        text: {
          primary: "#F5F5F0",      // Warm white (slight cream)
          secondary: "#D4CFC5",    // Light cream - readable descriptions
          tertiary: "#A8A299",     // Medium warm gray - placeholders
          muted: "#7D786F",        // Dark warm gray - subtle text
        },
        // Borders
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          hover: "rgba(255, 255, 255, 0.1)",
          focus: "rgba(251, 220, 123, 0.5)",
        },
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
        DEFAULT: "0 4px 12px rgba(0, 0, 0, 0.4)",
        md: "0 4px 12px rgba(0, 0, 0, 0.4)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.6)",
        glow: "0 0 40px rgba(251, 220, 123, 0.15)",
        "glow-lg": "0 0 80px rgba(251, 220, 123, 0.2)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        fast: "100ms",
        normal: "200ms",
        slow: "300ms",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
        "slide-down": "slideDown 200ms ease-out",
        "scale-in": "scaleIn 200ms ease-out",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
