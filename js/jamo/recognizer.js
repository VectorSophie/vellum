// recognizer.js — stroke-template matcher for jamo (combined-path).
//
// Same paradigm as tetohira's `o.list`, but count-agnostic: a drawn jamo is
// flattened into one path (strokes concatenated in draw order), normalized
// (uniform scale, aspect preserved) and resampled to a fixed point count, then
// compared against templates prepared the same way. Direction-forgiving (each
// path is matched forward and reversed).
//
// Why combined-path instead of per-stroke / count-gated matching: real users
// write cursively, so the same jamo may be 1, 2 or 3 strokes on different
// passes (e.g. ㅏ drawn as vertical+branch, or as one continuous stroke).
// Flattening to a path makes the matcher tolerant of that variation while
// still distinguishing shapes (validated 100% self-recognition on the 24-jamo
// set and correct on real cursive samples). Lower score = better.

import { TEMPLATES } from './templates.js';

const N = 24;                  // points per flattened path after resampling
const REJECT_THRESHOLD = 0.32; // mean normalized point distance; tune later

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

// Concatenate strokes (array of polylines) into one path in draw order.
function concatPath(strokes) {
  const out = [];
  for (const s of strokes) for (const p of s) out.push(p);
  return out;
}

// Translate + uniformly scale a path so the bounding box's longest side becomes
// 1 and the shape is centered in the unit box. Aspect preserved (keeps ㅡ flat
// and ㅣ tall).
function normalizePath(path) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of path) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.max(w, h) || 1;
  const offX = (1 - w / scale) / 2;
  const offY = (1 - h / scale) / 2;
  return path.map(([x, y]) => [(x - minX) / scale + offX, (y - minY) / scale + offY]);
}

function meanPointDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
  return sum / a.length;
}

// Prepare a stroke-set into a normalized, resampled path for matching.
function prepare(strokes) {
  return resample(normalizePath(concatPath(strokes)), N);
}

// Pre-prepare the template library once.
const PREPARED = TEMPLATES.map((t) => ({ char: t.char, path: prepare(t.strokes) }));

// Distance between an input path and a template path, trying both directions.
function pathDistance(input, template) {
  const fwd = meanPointDistance(input, template);
  const rev = meanPointDistance(input, template.slice().reverse());
  return Math.min(fwd, rev);
}

// Rank all templates against a drawn stroke-set.
// Returns { candidates: [{char, score}] sorted best-first }. No threshold.
export function rank(strokes) {
  if (!strokes || strokes.length === 0) return { candidates: [] };
  const input = prepare(strokes);
  const candidates = PREPARED.map((t) => ({ char: t.char, score: pathDistance(input, t.path) }));
  candidates.sort((a, b) => a.score - b.score);
  return { candidates };
}

// Recognize a drawn stroke-set. `strokes` is an array of polylines, each an
// array of [x, y] points in raw canvas/screen coordinates.
// Returns { char, confidence, score } or null if nothing matches.
export function recognize(strokes) {
  const { candidates } = rank(strokes);
  const best = candidates[0];
  if (!best || best.score > REJECT_THRESHOLD) return null;
  const confidence = 1 - best.score / REJECT_THRESHOLD;
  return { char: best.char, confidence, score: best.score };
}

export const _internals = { resample, normalizePath, concatPath, prepare, N, REJECT_THRESHOLD };
