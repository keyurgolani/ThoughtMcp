#!/bin/bash

# Ultimate Brain Construct Validation Script
# Comprehensive validation following End-to-End Functional Slices principle

set +e

echo "🧠 ThoughtMCP Ultimate Brain Construct Validation"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
step_header() {
    echo -e "\n${PURPLE}🎯 $1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
    return 1
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

# Function to run command with timeout and capture output
run_with_timeout() {
    local timeout_duration=$1
    local command=$2
    local description=$3

    if timeout "$timeout_duration" bash -c "$command" > /dev/null 2>&1; then
        check_pass "$description"
        return
else
        check_fail "$description"
        return 1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "thoughtmcp" package.json; then
    echo -e "${RED}❌ Error: Not in ThoughtMCP root directory${NC}"
    exit 1
fi

# Step 1: End-to-End Functional Slice Validation
step_header "Step 1: End-to-End Functional Slice Validation"

echo "Validating core requirements (ALL must pass)..."

# 1. Clean build validation
echo "1. Testing clean build..."
if npm run clean > /dev/null 2>&1 && npm run build > /dev/null 2>&1; then
    check_pass "Clean build successful"
else
    check_fail "Clean build failed"
    echo "❌ CRITICAL: Build must pass before proceeding"
    exit 1
fi

# 2. Server startup test
echo "2. Testing server startup..."
if timeout 30s npm start > /dev/null 2>&1 &
then
    SERVER_PID=$!
    sleep 5
    if kill -0 $SERVER_PID 2>/dev/null; then
        check_pass "MCP server starts successfully"
        kill $SERVER_PID 2>/dev/null || true
    else
        check_fail "MCP server failed to start"
        exit 1
    fi
else
    check_fail "MCP server startup timeout"
    exit 1
fi

# 3. MCP tool validation
echo "3. Testing MCP tool validation..."
if [ -f "scripts/validate-mcp-config.js" ]; then
    if timeout 30s node scripts/validate-mcp-config.js > /dev/null 2>&1; then
        check_pass "MCP tools respond correctly"
    else
        check_fail "MCP tool validation failed or timed out"
        exit 1
    fi
else
    check_warn "MCP validation script not found"
fi

# Step 2: Comprehensive Test Suite Execution
step_header "Step 2: Comprehensive Test Suite Execution"

echo "Running test suites with clean output requirements..."

# Core test categories
TEST_CATEGORIES=(
    "cognitive:Cognitive systems"
    "integration:Cross-system integration"
    "performance:Performance benchmarks"
    "memory:Memory system validation"
    "unit:Unit tests"
)

for category_desc in "${TEST_CATEGORIES[@]}"; do
    IFS=':' read -r category description <<< "$category_desc"
    echo "Testing $description..."

    if npm run test:$category > /dev/null 2>&1; then
        check_pass "$description tests passed"
    else
        check_fail "$description tests failed"
    fi
done

# Coverage analysis
echo "Running coverage analysis..."
if npm run test:coverage > /tmp/coverage_output.txt 2>&1; then
    # Extract coverage percentage from the summary line
    COVERAGE=$(grep "All files" /tmp/coverage_output.txt | grep -o '[0-9]*\.[0-9]*' | head -1 || echo "0")
    if [ -n "$COVERAGE" ] && [ "$COVERAGE" != "0" ]; then
        COVERAGE_INT=$(echo "$COVERAGE" | cut -d. -f1)
        if [ "$COVERAGE_INT" -ge 95 ]; then
            check_pass "Test coverage: ${COVERAGE}% (excellent - exceeds 95% target)"
        elif [ "$COVERAGE_INT" -ge 80 ]; then
            check_pass "Test coverage: ${COVERAGE}% (good - meets 80% minimum)"
        elif [ "$COVERAGE_INT" -ge 70 ]; then
            check_warn "Test coverage: ${COVERAGE}% (acceptable - above 70% threshold, target: 80%+)"
        else
            check_warn "Test coverage: ${COVERAGE}% (below 70% threshold, should improve)"
        fi
    else
        check_warn "Could not determine test coverage percentage"
    fi
    rm -f /tmp/coverage_output.txt
else
    check_fail "Coverage analysis failed - command execution error"
fi

# Step 3: Code Quality and Security Validation
step_header "Step 3: Code Quality and Security Validation"

echo "Running code quality checks..."

# Strict linting
if npm run lint:strict > /dev/null 2>&1; then
    check_pass "Strict linting passed (zero warnings)"
else
    check_fail "Strict linting failed"
fi

# TypeScript validation
if npm run type-check > /dev/null 2>&1; then
    check_pass "TypeScript validation passed"
else
    check_fail "TypeScript validation failed"
fi

# Security audit
if npm audit --audit-level=high > /dev/null 2>&1; then
    check_pass "Security audit passed (no high-severity issues)"
else
    check_fail "Security audit failed (high-severity vulnerabilities found)"
fi

# Forbidden patterns check
if [ -f "scripts/check-forbidden-patterns.sh" ]; then
    if ./scripts/check-forbidden-patterns.sh > /dev/null 2>&1; then
        check_pass "No forbidden patterns found"
    else
        check_fail "Forbidden patterns detected"
    fi
else
    check_warn "Forbidden patterns check script not found"
fi

# Step 4: Workspace Organization Audit
step_header "Step 4: Workspace Organization Audit"

if [ -f "scripts/check-workspace-organization.sh" ]; then
    if ./scripts/check-workspace-organization.sh > /dev/null 2>&1; then
        check_pass "Workspace organization is excellent"
    else
        check_warn "Workspace organization needs attention"
    fi
else
    check_warn "Workspace organization check script not found"
fi

# Step 5: Performance Validation
step_header "Step 5: Performance Validation"

echo "Validating performance targets..."

# Build time check
BUILD_START=$(date +%s)
if npm run build > /dev/null 2>&1; then
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    if [ "$BUILD_TIME" -le 120 ]; then  # 2 minutes
        check_pass "Build time: ${BUILD_TIME}s (target: <120s)"
    else
        check_warn "Build time: ${BUILD_TIME}s (target: <120s)"
    fi
else
    check_fail "Build performance test failed"
fi

# Test execution time
TEST_START=$(date +%s)
if npm run test:run > /dev/null 2>&1; then
    TEST_END=$(date +%s)
    TEST_TIME=$((TEST_END - TEST_START))

    if [ "$TEST_TIME" -le 300 ]; then  # 5 minutes
        check_pass "Test execution time: ${TEST_TIME}s (target: <300s)"
    else
        check_warn "Test execution time: ${TEST_TIME}s (target: <300s)"
    fi
else
    check_fail "Test performance validation failed"
fi

# Step 6: Ultimate Brain Construct Readiness
step_header "Step 6: Ultimate Brain Construct Readiness Assessment"

echo "Validating cognitive architecture components..."

# Check for key cognitive components
COGNITIVE_COMPONENTS=(
    "src/cognitive/CognitiveOrchestrator.ts:Cognitive Orchestrator"
    "src/cognitive/DualProcessController.ts:Dual-Process Controller"
    "src/cognitive/MemorySystem.ts:Memory System"
    "src/cognitive/MetacognitionModule.ts:Metacognition Module"
    "src/cognitive/SystematicThinkingOrchestrator.ts:Systematic Thinking"
)

for component_desc in "${COGNITIVE_COMPONENTS[@]}"; do
    IFS=':' read -r component description <<< "$component_desc"
    if [ -f "$component" ]; then
        check_pass "$description component present"
    else
        check_fail "$description component missing"
    fi
done

# Check MCP tools implementation
MCP_TOOLS=(
    "think:Think tool"
    "remember:Remember tool"
    "recall:Recall tool"
    "analyze_reasoning:Reasoning analysis tool"
    "analyze_systematically:Systematic analysis tool"
)

if [ -f "src/server/CognitiveMCPServer.ts" ]; then
    for tool_desc in "${MCP_TOOLS[@]}"; do
        IFS=':' read -r tool description <<< "$tool_desc"
        if grep -q "\"$tool\"" src/server/CognitiveMCPServer.ts; then
            check_pass "$description implemented"
        else
            check_fail "$description missing"
        fi
    done
else
    check_fail "MCP server implementation missing"
fi

# Step 7: Final Summary
step_header "Step 7: Validation Summary"

TOTAL=$((PASSED + FAILED + WARNINGS))
if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
else
    SUCCESS_RATE=0
fi

echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "📊 Success Rate: ${SUCCESS_RATE}%"

echo ""
if [ "$FAILED" -eq 0 ] && [ "$SUCCESS_RATE" -ge 90 ]; then
    echo -e "${GREEN}🎉 ThoughtMCP is ready for Ultimate Brain Construct transformation!${NC}"
    echo -e "${GREEN}All critical systems validated and operational.${NC}"
    exit 0
elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ThoughtMCP is mostly ready, but improvements recommended${NC}"
    echo -e "${YELLOW}Address warnings above for optimal performance.${NC}"
    exit 0
else
    echo -e "${RED}❌ ThoughtMCP needs fixes before transformation can proceed${NC}"
    echo -e "${RED}Please address the failed checks above.${NC}"
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "1. Fix all failed validations"
    echo "2. Re-run this validation script"
    echo "3. Ensure End-to-End Functional Slices principle is maintained"
    exit 1
fi
