# Integrating ThoughtMCP with Agentic Environments

This guide provides step-by-step instructions for configuring ThoughtMCP in various AI development environments and agentic systems.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Kiro IDE](#kiro-ide)
- [Claude Desktop](#claude-desktop)
- [Cursor IDE](#cursor-ide)
- [Void Editor](#void-editor)
- [Generic MCP Configuration](#generic-mcp-configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Overview

ThoughtMCP implements a human-like cognitive architecture that can enhance AI agents with:

- **Dual-process thinking** (intuitive and deliberative reasoning)
- **Memory systems** (episodic and semantic memory with consolidation)
- **Emotional processing** with somatic markers
- **Metacognitive monitoring** and bias detection
- **Predictive processing** with Bayesian belief updating

## Prerequisites

Before configuring ThoughtMCP in any environment, ensure you have:

1. **Node.js 18+** installed
2. **ThoughtMCP server** built and ready:
   ```bash
   git clone https://github.com/keyurgolani/ThoughtMcp.git
   cd ThoughtMcp
   npm install
   npm run build
   ```
3. **Server executable** available at: `./dist/index.js`

## Kiro IDE

Kiro IDE supports MCP servers through workspace and user-level configurations.

### Workspace Configuration

Create or edit `.kiro/settings/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_BRAIN_DIR": "./brain",
        "LOG_LEVEL": "INFO"
      },
      "disabled": false,
      "autoApprove": ["think", "remember", "recall"],
      "disabledTools": []
    }
  }
}
```

### User-Level Configuration

For global access across all projects, edit `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "thought-mcp-global": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced",
        "COGNITIVE_BRAIN_DIR": "~/.brain",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLACOGNITION": "true"
      },
      "disabled": false,
      "autoApprove": ["think", "remember", "recall", "analyze_reasoning"],
      "disabledTools": []
    }
  }
}
```

### Usage in Kiro

Once configured, you can use ThoughtMCP tools in Kiro:

```markdown
# Ask Kiro to use cognitive processing

Can you think through this complex problem using the cognitive architecture?

# Store important information

Please remember this key insight about the project architecture.

# Recall relevant memories

What do you recall about similar problems we've solved?
```

## Claude Desktop

Claude Desktop uses a centralized MCP configuration file.

### Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "deliberative",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_BRAIN_DIR": "~/.brain/claude",
        "COGNITIVE_TEMPERATURE": "0.7",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP server.

### Usage in Claude

```
I need to think through a complex ethical dilemma. Can you use the cognitive architecture to process this systematically?

Please remember our conversation about AI safety principles for future reference.

What insights do you recall about similar ethical frameworks we've discussed?
```

## Cursor IDE

Cursor IDE supports MCP through VS Code extensions and configuration.

### Method 1: VS Code MCP Extension

1. Install the MCP extension in Cursor
2. Configure in VS Code settings (`settings.json`):

```json
{
  "mcp.servers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "creative",
        "COGNITIVE_ENABLE_EMOTION": "true",
        "COGNITIVE_BRAIN_DIR": "${workspaceFolder}/brain",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

### Method 2: Cursor-Specific Configuration

Create `.cursor/mcp.json` in your project:

```json
{
  "servers": {
    "thought-mcp": {
      "command": "node",
      "args": ["./node_modules/thought-mcp/dist/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "COGNITIVE_DEFAULT_MODE": "analytical",
        "COGNITIVE_ENABLE_EMOTION": "false",
        "COGNITIVE_ENABLE_METACOGNITION": "true",
        "COGNITIVE_BRAIN_DIR": "${workspaceFolder}/.brain"
      }
    }
  }
}
```

### Usage in Cursor

Use Cursor's AI chat with cognitive processing:

```
@thought-mcp think about the best architecture for this React component

@thought-mcp remember this coding pattern for future use

@thought-mcp what do you recall about similar component designs?
```

## Void Editor

Void Editor supports MCP through its plugin system.

### Configuration

Create `void-mcp-config.json` in your project root:

```json
{
  "mcp": {
    "servers": {
      "thought-mcp": {
        "executable": "node",
        "args": ["/path/to/ThoughtMcp/dist/index.js"],
        "environment": {
          "COGNITIVE_DEFAULT_MODE": "balanced",
          "COGNITIVE_ENABLE_EMOTION": "true",
          "COGNITIVE_ENABLE_METACOGNITION": "true",
          "COGNITIVE_BRAIN_DIR": "./.void-brain",
          "COGNITIVE_TEMPERATURE": "0.8"
        },
        "autostart": true,
        "timeout": 30000
      }
    }
  }
}
```

### Void Settings

Add to your Void settings file:

```json
{
  "mcp.configFile": "./void-mcp-config.json",
  "mcp.autoConnect": true,
  "ai.providers": {
    "thought-mcp": {
      "enabled": true,
      "priority": "high"
    }
  }
}
```

## Generic MCP Configuration

For any MCP-compatible environment, use this template:

### Basic Configuration Template

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
        "COGNITIVE_EPISODIC_MEMORY_SIZE": "1000",
        "COGNITIVE_SEMANTIC_MEMORY_SIZE": "5000",
        "COGNITIVE_BRAIN_DIR": "~/.brain",
        "COGNITIVE_TEMPERATURE": "0.7",
        "COGNITIVE_NOISE_LEVEL": "0.1",
        "COGNITIVE_ATTENTION_THRESHOLD": "0.3",
        "COGNITIVE_TIMEOUT_MS": "30000",
        "COGNITIVE_MAX_REASONING_DEPTH": "10",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Environment Variables Reference

| Variable                            | Default    | Description                                                                        |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `COGNITIVE_DEFAULT_MODE`            | `balanced` | Processing mode: `intuitive`, `deliberative`, `balanced`, `creative`, `analytical` |
| `COGNITIVE_ENABLE_EMOTION`          | `true`     | Enable emotional processing and somatic markers                                    |
| `COGNITIVE_ENABLE_METACOGNITION`    | `true`     | Enable self-monitoring and bias detection                                          |
| `COGNITIVE_BRAIN_DIR`               | `~/.brain` | Directory for persistent memory storage                                            |
| `COGNITIVE_TEMPERATURE`             | `0.7`      | Randomness level for stochastic processing (0.0-2.0)                               |
| `COGNITIVE_WORKING_MEMORY_CAPACITY` | `7`        | Working memory capacity (Miller's magic number)                                    |
| `COGNITIVE_TIMEOUT_MS`              | `30000`    | Request timeout in milliseconds                                                    |
| `LOG_LEVEL`                         | `INFO`     | Logging level: `DEBUG`, `INFO`, `WARN`, `ERROR`                                    |

## Troubleshooting

### Common Issues

#### 1. Server Not Starting

**Problem**: MCP server fails to start
**Solutions**:

- Verify Node.js version (18+ required)
- Check file paths are absolute
- Ensure `dist/index.js` exists and is executable
- Check environment variables syntax

#### 2. Permission Errors

**Problem**: Cannot write to brain directory
**Solutions**:

```bash
# Create brain directory with proper permissions
mkdir -p ~/.brain
chmod 755 ~/.brain

# Or use project-local directory
mkdir -p ./brain
```

#### 3. Memory Issues

**Problem**: High memory usage or performance issues
**Solutions**:

- Reduce memory sizes in configuration:

```json
{
  "env": {
    "COGNITIVE_EPISODIC_MEMORY_SIZE": "500",
    "COGNITIVE_SEMANTIC_MEMORY_SIZE": "2000",
    "COGNITIVE_WORKING_MEMORY_CAPACITY": "5"
  }
}
```

#### 4. Connection Timeouts

**Problem**: Requests timing out
**Solutions**:

- Increase timeout:

```json
{
  "env": {
    "COGNITIVE_TIMEOUT_MS": "60000"
  }
}
```

- Use faster processing mode:

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "intuitive"
  }
}
```

### Debug Mode

Enable detailed logging for troubleshooting:

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "COGNITIVE_DEBUG": "true"
  }
}
```

### Health Check

Test your configuration with a simple request:

```bash
# Test server directly
echo '{"method": "tools/list"}' | node /path/to/ThoughtMcp/dist/index.js

# Expected response should include tools: think, remember, recall, analyze_reasoning
```

## Advanced Configuration

### Multi-Domain Setup

Configure separate brain directories for different domains:

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

### Performance Optimization

For high-performance environments:

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "intuitive",
    "COGNITIVE_ENABLE_METACOGNITION": "false",
    "COGNITIVE_WORKING_MEMORY_CAPACITY": "5",
    "COGNITIVE_TIMEOUT_MS": "10000",
    "COGNITIVE_MAX_REASONING_DEPTH": "5"
  }
}
```

### Research/Academic Setup

For detailed cognitive analysis:

```json
{
  "env": {
    "COGNITIVE_DEFAULT_MODE": "deliberative",
    "COGNITIVE_ENABLE_EMOTION": "true",
    "COGNITIVE_ENABLE_METACOGNITION": "true",
    "COGNITIVE_MAX_REASONING_DEPTH": "15",
    "COGNITIVE_TEMPERATURE": "0.3",
    "LOG_LEVEL": "DEBUG"
  }
}
```

## Integration Examples

### Example 1: Code Review Assistant

```javascript
// In your IDE with ThoughtMCP configured
const reviewPrompt = `
Please think through this code review systematically:
1. Analyze the code structure and logic
2. Consider potential edge cases and bugs
3. Evaluate performance implications
4. Remember any patterns or issues for future reviews

[CODE TO REVIEW]
`;
```

### Example 2: Learning Assistant

```javascript
// Learning session with memory
const learningPrompt = `
I'm learning about distributed systems. Please:
1. Think through the key concepts I should understand
2. Remember my current learning progress
3. Recall what we've covered in previous sessions
4. Suggest next steps based on my learning pattern
`;
```

### Example 3: Creative Writing

```javascript
// Creative mode for writing assistance
const creativePrompt = `
Help me develop this story idea using creative thinking:
1. Think creatively about plot possibilities
2. Remember character development from our previous sessions
3. Consider emotional arcs and reader engagement
4. Generate innovative narrative approaches
`;
```

## Best Practices

1. **Choose appropriate modes** for different tasks:

   - `analytical`: Code review, debugging, technical analysis
   - `creative`: Writing, brainstorming, design
   - `deliberative`: Complex reasoning, ethical decisions
   - `intuitive`: Quick responses, simple tasks
   - `balanced`: General-purpose use

2. **Manage memory effectively**:

   - Use project-specific brain directories for isolation
   - Regularly clean up old memories if needed
   - Monitor memory usage in long-running sessions

3. **Configure timeouts appropriately**:

   - Longer timeouts for complex reasoning
   - Shorter timeouts for simple tasks
   - Consider your environment's patience

4. **Use auto-approval wisely**:

   - Auto-approve safe tools like `think` and `recall`
   - Require confirmation for `remember` in sensitive contexts
   - Never auto-approve `analyze_reasoning` in production

5. **Monitor performance**:
   - Watch memory usage and response times
   - Adjust configuration based on usage patterns
   - Use debug mode to identify bottlenecks

## Support

For additional help:

1. **Check the logs** with `LOG_LEVEL=DEBUG`
2. **Review the troubleshooting section** above
3. **Test with minimal configuration** first
4. **Consult your IDE's MCP documentation**
5. **Open an issue** on the ThoughtMCP GitHub repository

---

_This guide covers the most common agentic environments. For other systems, adapt the generic configuration template to match your environment's MCP implementation._
