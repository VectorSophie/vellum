// recognizer.js — stroke-template matcher for jamo.
//
// Same paradigm as tetohira's `o.list`: compare a drawn stroke-set against a
// library of templates and return the closest match. Pipeline per match:
//   1. group-normalize (uniform scale, aspect preserved) so position/size vary
//      but ㅡ stays flat and ㅣ stays tall
//   2. resample each stroke to a fixed point count
//   3. filter templates to the same stroke count
//   4. score by best order-independent stroke pairing (draw order forgiving),
//      trying each stroke forward and reversed (direction forgiving)
//
// Lower score = better. A score above REJECT_THRESHOLD yields no match.

import { TEMPLATES } from './templates.js';

const N = 16;                 // points per stroke after resampling
const REJECT_THRESHOLD = 0.28; // mean normalized point distance; tune later

// ---- geometry helpers ----

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

// Resample a polyline to exactly n equally-spaced points (by arc length).
function resample(pts, n) {
  if (pts.length === 1) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const interval = pathLength(pts) / (n - 1);
  if (interval === 0) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const out = [[pts[0][0], pts[0][1]]];
  let acc = 0;
  let prev = pts[0];
  let i = 1;
  const work = pts.slice();
  while (i < work.length) {
    const cur = work[i];
    const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    if (acc + d >= interval) {
      const t = (interval - acc) / d;
      const np = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      out.push(np);
      work.splice(i, 0, np);
      prev = np;
      acc = 0;
    } else {
      acc += d;
      prev = cur;
      i++;
    }
  }
  while (out.length < n) out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out.slice(0, n);
}

// Translate + uniformly scale a group of strokes so the bounding box's longest
// side becomes 1 and the shape is centered in the unit box. Aspect preserved.
function normalizeGroup(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const [x, y] of s) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.max(w, h) || 1;
  // Offsets to center the (scaled) shape within the unit box.
  const offX = (1 - w / scale) / 2;
  const offY = (1 - h / scale) / 2;
  return strokes.map((s) => s.map(([x, y]) => [
    (x - minX) / scale + offX,
    (y - minY) / scale + offY,
  ]));
}

function meanPointDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
  return sum / a.length;
}

// Distance between two resampled strokes, trying both directions.
function strokeDistance(a, b) {
  const fwd = meanPointDistance(a, b);
  const rev = meanPointDistance(a, b.slice().reverse());
  return Math.min(fwd, rev);
}

// All permutations of [0..n-1] (n is small: stroke counts are <= 4).
function permutations(n) {
  if (n <= 1) return [[0]];
  const result = [];
  const rec = (arr, rest) => {
    if (rest.length === 0) { result.push(arr); return; }
    for (let i = 0; i < rest.length; i++) {
      rec(arr.concat(rest[i]), rest.slice(0, i).concat(rest.slice(i + 1)));
    }
  };
  rec([], Array.from({ length: n }, (_, i) => i));
  return result;
}

// Best order-independent pairing score between two equal-count stroke sets.
function setDistance(inputStrokes, templateStrokes) {
  const n = inputStrokes.length;
  if (n > 5) {
    // Greedy fallback for unusually high stroke counts (none in v1 set).
    let sum = 0;
    for (let i = 0; i < n; i++) sum += strokeDistance(inputStrokes[i], templateStrokes[i]);
    return sum / n;
  }
  let best = Infinity;
  for (const perm of permutations(n)) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += strokeDistance(inputStrokes[i], templateStrokes[perm[i]]);
    const score = sum / n;
    if (score < best) best = score;
  }
  return best;
}

// Pre-normalize + resample the template library once.
const PREPARED = TEMPLATES.map((t) => ({
  char: t.char,
  strokes: normalizeGroup(t.strokes).map((s) => resample(s, N)),
  count: t.strokes.length,
}));

// Recognize a drawn stroke-set. `strokes` is an array of polylines, each an
// array of [x, y] points in raw canvas/screen coordinates.
// Returns { char, confidence, score } or null if nothing matches.
export function recognize(strokes) {
  if (!strokes || strokes.length === 0) return null;
  const input = normalizeGroup(strokes).map((s) => resample(s, N));
  const count = input.length;

  let best = null;
  for (const t of PREPARED) {
    if (t.count !== count) continue;
    const score = setDistance(input, t.strokes);
    if (!best || score < best.score) best = { char: t.char, score };
  }

  if (!best || best.score > REJECT_THRESHOLD) return null;
  // Map score in [0, REJECT_THRESHOLD] to confidence in [1, 0].
  const confidence = 1 - best.score / REJECT_THRESHOLD;
  return { char: best.char, confidence, score: best.score };
}

export const _internals = { resample, normalizeGroup, setDistance, N, REJECT_THRESHOLD };
