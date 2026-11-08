#!/bin/bash
# stable-diffusion.cpp(Metal)をビルドし、モデルとともに内部ストレージへ配置する。
# 配置先: ~/Library/Application Support/stampMaker/sdcpp (STAMP_SD_ROOT で変更可)
set -euo pipefail

SD_COMMIT="5a1ba5d895bec4e07deab80d6d791721cd59d9c2"
ROOT="${STAMP_SD_ROOT:-$HOME/Library/Application Support/stampMaker/sdcpp}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$ROOT/bin" "$ROOT/models"

git clone -q --recurse-submodules https://github.com/leejet/stable-diffusion.cpp "$WORK/src"
git -C "$WORK/src" checkout -q "$SD_COMMIT"
git -C "$WORK/src" submodule update -q --init --recursive
cmake -S "$WORK/src" -B "$WORK/build" -DSD_METAL=ON -DCMAKE_BUILD_TYPE=Release > /dev/null
cmake --build "$WORK/build" --config Release -j 8 --target sd-cli
cp "$WORK/build/bin/sd-cli" "$ROOT/bin/sd-cli"

fetch() { # <出力名> <URL>
  [ -f "$ROOT/models/$1" ] || curl -fL -o "$ROOT/models/$1" "$2"
}
HF=https://huggingface.co
fetch flux-2-klein-4b-Q8_0.gguf "$HF/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf"
fetch Qwen3-4B-Q8_0.gguf "$HF/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf"
fetch flux2-vae.safetensors "$HF/black-forest-labs/FLUX.2-klein-4B/resolve/main/vae/diffusion_pytorch_model.safetensors"

echo "完了: $ROOT"
