#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Regenerates every brand asset for app-interesting-facts from a single
 * source of truth:
 *
 *   - Diagonal blue gradient  #3EA1FF (top-left) -> #0173DE (bottom-right)
 *   - White 4-point "discovery sparkle" (rounded-tip star) centered on it
 *
 * Usage:  node ./scripts/generate-icons.mjs
 * Deps:   sharp (devDependency, build-time only — never part of the app bundle)
 */
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Brand colors (do not change — current mark).
const C1 = { r: 62, g: 161, b: 255 }; // #3EA1FF
const C2 = { r: 1, g: 115, b: 222 };  // #0173DE

/* ------------------------------------------------------------------ */
/* Diagonal gradient                                                    */
/* ------------------------------------------------------------------ */

/**
 * Exact per-pixel linear diagonal gradient: top-left C1 -> bottom-right C2.
 * Lines of equal color run perpendicular to the main diagonal.
 */
function gradientRaw(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const denom = 2 * (size - 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / denom;
      const i = (y * size + x) * 4;
      buffer[i] = Math.round(C1.r + (C2.r - C1.r) * t);
      buffer[i + 1] = Math.round(C1.g + (C2.g - C1.g) * t);
      buffer[i + 2] = Math.round(C1.b + (C2.b - C1.b) * t);
      buffer[i + 3] = 255;
    }
  }
  return { buffer, info: { width: size, height: size, channels: 4 } };
}

/* ------------------------------------------------------------------ */
/* Sparkle geometry (4-point star, rounded tips, concave edges)          */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

function quad(p0, c, p1, u) {
  const w = 1 - u;
  return {
    x: w * w * p0.x + 2 * w * u * c.x + u * u * p1.x,
    y: w * w * p0.y + 2 * w * u * c.y + u * u * p1.y,
  };
}

function quadDeriv(p0, c, p1, u) {
  const w = 1 - u;
  return {
    x: 2 * w * (c.x - p0.x) + 2 * u * (p1.x - c.x),
    y: 2 * w * (c.y - p0.y) + 2 * u * (p1.y - c.y),
  };
}

function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

function lineIntersect(p1, d1, p2, d2) {
  const denom = d1.x * d2.y - d1.y * d2.x;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const s = (dx * d2.y - dy * d2.x) / denom;
  return { x: p1.x + s * d1.x, y: p1.y + s * d1.y };
}

/**
 * Control point of the sub-segment of a quadratic bezier between u1 and u2.
 * (Derived from exact coefficient matching.)
 */
function subControl(p0, c, p1, u1, u2) {
  const b1 = quad(p0, c, p1, u1);
  const d = u2 - u1;
  return {
    x: b1.x + d * (-(1 - u1) * p0.x + (1 - 2 * u1) * c.x + u1 * p1.x),
    y: b1.y + d * (-(1 - u1) * p0.y + (1 - 2 * u1) * c.y + u1 * p1.y),
  };
}

/** SVG arc command from p1 to p2 around `center` (radius r) bulging near `bulge`. */
function arcTo(p1, p2, center, bulge, r) {
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
  const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
  const ab = Math.atan2(bulge.y - center.y, bulge.x - center.x);
  const inc = (a2 - a1 + TAU) % TAU; // angular distance going increasing angle
  const dec = TAU - inc;             // going decreasing angle
  const midInc = normAngle(a1 + inc / 2);
  const midDec = normAngle(a1 - dec / 2);
  const useInc =
    Math.abs(normAngle(midInc - ab)) <= Math.abs(normAngle(midDec - ab));
  const sweep = useInc ? 1 : 0;
  const delta = useInc ? inc : dec;
  const large = delta > Math.PI ? 1 : 0;
  return `A${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} ${sweep} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

/**
 * Build the sparkle path for a size×size canvas.
 * `span` is the fraction of the canvas the symbol's bounding box covers.
 *
 * Geometry:
 *   - 4 tips on the axes at radius R (span/2)
 *   - concave edges via quadratic curves whose control points sit at 45°
 *     on an inner radius rIn (0.40 * R)
 *   - every tip is rounded with a circular arc of target radius 0.12 * R;
 *     the arc is built to be exactly tangent to both adjacent edges
 *     (center = intersection of the two normals).
 */
function sparklePath(size, span) {
  const cx = size / 2;
  const cy = size / 2;
  const R = (span / 2) * size;
  const rIn = 0.4 * R;
  const tipTarget = 0.12 * R;
  const s = Math.SQRT1_2; // √2/2

  const tips = [
    { x: cx, y: cy - R }, // 0 top
    { x: cx + R, y: cy }, // 1 right
    { x: cx, y: cy + R }, // 2 bottom
    { x: cx - R, y: cy }, // 3 left
  ];
  const inners = [
    { x: cx + rIn * s, y: cy - rIn * s }, // edge 0->1
    { x: cx + rIn * s, y: cy + rIn * s }, // edge 1->2
    { x: cx - rIn * s, y: cy + rIn * s }, // edge 2->3
    { x: cx - rIn * s, y: cy - rIn * s }, // edge 3->0
  ];
  // Edge k runs tips[k] -> tips[(k+1)%4] with control inners[k].
  const edges = tips.map((t, k) => ({ p0: t, c: inners[k], p1: tips[(k + 1) % 4] }));

  // For each corner at tip k, find the trim parameter u on the START side
  // edge (edge k) so the corner arc radius matches tipTarget. Binary search:
  // radius grows monotonically with u.
  const uCorner = new Array(4);
  for (let k = 0; k < 4; k++) {
    const edge = edges[k];       // starts at tip k
    const prevEdge = edges[(k + 3) % 4]; // ends at tip k
    let lo = 0.0001;
    let hi = 0.12;
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2;
      const p1 = quad(edge.p0, edge.c, edge.p1, mid);
      const t1 = quadDeriv(edge.p0, edge.c, edge.p1, mid);
      const p2 = quad(prevEdge.p0, prevEdge.c, prevEdge.p1, 1 - mid);
      const t2 = quadDeriv(prevEdge.p0, prevEdge.c, prevEdge.p1, 1 - mid);
      const n1 = { x: -t1.y, y: t1.x };
      const n2 = { x: -t2.y, y: t2.x };
      const center = lineIntersect(p1, n1, p2, n2);
      const radius = Math.hypot(center.x - p1.x, center.y - p1.y);
      if (radius < tipTarget) lo = mid;
      else hi = mid;
    }
    uCorner[k] = lo;
  }

  // Trimmed edge k: starts at S_k (tip-k side), ends at E_k (tip-(k+1) side).
  const S = [];
  const E = [];
  const C = [];
  for (let k = 0; k < 4; k++) {
    const e = edges[k];
    const u1 = uCorner[k];        // trim at start (tip k corner)
    const u2 = 1 - uCorner[(k + 1) % 4]; // trim at end (tip k+1 corner)
    S.push(quad(e.p0, e.c, e.p1, u1));
    E.push(quad(e.p0, e.c, e.p1, u2));
    C.push(subControl(e.p0, e.c, e.p1, u1, u2));
  }

  // Corner arcs: from E[k-1] to S[k] around tip k.
  const arcs = new Array(4);
  for (let k = 0; k < 4; k++) {
    const edge = edges[k];
    const u = uCorner[k];
    const p1 = quad(edge.p0, edge.c, edge.p1, u); // arc end on edge k (near tip k)
    const prevEdge = edges[(k + 3) % 4];
    const p2 = quad(prevEdge.p0, prevEdge.c, prevEdge.p1, 1 - u); // previous edge end
    const t1 = quadDeriv(edge.p0, edge.c, edge.p1, u);
    const t2 = quadDeriv(prevEdge.p0, prevEdge.c, prevEdge.p1, 1 - u);
    const n1 = { x: -t1.y, y: t1.x };
    const n2 = { x: -t2.y, y: t2.x };
    const center = lineIntersect(p1, n1, p2, n2);
    const radius = Math.hypot(center.x - p1.x, center.y - p1.y);
    arcs[k] = arcTo(p2, p1, center, tips[k], radius);
  }

  const f = (p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  return [
    `M ${f(S[0])}`,
    `Q ${f(C[0])} ${f(E[0])}`,
    arcs[1], // corner at tip 1 (E0 -> S1)
    `Q ${f(C[1])} ${f(E[1])}`,
    arcs[2],
    `Q ${f(C[2])} ${f(E[2])}`,
    arcs[3],
    `Q ${f(C[3])} ${f(E[3])}`,
    arcs[0], // corner at tip 0 (E3 -> S0)
    'Z',
  ].join(' ');
}

function sparkleSvg(size, span) {
  const d = sparklePath(size, span);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}"><path d="${d}" fill="#FFFFFF"/></svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Rendering                                                            */
/* ------------------------------------------------------------------ */

function mkdirFor(file) {
  mkdirSync(dirname(file), { recursive: true });
}

async function render(file, size, options) {
  const { gradient = false, symbol = true, span = 0.6 } = options;
  let img;
  if (gradient) {
    const raw = gradientRaw(size);
    img = sharp(raw.buffer, { raw: raw.info });
  } else {
    img = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
  }
  if (symbol) {
    img = img.composite([
      { input: Buffer.from(sparkleSvg(size, span)), top: 0, left: 0 },
    ]);
  }
  await img.png().toFile(file);
}

/* ------------------------------------------------------------------ */
/* Targets                                                              */
/* ------------------------------------------------------------------ */

// Note on spans: the rounded tips shave ~12% off the symbol outline, so the
// diamond outline is sized so the *visible* white shape lands in the target
// range (e.g. span 0.64 -> visible ~56% of the canvas).
// - Brand icons (gradient bg):   span 0.64 -> visible ~56% (spec: 55-60%)
// - Android adaptive-layers:     span 0.56 keeps everything inside the 66%
//                                safe zone after the ~33% mask crop
// - Splash/expo-logo (transparent): span 0.60 -> visible ~53%
const targets = [
  {
    file: 'assets/images/icon.png',
    size: 1024,
    options: { gradient: true, symbol: true, span: 0.64 },
  },
  {
    file: 'assets/images/android-icon-foreground.png',
    size: 512,
    options: { gradient: false, symbol: true, span: 0.56 },
  },
  {
    file: 'assets/images/android-icon-background.png',
    size: 512,
    options: { gradient: true, symbol: false },
  },
  {
    file: 'assets/images/android-icon-monochrome.png',
    size: 432,
    options: { gradient: false, symbol: true, span: 0.56 },
  },
  {
    file: 'assets/images/favicon.png',
    size: 48,
    options: { gradient: true, symbol: true, span: 0.64 },
  },
  {
    file: 'assets/images/splash-icon.png',
    size: 512,
    options: { gradient: false, symbol: true, span: 0.6 },
  },
  {
    file: 'assets/images/expo-logo.png',
    size: 512,
    options: { gradient: false, symbol: true, span: 0.6 },
  },
  {
    file: 'public/logo180.png',
    size: 180,
    options: { gradient: true, symbol: true, span: 0.64 },
  },
  {
    file: 'public/logo192.png',
    size: 192,
    options: { gradient: true, symbol: true, span: 0.64 },
  },
  {
    file: 'public/logo512.png',
    size: 512,
    options: { gradient: true, symbol: true, span: 0.64 },
  },
];

async function main() {
  const results = [];
  for (const t of targets) {
    const abs = join(ROOT, t.file);
    mkdirFor(abs);
    await render(abs, t.size, t.options);
    const { size: bytes } = statSync(abs);
    results.push(`${t.file.padEnd(42)} ${String(t.size).padStart(4)}px  ${bytes} bytes`);
    console.log(results[results.length - 1]);
  }
  console.log('\nDone. Document: run "pnpm icons" to regenerate.');
}

await main();