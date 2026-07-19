import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import preset from "../../packages/config/tailwind-preset";

export default {
  presets: [preset as Partial<Config>],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [animate],
} satisfies Config;
