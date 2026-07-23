// WCAG contrast check for PageAgent's semantic tokens (Plan Step 2.5 / decision D3).
// Computes the contrast ratio for load-bearing pairings in both themes. REQUIRED
// pairings fail the process (exit 1); others are advisory FLAGs against their target.
// Full color-blind / greyscale sign-off (D3) still needs the visual pass — this is
// the reproducible numeric half. Keep the hex values in sync with src/styles/tokens.css.

const DARK = {
  bg: '#0b1614',
  surface: '#12211e',
  ink: '#e7f0ed',
  muted: '#8ca59f',
  line: '#26403a',
  brand: '#33cfbd',
  brandInk: '#33cfbd',
  safe: '#46c07e',
  caution: '#e4a63a',
  halt: '#e5645a',
  offshore: '#7b99b8',
  focus: '#33cfbd',
};
const LIGHT = {
  bg: '#e9efed',
  surface: '#f8fbfa',
  ink: '#0d1a18',
  muted: '#47605a',
  line: '#cbd8d4',
  brand: '#0f9c8e',
  brandInk: '#0a756b',
  safe: '#1e874a',
  caution: '#b5730a',
  halt: '#b03a2e',
  offshore: '#4e6e8c',
  focus: '#0a756b',
};

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [label, fg, bg, minRatio, required?]
function pairs(t) {
  return [
    ['ink on bg (body)', t.ink, t.bg, 7, true],
    ['ink on surface (body)', t.ink, t.surface, 7, true],
    ['brand-ink on surface (links/small)', t.brandInk, t.surface, 7, false],
    ['brand-ink on bg (links/small)', t.brandInk, t.bg, 7, false],
    ['muted on bg (secondary)', t.muted, t.bg, 7, false],
    ['muted on surface (secondary)', t.muted, t.surface, 7, false],
    ['safe on bg (non-text)', t.safe, t.bg, 3, true],
    ['caution on bg (non-text)', t.caution, t.bg, 3, true],
    ['halt on bg (non-text)', t.halt, t.bg, 3, true],
    ['offshore on bg (non-text)', t.offshore, t.bg, 3, true],
    ['focus ring on bg (non-text)', t.focus, t.bg, 3, true],
  ];
}

let failed = 0;
let flagged = 0;
for (const [name, theme] of [
  ['DARK', DARK],
  ['LIGHT', LIGHT],
]) {
  console.log(`\n=== ${name} ===`);
  for (const [label, fg, bg, min, required] of pairs(theme)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    const tag = ok ? 'PASS' : required ? 'FAIL' : 'FLAG';
    if (!ok && required) failed++;
    if (!ok && !required) flagged++;
    console.log(`  [${tag}] ${label.padEnd(38)} ${r.toFixed(2)}:1 (min ${min}:1)`);
  }
}
console.log(
  `\nRequired failures: ${failed} · Advisory flags: ${flagged} (target-not-met; acceptable, tracked in #20/D3)`
);
console.log(
  'Color-blind / greyscale distinguishability (brand↔safe, offshore↔both): needs the visual pass — see #20.'
);
if (failed > 0) {
  console.error('\n✖ Required contrast threshold(s) not met.');
  process.exit(1);
}
console.log('\n✔ All required contrast thresholds met.');
