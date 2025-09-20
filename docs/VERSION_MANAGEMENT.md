# Version Management

This document explains how version management works in ThoughtMCP and how to properly bump versions.

## Overview

ThoughtMCP uses a centralized version management system where the version is defined in one place (`package.json`) and all other parts of the codebase read from this single source of truth.

## Architecture

### Single Source of Truth

The version is defined only in `package.json`:

```json
{
  "version": "0.2.1"
}
```

### Version Utility

All code that needs to reference the version uses the centralized version utility (`src/utils/version.ts`):

```typescript
import { getVersion, getVersionInfo } from "../utils/version.js";

// Get the current version
const version = getVersion(); // "0.2.1"

// Get detailed version information
const versionInfo = getVersionInfo();
// {
//   version: "0.2.1",
//   major: 0,
//   minor: 2,
//   patch: 1,
//   isPrerelease: false
// }
```

### Components Using Version

The following components automatically use the centralized version:

- **MCP Server**: Server info and tool responses
- **Response Formatter**: All formatted responses include version metadata
- **Persistence System**: Memory snapshots include version for compatibility
- **All Tests**: Test fixtures use the current version

## Version Bumping

### Automated Version Bumping

Use the provided scripts for version bumping:

```bash
# Bump patch version (0.2.1 -> 0.2.2)
npm run version:patch

# Bump minor version (0.2.1 -> 0.3.0)
npm run version:minor

# Bump major version (0.2.1 -> 1.0.0)
npm run version:major

# Set specific version
npm run version:bump 1.2.3
```

### Manual Version Bumping

If you need to bump the version manually:

1. Update `package.json`:

   ```json
   {
     "version": "0.2.2"
   }
   ```

2. Update `package-lock.json` (if it exists):

   ```bash
   npm install
   ```

3. Run tests to ensure everything works:

   ```bash
   npm run test:run
   ```

4. Build the project:
   ```bash
   npm run build
   ```

### Git Workflow

After bumping the version:

```bash
# Review changes
git diff

# Commit changes
git add .
git commit -m "Bump version to 0.2.2"

# Push changes
git push

# Create and push tag
git tag v0.2.2
git push origin v0.2.2
```

## Benefits

### Consistency

- All components automatically use the same version
- No risk of version mismatches between different parts of the system
- Version is always in sync across the entire codebase

### Maintainability

- Only one place to update when bumping versions
- Automated scripts prevent human error
- Tests ensure version changes don't break functionality

### Reliability

- Version utility includes caching for performance
- Fallback mechanisms in case of read errors
- Type-safe version information parsing

## Implementation Details

### Version Utility Features

- **Caching**: Version is cached after first read for performance
- **Error Handling**: Graceful fallback if package.json can't be read
- **Type Safety**: Full TypeScript support with proper types
- **Testing**: Comprehensive test coverage with cache management

### File Structure

```
src/
├── utils/
│   ├── version.ts          # Centralized version utility
│   └── index.ts           # Exports version utility
├── server/
│   └── CognitiveMCPServer.ts  # Uses getVersion()
├── utils/
│   ├── ResponseFormatter.ts   # Uses getVersion()
│   └── persistence/
│       ├── PersistenceManager.ts      # Uses getVersion()
│       └── FilePersistenceProvider.ts # Uses getVersion()
└── __tests__/
    └── utils/
        └── version.test.ts    # Tests for version utility
```

### Integration Points

The version utility is integrated into:

1. **MCP Server Registration**: Server metadata includes current version
2. **Tool Responses**: All tool responses include version in metadata
3. **Memory Persistence**: Snapshots include version for compatibility checking
4. **Error Responses**: Error metadata includes version information
5. **Performance Monitoring**: Metrics include version context

## Migration Notes

### From Hardcoded Versions

If you find hardcoded version strings in the codebase:

1. Replace with `getVersion()` import and call
2. Add the import: `import { getVersion } from "../utils/version.js"`
3. Update tests to use `getVersion()` instead of hardcoded strings

### Example Migration

**Before:**

```typescript
const serverInfo = {
  name: "thoughtmcp",
  version: "1.0.0", // Hardcoded
};
```

**After:**

```typescript
import { getVersion } from "../utils/version.js";

const serverInfo = {
  name: "thoughtmcp",
  version: getVersion(), // Centralized
};
```

## Best Practices

1. **Always use `getVersion()`** instead of hardcoding version strings
2. **Import from the utility** rather than reading package.json directly
3. **Use version scripts** for bumping rather than manual edits
4. **Test after version changes** to ensure nothing breaks
5. **Tag releases** with proper semantic versioning

## Troubleshooting

### Version Not Found

If you get "version not found" errors:

1. Ensure `package.json` exists in the project root
2. Check that the version field is properly formatted
3. Verify the path resolution in `version.ts`

### Import Errors

If you get import errors:

1. Ensure the import path is correct: `"../utils/version.js"`
2. Check that the version utility is exported in `utils/index.ts`
3. Verify TypeScript compilation is working

### Test Failures

If tests fail after version changes:

1. Update test expectations to use `getVersion()`
2. Clear version cache in test setup if needed
3. Ensure test fixtures use dynamic version references

This centralized approach ensures consistency, reduces maintenance overhead, and prevents version-related bugs across the ThoughtMCP system.
