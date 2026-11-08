#!/usr/bin/env bash
# リポジトリ作成直後に一度だけ実行し、main への変更に PR を必須にする。
# 使い方: scripts/setup-branch-protection.sh <owner>/<repo>
set -euo pipefail

repo="${1:?Usage: setup-branch-protection.sh <owner>/<repo>}"

# ルールはJSONのまま渡す(-F だと文字列になり 422 になる)
gh api "repos/${repo}/rulesets" -X POST --input - > /dev/null <<'JSON'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    }
  ]
}
JSON

echo "Branch ruleset created on ${repo}: main requires a pull request."
