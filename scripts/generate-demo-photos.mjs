/**
 * Generates the sample product photos in public/demo/ (WebP + _thumb).
 * Minimal "studio" illustrations: plush faux-fur texture, soft backdrop, floor shadow.
 *
 *   node scripts/generate-demo-photos.mjs
 *
 * Angles per product: 1 front · 2 close-up · 3 three-quarter view (warm backdrop) · 4 styled on a hanger.
 * Not needed in production; real photos are uploaded to R2 from the admin panel.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "demo");
const ANGLES = 4;

// Product → look. Keep in sync with src/lib/demo-data.ts and supabase/seed.sql.
const LOOKS = {
  "cloud-cream-faux-fur-crop": { kind: "fur", color: "#EFE7DC", bg: "#F3EEEA" },
  "blush-teddy-cropped-jacket": { kind: "teddy", color: "#E8C3CA", bg: "#F6EEEE" },
  "mocha-shearling-crop": { kind: "shearling", color: "#7A5646", trim: "#EDE2D4", bg: "#F1ECE8" },
  "champagne-fluffy-bolero": { kind: "bolero", color: "#E6D3AE", bg: "#F5F0E8" },
  "noir-luxe-faux-mink-crop": { kind: "fur", color: "#2A2524", bg: "#ECE8E6" },
  "dusty-rose-shaggy-crop": { kind: "fur", color: "#CF9EA9", bg: "#F5EDEE" },
  "ivory-tweed-cropped-jacket": { kind: "tweed", color: "#EEE6DA", trim: "#C9A96E", bg: "#F2EEEA" },
  "washed-denim-crop-jacket": { kind: "denim", color: "#93A7C0", trim: "#C9A96E", bg: "#EFF0F1" },
  "angora-knit-cardigan-top": { kind: "cardigan", color: "#F1E4E3", trim: "#FFFFFF", bg: "#F6F1EF" },
  "satin-slip-midi-dress": { kind: "dress", color: "#E2CDA9", bg: "#F4EFE9" },
  "fluffy-mini-shoulder-bag": { kind: "bag", color: "#F0E8DE", trim: "#C9A96E", bg: "#F3EEEB" },
  "faux-fur-hair-clip-set": { kind: "clips", color: "#E8C3CA", trim: "#EFE7DC", bg: "#F6F0EE" },
};
// Single pictures: category covers + home hero.
const SINGLES = {
  "cat-fur": { kind: "fur", color: "#EFE7DC", bg: "#F1EBE6" },
  "cat-jackets": { kind: "tweed", color: "#EEE6DA", trim: "#C9A96E", bg: "#EFEAE6" },
  "cat-tops": { kind: "cardigan", color: "#F1E4E3", trim: "#FFFFFF", bg: "#F4EEEC" },
  "cat-dresses": { kind: "dress", color: "#E2CDA9", bg: "#F2EDE7" },
  "cat-bottoms": { kind: "skirt", color: "#7A5646", bg: "#F1ECE8" },
  "cat-accessories": { kind: "clips", color: "#E8C3CA", trim: "#EFE7DC", bg: "#F5EFED" },
  "cat-bags": { kind: "bag", color: "#F0E8DE", trim: "#C9A96E", bg: "#F1ECE9" },
  "cat-others": { kind: "teddy", color: "#E8C3CA", bg: "#F4EDED" },
  hero: { kind: "fur", color: "#EFE7DC", bg: "#F2ECE7" },
};

/** Lighten (+) or darken (-) a hex color. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`;
}

/** feColorMatrix values: a flat color, with alpha taken from the input's red channel. */
function tint(hex, alphaRow) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3));
  return `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${alphaRow}`;
}

// Cropped jacket silhouette on an 800×1000 canvas.
const JACKET =
  "M330 262 Q400 300 470 262 L540 288 Q586 300 600 350 L640 560 Q648 640 640 700 L566 708 Q560 620 548 560 L536 470 L536 640 Q400 660 264 640 L264 470 L252 560 Q240 620 234 708 L160 700 Q152 640 160 560 L200 350 Q214 300 260 288 Z";
const BOLERO =
  "M330 262 Q400 300 470 262 L540 288 Q586 300 600 350 L640 560 Q648 640 640 700 L566 708 Q560 620 548 560 L536 470 Q530 520 470 540 Q430 470 400 430 Q370 470 330 540 Q270 520 264 470 L252 560 Q240 620 234 708 L160 700 Q152 640 160 560 L200 350 Q214 300 260 288 Z";

function defs(c, seed) {
  const hi = shade(c.color, 0.45);
  const lo = shade(c.color, -0.28);
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(c.bg, 0.4)}"/><stop offset=".72" stop-color="${c.bg}"/><stop offset="1" stop-color="${shade(c.bg, -0.05)}"/>
    </linearGradient>
    <radialGradient id="light" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${c.color}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
    <filter id="fur" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="${4 + seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="24" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency=".7 .07" numOctaves="2" seed="${9 + seed}" result="s1"/>
      <feColorMatrix in="s1" type="matrix" values="${tint("#ffffff", "1.1 0 0 0 -.48")}" result="hiS"/>
      <feComposite in="hiS" in2="d" operator="in" result="hi"/>
      <feTurbulence type="fractalNoise" baseFrequency=".9 .09" numOctaves="2" seed="${21 + seed}" result="s2"/>
      <feColorMatrix in="s2" type="matrix" values="${tint(shade(c.color, -0.5), ".9 0 0 0 -.4")}" result="loS"/>
      <feComposite in="loS" in2="d" operator="in" result="lo"/>
      <feMerge><feMergeNode in="d"/><feMergeNode in="lo"/><feMergeNode in="hi"/></feMerge>
    </filter>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${2 + seed}" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .25 -.08" result="ga"/>
      <feComposite in="ga" in2="SourceGraphic" operator="in" result="grain"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="grain"/></feMerge>
    </filter>
    <filter id="blur" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="wallblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>`;
}

function garment(c) {
  const lo = shade(c.color, -0.2);
  const edge = shade(c.color, -0.08);
  const seam = `<path d="M400 300 L400 650" stroke="${lo}" stroke-opacity=".5" stroke-width="3"/>`;
  switch (c.kind) {
    case "fur":
      return `<g filter="url(#fur)"><path d="${JACKET}" fill="url(#body)" stroke="${edge}" stroke-width="8"/>
        <path d="M330 262 Q350 380 400 440 Q450 380 470 262 Q430 300 400 300 Q370 300 330 262Z" fill="${shade(c.color, 0.18)}"/></g>
        <path d="${JACKET}" fill="url(#light)" opacity=".5"/>${seam}`;
    case "teddy":
      return `<g filter="url(#fur)"><path d="${JACKET}" fill="url(#body)" stroke="${edge}" stroke-width="8"/></g>
        <path d="M300 520 h70 v70 h-70z M430 520 h70 v70 h-70z" fill="${lo}" opacity=".25" filter="url(#fur)"/>${seam}
        <path d="${JACKET}" fill="url(#light)" opacity=".4"/>`;
    case "bolero":
      return `<g filter="url(#fur)"><path d="${BOLERO}" fill="url(#body)" stroke="${edge}" stroke-width="8"/></g><path d="${BOLERO}" fill="url(#light)" opacity=".5"/>`;
    case "shearling":
      return `<g filter="url(#soft)"><path d="${JACKET}" fill="url(#body)"/></g>
        <path d="M400 300 L420 650" stroke="${lo}" stroke-width="4"/>
        <g filter="url(#fur)" fill="${c.trim}">
          <path d="M320 262 Q300 330 340 420 L400 470 L380 330 Q360 300 330 262Z"/><path d="M480 262 Q500 330 470 420 L420 470 L430 330 Q450 300 480 262Z"/>
          <path d="M262 632 Q400 668 538 632 L540 664 Q400 700 262 664Z"/>
          <path d="M160 690 L236 698 L234 726 L158 718Z"/><path d="M566 698 L640 690 L642 718 L566 726Z"/>
        </g>`;
    case "tweed":
      return `<g filter="url(#soft)"><path d="${JACKET}" fill="url(#body)"/></g>
        <path d="${JACKET}" fill="none" stroke="${shade(c.color, -0.12)}" stroke-width="10" stroke-dasharray="2 7"/>
        <path d="M330 262 Q400 300 470 262 M400 300 L400 650" stroke="${c.trim}" stroke-width="5" fill="none"/>
        ${[360, 430, 500, 570].map((y) => `<circle cx="384" cy="${y}" r="9" fill="${c.trim}"/>`).join("")}
        <path d="M290 470 h60 M450 470 h60" stroke="${c.trim}" stroke-width="5"/>`;
    case "denim":
      return `<g filter="url(#soft)"><path d="${JACKET}" fill="url(#body)"/></g>
        <path d="M264 420 Q400 440 536 420 M290 470 h80 v60 h-80z M430 470 h80 v60 h-80z M400 300 L400 650" stroke="${shade(c.color, -0.3)}" stroke-width="3" fill="none" stroke-dasharray="7 5"/>
        <path d="M330 262 L370 360 L400 300 L430 360 L470 262" fill="${shade(c.color, 0.1)}" stroke="${shade(c.color, -0.3)}" stroke-width="3"/>
        ${[400, 470, 540, 610].map((y) => `<circle cx="412" cy="${y}" r="7" fill="${c.trim}"/>`).join("")}`;
    case "cardigan":
      return `<g filter="url(#fur)"><path d="${JACKET.replace("L536 640 Q400 660 264 640", "L536 680 Q400 700 264 680")}" fill="url(#body)"/></g>
        <path d="M330 262 Q370 360 400 420 Q430 360 470 262" fill="none" stroke="${shade(c.color, -0.15)}" stroke-width="4"/>
        ${[440, 510, 580, 650].map((y) => `<circle cx="400" cy="${y}" r="9" fill="#fff" stroke="${shade(c.color, -0.2)}"/>`).join("")}`;
    case "dress":
      return `<g filter="url(#soft)"><path d="M352 250 L360 330 Q320 420 300 600 Q290 700 260 800 L540 800 Q510 700 500 600 Q480 420 440 330 L448 250 L430 250 L422 320 Q400 340 378 320 L370 250Z" fill="url(#body)"/></g>
        <path d="M410 340 Q430 560 380 800" stroke="#fff" stroke-opacity=".45" stroke-width="22" fill="none"/>
        <path d="M352 250 L370 250 M430 250 L448 250" stroke="${shade(c.color, -0.3)}" stroke-width="3"/>`;
    case "skirt":
      return `<g filter="url(#soft)"><path d="M300 380 L500 380 L560 740 Q400 770 240 740Z" fill="url(#body)"/></g>
        <path d="M300 380 h200 v36 h-200z" fill="${shade(c.color, -0.15)}"/>
        <path d="M360 416 L330 745 M440 416 L470 745" stroke="${shade(c.color, -0.25)}" stroke-width="3"/>`;
    case "bag":
      return `<path d="M310 430 Q400 220 490 430" stroke="${c.trim}" stroke-width="10" fill="none" stroke-dasharray="16 8" stroke-linecap="round"/>
        <g filter="url(#fur)"><rect x="240" y="420" width="320" height="250" rx="110" fill="url(#body)"/></g>
        <rect x="240" y="420" width="320" height="250" rx="110" fill="url(#light)" opacity=".5"/><circle cx="400" cy="520" r="12" fill="${c.trim}"/>`;
    case "clips":
      return [300, 400, 500]
        .map((x, i) => {
          const col = i === 1 ? c.trim : i === 0 ? c.color : "#2A2524";
          const y = 470 + (i % 2) * 50;
          return `<rect x="${x - 34}" y="${y + 30}" width="68" height="90" rx="24" fill="#C9A96E" opacity=".75"/>
            <g filter="url(#fur)"><ellipse cx="${x}" cy="${y}" rx="62" ry="54" fill="${col}"/></g>`;
        })
        .join("");
  }
  return "";
}

const FLOOR = { dress: 812, skirt: 760, bag: 700, clips: 700 };
const HANGS = ["fur", "teddy", "bolero", "shearling", "tweed", "denim", "cardigan", "dress"];

/** One scene. angle: 1 front · 2 close-up · 3 three-quarter · 4 styled on a hanger. */
function sceneSvg(look, angle) {
  const c = angle === 3 ? { ...look, bg: shade(look.bg, -0.07) } : look;
  const floorY = FLOOR[look.kind] ?? 738;
  const floor = `<ellipse cx="400" cy="${floorY}" rx="230" ry="22" fill="#3b2a2a" opacity=".16" filter="url(#blur)"/>`;
  let scene;

  if (angle === 2) {
    // Detail: zoom into the upper body / texture.
    scene = `<g transform="translate(-400 -300) scale(2)">${floor}${garment(c)}</g>`;
  } else if (angle === 3) {
    // Three-quarter: slight turn + narrower silhouette.
    scene = `<g transform="translate(400 500) rotate(-6) scale(.86 .97) translate(-400 -500)">${floor}${garment(c)}</g>`;
  } else if (angle === 4 && HANGS.includes(look.kind)) {
    // Styled: on a gold hanger against a soft-lit wall.
    const wall = `<ellipse cx="560" cy="300" rx="320" ry="260" fill="#fff" opacity=".55" filter="url(#wallblur)"/>
`;
    const hanger = `<path d="M400 120 q0 -26 22 -26 q22 0 22 22 q0 16 -18 26 l-26 16" fill="none" stroke="#B8955A" stroke-width="6" stroke-linecap="round"/>
      <path d="M400 150 L250 262 Q400 250 550 262 Z" fill="none" stroke="#C9A96E" stroke-width="8" stroke-linejoin="round"/>`;
    scene = `${wall}${hanger}<g transform="translate(400 260) scale(.82) translate(-400 -262)">${garment(c)}</g>`;
  } else if (angle === 4) {
    // Small items: flat lay from above on a linen-toned surface.
    scene = `<rect width="800" height="1000" fill="${shade(c.bg, -0.04)}"/>
      <g transform="translate(400 520) rotate(8) translate(-400 -520)">${garment(c)}</g>`;
  } else {
    scene = `${floor}${garment(c)}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    ${defs(c, angle)}
    <rect width="800" height="1000" fill="url(#bg)"/>
    ${scene}
  </svg>`;
}

async function write(name, svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const full = await sharp(png).webp({ quality: 82 }).toBuffer();
  const thumb = await sharp(png).resize(400).webp({ quality: 80 }).toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.webp`), full);
  fs.writeFileSync(path.join(OUT, `${name}_thumb.webp`), thumb);
  return full.length + thumb.length;
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2]; // optional: regenerate one product slug
let bytes = 0;
let count = 0;
for (const [slug, look] of Object.entries(LOOKS)) {
  if (only && slug !== only) continue;
  for (let a = 1; a <= ANGLES; a++) {
    bytes += await write(`${slug}-${a}`, sceneSvg(look, a));
    count++;
  }
}
if (!only) {
  for (const [name, look] of Object.entries(SINGLES)) {
    bytes += await write(name, sceneSvg(look, 1));
    count++;
  }
}
console.log(`Wrote ${count} photos (+ thumbnails) to public/demo — ${Math.round(bytes / 1024)} KB`);
