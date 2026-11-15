---
name: package-install
description: モデル同梱の StampMaker.app を作って /Applications へ入れ替える。「パッケージを作って」「実環境に入れて」「アプリを更新して」と言われたときに使う
disable-model-invocation: true
---

# パッケージ作成と /Applications への入れ替え

## 前提の確認

- `~/Library/Application Support/stampMaker/sdcpp/` に `bin/sd-cli` とモデル3つがあること(無ければ `scripts/setup-sdcpp.sh`。約8.5GB、`git` と `cmake` が必要)
- 空きディスク約20GB(.app が約8.5GB、入れ替えで同程度)
- `StampMaker.app` が起動中なら、利用者に終了してもらう

## 手順

1. ビルドして**終了コードを記録する**(`| tail` や `&&` の連結は失敗を隠す)

   ```bash
   npm run package > "$SCRATCH/package.log" 2>&1; echo "exit=$?" >> "$SCRATCH/package.log"
   tail -5 "$SCRATCH/package.log"
   ```

   `exit=0` を確認する
2. 署名を検証する: `codesign --verify --deep --strict dist/mac-arm64/StampMaker.app`
3. 入れ替える(**先に消してから ditto。重ねてコピーしない**)。`rm -rf` は利用者の確認を取ってから行う

   ```bash
   rm -rf /Applications/StampMaker.app
   ditto dist/mac-arm64/StampMaker.app /Applications/StampMaker.app
   codesign --verify --deep --strict /Applications/StampMaker.app
   ```

4. 別のMacへ運ぶ場合や、ネットワーク経由で受け取った場合は `xattr -dr com.apple.quarantine /Applications/StampMaker.app`
5. 報告する: ビルドの `exit`、署名検証の結果、入れ替えの結果。**起動したかどうかは、確認していなければ「未確認」と書く**

## 注意

- プロジェクトデータは `~/Library/Application Support/StampMaker/` にあり、アプリを消しても残る
- `npx @electron/asar extract-file` などで中身を調べるときは、プロジェクトの外の専用フォルダで行う
- 一時ファイル・ログは scratchpad に置き、終わったら片付ける
