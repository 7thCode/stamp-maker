#!/bin/bash
# モデル込みの StampMaker.app を dist/ に作る。事前に scripts/setup-sdcpp.sh を実行しておくこと。
set -euo pipefail
cd "$(dirname "$0")/.."

export SD_BUNDLE_DIR="${STAMP_SD_ROOT:-$HOME/Library/Application Support/stampMaker/sdcpp}"
for f in bin/sd-cli models/flux-2-klein-4b-Q8_0.gguf models/Qwen3-4B-Q8_0.gguf models/flux2-vae.safetensors; do
  [ -f "$SD_BUNDLE_DIR/$f" ] || { echo "不足: $SD_BUNDLE_DIR/$f (scripts/setup-sdcpp.sh を実行してください)" >&2; exit 1; }
done

# 簡易署名が同梱ファイルにも書き込むため、読み取り専用のファイルがあると署名で失敗する。所有者の書き込みを許可しておく
chmod u+w "$SD_BUNDLE_DIR"/bin/sd-cli "$SD_BUNDLE_DIR"/models/*

# electron-builderは相対パスしか受け付けないため、同梱元へのリンクを張る
mkdir -p build
ln -sfn "$SD_BUNDLE_DIR" build/sdcpp

npx electron-vite build
npx electron-builder --mac dir --arm64 --config electron-builder.bundled.yml
