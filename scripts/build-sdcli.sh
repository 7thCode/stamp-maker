#!/bin/bash
# stable-diffusion.cpp(Metal)の sd-cli をビルドし、指定の場所へ置く。
# 使い方: scripts/build-sdcli.sh <出力先ファイル>   例: scripts/build-sdcli.sh build/sdcpp/bin/sd-cli
# CI では配布する .app に同梱するために、開発では scripts/setup-sdcpp.sh から呼ばれる。git と cmake が必要。
set -euo pipefail

SD_COMMIT="5a1ba5d895bec4e07deab80d6d791721cd59d9c2"
# 古い macOS でも動くよう、ビルドする機械の OS より低い下限を指定する
DEPLOYMENT_TARGET="14.0"

OUT="${1:?使い方: $0 <出力先ファイル>}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone -q --recurse-submodules https://github.com/leejet/stable-diffusion.cpp "$WORK/src"
git -C "$WORK/src" checkout -q "$SD_COMMIT"
git -C "$WORK/src" submodule update -q --init --recursive
cmake -S "$WORK/src" -B "$WORK/build" -DSD_METAL=ON -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_DEPLOYMENT_TARGET="$DEPLOYMENT_TARGET" > /dev/null
cmake --build "$WORK/build" --config Release -j 8 --target sd-cli

mkdir -p "$(dirname "$OUT")"
cp "$WORK/build/bin/sd-cli" "$OUT"
echo "完了: $OUT"
