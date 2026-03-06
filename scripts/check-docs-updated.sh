#!/usr/bin/env bash
# check-docs-updated.sh
# Fails if new files are added to git without updating documentation.
# Works in two modes:
#   pre-commit hook: compares staged changes against HEAD
#   CI (pull request): compares PR branch against base branch
set -euo pipefail

# --- Determine diff targets ---
if [ "${CI:-}" = "true" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
  # CI mode: compare full PR diff against base branch
  BASE="origin/${GITHUB_BASE_REF}"
  ADDED=$(git diff --name-only --diff-filter=A "$BASE"...HEAD)
  DOCS_CHANGED=$(git diff --name-only "$BASE"...HEAD | grep -E '^(docs/|README\.md)' || true)
else
  # Local pre-commit mode: compare staged changes against HEAD
  ADDED=$(git diff --cached --name-only --diff-filter=A)
  DOCS_CHANGED=$(git diff --cached --name-only | grep -E '^(docs/|README\.md)' || true)
fi

# --- Filter out docs files from the added list ---
# Adding a doc file itself should not trigger the gate
ADDED_NON_DOCS=$(echo "$ADDED" | grep -vE '^(docs/|README\.md)' || true)

# --- Nothing added? Pass. ---
if [ -z "$ADDED_NON_DOCS" ]; then
  exit 0
fi

# --- Docs were updated? Pass. ---
if [ -n "$DOCS_CHANGED" ]; then
  exit 0
fi

# --- Fail with clear message ---
echo ""
echo "============================================================"
echo "  DOCS GATE FAILED"
echo "============================================================"
echo ""
echo "New files were added but no documentation was updated."
echo ""
echo "Added files:"
echo "$ADDED_NON_DOCS" | sed 's/^/  - /'
echo ""
echo "To pass this check, update at least one of:"
echo "  - README.md  (repo root)"
echo "  - docs/*     (any file under docs/)"
echo ""
echo "============================================================"
exit 1
