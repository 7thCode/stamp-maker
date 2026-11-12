#!/bin/bash
# stable-diffusion.cpp(Metal)をビルドし、モデルとともに内部ストレージへ配置する。
# 配置先: ~/Library/Application Support/stampMaker/sdcpp (STAMP_SD_ROOT で変更可)
# アプリの初回起動時にも実行される。「STEP n/m 説明」の行は、アプリが進行表示に使う。
set -euo pipefail

SD_COMMIT="5a1ba5d895bec4e07deab80d6d791721cd59d9c2"
ROOT="${STAMP_SD_ROOT:-$HOME/Library/Application Support/stampMaker/sdcpp}"
TOTAL=4
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$ROOT/bin" "$ROOT/models"

# sd-cli が既にあればビルドしない(ダウンロードの再試行で作り直さないため。作り直すときは bin/sd-cli を消す)
echo "STEP 1/$TOTAL 画像生成エンジン(sd-cli)を用意しています(初回は数分)"
if [ ! -x "$ROOT/bin/sd-cli" ]; then
  git clone -q --recurse-submodules https://github.com/leejet/stable-diffusion.cpp "$WORK/src"
  git -C "$WORK/src" checkout -q "$SD_COMMIT"
  git -C "$WORK/src" submodule update -q --init --recursive
  cmake -S "$WORK/src" -B "$WORK/build" -DSD_METAL=ON -DCMAKE_BUILD_TYPE=Release > /dev/null
  cmake --build "$WORK/build" --config Release -j 8 --target sd-cli
  cp "$WORK/build/bin/sd-cli" "$ROOT/bin/sd-cli"
fi

# 取得中は .part に書き、完了してから名前を付ける(途中で切れたファイルを完成品と誤認しないため)
fetch() { # <番号> <出力名> <説明> <URL>
  echo "STEP $1/$TOTAL $3を取得しています"
  if [ ! -f "$ROOT/models/$2" ]; then
    curl -fL --silent --show-error -o "$ROOT/models/$2.part" "$4"
    mv "$ROOT/models/$2.part" "$ROOT/models/$2"
  fi
}
HF=https://huggingface.co
fetch 2 flux-2-klein-4b-Q8_0.gguf "画像生成モデル(約4GB)" "$HF/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf"
fetch 3 Qwen3-4B-Q8_0.gguf "テキストエンコーダ(約4GB)" "$HF/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf"
fetch 4 flux2-vae.safetensors "VAE(約0.3GB)" "$HF/black-forest-labs/FLUX.2-klein-4B/resolve/main/vae/diffusion_pytorch_model.safetensors"

echo "完了: $ROOT"
