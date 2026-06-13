#!/usr/bin/env node
/*
 * export-teto.js — re-export daniwell's codec-encoded Teto BASE samples
 * (data/s/hiragana.json, keys "1".."114" = each kana's primary sample) to plain
 * .mp3 files, producing a "standard"-loader voicebank. Self-extracts the decode
 * constants from app.js so the decode is byte-accurate.
 *
 * Base samples are what play on write (_ids[index][0]); variations are a later
 * enrichment. Run: node scripts/export-teto.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "web", "tetohira");
const APP = path.join(ROOT, "js", "app.js");
const HIRAGANA = path.join(ROOT, "data", "s", "hiragana.json");
const OUT = path.join(ROOT, "banks", "teto-std");

const app = fs.readFileSync(APP, "utf8");

const seed = app.match(/"(b_r_8_sbgm[^"]*)"/)[1];
const prefix = seed.split("").map(c => String.fromCharCode(c.charCodeAt(0) + 2)).join("");
if (prefix !== "data:audio/mp3;base64,") throw new Error("prefix mismatch: " + prefix);

const o = app.match(/o = \[(111[0-9, ]+)\]/)[1].split(",").map(s => parseInt(s.trim(), 10));
const r = o.length;
const HEADER = app.match(/\] = n \+ "([A-Za-z0-9+/]+)"/)[1];

function decode(s) {
  const u = s.length, h = s.split("");
  for (let l = u - 1; l >= 0; l--) { const c = (l + o[l % r]) % u; const t = h[l]; h[l] = h[c]; h[c] = t; }
  for (let d = u - 1; d >= 0; d--) h[d] = String.fromCharCode(h[d].charCodeAt(0) - (d % 4));
  return Buffer.from(HEADER + h.join(""), "base64");
}

// fresh output dir
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const hira = JSON.parse(fs.readFileSync(HIRAGANA, "utf8")); // keys "1".."114"; key N => kana index N-1
const samples = {};
let files = 0;
for (const key of Object.keys(hira)) {
  const idx = parseInt(key, 10) - 1;
  const bytes = decode(hira[key]);
  if (files === 0 && bytes.slice(0, 3).toString("ascii") !== "ID3") {
    throw new Error("decode failed: not an MP3 (" + bytes.slice(0, 4).toString("hex") + ")");
  }
  const fname = key + ".mp3";
  fs.writeFileSync(path.join(OUT, fname), bytes);
  samples[String(idx)] = [fname];
  files++;
}

const manifest = {
  id: "teto-std",
  name: "테토 ↑ (높은 소리) / Teto+",
  loader: "standard",
  base: "banks/teto-std/",
  subs: 1,
  transpose: 12,
  samples,
  theme: { font: "Gaegu", colors: [16755370, 13967691], mascot: "ξ•∀•ξ", effects: "default" },
  credits: { vocal: "Kasane Teto (re-export)", url: "https://kasaneteto.jp/" }
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("decoded", files, "base mp3 files ->", OUT, "| header", HEADER.length, "perm", o.length);
