#!/bin/bash
# Simulates CI environment by using only git-tracked files
# Requirements: REQ-5

set -e

echo "🔬 Simulating CI environment..."

# Create temporary directory
CI_SIM_DIR=$(mktemp -d)

# Cleanup function to remove temp directory on exit
cleanup() {
  echo "🧹 Cleaning up temporary directory..."
  rm -rf "$CI_SIM_DIR"
}
trap cleanup EXIT

echo "📁 Creating clean checkout in $CI_SIM_DIR..."

# Export only tracked files (simulates fresh CI checkout)
git archive HEAD | tar -x -C "$CI_SIM_DIR"

# Copy package-lock.json if it exists (needed for npm ci)
if [ -f package-lock.json ]; then
  cp package-lock.json "$CI_SIM_DIR/"
fi

cd "$CI_SIM_DIR"

echo "📦 Installing dependencies (npm ci)..."
npm ci --silent

echo "🔍 Running typecheck..."
npm run typecheck

echo "🏗️  Running build:quick..."
npm run build:quick

echo ""
echo "✅ CI simulation passed!"
echo "   All tracked files compile and build successfully."
exit 0
