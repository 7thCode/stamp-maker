# stamp-maker

LINEスタンプ(静止画・最大40個)の制作支援デスクトップアプリ。Electron + React + TypeScript。**macOS(Apple Silicon)専用**(画像生成が Metal 依存)。
リポジトリ: github.com/7thCode/stamp-maker(利用者 `7thCode`)。MIT。

## このプロジェクトの規約(親ディレクトリの規則との差分)

親の `~/project/.claude/rules/` は Python 前提(pytest、snake_case、型ヒント)。**この TypeScript プロジェクトでは次を優先する**:

- 命名: 変数・関数は camelCase、型・コンポーネントは PascalCase、定数は UPPER_SNAKE_CASE(英語)。ファイル名は既存に合わせる(`sdRunner.ts`、`PlanTab.tsx`)
- コメント・UI 文言・コミットメッセージ・エラーメッセージ: **日本語**。「何をするか」より「なぜそうするか」を書く
- テスト: vitest、`tests/` に `<対象>.test.ts`。TDD 推奨(`test-driven-development` スキル)。外部依存(sd-cli・Ollama・ネットワーク)はモックか `tests/helpers/httpFixture.ts`
- マジックナンバー禁止。LINE の規格値は `src/shared/lineSpec.ts` の `LINE_SPEC` に集約済み。直書きしない
- 既存オブジェクトを変更せず新しいものを返す。早期リターン。1ファイル 200〜400 行目安

## コマンド

```bash
npm run dev          # 開発起動(要: scripts/setup-sdcpp.sh で sd-cli とモデルを用意)
npm test             # vitest(実機生成の統合テストは sd-cli とモデルがあるときだけ走る)
npm run typecheck    # tsc --noEmit
npm run build        # electron-vite build
npm run package      # モデル込み dist/mac-arm64/StampMaker.app(約8.5GB)
```

変更を完了とする前に **`npm run typecheck && npm test`** を必ず通す。

## 構成

```
src/main/       Electron メイン。IPC(index.ts)、プロジェクト保存、sd-cli 実行、翻訳(Ollama)、書き出し
src/preload/    contextBridge。window.api を公開
src/renderer/   React UI。タブ: Setup / Plan / Gallery / Sales / Export / Publish
src/shared/     main と renderer で共有する型・検証・規格値(api.ts が IPC の契約)
tests/          vitest
scripts/        sd-cli のビルド・セットアップ、パッケージ作成、ブランチ保護
docs/index.html GitHub Pages のダウンロードページ
```

- IPC を足すときは `src/shared/api.ts`(`StampApi`)→ `src/preload/index.ts` → `src/main/index.ts` の3か所を揃える
- 画像生成は `src/main/generators.ts` の `ImageGenerator` レジストリ(`flux2-klein-4b-local`、動作確認用 `passthrough`)。実行は `sdRunner.ts`、モデル取得は `sdModels.ts` / `sdSetup.ts`
- 参考画像は `normalizeReference`(`imagePipeline.ts`)で普通の PNG にしてから sd-cli へ渡す(WebP などは sd-cli が読めない)
- 文字は画像と分けて保持し、書き出し時に合成する(`compose.ts`)。文言を直しても再生成は不要
- `sharp` は native のため、vite で external、electron-builder で `asarUnpack`
- sd-cli とモデルの置き場: 既定 `~/Library/Application Support/stampMaker/sdcpp/`、`STAMP_SD_ROOT` で変更。Ollama は `STAMP_OLLAMA_URL` / `STAMP_TRANSLATE_MODEL`
- プロジェクトデータ: `~/Library/Application Support/StampMaker/projects/`(macOS は大文字小文字を区別しないので、上記 stampMaker と同じフォルダ)

## LINE 仕様

規格値は `src/shared/lineSpec.ts` のみ(確認日 `confirmedAt` を持つ)。検証は `src/shared/validate.ts`。規格を更新するときは `update-line-spec` スキルを使う。アプリは**審査の合否を判定しない**(確認を促すだけ)。LINE 社とは無関係の非公式ツールである旨を崩さない。

## Git / リリース

- `main` は PR 必須(ruleset)。**作業は必ずフィーチャーブランチ**。main へ直接 push しない
- コミットメッセージは日本語。末尾に Co-Authored-By、PR 本文末尾に Claude Code の行
- **PR は作成で止め、利用者の「PR #N をマージして」を待つ**。利用者が先に GitHub でマージしていることもあるので、マージ前に `gh pr view` で状態を確認する
- リリース: `release` スキル。パッケージ作成と入れ替え: `package-install` スキル
- CI は `7thCode/actions-templates` の reusable workflow を呼ぶだけ。ワークフロー本体をこのリポジトリへ複製しない
- `dist/` `out/` `build/` は gitignore 済み。成果物をコミットしない

## 落とし穴

- 署名は ad-hoc(`identity: '-'`、`hardenedRuntime: false`)。署名なしだと「壊れている」と表示される。変えない
- dmg 名は `StampMaker-arm64.dmg` に固定(Pages が `releases/latest/download/` へ直接リンク)
- `/Applications` の入れ替えは `rm -rf` → `ditto`。重ねてコピーすると署名が壊れる
- `npx @electron/asar extract-file` は**プロジェクトの外**で実行する(package.json を上書きされた事故あり)
- 検証用のダウンロード・展開は scratchpad の専用フォルダで行う
- ビルドの成否は、ログの `exit=` と `codesign --verify` で確かめる。`| tail` や `&&` の連結は失敗を隠す
- `npm version` は package.json の整形を崩すので使わない(リリーススキル参照)
- 動作確認済みの環境は Apple M4 / 24GB のみ。生成のピークメモリ約10GB。ほかの環境での動作は未確認と書く
