---
name: update-line-spec
description: LINE Creators Market のスタンプ規格(サイズ・容量・個数・文字数)の変更をアプリへ反映する。「LINEの規格が変わった」「規格を確認し直して」と言われたときに使う
---

# LINE 規格の更新

規格値は `src/shared/lineSpec.ts` の `LINE_SPEC` に集約されている。値を他の場所へ直書きしない。

## 手順

1. 公式ガイドライン(`LINE_SPEC.source` の URL: https://creator.line.me/ja/guideline/sticker/)を取得して読む。**記憶ではなく、現在のページを根拠にする**(取得できなければ、利用者に内容を貼ってもらう)
2. 現在の `LINE_SPEC` と差分を表にして、利用者に見せる
3. ブランチを切る(`fix/line-spec-YYYY-MM-DD`)。**テストを先に直す**: `tests/validate.test.ts` ほか、規格値を前提にしたテスト(`grep -rn "LINE_SPEC\|370\|1024" tests`)
4. `lineSpec.ts` の値と `confirmedAt`(確認日、`YYYY-MM-DD`)を更新する
5. 検証・UI 文言が追従しているか確認する: `src/shared/validate.ts`、`src/main/imagePipeline.ts`、`src/renderer/src/compose.ts`、`PlanTab.tsx`、`SalesTab.tsx`、`src/shared/publish.ts`(チェックリスト)
6. `README.md` の「LINE 仕様の検証」の記述が変わっていれば直す
7. `npm run typecheck && npm test` を通し、PR を作って止める(マージの指示を待つ)

## 注意

- アプリは審査の合否を判定しない。「合格する」「通る」といった保証の文言を足さない
- 確認日を更新するのは、ガイドラインを実際に読み直したときだけ
