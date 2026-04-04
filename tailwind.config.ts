import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ═══ Aura Design Tokens — @visual-designer (Pixel) + @ux-design-expert (Uma) ═══
      // Benchmark: Linear (#08090a), Vercel/Geist (white-alpha borders), Raycast (blur+glow),
      //            shadcn (#09090b canonical dark, zinc neutral scale)
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Surface tokens — 4-layer elevation system (CSS variables are canonical)
        // L0: background (#09090b) | L1: surface (#111113) | L2: raised (#18181b) | L3: overlay (#27272a)
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          subtle: "var(--surface-subtle)",
        },

        // Border tokens — white-alpha system (Vercel pattern)
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          focus: "var(--border-focus)",
        },

        // Typography tokens
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },

        // Accent tokens
        accent: {
          DEFAULT: "var(--accent)",
          indigo: "var(--accent-indigo)",
        },

        // MATED Zone tokens — semanticos para PM/PO
        zona: {
          otimo: {
            DEFAULT: "#10b981", // emerald-500
            bg: "#10b98110",    // emerald-500/6
            border: "#10b98130", // emerald-500/19
            text: "#34d399",    // emerald-400
          },
          seguro: {
            DEFAULT: "#3b82f6", // blue-500
            bg: "#3b82f610",
            border: "#3b82f630",
            text: "#60a5fa",    // blue-400
          },
          risco: {
            DEFAULT: "#f59e0b", // amber-500
            bg: "#f59e0b10",
            border: "#f59e0b30",
            text: "#fbbf24",    // amber-400
          },
          crise: {
            DEFAULT: "#f43f5e", // rose-500
            bg: "#f43f5e10",
            border: "#f43f5e30",
            text: "#fb7185",    // rose-400
          },
        },

        // Klauss IA
        klauss: {
          DEFAULT: "#6366f1",   // indigo-500
          bg: "#6366f108",
          border: "#6366f130",
          text: "#818cf8",      // indigo-400
        },

        // CDT Dimensions
        cdt: {
          escopo: "#3b82f6",    // blue-500
          custo: "#10b981",     // emerald-500
          prazo: "#f59e0b",     // amber-500
        },
      },

      // Typography scale — Inter-like (4px base)
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],   // 10px
        "xs": ["0.75rem", { lineHeight: "1rem" }],          // 12px
        "sm": ["0.875rem", { lineHeight: "1.25rem" }],      // 14px
        "base": ["1rem", { lineHeight: "1.5rem" }],         // 16px
        "lg": ["1.125rem", { lineHeight: "1.75rem" }],      // 18px
        "xl": ["1.25rem", { lineHeight: "1.75rem" }],       // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }],          // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],     // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],       // 36px
        "metric": ["2.5rem", { lineHeight: "2.75rem", fontWeight: "700" }], // 40px — KPIs
      },

      // Spacing — 4px grid
      spacing: {
        "0.5": "0.125rem",   // 2px
        "1": "0.25rem",      // 4px
        "1.5": "0.375rem",   // 6px
        "2": "0.5rem",       // 8px
        "3": "0.75rem",      // 12px
        "4": "1rem",         // 16px
        "5": "1.25rem",      // 20px
        "6": "1.5rem",       // 24px
        "8": "2rem",         // 32px
        "10": "2.5rem",      // 40px
        "12": "3rem",        // 48px
        "16": "4rem",        // 64px
        "20": "5rem",        // 80px
      },

      // Border radius — Aura rounded style
      borderRadius: {
        "sm": "0.375rem",    // 6px
        "md": "0.5rem",      // 8px
        "lg": "0.75rem",     // 12px
        "xl": "1rem",        // 16px
        "2xl": "1.25rem",    // 20px — cards
        "3xl": "1.5rem",     // 24px — modals
        "full": "9999px",
      },

      // Shadows — layered depth system (CSS-var delegates to theme)
      boxShadow: {
        // Glow halos — zone-colored ambient light (Raycast pattern, 40+80px radii)
        "glow-emerald": "0 0 40px rgba(16,185,129,0.10), 0 0 80px rgba(16,185,129,0.05)",
        "glow-blue":    "0 0 40px rgba(59,130,246,0.10),  0 0 80px rgba(59,130,246,0.05)",
        "glow-amber":   "0 0 40px rgba(245,158,11,0.10),  0 0 80px rgba(245,158,11,0.05)",
        "glow-rose":    "0 0 40px rgba(244,63,94,0.10),   0 0 80px rgba(244,63,94,0.05)",
        "glow-indigo":  "0 0 40px rgba(99,102,241,0.10),  0 0 80px rgba(99,102,241,0.05)",
        // Elevation shadows — dark-optimized (deep blacks, no color contamination)
        "card":         "0 1px 3px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.30)",
        "card-hover":   "0 4px 16px rgba(0,0,0,0.60), 0 2px 6px rgba(0,0,0,0.40)",
        "modal":        "0 24px 64px rgba(0,0,0,0.70), 0 8px 24px rgba(0,0,0,0.50)",
        "dropdown":     "0 8px 24px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)",
      },

      // Animations
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
        "shrink-width": "shrinkWidth 5s linear forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(99,102,241,0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(99,102,241,0.2)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shrinkWidth: {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
      },

      // Backdrop blur
      backdropBlur: {
        "xs": "2px",
        "sm": "4px",
        "md": "8px",
        "lg": "16px",
      },
    },
  },
  plugins: [],
};
export default config;
