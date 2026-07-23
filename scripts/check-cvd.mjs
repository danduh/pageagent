// Color-blind (CVD) + greyscale distinguishability check for PageAgent's
// semantic tokens (issue #20 / decision D3).
//
// The safety trio (Safe/Caution/Halt), the brand teal, and the processing-locus
// Offshore blue all carry meaning that MUST also survive when hue is lost. The
// design brief already pairs every color with text, but a few separations still
// need to read at a glance for sighted-but-colorblind reviewers:
//   • brand ↔ safe      (teal identity vs. green "safe" — easy to blur)
//   • offshore ↔ brand  (blue "leaves device" vs. teal "on device")
//   • offshore ↔ safe   (blue vs. green — the classic deutan/protan confusion)
//
// This tool simulates protanopia and deuteranopia, plus greyscale (luminance),
// and prints a PASS/WARN table per theme so a human can sign off D3.
//
// ADVISORY ONLY: it always exits 0. It informs the D3 visual sign-off; it does
// not gate CI. Keep the hex values below in sync with src/styles/tokens.css.
//
// CVD simulation: Machado, Oliveira & Fernandes (2009), "A Physiologically-based
// Model for Simulation of Color Vision Deficiency", IEEE TVCG. The 3x3 matrices
// below are their severity-1.0 (full dichromacy) matrices, applied in LINEAR RGB.
// Distinguishability metrics: CIE76 ΔE (Lab, D65) and WCAG 2.x contrast ratio.

// ---- semantic hex maps (must mirror src/styles/tokens.css) ------------------
const DARK = {
  bg: '#0b1614',
  surface: '#12211e',
  brand: '#33cfbd',
  safe: '#46c07e',
  caution: '#e4a63a',
  halt: '#e5645a',
  offshore: '#7b99b8',
  ink: '#e7f0ed',
  muted: '#8ca59f',
};
const LIGHT = {
  bg: '#e9efed',
  surface: '#f8fbfa',
  brand: '#0f9c8e',
  safe: '#1e874a',
  caution: '#b5730a',
  halt: '#b03a2e',
  offshore: '#4e6e8c',
  ink: '#0d1a18',
  muted: '#47605a',
};

// ---- thresholds -------------------------------------------------------------
// A pair is "distinguishable" if it clears EITHER metric: a Lab ΔE separation
// (hue/chroma/lightness) OR a lightness-only contrast ratio (what greyscale
// keeps). It only WARNs when a pair collapses on BOTH under a simulation.
const DE_MIN = 11; // CIE76 ΔE — comfortably above the ~2.3 "just noticeable" step.
const CR_MIN = 1.3; // WCAG contrast ratio between the two colors (lightness split).

// ---- color math -------------------------------------------------------------
function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}
// sRGB electro-optical transfer function (IEC 61966-2-1).
function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearOf(hex) {
  return parseHex(hex).map(toLinear);
}
function clamp01(v) {
  return v.map((x) => Math.min(1, Math.max(0, x)));
}
function applyMatrix(m, v) {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

// Relative luminance (WCAG) from linear RGB.
function luminance(lin) {
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(linA, linB) {
  const [hi, lo] = [luminance(linA), luminance(linB)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

// Linear RGB → CIE XYZ (sRGB primaries, D65) → CIE L*a*b*.
function linToXyz([r, g, b]) {
  return [
    0.4124 * r + 0.3576 * g + 0.1805 * b,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    0.0193 * r + 0.1192 * g + 0.9505 * b,
  ];
}
function xyzToLab([x, y, z]) {
  const wn = [0.95047, 1.0, 1.08883]; // D65 reference white
  const f = (t) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);
  const [fx, fy, fz] = [f(x / wn[0]), f(y / wn[1]), f(z / wn[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labOf(lin) {
  return xyzToLab(linToXyz(lin));
}
function deltaE76(labA, labB) {
  return Math.hypot(labA[0] - labB[0], labA[1] - labB[1], labA[2] - labB[2]);
}

// ---- CVD simulations (Machado et al. 2009, severity 1.0, linear RGB) --------
const MACHADO = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

// Each transform takes linear RGB → linear RGB (all downstream metrics use linear).
const CONDITIONS = [
  ['normal', (lin) => lin],
  ['protanopia', (lin) => clamp01(applyMatrix(MACHADO.protanopia, lin))],
  ['deuteranopia', (lin) => clamp01(applyMatrix(MACHADO.deuteranopia, lin))],
  ['greyscale', (lin) => [luminance(lin), luminance(lin), luminance(lin)]],
];

// The separations that must survive CVD + greyscale.
const CRITICAL_PAIRS = [
  ['brand', 'safe'],
  ['offshore', 'brand'],
  ['offshore', 'safe'],
];

// Colors whose greyscale luminance we surface for context.
const LUM_KEYS = ['bg', 'surface', 'ink', 'muted', 'brand', 'safe', 'caution', 'halt', 'offshore'];

// ---- report -----------------------------------------------------------------
console.log('='.repeat(72));
console.log(' PageAgent — CVD + greyscale distinguishability (advisory, issue #20 / D3)');
console.log(' Simulation: Machado, Oliveira & Fernandes (2009), severity 1.0 (dichromacy)');
console.log(' Metrics:    CIE76 ΔE (Lab, D65) and WCAG contrast ratio');
console.log(` Verdict:    distinguishable if ΔE ≥ ${DE_MIN} OR contrast ≥ ${CR_MIN.toFixed(2)};`);
console.log('             WARN when a pair collapses on BOTH under a simulation.');
console.log('='.repeat(72));

let totalWarn = 0;
for (const [themeName, theme] of [
  ['DARK', DARK],
  ['LIGHT', LIGHT],
]) {
  console.log(`\n=== ${themeName} ===`);

  // Per-color greyscale luminance — if two colors land on the same L*, a
  // hue-only distinction between them vanishes in greyscale.
  console.log('\n  Greyscale luminance (relative Y, 0–1) and CIE L*:');
  for (const key of LUM_KEYS) {
    const lin = linearOf(theme[key]);
    const y = luminance(lin);
    const l = labOf(lin)[0];
    console.log(
      `    ${key.padEnd(9)} ${theme[key]}  Y=${y.toFixed(3)}  L*=${l.toFixed(1).padStart(5)}`
    );
  }

  console.log('\n  Critical separations:');
  for (const [aKey, bKey] of CRITICAL_PAIRS) {
    console.log(`    ${aKey} ↔ ${bKey}`);
    const linA = linearOf(theme[aKey]);
    const linB = linearOf(theme[bKey]);
    for (const [condName, transform] of CONDITIONS) {
      const tA = transform(linA);
      const tB = transform(linB);
      const dE = deltaE76(labOf(tA), labOf(tB));
      const cr = contrast(tA, tB);
      const ok = dE >= DE_MIN || cr >= CR_MIN;
      if (!ok) totalWarn++;
      const tag = ok ? 'PASS' : 'WARN';
      const note = ok ? '' : '  ← collapses (hue-only distinction lost)';
      console.log(
        `      [${tag}] ${condName.padEnd(13)} ΔE=${dE.toFixed(1).padStart(5)}  CR=${cr
          .toFixed(2)
          .padStart(4)}${note}`
      );
    }
  }
}

console.log('\n' + '='.repeat(72));
if (totalWarn > 0) {
  console.log(`⚠ ${totalWarn} separation(s) collapse under a simulation. This is EXPECTED for`);
  console.log('  hue-only pairs (brand↔safe etc.) — meaning is also carried in text per the');
  console.log('  design brief. Review the WARN rows above for the D3 sign-off (#20).');
} else {
  console.log('✔ All critical separations stay distinguishable under CVD + greyscale.');
}
console.log('Advisory only — does not gate CI.');
process.exit(0);
