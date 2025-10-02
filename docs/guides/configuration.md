# Configuration Guide

This guide covers all configuration options for ThoughtMCP, from basic setup to advanced tuning for specific use cases.

## Quick Configuration

### Basic Setup

Create a `.env` file in your project root:

```bash
# Copy the example configuration
cp example.env .env
```

Edit with your preferences:

```bash
# Essential settings
COGNITIVE_DEFAULT_MODE=balanced
COGNITIVE_BRAIN_DIR=~/.brain
LOG_LEVEL=INFO
```

### Memory Storage Options

Choose how ThoughtMCP stores its memories:

```bash
# Option 1: Global learning (recommended for personal use)
COGNITIVE_BRAIN_DIR="~/.brain"

# Option 2: Project-specific (good for client work)
COGNITIVE_BRAIN_DIR="./brain"

# Option 3: Domain-specific (good for specialists)
COGNITIVE_BRAIN_DIR="~/.brain/web-development"
```

## Complete Configuration Reference

### Core Processing Settings

#### `COGNITIVE_DEFAULT_MODE`

**Default**: `balanced`
**Options**: `intuitive`, `deliberative`, `balanced`, `creative`, `analytical`

Controls the default thinking mode when not specified in requests.

```bash
# For speed-focused applications
COGNITIVE_DEFAULT_MODE=intuitive

# For quality-focused applications
COGNITIVE_DEFAULT_MODE=deliberative

# For general use
COGNITIVE_DEFAULT_MODE=balanced
```

#### `COGNITIVE_ENABLE_EMOTION`

**Default**: `true`
**Options**: `true`, `false`

Whether to include emotional processing in reasoning.

```bash
# Enable for human-facing applications
COGNITIVE_ENABLE_EMOTION=true

# Disable for purely technical applications
COGNITIVE_ENABLE_EMOTION=false
```

#### `COGNITIVE_ENABLE_METACOGNITION`

**Default**: `true`
**Options**: `true`, `false`

Whether to include self-monitoring of reasoning quality.

```bash
# Enable for high-quality reasoning (slower)
COGNITIVE_ENABLE_METACOGNITION=true

# Disable for faster responses
COGNITIVE_ENABLE_METACOGNITION=false
```

#### `COGNITIVE_ENABLE_PREDICTION`

**Default**: `true`
**Options**: `true`, `false`

Whether to enable predictive processing and future state modeling.

```bash
# Enable for enhanced reasoning with predictions
COGNITIVE_ENABLE_PREDICTION=true

# Disable for simpler processing
COGNITIVE_ENABLE_PREDICTION=false
```

#### `COGNITIVE_WORKING_MEMORY_CAPACITY`

**Default**: `7`
\*\*Rang`1-20`

Maximum items in working memory (affects reasoning depth).

```bash
# For simple applications
COGNITIVE_WORKING_MEMORY_CAPACITY=5

# For complex reasoning
COGNITIVE_WORKING_MEMORY_CAPACITY=12
```

#### `COGNITIVE_TEMPERATURE`

**Default**: `0.7`
**Range**: `0.0-2.0`

Controls randomness in processing.

```bash
# For deterministic responses
COGNITIVE_TEMPERATURE=0.3

# For creative responses
COGNITIVE_TEMPERATURE=1.2
```

#### `COGNITIVE_TIMEOUT_MS`

**Default**: `30000`
**Range**: `1000-300000`

Maximum processing time per request in milliseconds.

```bash
# For fast applications
COGNITIVE_TIMEOUT_MS=10000

# For complex reasoning
COGNITIVE_TIMEOUT_MS=60000
```

#### `COGNITIVE_NOISE_LEVEL`

**Default**: `0.1`
**Range**: `0.0-1.0`

Neural noise level for stochastic processing.

```bash
# For deterministic processing
COGNITIVE_NOISE_LEVEL=0.0

# For enhanced creativity
COGNITIVE_NOISE_LEVEL=0.2
```

#### `COGNITIVE_ATTENTION_THRESHOLD`

**Default**: `0.3`
**Range**: `0.0-1.0`

Attention threshold for sensory processing.

```bash
# For focused attention
COGNITIVE_ATTENTION_THRESHOLD=0.5

# For broad attention
COGNITIVE_ATTENTION_THRESHOLD=0.2
```

#### `COGNITIVE_MAX_REASONING_DEPTH`

**Default**: `10`
**Range**: `1-50`

Maximum depth for reasoning chains.

```bash
# For simple reasoning
COGNITIVE_MAX_REASONING_DEPTH=5

# For deep analysis
COGNITIVE_MAX_REASONING_DEPTH=20
```

#### `COGNITIVE_MAX_CONCURRENT_SESSIONS`

**Default**: `100`
**Range**: `1-1000`

Maximum concurrent cognitive sessions.

```bash
# For single-user applications
COGNITIVE_MAX_CONCURRENT_SESSIONS=10

# For high-traffic applications
COGNITIVE_MAX_CONCURRENT_SESSIONS=500
```

#### `COGNITIVE_CONFIDENCE_THRESHOLD`

**Default**: `0.6`
**Range**: `0.0-1.0`

Confidence threshold for decision making.

```bash
# For cautious decision making
COGNITIVE_CONFIDENCE_THRESHOLD=0.8

# For more permissive decisions
COGNITIVE_CONFIDENCE_THRESHOLD=0.4
```

#### `COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD`

**Default**: `0.4`
**Range**: `0.0-1.0`

Threshold for activating deliberative processing (System 2).

```bash
# For more deliberative processing
COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD=0.2

# For more intuitive processing
COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD=0.8
```

#### `COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD`

**Default**: `0.3`
**Range**: `0.0-1.0`

Similarity threshold for memory retrieval.

```bash
# For strict memory matching
COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD=0.7

# For loose memory associations
COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD=0.1
```

#### `COGNITIVE_CONSOLIDATION_INTERVAL`

**Default**: `300000`
**Range**: `60000-3600000`

Memory consolidation interval in milliseconds.

```bash
# For frequent consolidation
COGNITIVE_CONSOLIDATION_INTERVAL=60000

# For less frequent consolidation
COGNITIVE_CONSOLIDATION_INTERVAL=1800000
```

### Memory System Settings

#### `COGNITIVE_BRAIN_DIR`

**Default**: `~/.brain`

Directory for persistent memory storage.

```bash
# Global brain (learns across all projects)
COGNITIVE_BRAIN_DIR="~/.brain"

# Project-specific brain
COGNITIVE_BRAIN_DIR="./brain"

# Domain-specific brain
COGNITIVE_BRAIN_DIR="~/.brain/finance"
```

#### `COGNITIVE_EPISODIC_MEMORY_SIZE`

**Default**: `10000`
**Range**: `100-100000`

Maximum number of episodic memories to store.

```bash
# For lightweight applications
COGNITIVE_EPISODIC_MEMORY_SIZE=1000

# For extensive learning
COGNITIVE_EPISODIC_MEMORY_SIZE=50000
```

#### `COGNITIVE_SEMANTIC_MEMORY_SIZE`

**Default**: `5000`
**Range**: `100-50000`

Maximum number of semantic concepts to store.

```bash
# For simple knowledge bases
COGNITIVE_SEMANTIC_MEMORY_SIZE=1000

# For comprehensive knowledge
COGNITIVE_SEMANTIC_MEMORY_SIZE=20000
```

### Advanced Cognitive Settings

#### Dual-Process System

```bash
# System 1 (intuitive) threshold
COGNITIVE_SYSTEM1_THRESHOLD=0.3

# System 2 (deliberative) threshold
COGNITIVE_SYSTEM2_THRESHOLD=0.7

# Conflict resolution strategy
COGNITIVE_CONFLICT_RESOLUTION=weighted  # or 'system1', 'system2'
```

#### Memory Consolidation

```bash
# How often to consolidate memories (milliseconds)
COGNITIVE_CONSOLIDATION_INTERVAL=3600000  # 1 hour

# Minimum pattern strength for consolidation
COGNITIVE_CONSOLIDATION_THRESHOLD=0.5

# Episodic memory decay rate
COGNITIVE_EPISODIC_DECAY_RATE=0.01
```

#### Emotional Processing

```bash
# Emotional sensitivity (0.0-1.0)
COGNITIVE_EMOTIONAL_SENSITIVITY=0.5

# Somatic marker influence strength
COGNITIVE_SOMATIC_MARKER_STRENGTH=0.3

# Emotional decay rate
COGNITIVE_EMOTIONAL_DECAY_RATE=0.05
```

#### Stochastic Processing

```bash
# Neural noise level (0.0-1.0)
COGNITIVE_NOISE_LEVEL=0.1

# Enable stochastic resonance
COGNITIVE_STOCHASTIC_RESONANCE=true

# Noise adaptation rate
COGNITIVE_NOISE_ADAPTATION=0.01
```

### System Settings

#### `LOG_LEVEL`

**Default**: `INFO`
**Options**: `DEBUG`, `INFO`, `WARN`, `ERROR`

Controls logging verbosity.

```bash
# For development
LOG_LEVEL=DEBUG

# For production
LOG_LEVEL=INFO
```

#### Performance Monitoring

```bash
# Enable performance monitoring
COGNITIVE_ENABLE_MONITORING=true

# Performance metrics collection interval
COGNITIVE_METRICS_INTERVAL=60000  # 1 minute

# Enable memory usage tracking
COGNITIVE_TRACK_MEMORY=true
```

## Configuration Profiles

### Development Profile

Optimized for experimentation and debugging:

```bash
# Development configuration
COGNITIVE_DEFAULT_MODE=balanced
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_ENABLE_PREDICTION=true
COGNITIVE_WORKING_MEMORY_CAPACITY=7
COGNITIVE_EPISODIC_MEMORY_SIZE=1000
COGNITIVE_SEMANTIC_MEMORY_SIZE=5000
COGNITIVE_CONSOLIDATION_INTERVAL=300000
COGNITIVE_NOISE_LEVEL=0.1
COGNITIVE_TEMPERATURE=0.7
COGNITIVE_ATTENTION_THRESHOLD=0.3
COGNITIVE_MAX_REASONING_DEPTH=10
COGNITIVE_TIMEOUT_MS=30000
COGNITIVE_MAX_CONCURRENT_SESSIONS=100
COGNITIVE_CONFIDENCE_THRESHOLD=0.6
COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD=0.4
COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD=0.3
COGNITIVE_BRAIN_DIR="./brain"
LOG_LEVEL=DEBUG
```

### Production Profile

Optimized for performance and reliability:

```bash
# Production configuration
COGNITIVE_DEFAULT_MODE=balanced
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=false  # Disable for speed
COGNITIVE_ENABLE_PREDICTION=true
COGNITIVE_WORKING_MEMORY_CAPACITY=7
COGNITIVE_EPISODIC_MEMORY_SIZE=5000
COGNITIVE_SEMANTIC_MEMORY_SIZE=10000
COGNITIVE_CONSOLIDATION_INTERVAL=600000  # 10 minutes
COGNITIVE_NOISE_LEVEL=0.05
COGNITIVE_TEMPERATURE=0.5
COGNITIVE_ATTENTION_THRESHOLD=0.4
COGNITIVE_MAX_REASONING_DEPTH=8
COGNITIVE_TIMEOUT_MS=15000
COGNITIVE_MAX_CONCURRENT_SESSIONS=200
COGNITIVE_CONFIDENCE_THRESHOLD=0.7
COGNITIVE_SYSTEM2_ACTIVATION_THRESHOLD=0.5
COGNITIVE_MEMORY_RETRIEVAL_THRESHOLD=0.4
COGNITIVE_BRAIN_DIR="~/.brain"
LOG_LEVEL=INFO
```

### Speed-Optimized Profile

Optimized for fast responses:

```bash
# Speed-optimized configuration
COGNITIVE_DEFAULT_MODE=intuitive
COGNITIVE_ENABLE_EMOTION=false
COGNITIVE_ENABLE_METACOGNITION=false
COGNITIVE_TEMPERATURE=0.3
COGNITIVE_TIMEOUT_MS=5000
COGNITIVE_WORKING_MEMORY_CAPACITY=5
COGNITIVE_NOISE_LEVEL=0.05
LOG_LEVEL=WARN
```

### Quality-Optimized Profile

Optimized for highest reasoning quality:

```bash
# Quality-optimized configuration
COGNITIVE_DEFAULT_MODE=deliberative
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_TEMPERATURE=0.8
COGNITIVE_TIMEOUT_MS=60000
COGNITIVE_WORKING_MEMORY_CAPACITY=15
COGNITIVE_MAX_DEPTH=20
LOG_LEVEL=DEBUG
```

### Research Profile

Optimized for research and experimentation:

```bash
# Research configuration
COGNITIVE_DEFAULT_MODE=deliberative
COGNITIVE_ENABLE_EMOTION=true
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_TEMPERATURE=0.7
COGNITIVE_TIMEOUT_MS=120000
COGNITIVE_WORKING_MEMORY_CAPACITY=20
COGNITIVE_EPISODIC_MEMORY_SIZE=50000
COGNITIVE_SEMANTIC_MEMORY_SIZE=25000
LOG_LEVEL=DEBUG
COGNITIVE_ENABLE_MONITORING=true
```

## Runtime Configuration

Some settingse overridden per request:

```json
{
  "tool": "think",
  "arguments": {
    "input": "Your question",
    "mode": "creative", // Override default mode
    "temperature": 1.0, // Override default temperature
    "enable_emotion": false, // Override emotion setting
    "enable_metacognition": true, // Override metacognition setting
    "max_depth": 15 // Override depth limit
  }
}
```

## Configuration Validation

### Checking Current Configuration

```bash
# View current configuration
npm run config:show

# Validate configuration
npm run config:validate

# Test configuration with sample request
npm run config:test
```

### Common Configuration Issues

**Memory Directory Permissions:**

```bash
# Fix permissions
chmod 755 ~/.brain
chown -R $USER ~/.brain
```

**Invalid Configuration Values:**

```bash
# Check for invalid values
npm run config:validate

# Reset to defaults
npm run config:reset
```

**Performance Issues:**

```bash
# Check resource usage
npm run monitor:resources

# Optimize for current system
npm run config:optimize
```

## Environment-Specific Configuration

### Docker Configuration

```dockerfile
# Dockerfile environment variables
ENV COGNITIVE_DEFAULT_MODE=balanced
ENV COGNITIVE_BRAIN_DIR=/app/brain
ENV COGNITIVE_TIMEOUT_MS=15000
ENV LOG_LEVEL=INFO
```

### Kubernetes Configuration

```yaml
# ConfigMap for Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: thoughtmcp-config
data:
  COGNITIVE_DEFAULT_MODE: "balanced"
  COGNITIVE_BRAIN_DIR: "/data/brain"
  COGNITIVE_TIMEOUT_MS: "15000"
  LOG_LEVEL: "INFO"
```

### Cloud Function Configuration

```bash
# For serverless environments
COGNITIVE_DEFAULT_MODE=intuitive
COGNITIVE_ENABLE_METACOGNITION=false
COGNITIVE_TIMEOUT_MS=5000
COGNITIVE_BRAIN_DIR="/tmp/brain"
```

## Monitoring Configuration

### Performance Metrics

```bash
# Enable detailed performance tracking
COGNITIVE_ENABLE_MONITORING=true
COGNITIVE_METRICS_INTERVAL=30000
COGNITIVE_TRACK_MEMORY=true
COGNITIVE_TRACK_LATENCY=true
```

### Health Checks

```bash
# Health check configuration
COGNITIVE_HEALTH_CHECK_INTERVAL=60000
COGNITIVE_HEALTH_CHECK_TIMEOUT=5000
COGNITIVE_HEALTH_CHECK_ENABLED=true
```

## Troubleshooting Configuration

### Debug Configuration Issues

```bash
# Enable debug logging
LOG_LEVEL=DEBUG

# Check configuration loading
DEBUG=config:* npm run dev

# Validate all settings
npm run config:validate --verbose
```

### Performance Tuning

**For High Throughput:**

```bash
COGNITIVE_DEFAULT_MODE=intuitive
COGNITIVE_ENABLE_METACOGNITION=false
COGNITIVE_TIMEOUT_MS=5000
COGNITIVE_WORKING_MEMORY_CAPACITY=5
```

**For High Quality:**

```bash
COGNITIVE_DEFAULT_MODE=deliberative
COGNITIVE_ENABLE_METACOGNITION=true
COGNITIVE_TIMEOUT_MS=30000
COGNITIVE_WORKING_MEMORY_CAPACITY=12
```

**For Memory Efficiency:**

```bash
COGNITIVE_EPISODIC_MEMORY_SIZE=1000
COGNITIVE_SEMANTIC_MEMORY_SIZE=500
COGNITIVE_CONSOLIDATION_INTERVAL=1800000  # 30 minutes
```

## Best Practices

### Configuration Management

1. **Use Environment Files**: Keep configuration in `.env` files
2. **Version Control**: Track configuration changes in git
3. **Environment Separation**: Different configs for dev/staging/prod
4. **Validation**: Always validate configuration before deployment
5. **Documentation**: Document custom configuration choices

### Security Considerations

1. **File Permissions**: Secure brain directory permissions
2. **Sensitive Data**: Don't log sensitive configuration values
3. **Access Control**: Limit access to configuration files
4. **Encryption**: Consider encrypting brain directory contents

### Performance Optimization

1. **Profile First**: Measure before optimizing
2. **Gradual Changes**: Make incremental configuration adjustments
3. **Monitor Impact**: Track performance metrics after changes
4. **Load Testing**: Test configuration under realistic load
5. **Rollback Plan**: Keep working configurations for rollback

---

_Next: Learn about [Integration](integration.md) to add ThoughtMCP to your applications._
