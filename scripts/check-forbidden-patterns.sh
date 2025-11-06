#!/bin/bash

# Check for forbidden patterns in ThoughtMCP codebase
# Following Ultimate Brain Construct best practices

set -e

echo "🔍 Checking for forbidden patterns..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0

# Function to report violations
report_violation() {
    echo -e "${RED}❌ VIOLATION${NC}: $1"
    ((VIOLATIONS++))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

report_success() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

# Check for TypeScript 'any' types (excluding legitimate uses)
echo "Checking for problematic TypeScript 'any' types..."
# Count files with 'any' types, excluding test files and examples
ANY_FILES=$(find src -name "*.ts" -not -path "src/__tests__/*" -not -path "src/examples/*" -exec grep -l ": any\|as any\|any\[\]" {} \; 2>/dev/null || true)
ANY_COUNT=$(echo "$ANY_FILES" | grep -c . 2>/dev/null || echo "0")

if [ "$ANY_COUNT" -gt 0 ]; then
    report_warning "Found $ANY_COUNT files with 'any' types (excluding tests/examples)"
    echo "$ANY_FILES" | head -5
    echo "Note: Some 'any' types may be legitimate for dynamic content handling"
else
    report_success "No 'any' types found in main source code"
fi

# Check for debug statements (excluding legitimate uses)
echo "Checking for problematic debug statements..."
# Exclude legitimate uses: examples, monitoring dashboard, and test files
DEBUG_FILES=$(find src -name "*.ts" -not -path "src/__tests__/*" -not -path "src/examples/*" -not -path "src/utils/MonitoringDashboard.ts" -exec grep -l "console\.\(log\|debug\|info\)\|debugger" {} \; 2>/dev/null || true)
if [ -n "$DEBUG_FILES" ]; then
    DEBUG_COUNT=$(echo "$DEBUG_FILES" | wc -l)
else
    DEBUG_COUNT=0
fi

if [ "$DEBUG_COUNT" -gt 0 ]; then
    report_violation "Found $DEBUG_COUNT files with problematic debug statements"
    echo "$DEBUG_FILES" | head -5
    echo "Run: npm run check:debug for details"
else
    report_success "No problematic debug statements found"
fi

# Check for suppressed type errors (excluding legitimate utility suppressions)
echo "Checking for problematic suppressed type errors..."
# Exclude legitimate suppressions for dynamic content handling utilities
PROBLEMATIC_SUPPRESS=$(find src -name "*.ts" -not -path "src/__tests__/*" -not -path "src/utils/*" -exec grep -l "@ts-ignore\|@ts-expect-error" {} \; 2>/dev/null || true)
if [ -n "$PROBLEMATIC_SUPPRESS" ]; then
    SUPPRESS_COUNT=$(echo "$PROBLEMATIC_SUPPRESS" | wc -l)
else
    SUPPRESS_COUNT=0
fi

if [ "$SUPPRESS_COUNT" -gt 0 ]; then
    report_violation "Found $SUPPRESS_COUNT files with problematic suppressed errors"
    echo "$PROBLEMATIC_SUPPRESS" | head -5
else
    report_success "No problematic suppressed type errors found"
fi

# Check for alternative file versions
echo "Checking for alternative file versions..."
ALT_FILES=$(find . -name "*-v2*" -o -name "*-new*" -o -name "*-old*" -o -name "*-legacy*" -o -name "*-temp*" -o -name "*-backup*" | grep -v node_modules || true)
if [ -n "$ALT_FILES" ]; then
    ALT_COUNT=$(echo "$ALT_FILES" | wc -l)
else
    ALT_COUNT=0
fi

if [ "$ALT_COUNT" -gt 0 ]; then
    report_violation "Found $ALT_COUNT alternative file versions"
    echo "$ALT_FILES"
else
    report_success "No alternative file versions found"
fi

# Check for files with spaces in names
echo "Checking for files with spaces in names..."
SPACE_FILES=$(find . -name "* *" -type f | grep -v node_modules || true)
if [ -n "$SPACE_FILES" ]; then
    SPACE_COUNT=$(echo "$SPACE_FILES" | wc -l)
else
    SPACE_COUNT=0
fi

if [ "$SPACE_COUNT" -gt 0 ]; then
    report_violation "Found $SPACE_COUNT files with spaces in names"
    echo "$SPACE_FILES"
else
    report_success "No files with spaces in names found"
fi

# Check for TODO/FIXME comments
echo "Checking for TODO/FIXME comments..."
TODO_FILES=$(find src -name "*.ts" -exec grep -l "TODO\|FIXME\|XXX\|HACK" {} \; 2>/dev/null || true)
if [ -n "$TODO_FILES" ]; then
    TODO_COUNT=$(echo "$TODO_FILES" | wc -l)
else
    TODO_COUNT=0
fi

if [ "$TODO_COUNT" -gt 0 ]; then
    report_warning "Found $TODO_COUNT files with TODO/FIXME comments"
    echo "$TODO_FILES" | head -5
else
    report_success "No TODO/FIXME comments found"
fi

# Check root directory cleanliness
echo "Checking root directory cleanliness..."
ROOT_FILES=$(ls -la | grep "^-" | awk '{print $9}' | grep -v -E "(README|CONTRIBUTING|LICENSE|package|tsconfig|eslint|vitest|\.)" || true)
if [ -n "$ROOT_FILES" ]; then
    ROOT_COUNT=$(echo "$ROOT_FILES" | wc -l)
else
    ROOT_COUNT=0
fi

if [ "$ROOT_COUNT" -gt 0 ]; then
    report_warning "Found $ROOT_COUNT unexpected files in root directory"
    echo "$ROOT_FILES"
else
    report_success "Root directory is clean"
fi

# Summary
echo ""
echo "======================================"
if [ "$VIOLATIONS" -eq 0 ]; then
    echo -e "${GREEN}🎉 No forbidden patterns found!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $VIOLATIONS violations${NC}"
    echo "Please fix the violations above before proceeding."
    exit 1
fi
