---
name: release
description: stamp-maker の新バージョンをリリースする(バージョン更新PR → タグ → CI → dmg検証 → 公開)。「vX.Y.Z で進めて」「リリースして」と言われたときに使う
disable-model-invocation: true
argument-hint: "<X.Y.Z>"
---

# リリース手順

引数のバージョン `X.Y.Z` でリリースする。**PR のマージは、利用者が「PR #N をマージして」と言うまで行わない**。「vX.Y.Z で進めて」の指示は、マージ後のタグ打ちと公開まで含む。

## 1. バージョンを上げる PR

1. `git status` / `git branch` を確認し、`git checkout -b chore/release-X.Y.Z`(main から)
2. 次の3か所を直接編集する(`npm version` は整形を崩すので使わない)
   - `package.json` の `"version"`
   - `package-lock.json` の先頭付近の `"version"` 2か所(ルートと `packages.""`)
   - `docs/index.html` の「最新版: vX.Y.Z」
3. `npm run typecheck && npm test` を通す
4. コミット(日本語。例: 「バージョンをX.Y.Zに更新する」)→ push → `gh pr create`(本文末尾に Claude Code の行)
5. **ここで止めて報告する**。マージの指示を待つ

## 2. マージ後

1. `gh pr view <N>` で状態を確認(利用者が先にマージしていることがある)
2. 指示があれば `gh pr merge <N> --merge` → `git checkout main && git pull` → ブランチ削除
3. `git tag -a vX.Y.Z -m "vX.Y.Z"` → `git push origin vX.Y.Z`
4. CI を待つ(約7分。sd-cli のビルドを含む)。`gh run watch` で確認

## 3. 下書きリリースの検証と公開

electron-builder は**下書きリリースを2つ**作る。**dmg が付いているほうが本物**で、もう一方(.blockmap だけ)は放置してよい。

1. `gh api repos/7thCode/stamp-maker/releases` で下書きを見つけ、dmg のアセット ID を得る
2. scratchpad の専用フォルダへダウンロードする: `gh api -H "Accept: application/octet-stream" repos/7thCode/stamp-maker/releases/assets/<id> > StampMaker-arm64.dmg`
3. 検証する
   - `hdiutil verify StampMaker-arm64.dmg`
   - マウントして `codesign --verify --deep --strict <StampMaker.app>`
   - 同梱の `sd-cli` で実際に1枚生成できるか(`Contents/Resources/sdcpp/bin/sd-cli`。モデルは開発環境のものを使う)
4. 全部通ったら公開(判定は利用者の指示がある場合のみ):
   `gh api -X PATCH repos/7thCode/stamp-maker/releases/<id> -F draft=false -f make_latest=true`
5. `https://github.com/7thCode/stamp-maker/releases/latest/download/StampMaker-arm64.dmg` が取得できることを確認する
6. 後片付け: マウントした dmg を `hdiutil detach`、ダウンロードした dmg を削除

## 注意

- dmg 名は `StampMaker-arm64.dmg` 固定(`electron-builder.yml` の `artifactName`)。変えると Pages のボタンが壊れる
- 実機で未確認のことは、公開報告に「未確認」と明記する(モデル約8.5GBの通しダウンロードなど)
