import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Y2K palette (matches the mockup)
        cotton:    "#F4EBE8",
        paper:     "#F5F5F5",
        cream:     "#FAF6F0",
        ink:       "#272727",
        graphite:  "#272727",
        "ink-soft":  "#5a5a5a",
        "ink-faint": "#8a8a8a",
        line:      "#E0DCD3",
        lavender:  "#E6ABE1",
        goldrush:  "#E8B044",
        bubblegum: "#F8D5F3",
        bronze:    "#925F3A",
        frost:     "#ECEBE7",
        accent:    "#E6ABE1",
        "accent-2":"#E8B044",
        warn:      "#C7892A",
        good:      "#5C8C5A",
        error:     "#B04D45",
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'y2k-sm': '2px 2px 0 #272727',
        'y2k':    '3px 3px 0 #272727',
        'y2k-lg': '4px 4px 0 #272727',
      },
      borderRadius: {
        'y2k': '14px',
      },
    },
  },
  plugins: [],
};
export default config;
