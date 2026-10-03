// Generates the app icon, Android adaptive icon layers, splash and notification icons.
// "DMS" is set in Cormorant Garamond (converted to paths) on blush pink.
// Run: npm install --no-save opentype.js && node scripts/generate-icons.mjs
// (sharp is resolved from the website project one folder up.)
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const sharp = require(path.resolve("../node_modules/sharp"));

const fontFile = "node_modules/@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf";
const sansFile = "node_modules/@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf";
const load = (f) => { const b = fs.readFileSync(f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const serif = load(fontFile);
const sans = load(sansFile);

const BLUSH = "#F8E1E7";
const GOLD = "#C9A96E";
const MOCHA = "#3B2A2A";
const OUT = "assets/images";

/** Centered text as an SVG path; letterSpacing in em. */
function textPath(font, text, size, cx, baseline, fill, letterSpacing = 0) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  const widths = glyphs.map((g) => g.advanceWidth * scale);
  const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * size * (glyphs.length - 1);
  let x = cx - total / 2;
  const d = glyphs
    .map((g, i) => {
      const p = g.getPath(x, baseline, size).toPathData(2);
      x += widths[i] + letterSpacing * size;
      return p;
    })
    .join(" ");
  return `<path d="${d}" fill="${fill}"/>`;
}

/** The DMS mark centred in a `size` box, scaled by `k` (1 = full icon composition). */
function mark(size, k, { ink = MOCHA, ring = GOLD, tagline = true } = {}) {
  const c = size / 2;
  const r = size * 0.36 * k;
  const parts = [
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${ring}" stroke-width="${size * 0.008 * k}"/>`,
    textPath(serif, "DMS", size * 0.27 * k, c, c + size * 0.07 * k, ink, 0.04),
  ];
  if (tagline) parts.push(textPath(sans, "DIRECT MESSAGE US", size * 0.034 * k, c, c + size * 0.17 * k, ink, 0.28));
  return parts.join("");
}

const svg = (size, body, bg) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      (bg ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BLUSH}"/><stop offset="1" stop-color="#EFCDD5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>` : "") +
      body +
      `</svg>`,
  );

const png = (buf, file, size = 1024) => sharp(buf).resize(size, size).png().toFile(path.join(OUT, file));

fs.mkdirSync(OUT, { recursive: true });
await Promise.all([
  // iOS / store icon: full-bleed, no transparency.
  png(svg(1024, mark(1024, 1), true), "icon.png"),
  // Android adaptive icon: foreground inside the 66% safe zone, background colour set in app config.
  png(svg(1024, mark(1024, 0.66)), "android-icon-foreground.png"),
  png(svg(1024, "", true), "android-icon-background.png"),
  png(svg(1024, mark(1024, 0.66, { ink: "#000", ring: "#000" })), "android-icon-monochrome.png"),
  // Splash: transparent mark on the blush splash background.
  png(svg(1024, mark(1024, 1)), "splash-icon.png"),
  png(svg(1024, mark(1024, 1, { ink: "#F4EFED", ring: GOLD })), "splash-icon-dark.png"),
  // Android status-bar notification icon: white on transparent.
  png(svg(96, textPath(serif, "D", 80, 48, 76, "#fff")), "notification-icon.png", 96),
  png(svg(512, mark(512, 1), true), "favicon.png", 48),
]);
console.log("icons written to", OUT);
