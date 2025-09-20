#!/bin/bash

# Version Bump Script
# Usage: ./scripts/bump-version.sh [major|minor|patch|<version>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Determine new version
if [ $# -eq 0 ]; then
    print_error "Usage: $0 [major|minor|patch|<version>]"
    exit 1
fi

BUMP_TYPE=$1

case $BUMP_TYPE in
    major|minor|patch)
        print_status "Bumping $BUMP_TYPE version..."
        NEW_VERSION=$(npm version $BUMP_TYPE --no-git-tag-version)
        NEW_VERSION=${NEW_VERSION#v} # Remove 'v' prefix
        ;;
    *)
        # Assume it's a specific version
        if [[ $BUMP_TYPE =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            NEW_VERSION=$BUMP_TYPE
            print_status "Setting version to: $NEW_VERSION"
            npm version $NEW_VERSION --no-git-tag-version
        else
            print_error "Invalid version format. Use semver format (e.g., 1.2.3) or bump type (major|minor|patch)"
            exit 1
        fi
        ;;
esac

print_status "New version: $NEW_VERSION"

# Update package-lock.json version references
print_status "Updating package-lock.json..."
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" package-lock.json

# Run tests to make sure everything still works
print_status "Running tests to verify version update..."
npm run test:run

# Build to make sure everything compiles
print_status "Building project..."
npm run build

print_status "Version bump completed successfully!"
print_status "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit changes: git add . && git commit -m 'Bump version to $NEW_VERSION'"
echo "  3. Push changes: git push"
echo "  4. Create tag: git tag v$NEW_VERSION && git push origin v$NEW_VERSION"
