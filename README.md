# stamp-maker

LINEスタンプ(静止画・最大40個)の制作を助けるデスクトップアプリです。
参考画像から表情・ポーズ違いの画像をローカルで生成し、文字を載せて、LINE の仕様を検証したうえで PNG と ZIP に書き出します。

> LINE 社とは無関係の非公式ツールです。LINE Creators Market への登録は、利用者自身が公式の案内に従って行います。

## 主な機能

- **ローカル画像生成**: FLUX.2 klein 4B を [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp)(Metal)で実行します。素材は外部へ送信しません。
- **参考画像の作成**: 説明文から参考画像の候補を4枚生成できます。参考画像が複数あるときは、生成のたびにランダムで1枚を使います。
- **日本語から英語への変換**: 表情・ポーズ・維持したい特徴を Ollama(`gpt-oss:20b`)で英訳します。
- **文字の合成**: 文字は画像と分けて保持するため、文言を直しても再生成は不要です。
- **LINE 仕様の検証と書き出し**: 画像サイズ、PNG 容量、偶数サイズ、ZIP 容量、販売情報の文字数を検証し、`01.png`…、`main.png`、`tab.png`、`stamps.zip`、`sales.json` をダウンロードフォルダに出力します。
- **申請準備**: 申請前チェックリスト、販売情報のコピー、LINE Creators Market を開くボタン。

## 動作環境

- macOS(Apple Silicon)。画像生成が Metal 専用のため、Windows と Linux では動きません。
- 動作確認は Apple M4 / メモリ 24GB のみです。画像生成のピークメモリは約10GB、1枚あたり約27秒です。
- 空きディスク約10GB(モデルと実行ファイル)。
- 英訳機能を使う場合は [Ollama](https://ollama.com) と `gpt-oss:20b`(約13GB)。英訳を使わず、英語で直接入力することもできます。

## セットアップ

```bash
git clone https://github.com/7thCode/stamp-maker.git
cd stamp-maker
npm ci
scripts/setup-sdcpp.sh   # sd-cli のビルドとモデル(約8GB)の取得。git と cmake が必要
npm run dev
```

`scripts/setup-sdcpp.sh` は、`~/Library/Application Support/stampMaker/sdcpp/` に次のものを置きます。

| ファイル | 用途 |
|---|---|
| `bin/sd-cli` | stable-diffusion.cpp(Metal)をビルドしたもの |
| `models/flux-2-klein-4b-Q8_0.gguf` | FLUX.2 klein 4B(Apache 2.0) |
| `models/Qwen3-4B-Q8_0.gguf` | テキストエンコーダ Qwen3 4B(Apache 2.0) |
| `models/flux2-vae.safetensors` | VAE |

配置先は環境変数 `STAMP_SD_ROOT` で変えられます。英訳の接続先とモデルは `STAMP_OLLAMA_URL`、`STAMP_TRANSLATE_MODEL` で変えられます。

## インストール(実環境へ)

開発環境を使わず、`/Applications` に入れて使う手順です。

### A. モデル同梱版(`npm run package` で作った .app)

`sd-cli` とモデルが入っているため、追加の準備は不要です(約8.5GB)。

1. 開発用のMacで `npm run package` を実行し、`dist/mac-arm64/StampMaker.app` を作る。
2. 起動中なら終了してから、`/Applications` へコピーする。サイズが大きいので `ditto` を使う。古い版が入っているときは、先に消す(重ねてコピーすると、古い版にだけあるファイルが残り、署名が壊れて「壊れているため開けません」と出ることがある)。

   ```bash
   rm -rf /Applications/StampMaker.app
   ditto dist/mac-arm64/StampMaker.app /Applications/StampMaker.app
   ```

3. 別のMacへ運ぶ場合は、外付けディスクなどで `.app` ごとコピーし、2. と同じコマンドで入れる。ネットワーク経由で受け取ったときは、隔離属性を外す。

   ```bash
   xattr -dr com.apple.quarantine /Applications/StampMaker.app
   ```

4. 初回は、未署名のため Gatekeeper の警告が出る。Finder で右クリックして「開く」を選ぶ(警告が出ない場合は不要)。
5. 起動して、プロジェクトを作成できれば完了。

更新するときも、古いアプリを消してから同じ手順でコピーします。プロジェクトは別の場所にあるため、消えません。

### B. dmg 版(GitHub Actions / Release の成果物)

dmg にはモデルが入っていません。

1. dmg を開き、`StampMaker.app` を `/Applications` へドラッグする。警告が出たら A-4 と同じ手順で開く。
2. アプリを起動する。初回は、画像生成の環境(`sd-cli` のビルドとモデル約8GB)を自動で用意する。画面上部に進み具合が出て、完了すると消える(数十分かかることがある)。
   - 準備中も、プロジェクトの作成や文言の編集はできる。画像の生成は、準備が終わってからになる。
   - ビルドに `git` と `cmake` が必要。無い場合は画面に入れ方が出るので、入れてから「再試行」を押す(`git` は `xcode-select --install`、`cmake` は `brew install cmake`)。
   - 途中で失敗したときも、「再試行」で続きから行う(取得済みのモデルは取り直さない)。
   - 手動で行う場合は、`scripts/setup-sdcpp.sh` を実行してもよい。

   `~/Library/Application Support/stampMaker/sdcpp/` に `sd-cli` とモデルが置かれ、アプリが自動で使います。

### 英訳機能(任意)

[Ollama](https://ollama.com) を入れ、`ollama pull gpt-oss:20b`(約13GB)を実行します。Ollama を起動した状態で、「参考画像・設定」の英訳ボタンが使えます。`gpt-oss:20b` が無くても、`gpt-oss:120b` など `gpt-oss` 系のモデルが入っていれば自動で使います。別のモデルを使う場合は、環境変数 `STAMP_TRANSLATE_MODEL` で指定します。使わない場合は、英語の欄へ直接入力してください。参考画像の生成は、Ollama が無くても動きます(入力した文章をそのまま使います)。

### 開発環境のプロジェクトを引き継ぐ

開発版と実環境版は、同じ `~/Library/Application Support/StampMaker/` を使うため、移行は不要です。別のMacへ移すときは、`projects/` フォルダをコピーしてください。

### アンインストール

```bash
rm -rf /Applications/StampMaker.app
```

プロジェクトを消す場合は `~/Library/Application Support/StampMaker/` を、モデルを消す場合は `~/Library/Application Support/stampMaker/sdcpp/` を削除します。macOS は大文字小文字を区別しないため、2つは同じフォルダの中にあります。削除すると元に戻せません。

### うまくいかないとき

| 症状 | 対処 |
|---|---|
| 「壊れているため開けません」と出る | `xattr -dr com.apple.quarantine /Applications/StampMaker.app` を実行する |
| 「画像生成の準備ができていません」と出る(dmg 版) | 画面の理由に従い、`git`・`cmake` を入れて「再試行」を押す。ネットワークが原因なら、つなぎ直して「再試行」 |
| 生成が途中で失敗する | 他の重いアプリを閉じてメモリを空ける(ピーク約10GB) |
| 英訳できない | Ollama が起動しているか、`gpt-oss:20b` を取得済みか確認する |

## 使い方

1. プロジェクトを作成し、「参考画像・設定」で参考画像と維持したい特徴を入れる。
2. 「構成・文言」でスタンプの数、文言、表情、ポーズを決める。
3. 「生成・確認」で生成し、採用するスタンプを選ぶ。
4. 「販売情報」を入力し、「検証・出力」で書き出す。
5. 「申請準備」でチェックを行い、LINE Creators Market で登録する。

表情の変更は安定していますが、ポーズの大きな変更(お辞儀など)は失敗しやすいです。気に入らない画像は再生成してください。

## 開発

```bash
npm run dev        # 開発用に起動
npm test           # テスト(実機生成の統合テストは sd-cli とモデルがあるときだけ実行)
npm run typecheck  # 型チェック
npm run build      # electron-vite のビルド
npm run package    # モデル込みの StampMaker.app(約8.5GB)を dist/ に作る
```

CI(GitHub Actions)は、モデルを含まない macOS 向けの dmg をビルドします。dmg から起動する場合も、モデルは `scripts/setup-sdcpp.sh` で別に用意してください。

## データの保存先

プロジェクトは `~/Library/Application Support/StampMaker/projects/` に保存されます。

## 注意

- 生成した画像の権利、第三者の権利の侵害、LINE の審査基準への適合は、利用者の責任で確認してください。アプリの「申請前チェック」は、確認を促すだけで合否を判定しません。
- 参考画像には、自作または利用の許諾がある画像を使ってください。
- 同梱ではなく、利用者が取得するモデルには、それぞれのライセンスがあります。

## ライセンス

[MIT](LICENSE)
