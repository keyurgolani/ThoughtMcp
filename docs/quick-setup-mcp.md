# Quick MCP Setup Guide

Get ThoughtMCP running in your AI environment in under 5 minutes.

## 1. Install ThoughtMCP

```bash
# Clone and build
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp
npm install
npm run build

# Note the full path to dist/index.js
pwd
# Example: /Users/yourname/ThoughtMcp
```

## 2. Configure Your Environment

### Kiro IDE

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/full/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "COGNITIVE_DEFAULT_MODE": "balanced"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thought-mcp": {
      "command": "node",
      "args": ["/full/path/to/ThoughtMcp/dist/index.js"]
    }
  }
}
```

### Other Environments

See the [complete guide](integration/agentic-environments.md) for Cursor, Void, and generic setups.

## 3. Test It Works

In your AI environment, try:

```
Can you think through this problem step by step using the cognitive architecture?
```

You should see systematic reasoning with confidence levels and multiple perspectives.

## 4. Next Steps

- **[Learn the tools](api/cognitive-tools.md)** - think, remember, recall, analyze_reasoning
- **[See examples](../examples/)** - Real-world usage patterns
- **[Customize behavior](guides/configuration.md)** - Tune for your needs

## Troubleshooting

**Server won't start?**

- Use absolute paths in configuration
- Check Node.js version (18+ required)
- Verify `dist/index.js` exists

**Need help?** Check the [full troubleshooting guide](integration/agentic-environments.md#troubleshooting).
