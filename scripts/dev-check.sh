#!/bin/bash

# Development Quality Check Script
# Run this script to perform comprehensive local quality checks

set -e

echo "🔍 ThoughtMCP Development Quality Check"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  print_error "Please run this script from the project root directory"
  exit 1
fi

# Parse command line arguments
STRICT_MODE=false
SKIP_TESTS=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --strict      Enable strict mode (treat warnings as errors)"
      echo "  --skip-tests  Skip running tests"
      echo "  --skip-build  Skip build step"
      echo "  --help        Show this help message"
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ "$STRICT_MODE" = true ]; then
  print_status "Running in STRICT MODE - warnings will be treated as errors"
fi

# 1. Check Node.js and npm versions
print_status "Checking Node.js and npm versions..."
node_version=$(node --version)
npm_version=$(npm --version)
echo "Node.js: $node_version"
echo "npm: $npm_version"

# Check if Node.js version meets requirements
required_node_major=18
current_node_major=$(echo $node_version | sed 's/v\([0-9]*\).*/\1/')
if [ "$current_node_major" -lt "$required_node_major" ]; then
  print_error "Node.js version $node_version is below required v$required_node_major"
  exit 1
fi

# 2. Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  print_status "Installing dependencies..."
  npm ci
fi

# 3. Security audit
print_status "Running security audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
  print_success "No high-severity security vulnerabilities found"
else
  print_error "High-severity security vulnerabilities detected!"
  npm audit --audit-level=high
  exit 1
fi

# Check for moderate vulnerabilities (warning only)
if ! npm audit --audit-level=moderate > /dev/null 2>&1; then
  print_warning "Moderate security vulnerabilities detected. Run 'npm audit' for details."
fi

# 4. Code style and linting
print_status "Running ESLint..."
if [ "$STRICT_MODE" = true ]; then
  if npm run lint:strict; then
    print_success "Code style check passed (strict mode)"
  else
    print_error "Code style check failed in strict mode"
    exit 1
  fi
else
  if npm run lint; then
    print_success "Code style check passed"
  else
    print_error "Code style check failed"
    exit 1
  fi
fi

# 5. Type checking
print_status "Running TypeScript type checking..."
if npm run type-check; then
  print_success "Type checking passed"
else
  print_error "Type checking failed"
  exit 1
fi

# 6. Check for 'any' types
print_status "Checking for TypeScript 'any' types..."
any_files=$(find src -name "*.ts" -exec grep -l ": any\|as any\|any\[\]" {} \; 2>/dev/null || true)
any_count=$(echo "$any_files" | grep -c . || echo "0")

if [ "$any_count" -gt 0 ]; then
  print_warning "Found 'any' types in $any_count files:"
  echo "$any_files" | head -5
  if [ "$STRICT_MODE" = true ]; then
    print_error "Strict mode: 'any' types not allowed"
    exit 1
  else
    print_warning "Consider replacing 'any' with specific types for better type safety"
  fi
else
  print_success "No 'any' types found"
fi

# 7. Check for debug statements
print_status "Checking for debug statements..."
debug_files=$(find src -name "*.ts" -exec grep -l "console\.\(log\|debug\|info\|warn\|error\)\|debugger" {} \; 2>/dev/null || true)
debug_count=$(echo "$debug_files" | grep -c . || echo "0")

if [ "$debug_count" -gt 0 ]; then
  print_warning "Found debug statements in $debug_count files:"
  echo "$debug_files" | head -5
  if [ "$STRICT_MODE" = true ]; then
    print_error "Strict mode: Debug statements not allowed"
    exit 1
  fi
else
  print_success "No debug statements found"
fi

# 8. Run tests
if [ "$SKIP_TESTS" = false ]; then
  print_status "Running tests..."
  if npm run test:run; then
    print_success "All tests passed"
  else
    print_error "Tests failed"
    exit 1
  fi
  
  # Run test coverage if in strict mode
  if [ "$STRICT_MODE" = true ]; then
    print_status "Running test coverage analysis..."
    if npm run test:coverage > /dev/null 2>&1; then
      print_success "Test coverage analysis completed"
    else
      print_warning "Test coverage analysis had issues"
    fi
  fi
else
  print_warning "Skipping tests (--skip-tests flag used)"
fi

# 9. Build check
if [ "$SKIP_BUILD" = false ]; then
  print_status "Running build..."
  build_start=$(date +%s)
  if npm run build; then
    build_end=$(date +%s)
    build_time=$((build_end - build_start))
    print_success "Build completed in ${build_time}s"
    
    if [ "$build_time" -gt 30 ]; then
      print_warning "Build took longer than 30 seconds. Consider optimizing."
    fi
  else
    print_error "Build failed"
    exit 1
  fi
else
  print_warning "Skipping build (--skip-build flag used)"
fi

# 10. Check for large files
print_status "Checking for large files..."
large_files=$(find . -name "*.ts" -o -name "*.js" -o -name "*.json" | xargs ls -la 2>/dev/null | awk '$5 > 102400 {print $9 " (" $5 " bytes)"}' || true)
if [ -n "$large_files" ]; then
  print_warning "Large files detected (>100KB):"
  echo "$large_files"
fi

# 11. Git status check
if git rev-parse --git-dir > /dev/null 2>&1; then
  print_status "Checking git status..."
  
  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes"
  fi
  
  # Check for untracked files
  untracked=$(git ls-files --others --exclude-standard)
  if [ -n "$untracked" ]; then
    print_warning "You have untracked files:"
    echo "$untracked" | head -5
  fi
  
  # Check current branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  print_status "Current branch: $current_branch"
fi

# 12. Final summary
echo ""
echo "======================================"
if [ "$STRICT_MODE" = true ]; then
  print_success "🎉 All strict quality checks passed!"
else
  print_success "🎉 All quality checks passed!"
fi

print_status "Summary:"
echo "  ✅ Security audit passed"
echo "  ✅ Code style check passed"
echo "  ✅ Type checking passed"
if [ "$SKIP_TESTS" = false ]; then
  echo "  ✅ Tests passed"
fi
if [ "$SKIP_BUILD" = false ]; then
  echo "  ✅ Build successful"
fi

echo ""
print_status "💡 Tips:"
echo "  • Run with --strict for stricter quality checks"
echo "  • Use --skip-tests or --skip-build to speed up checks during development"
echo "  • Set STRICT_PRECOMMIT=1 to enable strict pre-commit hooks"
echo "  • Run 'npm run quality:check' for a quick quality overview"

echo ""
print_success "Ready to commit! 🚀"