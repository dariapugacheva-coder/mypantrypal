import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./demo/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        ice: token("ice"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        mint: { DEFAULT: token("mint"), strong: token("mint-strong"), ink: token("mint-ink"), soft: token("mint-soft"), on: token("on-mint") },
        danger: { DEFAULT: token("red"), ink: token("red-ink"), soft: token("red-soft") },
        sun: { DEFAULT: token("sun"), soft: token("sun-soft"), ink: token("sun-ink") },
        sky: { soft: token("sky-soft"), ink: token("sky-ink") }
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 16px rgb(var(--shadow) / 0.06)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.08), 0 12px 32px rgb(var(--shadow) / 0.10)"
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        rise: { "0%": { transform: "translateY(6px)", opacity: "0.6" }, "100%": { transform: "none", opacity: "1" } },
        bob: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        twinkle: { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.55", transform: "scale(0.85)" } }
      },
      animation: { rise: "rise .35s ease-out", bob: "bob 3s ease-in-out infinite", twinkle: "twinkle 2.4s ease-in-out infinite" }
    }
  },
  plugins: []
};
export default config;
