import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        panel: "#141416",
        edge: "#26262b",
        accent: "#f4622e",
      },
    },
  },
  plugins: [],
};
export default config;
