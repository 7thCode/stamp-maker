#!/bin/bash
# モデル込みの StampMaker.app を dist/ に作る。事前に scripts/setup-sdcpp.sh を実行しておくこと。
set -euo pipefail
cd "$(dirname "$0")/.."

export SD_BUNDLE_DIR="${STAMP_SD_ROOT:-$HOME/Library/Application Support/stampMaker/sdcpp}"
for f in bin/sd-cli models/flux-2-klein-4b-Q8_0.gguf models/Qwen3-4B-Q8_0.gguf models/flux2-vae.safetensors; do
  [ -f "$SD_BUNDLE_DIR/$f" ] || { echo "不足: $SD_BUNDLE_DIR/$f (scripts/setup-sdcpp.sh を実行してください)" >&2; exit 1; }
done

# electron-builderは相対パスしか受け付けないため、同梱元へのリンクを張る
mkdir -p build
ln -sfn "$SD_BUNDLE_DIR" build/sdcpp

npx electron-vite build
npx electron-builder --mac --arm64
