import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f4f9",
          100: "#dde5f0",
          200: "#c0cfe3",
          300: "#94b0cf",
          400: "#618ab6",
          500: "#3f6c9c",
          600: "#2f5480",
          700: "#1f3c63",
          800: "#152b49",
          900: "#0e1e33",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
