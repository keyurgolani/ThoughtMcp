#!/bin/bash

# ThoughtMCP Health Check Script
# Validates system health and identifies gaps for Ultimate Brain Construct transformation

set +e

echo "🧠 ThoughtMCP Health Check - Ultimate Brain Construct Readiness"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "thoughtmcp" package.json; then
    echo -e "${RED}❌ Error: Not in ThoughtMCP root directory${NC}"
    exit 1
fi

echo -e "\n${BLUE}📋 Phase 1: Core System Validation${NC}"
echo "=================================="

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
    check_pass "Node.js version $NODE_VERSION (>= $REQUIRED_NODE)"
else
    check_fail "Node.js version $NODE_VERSION (requires >= $REQUIRED_NODE)"
fi

# Check dependencies
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    check_pass "Dependencies installed"
else
    check_fail "Dependencies not installed (run 'npm install')"
fi

# Check TypeScript compilation
if npm run type-check > /dev/null 2>&1; then
    check_pass "TypeScript compilation"
else
    check_fail "TypeScript compilation errors"
fi

# Check build
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    check_pass "Build artifacts present"
else
    check_warn "Build artifacts missing (run 'npm run build')"
fi

echo -e "\n${BLUE}🧪 Phase 2: Test Suite Validation${NC}"
echo "================================="

# Check test coverage (allow coverage check to fail without stopping health check)
if npm run test:run > /dev/null 2>&1; then
    check_pass "Test suite execution successful"

    # Try to get coverage information (non-blocking)
    COVERAGE_OUTPUT=$(npm run test:coverage 2>/dev/null || echo "")
    if echo "$COVERAGE_OUTPUT" | grep -q "All files"; then
        COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | grep -o '[0-9]*\.[0-9]*' | head -1)
        if [ -n "$COVERAGE" ]; then
            COVERAGE_INT=$(echo "$COVERAGE" | cut -d. -f1)
            if [ "$COVERAGE_INT" -ge 80 ]; then
                check_pass "Test coverage: ${COVERAGE}% (target: 80%+)"
            elif [ "$COVERAGE_INT" -ge 70 ]; then
                check_warn "Test coverage: ${COVERAGE}% (target: 80%+)"
            else
                check_warn "Test coverage: ${COVERAGE}% (below target but acceptable for development)"
            fi
        else
            check_info "Coverage data available but format not recognized"
        fi
    else
        check_info "Coverage information not available (tests still pass)"
    fi
else
    check_fail "Test suite execution failed"
fi

# Check specific test categories
TEST_CATEGORIES=("cognitive" "integration" "performance" "memory")
for category in "${TEST_CATEGORIES[@]}"; do
    if npm run test:$category > /dev/null 2>&1; then
        check_pass "$category tests passing"
    else
        check_fail "$category tests failing"
    fi
done

echo -e "\n${BLUE}🏗️ Phase 3: Architecture Validation${NC}"
echo "==================================="

# Check cognitive components
COGNITIVE_COMPONENTS=(
    "src/cognitive/CognitiveOrchestrator.ts"
    "src/cognitive/DualProcessController.ts"
    "src/cognitive/MemorySystem.ts"
    "src/cognitive/MetacognitionModule.ts"
    "src/cognitive/SystematicThinkingOrchestrator.ts"
)

for component in "${COGNITIVE_COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        check_pass "$(basename "$component" .ts) component present"
    else
        check_fail "$(basename "$component" .ts) component missing"
    fi
done

# Check MCP server implementation
if [ -f "src/server/CognitiveMCPServer.ts" ]; then
    check_pass "MCP server implementation present"
else
    check_fail "MCP server implementation missing"
fi

# Check tool implementations
TOOLS=("think" "remember" "recall" "analyze_reasoning" "analyze_systematically" "think_parallel" "decompose_problem")
for tool in "${TOOLS[@]}"; do
    if grep -q "\"$tool\"" src/server/CognitiveMCPServer.ts; then
        check_pass "$tool tool implemented"
    else
        check_fail "$tool tool missing"
    fi
done

echo -e "\n${BLUE}📚 Phase 4: Documentation Validation${NC}"
echo "===================================="

# Check documentation structure
DOC_DIRS=("api" "architecture" "development" "examples" "getting-started" "guides" "integration" "performance" "research")
for dir in "${DOC_DIRS[@]}"; do
    if [ -d "docs/$dir" ]; then
        check_pass "docs/$dir directory present"
    else
        check_warn "docs/$dir directory missing"
    fi
done

# Check key documentation files
KEY_DOCS=(
    "README.md"
    "docs/README.md"
    "docs/api/cognitive-tools.md"
    "docs/architecture/cognitive-architecture-guide.md"
    "docs/getting-started/README.md"
)

for doc in "${KEY_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$(basename "$doc") present"
    else
        check_fail "$(basename "$doc") missing"
    fi
done

echo -e "\n${BLUE}🎯 Phase 5: Ultimate Brain Construct Readiness${NC}"
echo "=============================================="

# Check for spec files
if [ -d ".kiro/specs/thoughtmcp-ultimate-brain-construct" ]; then
    check_pass "Ultimate Brain Construct spec present"

    SPEC_FILES=("requirements.md" "design.md" "tasks.md")
    for spec in "${SPEC_FILES[@]}"; do
        if [ -f ".kiro/specs/thoughtmcp-ultimate-brain-construct/$spec" ]; then
            check_pass "$spec specification present"
        else
            check_fail "$spec specification missing"
        fi
    done
else
    check_fail "Ultimate Brain Construct spec directory missing"
fi

# Check for steering documents
STEERING_DOCS=(
    ".kiro/steering/thoughtmcp-ultimate-brain-construct-guide.md"
    ".kiro/steering/comprehensive-thoughtmcp-guide.md"
    ".kiro/steering/thoughtmcp-strategic-vision.md"
)

for steering in "${STEERING_DOCS[@]}"; do
    if [ -f "$steering" ]; then
        check_pass "$(basename "$steering") steering document present"
    else
        check_warn "$(basename "$steering") steering document missing"
    fi
done

# Check for transformation readiness
if [ -f "docs/architecture/ultimate-brain-construct-roadmap.md" ]; then
    check_pass "Transformation roadmap documented"
else
    check_warn "Transformation roadmap missing"
fi

echo -e "\n${BLUE}🔧 Phase 6: Development Environment${NC}"
echo "=================================="

# Check git hooks
if [ -d ".husky" ] && [ -f ".husky/pre-commit" ]; then
    check_pass "Git hooks configured"
else
    check_warn "Git hooks not configured"
fi

# Check linting
if npm run lint > /dev/null 2>&1; then
    check_pass "Code linting passes"
else
    check_fail "Code linting issues found"
fi

# Check for any types
ANY_TYPES=$(find src -name "*.ts" -exec grep -Hn ': any\|as any\|any\[\]' {} \; | wc -l)
if [ "$ANY_TYPES" -eq 0 ]; then
    check_pass "No 'any' types found"
else
    check_warn "$ANY_TYPES 'any' types found (should be minimized)"
fi

# Check for debug code
DEBUG_CODE=$(find src -name "*.ts" -exec grep -Hn 'console\.\|debugger' {} \; | wc -l)
if [ "$DEBUG_CODE" -eq 0 ]; then
    check_pass "No debug code found"
else
    check_warn "$DEBUG_CODE debug statements found (should be removed)"
fi

echo -e "\n${BLUE}📊 Phase 7: Performance Baseline${NC}"
echo "==============================="

# Check if performance tests can run
if npm run test:performance > /dev/null 2>&1; then
    check_pass "Performance tests executable"
else
    check_warn "Performance tests not executable"
fi

# Check memory usage baseline
if [ -f "brain/memory.json" ]; then
    MEMORY_SIZE=$(du -h brain/memory.json | cut -f1)
    check_info "Current memory storage: $MEMORY_SIZE"
else
    check_info "No persistent memory data yet"
fi

echo -e "\n${BLUE}📋 Health Check Summary${NC}"
echo "======================="

echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"

TOTAL=$((PASSED + FAILED + WARNINGS))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo -e "\nOverall Health: ${SUCCESS_RATE}%"

if [ $FAILED -eq 0 ] && [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "\n${GREEN}🎉 System is ready for Ultimate Brain Construct transformation!${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "\n${YELLOW}⚠️  System is mostly ready, but some improvements recommended${NC}"
    exit 0
else
    echo -e "\n${RED}❌ System needs fixes before transformation can begin${NC}"
    echo -e "Please address the failed checks above."
    exit 1
fi
