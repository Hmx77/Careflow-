import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F3FBFE",
          100: "#EAF8FC",
          500: "#18A9D6",
          700: "#006B9A",
          800: "#075B82",
          900: "#12313F"
        },
        clinic: {
          teal: "#18A9D6",
          mint: "#EAF8FC",
          blue: "#F3FBFE",
          line: "#D8EEF6",
          grey: "#F5F7FA",
          success: "#22A06B",
          warning: "#F5A623",
          error: "#D64545",
          muted: "#5E7280"
        }
      },
      boxShadow: {
        soft: "0 14px 34px rgba(0, 107, 154, 0.08)",
        glass: "0 18px 48px rgba(0, 107, 154, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
