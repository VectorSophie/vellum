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
const { execFileSync, spawnSync } = require("child_process");
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

// RMS gain (dB) to bring a clip to TARGET_RMS, clamped so its peak stays under TARGET_PEAK.
// EBU R128 loudnorm is unusable here: staccato samples are shorter than its 400ms gate
// (integrated reads -inf), so we normalize by mean/peak from volumedetect instead.
const TARGET_RMS = -16, TARGET_PEAK = -1;
function normGainDb(file) {
  let mean = NaN, peak = NaN;
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const s = (r.stderr || ""); // volumedetect prints stats to stderr
  const m = s.match(/mean_volume:\s*(-?[\d.]+) dB/), p = s.match(/max_volume:\s*(-?[\d.]+) dB/);
  if (m) mean = parseFloat(m[1]);
  if (p) peak = parseFloat(p[1]);
  if (isNaN(mean)) return 0;
  let g = TARGET_RMS - mean;
  if (!isNaN(peak) && peak + g > TARGET_PEAK) g = TARGET_PEAK - peak; // peak guard: never clip
  return g;
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
      const CAP = parseInt(process.env.STACCATO_MS || "200", 10); // staccato cap: tight "가!" not "가아아"; env-tunable (STACCATO_MS)
      const startS = startMs / 1000;
      const lenS = Math.max(0.1, Math.min((endMs - startMs) / 1000, CAP / 1000));
      const fadeDur = Math.min(0.09, lenS * 0.4);
      const fadeSt = Math.max(0, lenS - fadeDur);
      const outName = idx + ".mp3";
      const cutWav = path.join(TMP, idx + ".cut.wav");
      // pass 1: slice + fade to wav. -ss BEFORE -i (input seek) resets PTS so afade is relative to the clip
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(startS), "-i", tmpWav, "-t", String(lenS),
        "-af", "afade=t=out:st=" + fadeSt.toFixed(3) + ":d=" + fadeDur.toFixed(3),
        "-ac", "1", "-ar", "44100", cutWav]);
      // pass 1b: bake a short ambience tail so dry CV recordings don't sound dead.
      // Dry attack stays tight (diction); a multi-tap echo rings into a silent pad and fades.
      // REVERB=0 disables. (The "live later" upgrade is a global Web Audio convolver via AudioManager.addNode.)
      let toNorm = cutWav;
      if (process.env.REVERB !== "0") {
        const wetWav = path.join(TMP, idx + ".wet.wav");
        const tail = 0.18, total = lenS + tail, fSt = Math.max(0, total - 0.08);
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", cutWav,
          "-af", "apad=pad_dur=" + tail + ",aecho=0.85:0.7:20|35|50|65:0.4|0.3|0.22|0.15,afade=t=out:st=" + fSt.toFixed(3) + ":d=0.08",
          "-t", total.toFixed(3), wetWav]);
        fs.rmSync(cutWav, { force: true });
        toNorm = wetWav;
      }
      // pass 2: measure, then encode mp3 at consistent RMS (peak-guarded)
      const gain = normGainDb(toNorm);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", toNorm,
        "-af", "volume=" + gain.toFixed(2) + "dB",
        "-codec:a", "libmp3lame", "-q:a", "6", path.join(OUT, outName)]);
      fs.rmSync(toNorm, { force: true });
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
