#!/usr/bin/env bash
# Rebuild Vellum's voicebank audio locally (the sliced audio is gitignored).
# Requires: node, ffmpeg/ffprobe, 7z, and `npm install adm-zip`.
set -e
cd "$(dirname "$0")/.."
SRC=scripts/banks-src
mkdir -p "$SRC"
enc() { node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"; }

# Adachi Rei — CV (単独音)
[ -f "$SRC/adachi-cv.zip" ] || curl -sL "https://archive.org/download/Adachi_Rei_Voicebank/$(enc '足立レイver3.1.2(単独音).zip')" -o "$SRC/adachi-cv.zip"
node scripts/build-bank.js adachi "$SRC/adachi-cv.zip" "아다치 레이 / Adachi Rei" 0 "Do Hyeon" "48cae4,0096c7"

# --- More banks (now consistent: build-bank.js RMS-normalizes every slice to -16 dB) ---
# Defoko — rar, extract then slice
[ -f "$SRC/defoko.rar" ] || curl -sL "https://archive.org/download/defoko-aquestone/$(enc 'Defoko aquestone.rar')" -o "$SRC/defoko.rar"
[ -d "$SRC/_defoko" ] || 7z x "$SRC/defoko.rar" -o"$SRC/_defoko" -y >/dev/null
node scripts/build-bank.js defoko "$SRC/_defoko" "데포코 / Defoko" 0 "Dongle" "9aa3a8,ffffff"

echo "Banks rebuilt into web/vellum/banks/."
