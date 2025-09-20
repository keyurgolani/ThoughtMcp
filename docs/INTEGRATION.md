# ThoughtMCP Integration Guide

Complete guide for integrating ThoughtMCP with AI development environments and applications.

## Quick Start

### 1. Install and Validate

```bash
# Clone and build ThoughtMCP
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install
npm run setup:mcp
```

The setup command will:

- Build the project
- Validate your system requirements
- Check existing configurations
- Generate sample configuration files

### 2. Choose Your Environment

| Environment                           | Best For               | Setup Time | Complexity |
| ------------------------------------- | ---------------------- | ---------- | ---------- |
| **[Kiro IDE](#kiro-ide)**             | AI-powered development | 2 minutes  | Easy       |
| **[Claude Desktop](#claude-desktop)** | Research and analysis  | 3 minutes  | Easy       |
| **[Cursor IDE](#cursor-ide)**         | AI coding assistance   | 5 minutes  | Medium     |
| **[Void Editor](#void-editor)**       | Modern AI editing      | 5 minutes  | Medium     |
| **[Generic MCP](#generic-setup)**     | Any MCP system         | 10 minutes | Advanced   |

## Environment-Specific Setup

### Kiro IDE

**Best for**: AI-powered development, code review, learning

```bash
# 1. Create workspace configuration
mkdir -p .kiro/settings
cat > .kiro/settings/mcp.json << 'EOF'
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_BRAIN_DIR": "./brain"
      },
      "autoApprove": ["think", "recall"]
    }
  }
}
EOF

# 2. Test the integration
echo "Can you think through this code review systematically?" | kiro chat
```

**Usage Examples**:

```markdown
# Code review

Review this React component using systematic thinking

# Learning session

Help me understand microservices architecture step by step

# Project planning

Think through the architecture for this new feature
```

### Claude Desktop

**Best for**: Research, analysis, creative writing, complex reasoning

```bash
# 1. Find your Claude config directory
# macOS: ~/Library/Application Support/Claude/
# Windows: %APPDATA%\Claude\
# Linux: ~/.config/Claude/

# 2. Edit claude_desktop_config.json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "deliberative",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_BRAIN_DIR": "~/.brain/claude"
      }
    }
  }
}

# 3. Restart Claude Desktop
```

**Usage Examples**:

```
Analyze this research paper using systematic reasoning with multiple perspectives

Help me make a complex business decision about our product strategy

Write a creative story using emotional and intuitive thinking
```

### Cursor IDE

**Best for**: AI-assisted coding, architecture decisions, debugging

```bash
# 1. Install MCP extension (if available) or configure manually
# 2. Add to VS Code settings.json or .cursor/mcp.json

{
  "mcp.servers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "analytical",
        "COGNITIVE_BRAIN_DIR": "${workspaceFolder}/brain"
      }
    }
  }
}
```

**Usage Examples**:

```typescript
// Use @thought-mcp in comments or chat
/*
@thought-mcp Think through the best stanagement solution for this React app.
Consider team experience, app complexity, and performance requirements.
*/

// @thought-mcp Help debug this performance issue systematically
```

### Void Editor

**Best for**: Modern AI editing, collaborative development

```bash
# 1. Create void-mcp-config.json in project root
{
  "mcp": {
    "servers": {
      "thought-mcp": {
        "executable": "node",
        "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
        "environment": {
          "COGNITIVE_DEFAULT_MODE": "creative",
          "COGNITIVE_ENABLE_EMOTION": "true"
        },
        "autostart": true
      }
    }
  }
}

# 2. Update Void settings to reference the config
```

### Generic Setup

**For any MCP-compatible system**:

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_WORKING_MEMORY_CAPACITY": "7",
        "COGNITIVE_BRAIN_DIR": "~/.brain",
        "COGNITIVE_TEMPERATURE": "0.7",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## Configuration Options

### Processing Modes

| Mode           | Use Case           | Speed  | Quality  | Creativity |
| -------------- | ------------------ | ------ | -------- | ---------- |
| `intuitive`    | Quick responses    | ⚡⚡⚡ | ⭐⭐     | ⭐⭐       |
| `analytical`   | Technical analysis | ⚡⚡   | ⭐⭐⭐   | ⭐         |
| `balanced`     | General purpose    | ⚡⚡   | ⭐⭐⭐   | ⭐⭐       |
| `deliberative` | Complex reasoning  | ⚡     | ⭐⭐⭐⭐ | ⭐⭐       |
| `creative`     | Innovation         | ⚡⚡   | ⭐⭐⭐   | ⭐⭐⭐⭐   |

### Memory Configuration

```json
{
  "env": {
    "COGNITIVE_BRAIN_DIR": "~/.brain", // Global memory
    "COGNITIVE_BRAIN_DIR": "./brain", // Project-specific
    "COGNITIVE_BRAIN_DIR": "~/.brain/domain", // Domain-specific
    "COGNITIVE_EPISODIC_MEMORY_SIZE": "1000", // Experience capacity
    "COGNITIVE_SEMANTIC_MEMORY_SIZE": "5000" // Knowledge capacity
  }
}
```

### Performance Tuning

**High Performance** (fast responses):

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "intuitive",
    "COGNITIVE_ENABLE_METACOGNITION": "false",
    "COGNITIVE_WORKING_MEMORY_CAPACITY": "5",
    "COGNITIVE_TIMEOUT_MS": "10000"
  }
}
```

**High Quality** (thorough analysis):

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "deliberative",
    "COGNITIVE_ENABLE_METACOGNITION": "true",
    "COGNITIVE_MAX_REASONING_DEPTH": "15",
    "COGNITIVE_TIMEOUT_MS": "60000"
  }
}
```

## Usage Patterns

### 1. Systematic Problem Solving

```
Think through [problem] using deliberative reasoning:
1. Break down into components
2. Analyze each systematically
3. Consider multiple approaches
4. Evaluate trade-offs
5. Remember insights for future use
```

### 2. Knowledge Building

```
I'm learning [topic]. Please:
1. Think through key concepts
2. Remember my progress
3. Recall previous discussions
4. Suggest next steps
```

### 3. Code Quality Assurance

```
Review this [code] systematically:
1. Analyze structure and logic
2. Identify potential issues
3. Consider maintainability
4. Remember successful patterns
```

### 4. Creative Innovation

```
Brainstorm solutions for [challenge]:
1. Think creatively and unconventionally
2. Consider cross-domain analogies
3. Generate diverse options
4. Remember creative patterns
```

## Validation and Testing

### Automated Validation

```bash
# Run the configuration validator
npm run validate:mcp

# This checks:
# - Node.js version (18+)
# - ThoughtMCP build status
# - Server startup functionality
# - Configuration file validity
# - Path correctness
```

### Manual Testing

```bash
# Test server directly
echo '{"method": "tools/list"}' | node dist/index.js

# Expected response includes: think, remember, recall, analyze_reasoning
```

### Integration Testing

In your AI environment, try:

```
Test 1: Can you think through a simple math problem step by step?

Test 2: Remember this: "Integration testing completed successfully"

Test 3: What do you recall about integration testing?

Test 4: Analyze the quality of your reasoning in the previous responses
```

## Troubleshooting

### Common Issues

**Server won't start**:

- ✅ Use absolute paths in configuration
- ✅ Check Node.js version (18+ required)
- ✅ Verify `dist/index.js` exists (`npm run build`)
- ✅ Check file permissions

**High memory usage**:

```json
{
  "env": {
    "COGNITIVE_EPISODIC_MEMORY_SIZE": "500",
    "COGNITIVE_SEMANTIC_MEMORY_SIZE": "2000",
    "COGNITIVE_WORKING_MEMORY_CAPACITY": "5"
  }
}
```

**Slow responses**:

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "intuitive",
    "COGNITIVE_MAX_REASONING_DEPTH": "6",
    "COGNITIVE_ENABLE_METACOGNITION": "false"
  }
}
```

**Connection timeouts**:

```json
{
  "env": {
    "COGNITIVE_TIMEOUT_MS": "60000"
  }
}
```

### Debug Mode

Enable detailed logging:

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "COGNITIVE_DEBUG": "true"
  }
}
```

### Getting Help

1. **Run diagnostics**: `npm run validate:mcp`
2. **Check logs**: Enable debug mode and check output
3. **Review documentation**: [Complete guide](integration/agentic-environments.md)
4. **Community support**: [GitHub Discussions](https://github.com/keyurgolani/ThoughtMcp/discussions)
5. **Report issues**: [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues)

## Advanced Integration

### Multi-Domain Setup

Configure separate instances for different domains:

```json
{
  "mcpServers": {
    "thought-mcp-coding": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_BRAIN_DIR": "~/.brain/coding",
        "COGNITIVE_DEFAULT_MODE": "analytical"
      }
    },
    "thought-mcp-creative": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_BRAIN_DIR": "~/.brain/creative",
        "COGNITIVE_DEFAULT_MODE": "creative",
        "COGNITIVE_TEMPERATURE": "1.2"
      }
    }
  }
}
```

### API Integration

```typescript
// Express.js integration example
import express from "express";
import { ThoughtMCPClient } from "./cognitive-client.js";

const app = express();
const client = new ThoughtMCPClient();

app.post("/api/think", async (req, res) => {
  const result = await client.think(req.body.input, req.body.options);
  res.json(result);
});

await client.connect();
app.listen(3000);
```

### Webhook Integration

```typescript
// Webhook for external systems
app.post("/webhook/cognitive", async (req, res) => {
  const { event, data } = req.body;

  if (event === "decision_needed") {
    const analysis = await client.think(data.problem, {
      mode: "deliberative",
      enable_metacognition: true,
    });

    // Send result to external system
    await notifyExternalSystem(analysis);
  }

  res.status(200).send("OK");
});
```

## Best Practices

### 1. Environment Selection

- **Kiro**: Best for development workflows and learning
- **Claude**: Best for research and complex analysis
- **Cursor**: Best for AI-assisted coding
- **Void**: Best for modern collaborative editing

### 2. Configuration Management

- Use project-specific brain directories for isolation
- Configure appropriate timeouts for your use case
- Enable meition for important decisions
- Use auto-approval for safe, frequent operations

### 3. Performance Optimization

- Choose the right mode for each task type
- Monitor memory usage in long-running sessions
- Use appropriate timeout values
- Consider disabling features for speed-critical applications

### 4. Security Considerations

- Use project-specific brain directories for sensitive data
- Be cautious with auto-approval in production environments
- Regularly clean up old memories if needed
- Monitor for sensitive information in logs

## Next Steps

1. **[Complete Setup Guide](integration/agentic-environments.md)** - Detailed instructions for all environments
2. **[Usage Examples](../examples/agentic-usage-examples.md)** - Practical examples for each environment
3. **[API Reference](api/cognitive-tools.md)** - Complete tool documentation
4. **[Configuration Guide](guides/configuration.md)** - Advanced configuration options

---

_Ready to enhance your AI environment with human-like thinking? Choose your environment above and get started in minutes!_
