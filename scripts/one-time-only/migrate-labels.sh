#!/bin/bash
# Migrates the repository label set to the taxonomy in docs/references/LABELS.md.
# Run once, after the PR that lands the taxonomy is merged. Safe to re-run: every
# step is idempotent and skips work that is already done.
#
# `gh label edit --name` RENAMES in place, so a rename keeps the label on every PR
# and issue that already carries it — history is preserved, not rewritten.
#
# Requires: gh, authenticated with write access to the repository.
set -euo pipefail

DERIVED_COLOR="b3c5d7"

rename() { # rename <old> <new> [color]
  if gh label list --limit 200 --json name --jq '.[].name' | grep -qxF "$1"; then
    echo "rename: $1 -> $2"
    gh label edit "$1" --name "$2" ${3:+--color "$3"}
  else
    echo "rename: $1 not present, skipping"
  fi
}

create() { # create <name> <color> [description]
  echo "create: $1"
  gh label create "$1" --color "$2" ${3:+--description "$3"} --force
}

remove() { # remove <name>
  if gh label list --limit 200 --json name --jq '.[].name' | grep -qxF "$1"; then
    echo "delete: $1"
    gh label delete "$1" --yes
  else
    echo "delete: $1 not present, skipping"
  fi
}

echo "== Types: renamed to the conventional-commit vocabulary =="
# Renamed rather than recreated so the ~240 PRs carrying them keep their label.
rename "Feature 🎁"          "feat"      "$DERIVED_COLOR"
rename "Bug 🐛"              "fix"       "$DERIVED_COLOR"
rename "Documentation 📝"    "docs"      "$DERIVED_COLOR"
rename "Maintenance 🔨"      "chore"     "$DERIVED_COLOR"
rename "Breaking Change 💣"  "breaking"  "b60205"
# `refactor`, `test` and `ci` split out of the old `Maintenance 🔨` bucket, and
# `revert` is new — no existing label maps onto them.
create "refactor" "$DERIVED_COLOR" "Derived from the PR title"
create "test"     "$DERIVED_COLOR" "Derived from the PR title"
create "ci"       "$DERIVED_COLOR" "Derived from the PR title"
create "revert"   "$DERIVED_COLOR" "Derived from the PR title"

echo "== Chromatic gate: renamed, keeping it on the 145 PRs that use it =="
rename "no visual change" "Chromatic: skip" "bfdadc"

echo "== Review: consistent casing, unused polarities dropped =="
rename "Review: Code needed"      "Review: code needed"
rename "Review: A11y needed"      "Review: a11y needed"
rename "Review: Design needed"    "Review: design needed"
rename "Review: Chromatic Needed" "Review: Chromatic needed"
rename "Review: Code +1"          "Review: code +1"
rename "Review: A11y +1"          "Review: a11y +1"
rename "Review: Design +1"        "Review: design +1"
# Zero uses across ~800 PRs and issues; GitHub's "Request changes" covers rejection.
for discipline in "Code" "QA" "A11y" "UX" "Design" "Chromatic"; do
  remove "Review: ${discipline} -1"
done
remove "Review: Code +1 (with changes)"

echo "== Status and priority: namespaced =="
rename "Blocked"      "Status: blocked"
rename "do not merge" "Status: do not merge"
rename "question"     "Status: question" "cdcdcd"
remove "Don't merge"  # zero uses; duplicate of `do not merge`
rename "Priority: Low"      "Priority: low"
rename "Priority: Moderate" "Priority: medium"
rename "Priority: High"     "Priority: high"

echo "== Topic: migration trains =="
create "Topic: design tokens" "8250df" "Part of the design-token migration"

echo "== Superseded =="
remove "Dependencies"  # zero uses; Renovate titles its PRs chore(deps): …
# `feat` exists by now, so `enhancement` cannot be renamed onto it — move the items
# that carry it across first, then drop the duplicate.
gh issue list --state all --limit 200 --label "enhancement" --json number --jq '.[].number' |
  while read -r number; do
    echo "  issue #$number: enhancement -> feat"
    gh issue edit "$number" --add-label "feat" --remove-label "enhancement"
  done
remove "enhancement"

echo "== Backfill: derive the type label for every open PR =="
# New PRs get this from pr-lint.yml; open PRs predate it.
gh pr list --state open --limit 200 --json number,title --jq '.[] | "\(.number)\t\(.title)"' |
  while IFS=$'\t' read -r number title; do
    type="$(sed -nE 's/^([a-z]+)(\([^)]*\))?(!)?:[[:space:]].*/\1/p' <<<"$title")"
    [[ -z "$type" ]] && { echo "  #$number: title is not conventional, skipping"; continue; }
    labels="$type"
    [[ "$title" =~ ^[a-z]+(\([^\)]*\))?! ]] && labels="$labels,breaking"
    echo "  #$number: $labels"
    gh pr edit "$number" --add-label "$labels"
  done

echo "== Backfill: the design-token migration train =="
for pr in 940 941 942 943 944 945 946 947 948 950 954 \
          888 890 892 920 922 925 927 929 938 949; do
  gh pr edit "$pr" --add-label "Topic: design tokens"
done

echo "Done. Verify with: gh label list --limit 100"
