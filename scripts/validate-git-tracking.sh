#!/bin/bash
# Validates that all TypeScript source files are tracked by git
# Requirements: REQ-2, REQ-3

set -e

echo "🔍 Checking for untracked source files..."

# Find all .ts files in src/ that are not tracked by git
UNTRACKED=""
while IFS= read -r file; do
  if ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    UNTRACKED="$UNTRACKED$file"$'\n'
  fi
done < <(find src -name "*.ts" -type f 2>/dev/null)

# Remove trailing newline
UNTRACKED=$(echo "$UNTRACKED" | sed '/^$/d')

if [ -n "$UNTRACKED" ]; then
  echo "❌ Found untracked source files:"
  echo "$UNTRACKED"
  echo ""
  echo "These files exist locally but are not tracked by git."
  echo "This will cause CI failures. Please run:"
  echo "  git add <files>"
  echo "  git commit -m 'fix: add missing source files'"
  exit 1
fi

echo "✅ All source files are tracked by git"
exit 0
