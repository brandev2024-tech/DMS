/** DMS palette — same tokens as the website (src/app/globals.css in the web project). */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        blush: token("blush"),
        rose: token("rose"),
        "rose-ink": token("rose-ink"),
        gold: token("gold"),
        "gold-ink": token("gold-ink"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        "on-ink": token("on-ink"),
      },
      fontFamily: {
        serif: ["CormorantGaramond_500Medium"],
        "serif-italic": ["CormorantGaramond_500Medium_Italic"],
        sans: ["Jost_400Regular"],
        medium: ["Jost_500Medium"],
        semibold: ["Jost_600SemiBold"],
      },
    },
  },
  plugins: [],
};
