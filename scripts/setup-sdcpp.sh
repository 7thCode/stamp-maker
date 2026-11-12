#!/bin/bash
# 開発用: sd-cli をビルドし、モデルとともに内部ストレージへ配置する。
# 配置先: ~/Library/Application Support/stampMaker/sdcpp (STAMP_SD_ROOT で変更可)
# 配布版のアプリは、sd-cli を同梱し、モデルを初回起動時に自分でダウンロードするため、このスクリプトは不要。
set -euo pipefail
cd "$(dirname "$0")"

ROOT="${STAMP_SD_ROOT:-$HOME/Library/Application Support/stampMaker/sdcpp}"
mkdir -p "$ROOT/bin" "$ROOT/models"

# sd-cli が既にあればビルドしない(作り直すときは bin/sd-cli を消す)
[ -x "$ROOT/bin/sd-cli" ] || ./build-sdcli.sh "$ROOT/bin/sd-cli"

# 取得中は .part に書き、完了してから名前を付ける(途中で切れたファイルを完成品と誤認しないため)
fetch() { # <出力名> <URL>
  if [ ! -f "$ROOT/models/$1" ]; then
    curl -fL --silent --show-error -o "$ROOT/models/$1.part" "$2"
    mv "$ROOT/models/$1.part" "$ROOT/models/$1"
  fi
}
HF=https://huggingface.co
fetch flux-2-klein-4b-Q8_0.gguf "$HF/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf"
fetch Qwen3-4B-Q8_0.gguf "$HF/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf"
fetch flux2-vae.safetensors "$HF/black-forest-labs/FLUX.2-klein-4B/resolve/main/vae/diffusion_pytorch_model.safetensors"

echo "完了: $ROOT"
