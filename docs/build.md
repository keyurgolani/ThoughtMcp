# Build System Guide

## Overview

ThoughtMCP uses a comprehensive build system that enforces all quality standards automatically. The build process includes security auditing, code formatting, linting, type checking, and complete test suite execution before creating production artifacts.

## Build Commands

### Production Build (Recommended)

```bash
npm run build
```

**What it does:**

1. **Clean** - Removes all build artifacts (`dist/`, `coverage/`, `.vitest/`)
2. **Format** - Auto-formats all code with Prettier
3. **Security Audit** - Checks for moderate+ severity vulnerabilities
4. **Format Check** - Verifies code formatting is correct
5. **Lint** - Runs ESLint on all TypeScript files
6. **Type Check** - Verifies TypeScript types with zero errors
7. **Test** - Runs complete test suite (unit, integration, e2e)
8. **Build Types** - Generates TypeScript declaration files
9. **Build Bundle** - Creates optimized production bundle with esbuild

**Build fails if ANY step fails.** This ensures zero technical debt and production-ready code.

### Quick Build (Skip Validation)

```bash
npm run build:quick
```

**What it does:**

1. Clean build artifacts
2. Generate TypeScript declarations
3. Create production bundle

**Use only when:**

- You've already run `npm run validate` successfully
- You're iterating on build configuration
- You need a fast rebuild during development

**⚠️ Warning:** This skips all quality gates. Always run full build before committing.

### Individual Build Steps

```bash
# Clean build artifacts
npm run clean

# Generate TypeScript declarations only
npm run build:types

# Create production bundle only
npm run build:bundle

# Watch mode for development
npm run build:watch
```

## Quality Gates

### 1. Security Audit

```bash
npm run audit:check
```

- Checks for npm package vulnerabilities
- Fails on moderate or higher severity
- Must have **0 vulnerabilities** to pass

**Fix vulnerabilities:**

```bash
# Update vulnerable packages
npm audit fix

# Or update specific package
npm install package@latest --save-dev
```

### 2. Code Formatting

```bash
# Auto-format all code
npm run format

# Check formatting without changes
npm run format:check
```

- Uses Prettier for consistent code style
- Formats TypeScript, JavaScript, JSON, and Markdown
- Build automatically formats code before validation

**Configuration:** `.prettierrc` and `.prettierignore`

### 3. Linting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

- Enforces code quality and style rules
- Zero tolerance for errors and warnings
- Checks TypeScript-specific rules

**Key Rules:**

- No `any` types
- No `@ts-ignore` or `@ts-expect-error`
- Prefer nullish coalescing (`??`) over logical OR (`||`)
- Explicit function return types
- No floating promises
- No unused variables

**Configuration:** `eslint.config.js`

### 4. Type Checking

```bash
npm run typecheck
```

- Verifies TypeScript types without emitting files
- Must have **0 errors and 0 warnings**
- Checks all files in `src/`

**Configuration:** `tsconfig.json`

### 5. Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

- Runs complete test suite with Vitest
- Must have **100% pass rate**
- Requires **95%+ line coverage, 90%+ branch coverage**

**See:** [Testing Guide](testing.md) for details

## Build Output

### Directory Structure

```
dist/
├── index.js              # Main entry point (bundled)
├── index.js.map          # Source map
├── index.d.ts            # Type declarations (main)
├── cognitive/            # Cognitive components
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── server/               # MCP server
│   ├── CognitiveMCPServer.js
│   ├── CognitiveMCPServer.d.ts
│   └── ...
└── utils/                # Utilities
    ├── index.js
    ├── index.d.ts
    └── ...
```

### Bundle Characteristics

- **Minified**: Production code is minified for smaller size
- **Source Maps**: Included for debugging
- **Type Declarations**: Full TypeScript definitions
- **Executable**: Main entry point has execute permissions
- **ES Modules**: Uses modern ES module format

### Bundle Size

Current bundle sizes (optimized with esbuild):

- **index.js**: 1.2 KB (minified)
- **index.js.map**: 3.4 KB (source map)
- **index.d.ts**: 297 B (type declarations)
- **Total**: ~4.9 KB

**Optimization Results:**

- 50% size reduction through minification
- Tree-shaking removes unused code
- Fast builds (~15ms for current codebase)

## Build Configuration

### esbuild Configuration

Located in `scripts/build.mjs`:

```javascript
{
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  minify: true,
  external: ['@modelcontextprotocol/sdk']
}
```

### TypeScript Configuration

Located in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  }
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run validate:ci
```

### CI Validation

```bash
npm run validate:ci
```

**What it does:**

1. Security audit
2. Format check
3. Lint
4. Type check
5. Quick build (without re-validation)
6. Test suite

## Troubleshooting

### Build Fails on Security Audit

**Problem:** Moderate or higher severity vulnerabilities found

**Solution:**

```bash
# Check vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Or update specific package
npm install package@latest --save-dev

# Rebuild
npm run build
```

### Build Fails on Formatting

**Problem:** Code formatting doesn't match Prettier rules

**Solution:**

```bash
# Auto-format all code
npm run format

# Rebuild
npm run build
```

### Build Fails on Linting

**Problem:** ESLint errors or warnings

**Solution:**

```bash
# Try auto-fix
npm run lint:fix

# If auto-fix doesn't work, manually fix errors
# Check error messages for specific issues

# Rebuild
npm run build
```

### Build Fails on Type Checking

**Problem:** TypeScript type errors

**Solution:**

```bash
# Run type check to see errors
npm run typecheck

# Fix type errors in source code
# Common issues:
# - Missing return types
# - Using 'any' type
# - Type mismatches

# Rebuild
npm run build
```

### Build Fails on Tests

**Problem:** Test failures

**Solution:**

```bash
# Run tests to see failures
npm test

# Run specific test file
npm test -- src/__tests__/path/to/test.test.ts

# Fix failing tests
# See Testing Guide for details

# Rebuild
npm run build
```

### Build is Slow

**Problem:** Build takes too long

**Solutions:**

1. **Use Quick Build During Development:**

   ```bash
   npm run build:quick
   ```

2. **Use Watch Mode:**

   ```bash
   npm run build:watch
   ```

3. **Skip Tests During Iteration:**

   ```bash
   npm run clean
   npm run format
   npm run lint
   npm run typecheck
   npm run build:quick
   ```

4. **Run Full Build Before Commit:**
   ```bash
   npm run build
   ```

## Best Practices

### Before Committing

Always run full build:

```bash
npm run build
```

This ensures:

- No security vulnerabilities
- Code is properly formatted
- No linting errors
- No type errors
- All tests pass
- Build artifacts are up to date

### During Development

Use quick iteration cycle:

```bash
# Make changes
npm run dev

# Run tests in watch mode
npm run test:watch

# When ready, run full build
npm run build
```

### Before Pull Request

Run CI validation:

```bash
npm run validate:ci
```

This matches what CI will run and catches issues early.

### After Pulling Changes

Rebuild to ensure dependencies and build artifacts are up to date:

```bash
npm install
npm run build
```

## Performance Optimization

### Build Performance

Current build times:

- **Full Build**: ~10-15 seconds (with all quality gates)
- **Quick Build**: ~1-2 seconds (skip validation)
- **Type Generation**: <1 second
- **Bundle Creation**: ~15ms (esbuild)

### esbuild Optimization

ThoughtMCP uses esbuild for production builds:

**Features:**

- **Minification**: Removes whitespace, shortens names (~50% reduction)
- **Tree-shaking**: Removes unused code automatically
- **Bundling**: Combines modules for optimal loading
- **Source maps**: Enables debugging of minified code

**Configuration:**

```javascript
{
  platform: "node",
  target: "node18",
  format: "esm",
  bundle: true,
  minify: true,
  sourcemap: true,
  treeShaking: true
}
```

### Optimization Tips

1. **Use Quick Build for Iteration:**
   - Run `npm run build:quick` during development
   - Run full build before commits

2. **Use Watch Mode:**
   - `npm run build:watch` for continuous type checking
   - `npm run test:watch` for continuous testing

3. **Optimize Imports:**

   ```typescript
   // Good: Import only what you need
   import { specificFunction } from "./utils";

   // Bad: Import everything
   import * as utils from "./utils";
   ```

4. **Keep Dependencies Minimal:**
   - Review package.json regularly
   - Remove unused dependencies
   - Use peer dependencies when appropriate

5. **Parallel Execution:**
   - Tests run in parallel automatically
   - Build steps run sequentially for reliability

6. **Caching:**
   - npm caches dependencies
   - TypeScript caches type information
   - Vitest caches test results

## Zero Technical Debt Policy

The build system enforces zero technical debt:

❌ **Build FAILS if:**

- Security vulnerabilities exist (moderate+)
- Code is not formatted
- Linting errors or warnings exist
- TypeScript errors or warnings exist
- Any test fails
- Coverage is below 95% line, 90% branch

✅ **Build SUCCEEDS only if:**

- 0 security vulnerabilities
- All code properly formatted
- 0 linting errors/warnings
- 0 TypeScript errors/warnings
- 100% test pass rate
- 95%+ line coverage, 90%+ branch coverage

This ensures production-ready code at all times.

## Related Documentation

- **[Development Guide](development.md)** - Complete development workflow
- **[Testing Guide](testing.md)** - TDD principles and test utilities
- **[Database Guide](database.md)** - PostgreSQL setup and configuration
- **[Environment Guide](environment.md)** - Environment variables and configuration

---

**Last Updated**: December 2025
**Version**: 0.5.0
