# Installation Guide

This guide covers different ways to install and set up ThoughtMCP for various use cases.

## System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Memory**: At least 2GB RAM available
- **Storage**: 100MB-1GB for memory persistence

## Installation Methods

### Method 1: Development Setup (Recommended)

Best for trying out ThoughtMCP, development, or customization.

```bash
# Clone the repository
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp

# Install dependencies
npm ci

# Build the project
npm run build

# Verify installation
npm test
```

**Verify it works:**

```bash
# Start the server
npm run dev

# You should see:
# [INFO] ThoughtMCP server starting...
# [INFO] MCP server ready on stdio
```

### Method 2: NPM Package (Coming Soon)

For production deployments and easy integration.

```bash
# This will be available soon
npm install thought-mcp
```

### Method 3: Docker (Coming Soon)

For containerized deployments.

```bash
# This will be available soon
docker run -p 3000:3000 thoughtmcp/server
```

## Configuration

### Basic Configuration

Create a `.env` file in your project root:

```bash
# Copy the example configuration
cp example.env .env
```

Edit `.env` with your preferences:

```bash
# Core Processing
COGNITIVE_DEFAULT_MODE=balanced
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_WORKING_MEMORY_CAPACITY=7
COGNITIVE_TEMPERATURE=0.7

# Memory Configuration
COGNITIVE_BRAIN_DIR=~/.brain
COGNITIVE_EPISODIC_MEMORY_SIZE=10000
COGNITIVE_SEMANTIC_MEMORY_SIZE=5000

# System
LOG_LEVEL=INFO
COGNITIVE_TIMEOUT_MS=30000
```

### Memory Storage Options

ThoughtMCP needs a place to store its memories. You have three options:

#### Option 1: Global Learning (Default)

```bash
COGNITIVE_BRAIN_DIR="~/.brain"
```

- AI learns across all your projects
- Builds comprehensive knowledge over time
- Best for personal use

#### Option 2: Project-Specific

```bash
COGNITIVE_BRAIN_DIR="./brain"
```

- Memory isolated to current project
- Good for client work or sensitive projects
- Each project has its own knowledge base

#### Option 3: Domain-Specific

```bash
COGNITIVE_BRAIN_DIR="~/.brain/web-development"
```

- Separate brains for different domains
- Good for specialists working in multiple fields
- Organized knowledge by topic

### Advanced Configuration

For advanced users, you can configure individual cognitive components:

```bash
# Dual-Process System
COGNITIVE_SYSTEM1_THRESHOLD=0.3
COGNITIVE_SYSTEM2_THRESHOLD=0.7
COGNITIVE_CONFLICT_RESOLUTION=weighted

# Memory Systems
COGNITIVE_EPISODIC_DECAY_RATE=0.01
COGNITIVE_SEMANTIC_SIMILARITY_THRESHOLD=0.3
COGNITIVE_CONSOLIDATION_INTERVAL=3600000

# Emotional Processing
COGNITIVE_EMOTIONAL_SENSITIVITY=0.5
COGNITIVE_SOMATIC_MARKER_STRENGTH=0.3

# Stochastic Processing
COGNITIVE_NOISE_LEVEL=0.1
COGNITIVE_STOCHASTIC_RESONANCE=true
```

## Verification

### Quick Health Check

```bash
# Run the development check
npm run dev:check:fast

# Should show:
# ✅ TypeScript compilation
# ✅ Code style check
# ✅ Basic validation
```

### Full Test Suite

```bash
# Run all tests
npm test

# Should show:
# ✅ 789 tests passing
# ✅ 79.63% coverage
# ✅ All cognitive components working
```

### Performance Benchmark

```bash
# Test performance
npm run test:performance

# Should show response times:
# ✅ Think tool: 50-200ms
# ✅ Memory operations: 10-50ms
# ✅ Analysis: 100-300ms
```

## Troubleshooting

### Common Issues

**"Node.js version not supported"**

```bash
# Check your Node.js version
node --version

# Should be 18.0.0 or higher
# If not, install from: https://nodejs.org/
```

**"npm install fails"**

```bash
# Clear npm cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**"Build fails with TypeScript errors"**

```bash
# Check TypeScript version
npx tsc --version

# Clean build
npm run clean
npm run build
```

**"Tests fail"**

```bash
# Run specific test suites to isolate issues
npm run test:cognitive
npm run test:integration
npm run test:memory
```

**"Server starts but doesn't respond"**

```bash
# Check if port is available
lsof -i :3000

# Check logs for errors
LOG_LEVEL=DEBUG npm run dev
```

### Memory Issues

**"Out of memory errors"**

```bash
# Reduce memory usage
COGNITIVE_EPISODIC_MEMORY_SIZE=5000
COGNITIVE_SEMANTIC_MEMORY_SIZE=2000
COGNITIVE_WORKING_MEMORY_CAPACITY=5
```

**"Brain directory permissions"**

```bash
# Fix permissions
chmod 755 ~/.brain
chown -R $USER ~/.brain
```

### Performance Issues

**"Slow response times"**

```bash
# Optimize for speed
COGNITIVE_TEMPERATURE=0.3
COGNITIVE_ENABLE_METACOGNITION=false
COGNITIVE_TIMEOUT_MS=10000
```

**"High CPU usage"**

```bash
# Reduce processing intensity
COGNITIVE_DEFAULT_MODE=intuitive
COGNITIVE_NOISE_LEVEL=0.05
```

## Next Steps

Once installation is complete:

1. **[Quick Start](README.md)** - Try your first example
2. **[Basic Concepts](basic-concepts.md)** - Understand how it works
3. **[Configuration Guide](../guides/configuration.md)** - Customize behavior
4. **[Examples](../examples/)** - See real applications

## Getting Help

- **Documentation**: Check our [guides](../guides/) for common issues
- **GitHub Issues**: [Report bugs](https://github.com/keyurgolani/ThoughtMcp/issues)
- **Discussions**: [Ask questions](https://github.com/keyurgolani/ThoughtMcp/discussions)
- **Community**: Join our community for support and tips

---

_Installation complete? Head to [Quick Start](README.md) to try your first example._
