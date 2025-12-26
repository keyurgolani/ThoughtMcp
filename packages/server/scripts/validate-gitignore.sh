#!/bin/bash
# Validates gitignore doesn't accidentally ignore source code
# Requirements: REQ-4

set -e

echo "🔍 Checking .gitignore for dangerous patterns..."

FOUND_ISSUES=0

# Patterns that might accidentally ignore source code (unanchored directory patterns)
# These should be anchored with leading / to only match root-level directories
DANGEROUS_PATTERNS=(
  "^memory/$"
  "^types/$"
  "^utils/$"
  "^lib/$"
  "^data/$"
  "^brain/$"
  "^cognitive-state/$"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if grep -qE "$pattern" .gitignore 2>/dev/null; then
    MATCH=$(grep -E "$pattern" .gitignore)
    echo "⚠️  Potentially dangerous unanchored pattern found: $MATCH"
    echo "   This pattern matches directories at any level, including src/"
    echo "   Consider anchoring with leading '/': /${MATCH}"
    FOUND_ISSUES=1
  fi
done

# Check if .gitignore would ignore src/ entirely
if grep -qE "^src/$" .gitignore 2>/dev/null; then
  echo "❌ Critical: .gitignore contains 'src/' which ignores all source code!"
  FOUND_ISSUES=1
fi

# Check if any pattern would ignore all .ts files
if grep -qE "^\*\.ts$" .gitignore 2>/dev/null; then
  echo "❌ Critical: .gitignore contains '*.ts' which ignores all TypeScript files!"
  FOUND_ISSUES=1
fi

# Check if any src/ files are being ignored
echo "🔍 Checking if any source files are being ignored..."
IGNORED_SRC=$(git check-ignore src/**/*.ts 2>/dev/null || true)
if [ -n "$IGNORED_SRC" ]; then
  echo "❌ Source files are being ignored by .gitignore:"
  echo "$IGNORED_SRC"
  FOUND_ISSUES=1
fi

if [ $FOUND_ISSUES -eq 1 ]; then
  echo ""
  echo "Please review your .gitignore patterns."
  echo "Use leading '/' to anchor patterns to repository root."
  echo "Example: '/memory/' only matches root-level memory directory"
  exit 1
fi

echo "✅ .gitignore patterns look safe"
exit 0
