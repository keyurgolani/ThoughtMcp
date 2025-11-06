#!/bin/bash

# Check workspace organization following ThoughtMCP best practices
# Ensures clean, professional structure for Ultimate Brain Construct

set -e

echo "🏗️ Checking workspace organization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ ISSUE${NC}: $1"
    ((ISSUES++))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

report_success() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

report_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "thoughtmcp" package.json; then
    echo -e "${RED}❌ Error: Not in ThoughtMCP root directory${NC}"
    exit 1
fi

echo "Validating ThoughtMCP workspace organization..."
echo "=============================================="

# 1. Check root directory structure
echo -e "\n${BLUE}📁 Root Directory Structure${NC}"
echo "----------------------------"

REQUIRED_ROOT_FILES=(
    "README.md"
    "package.json"
    "tsconfig.json"
    "LICENSE"
    "CONTRIBUTING.md"
    ".gitignore"
)

for file in "${REQUIRED_ROOT_FILES[@]}"; do
    if [ -f "$file" ]; then
        report_success "$file present"
    else
        report_issue "$file missing"
    fi
done

REQUIRED_ROOT_DIRS=(
    "src"
    "docs"
    "scripts"
    ".kiro"
    ".husky"
)

for dir in "${REQUIRED_ROOT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        report_success "$dir/ directory present"
    else
        report_issue "$dir/ directory missing"
    fi
done

# 2. Check for unwanted files in root
echo -e "\n${BLUE}🧹 Root Directory Cleanliness${NC}"
echo "------------------------------"

UNWANTED_PATTERNS=(
    "*.log"
    "*.tmp"
    "*-temp*"
    "*-backup*"
    "test-*"
    "debug-*"
)

for pattern in "${UNWANTED_PATTERNS[@]}"; do
    FOUND=$(find . -maxdepth 1 -name "$pattern" -type f 2>/dev/null || true)
    if [ -n "$FOUND" ]; then
        report_warning "Found unwanted files matching $pattern:"
        echo "$FOUND"
    fi
done

# Check for unexpected files in root
ROOT_FILES=$(ls -la | grep "^-" | awk '{print $9}' | grep -v -E "(README|CONTRIBUTING|LICENSE|package|tsconfig|eslint|vitest|\.)" || true)
if [ -n "$ROOT_FILES" ]; then
    report_warning "Unexpected files in root directory:"
    echo "$ROOT_FILES"
else
    report_success "Root directory contains only essential files"
fi

# 3. Check source code organization
echo -e "\n${BLUE}📂 Source Code Organization${NC}"
echo "----------------------------"

SRC_DIRS=(
    "src/cognitive"
    "src/server"
    "src/utils"
    "src/types"
    "src/interfaces"
    "src/__tests__"
)

for dir in "${SRC_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        report_success "$dir/ properly organized"
    else
        report_warning "$dir/ directory missing"
    fi
done

# Check for proper test organization
if [ -d "src/__tests__" ]; then
    TEST_DIRS=(
        "src/__tests__/cognitive"
        "src/__tests__/server"
        "src/__tests__/utils"
        "src/__tests__/integration"
    )

    for dir in "${TEST_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            report_success "$(basename "$dir") tests organized"
        else
            report_warning "$(basename "$dir") test directory missing"
        fi
    done
fi

# 4. Check documentation organization
echo -e "\n${BLUE}📚 Documentation Organization${NC}"
echo "------------------------------"

DOC_DIRS=(
    "docs/api"
    "docs/architecture"
    "docs/development"
    "docs/examples"
    "docs/getting-started"
    "docs/guides"
    "docs/integration"
    "docs/performance"
    "docs/research"
)

for dir in "${DOC_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        report_success "$dir/ documentation organized"
    else
        report_warning "$dir/ documentation directory missing"
    fi
done

# 5. Check gitignored directories
echo -e "\n${BLUE}🙈 Gitignored Directories${NC}"
echo "-------------------------"

GITIGNORED_DIRS=(
    "node_modules"
    "dist"
    "coverage"
    "brain"
    "tmp"
)

for dir in "${GITIGNORED_DIRS[@]}"; do
    if grep -q "^$dir/" .gitignore 2>/dev/null; then
        report_success "$dir/ properly gitignored"
    else
        report_warning "$dir/ not found in .gitignore"
    fi
done

# Check if gitignored directories exist and contain expected content
if [ -d "brain" ]; then
    BRAIN_FILES=$(find brain -name "*.json" -o -name "*.db" 2>/dev/null | wc -l)
    if [ "$BRAIN_FILES" -gt 0 ]; then
        report_info "brain/ contains $BRAIN_FILES data files"
    else
        report_info "brain/ directory exists but is empty"
    fi
fi

if [ -d "tmp" ]; then
    TMP_FILES=$(find tmp -type f 2>/dev/null | wc -l)
    if [ "$TMP_FILES" -gt 0 ]; then
        report_warning "tmp/ contains $TMP_FILES files (should be cleaned)"
    else
        report_success "tmp/ directory is clean"
    fi
fi

# 6. Check file naming conventions
echo -e "\n${BLUE}📝 File Naming Conventions${NC}"
echo "---------------------------"

# Check for files with spaces
SPACE_FILES=$(find . -name "* *" -type f | grep -v node_modules | head -5 || true)
if [ -n "$SPACE_FILES" ]; then
    report_issue "Files with spaces in names found:"
    echo "$SPACE_FILES"
else
    report_success "No files with spaces in names"
fi

# Check for proper TypeScript file naming
TS_FILES_WRONG_CASE=$(find src -name "*.ts" | grep -E "[A-Z].*[a-z].*\.ts$|[a-z].*[A-Z].*\.ts$" | grep -v -E "(test|spec)\.ts$" | head -5 || true)
if [ -n "$TS_FILES_WRONG_CASE" ]; then
    report_info "Mixed case TypeScript files (verify naming convention):"
    echo "$TS_FILES_WRONG_CASE"
fi

# 7. Check Kiro configuration
echo -e "\n${BLUE}🤖 Kiro Configuration${NC}"
echo "---------------------"

KIRO_DIRS=(
    ".kiro/hooks"
    ".kiro/steering"
    ".kiro/specs"
)

for dir in "${KIRO_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        FILE_COUNT=$(find "$dir" -type f | wc -l)
        report_success "$dir/ exists with $FILE_COUNT files"
    else
        report_warning "$dir/ directory missing"
    fi
done

# 8. Summary
echo -e "\n${BLUE}📊 Organization Summary${NC}"
echo "======================="

echo -e "Issues found: ${RED}$ISSUES${NC}"

if [ "$ISSUES" -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Workspace organization is excellent!${NC}"
    echo "ThoughtMCP follows proper project structure."
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Workspace organization needs attention${NC}"
    echo "Please address the issues above to maintain professional structure."
    exit 1
fi
