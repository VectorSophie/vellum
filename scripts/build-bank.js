#!/usr/bin/env node
/*
 * build-bank.js — turn a CV (単独音) UTAU voicebank zip into a Vellum "standard"
 * voicebank: parse oto.ini (Shift-JIS), ffmpeg-slice each mora, write per-index
 * mp3 + manifest.json keyed by our kana index (same order as app.js D._list).
 *
 * Usage: node scripts/build-bank.js <id> <zip> "<display name>" <transpose>
 * Audio output is gitignored (local-only); re-run to rebuild.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const AdmZip = require("adm-zip");

// kana inventory in D._list order (index 0..113)
const KANA = ["あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ","た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ","ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん","が","ぎ","ぐ","げ","ご","ざ","じ","ず","ぜ","ぞ","だ","ぢ","づ","で","ど","ば","び","ぶ","べ","ぼ","ぱ","ぴ","ぷ","ぺ","ぽ","きゃ","きゅ","きょ","しゃ","しゅ","しょ","ちゃ","ちゅ","ちょ","にゃ","にゅ","にょ","ひゃ","ひゅ","ひょ","みゃ","みゅ","みょ","りゃ","りゅ","りょ","ぎゃ","ぎゅ","ぎょ","じゃ","じゅ","じょ","ぢゃ","ぢゅ","ぢょ","びゃ","びゅ","びょ","ぴゃ","ぴゅ","ぴょ","ふぁ","ふぃ","ふぇ","ふぉ","しぇ","ちぇ","じぇ"];
const KANA_INDEX = {}; KANA.forEach((k, i) => { KANA_INDEX[k] = i; });

const dec = new TextDecoder("shift_jis");
const sjis = (buf) => dec.decode(buf);
const base = (p) => p.split(/[\/\\]/).pop();

function ffprobeMs(file) {
  try {
    const out = execFileSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
    return (parseFloat(out) || 0) * 1000;
  } catch (e) { return 0; }
}

function main() {
  const id = process.argv[2], zipPath = process.argv[3], displayName = process.argv[4] || id, transpose = parseInt(process.argv[5] || "0", 10);
  const themeFont = process.argv[6] || "Jua";
  const themeColors = (process.argv[7] || "").split(",").map((h) => parseInt(h.trim(), 16)).filter((n) => !isNaN(n));
  if (!id || !zipPath) { console.error("usage: build-bank.js <id> <zip> <name> <transpose> [themeFont] [hex,hex]"); process.exit(1); }

  const OUT = path.resolve(__dirname, "..", "web", "vellum", "banks", id);
  const TMP = path.resolve(__dirname, "banks-src", "_tmp_" + id);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });

  const otoTexts = [];
  const wavs = {};                       // basename -> Buffer
  if (fs.statSync(zipPath).isDirectory()) {  // extracted folder (filenames already correct on disk)
    const walk = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, ent.name);
        if (ent.isDirectory()) walk(fp);
        else if (/^oto\.ini$/i.test(ent.name)) otoTexts.push(sjis(fs.readFileSync(fp)));
        else if (/\.wav$/i.test(ent.name)) wavs[ent.name] = fs.readFileSync(fp);
      }
    };
    walk(zipPath);
  } else {                                   // zip (decode Shift-JIS entry names)
    const zip = new AdmZip(zipPath);
    for (const e of zip.getEntries()) {
      if (e.isDirectory) continue;
      const name = sjis(e.rawEntryName);
      const b = base(name);
      if (/^oto\.ini$/i.test(b)) otoTexts.push(sjis(e.getData()));
      else if (/\.wav$/i.test(b)) wavs[b] = e.getData();
    }
  }
  if (!otoTexts.length) throw new Error("no oto.ini found");
  console.log(`  oto.ini files: ${otoTexts.length} | wav files: ${Object.keys(wavs).length}`);

  const samples = {};
  for (const text of otoTexts) {
    for (const line of text.split(/\r?\n/)) {
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const file = base(line.slice(0, eq).trim());
      const p = line.slice(eq + 1).split(",");
      const alias = (p[0] || "").trim();
      let kana = alias.replace(/^[-_]\s*/, "").trim();   // strip leading "- " (VCV onset prefix)
      if (!(kana in KANA_INDEX)) kana = file.replace(/\.wav$/i, "");
      if (!(kana in KANA_INDEX)) continue;
      const idx = KANA_INDEX[kana];
      if (samples[idx]) continue;                 // first occurrence wins
      const wav = wavs[file];
      if (!wav) continue;
      const offset = parseFloat(p[1]) || 0;
      const cutoff = parseFloat(p[3]) || 0;
      const preutter = parseFloat(p[4]) || 0;
      const tmpWav = path.join(TMP, idx + ".wav");
      fs.writeFileSync(tmpWav, wav);
      const durMs = ffprobeMs(tmpWav);
      let endMs = cutoff < 0 ? offset - cutoff : durMs - cutoff;
      // start near the vowel onset (preutterance), keeping ~50ms of consonant attack;
      // VCV banks have long consonant/transition regions, so raw offset would be silent
      const startMs = offset + Math.max(0, preutter - 50);
      if (!(endMs > startMs)) endMs = durMs || (startMs + 700);
      const CAP = 240; // staccato: trim long held vowels to a short "ga!"
      const startS = startMs / 1000;
      const lenS = Math.max(0.1, Math.min((endMs - startMs) / 1000, CAP / 1000));
      const fadeDur = Math.min(0.09, lenS * 0.4);
      const fadeSt = Math.max(0, lenS - fadeDur);
      const outName = idx + ".mp3";
      // -ss BEFORE -i (input seek) resets PTS so afade is relative to the clip, not absolute
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(startS), "-i", tmpWav, "-t", String(lenS),
        "-af", "afade=t=out:st=" + fadeSt.toFixed(3) + ":d=" + fadeDur.toFixed(3),
        "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "6", path.join(OUT, outName)]);
      samples[idx] = [outName];
    }
  }

  const manifest = {
    id, name: displayName, loader: "standard", base: "banks/" + id + "/", subs: 1, transpose,
    samples,
    theme: { font: themeFont, colors: themeColors.length ? themeColors : [989213, 13967691], mascot: "", effects: "default" },
    credits: {}
  };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.rmSync(TMP, { recursive: true, force: true });
  const got = Object.keys(samples).length;
  console.log(`[${id}] "${displayName}" -> ${got}/${KANA.length} kana sliced into ${OUT}`);
  if (got < 40) console.warn("  ⚠ low kana count — check oto alias format (maybe not 単独音/CV)");
}
main();
