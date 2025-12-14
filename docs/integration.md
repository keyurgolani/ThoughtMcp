# ThoughtMCP Integration Guide

## Overview

This guide covers integrating ThoughtMCP with various MCP clients including Kiro IDE, Claude Desktop, Cursor, and custom MCP clients.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Kiro IDE Integration](#kiro-ide-integration)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Cursor Integration](#cursor-integration)
- [Custom MCP Client Integration](#custom-mcp-client-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before integrating ThoughtMCP, ensure you have:

1. **Node.js 18+** installed
2. **PostgreSQL 14+** with pgvector extension
3. **ThoughtMCP built** (`npm run build`)
4. **Environment configured** (see [Environment Guide](environment.md))

### Quick Setup

```bash
# Clone and build
git clone <repository-url>
cd thoughtmcp
npm install
npm run build

# Start PostgreSQL (using Docker)
docker-compose up -d

# Run migrations
npm run db:migrate

# Verify build
ls dist/index.js  # Should exist
```

---

## Kiro IDE Integration

### Configuration

1. **Open Kiro IDE** in your workspace

2. **Edit MCP configuration** at `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/thoughtmcp/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "thoughtmcp",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your-password",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_DIMENSION": "768",
        "OLLAMA_HOST": "http://localhost:11434",
        "LOG_LEVEL": "INFO"
      },
      "disabled": false,
      "autoApprove": [
        "store_memory",
        "retrieve_memories",
        "search_memories",
        "think",
        "assess_confidence"
      ]
    }
  }
}
```

> **Important**: Always use absolute paths for the `args` array.

3. **Verify connection** by asking Kiro: "What MCP tools are available?"

### Auto-Approve Configuration

For frequently used tools, add them to `autoApprove` to skip confirmation:

```json
"autoApprove": [
  "store_memory",
  "retrieve_memories",
  "search_memories",
  "update_memory",
  "think",
  "analyze_systematically",
  "assess_confidence",
  "detect_bias",
  "detect_emotion"
]
```

### Updating After Code Changes

When you modify ThoughtMCP code:

1. Rebuild: `npm run build`
2. Update timestamp in config to trigger restart:

```json
"env": {
  "BUILD_TIMESTAMP": "2025-12-07T12:00:00Z"
}
```

3. Kiro will automatically reconnect

---

## Claude Desktop Integration

### Configuration

1. **Locate Claude Desktop config**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add ThoughtMCP configuration**:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/thoughtmcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "thoughtmcp",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your-password",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_DIMENSION": "768",
        "OLLAMA_HOST": "http://localhost:11434",
        "LOG_LEVEL": "WARN"
      }
    }
  }
}
```

3. **Restart Claude Desktop** to load the new configuration

### Verification

Ask Claude: "Can you list the available MCP tools?"

Claude should respond with the ThoughtMCP tools including `store_memory`, `think`, etc.

---

## Cursor Integration

### Configuration

1. **Open Cursor settings** (Cmd/Ctrl + ,)

2. **Navigate to MCP settings** or edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/thoughtmcp/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "thoughtmcp",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your-password",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_DIMENSION": "768",
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

3. **Reload Cursor** to apply changes

### Usage in Cursor

Use ThoughtMCP tools in Cursor's AI chat:

```
@thoughtmcp store_memory content="User prefers TypeScript" userId="user-1" sessionId="session-1" primarySector="semantic"
```

---

## Custom MCP Client Integration

### MCP Protocol Overview

ThoughtMCP implements the Model Context Protocol (MCP) specification. Custom clients communicate via JSON-RPC over stdio.

### Starting the Server

```bash
# Direct execution
node dist/index.js

# With environment variables
DB_HOST=localhost DB_PORT=5432 node dist/index.js
```

### Protocol Messages

**Tool Discovery (list_tools)**

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "store_memory",
        "description": "Store a new memory...",
        "inputSchema": { ... }
      }
    ]
  }
}
```

**Tool Execution (call_tool)**

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "store_memory",
    "arguments": {
      "content": "User prefers dark mode",
      "userId": "user-123",
      "sessionId": "session-456",
      "primarySector": "semantic"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"memoryId\":\"mem-abc123\"}}"
      }
    ]
  }
}
```

### TypeScript Client Example

```typescript
import { spawn } from "child_process";
import * as readline from "readline";

class ThoughtMCPClient {
  private process: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

  constructor(serverPath: string, env: Record<string, string> = {}) {
    this.process = spawn("node", [serverPath], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: this.process.stdout! });
    rl.on("line", (line) => this.handleResponse(JSON.parse(line)));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      };

      this.process.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  private handleResponse(response: { id: number; result?: unknown; error?: unknown }) {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(response.error);
      } else {
        pending.resolve(response.result);
      }
    }
  }

  close() {
    this.process.kill();
  }
}

// Usage
const client = new ThoughtMCPClient("/path/to/dist/index.js", {
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "thoughtmcp",
  DB_USER: "postgres",
  DB_PASSWORD: "password",
});

const result = await client.callTool("store_memory", {
  content: "Test memory",
  userId: "user-1",
  sessionId: "session-1",
  primarySector: "semantic",
});

console.log(result);
client.close();
```

### Python Client Example

```python
import subprocess
import json
import threading

class ThoughtMCPClient:
    def __init__(self, server_path: str, env: dict = None):
        self.process = subprocess.Popen(
            ['node', server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={**os.environ, **(env or {})}
        )
        self.request_id = 0
        self.pending = {}

        # Start response reader thread
        self.reader_thread = threading.Thread(target=self._read_responses)
        self.reader_thread.daemon = True
        self.reader_thread.start()

    def call_tool(self, name: str, args: dict) -> dict:
        self.request_id += 1
        request = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': 'tools/call',
            'params': {'name': name, 'arguments': args}
        }

        event = threading.Event()
        self.pending[self.request_id] = {'event': event, 'result': None}

        self.process.stdin.write((json.dumps(request) + '\n').encode())
        self.process.stdin.flush()

        event.wait(timeout=30)
        return self.pending.pop(self.request_id)['result']

    def _read_responses(self):
        for line in self.process.stdout:
            response = json.loads(line.decode())
            if response['id'] in self.pending:
                self.pending[response['id']]['result'] = response.get('result')
                self.pending[response['id']]['event'].set()

    def close(self):
        self.process.terminate()

# Usage
client = ThoughtMCPClient('/path/to/dist/index.js', {
    'DB_HOST': 'localhost',
    'DB_PORT': '5432',
    'DB_NAME': 'thoughtmcp',
    'DB_USER': 'postgres',
    'DB_PASSWORD': 'password'
})

result = client.call_tool('store_memory', {
    'content': 'Test memory',
    'userId': 'user-1',
    'sessionId': 'session-1',
    'primarySector': 'semantic'
})

print(result)
client.close()
```

---

## Best Practices

### Security

1. **Never commit credentials**: Use environment variables for database passwords
2. **Use separate databases**: Development, testing, and production should use different databases
3. **Limit auto-approve**: Only auto-approve tools you trust completely
4. **Use SSL in production**: Configure PostgreSQL with SSL for production deployments

### Performance

1. **Connection pooling**: ThoughtMCP uses connection pooling (default 20 connections)
2. **Embedding caching**: Embeddings are cached to reduce computation
3. **Batch operations**: Use batch operations for multiple memories
4. **Index optimization**: Ensure pgvector indexes are properly configured

### User Isolation

1. **Always provide userId**: Every memory operation requires a userId
2. **Session tracking**: Use sessionId for context grouping
3. **No cross-user access**: Memories are isolated by userId

### Error Handling

1. **Check success field**: Always check `response.success` before using data
2. **Handle suggestions**: Error responses include `suggestion` for fixing issues
3. **Retry with backoff**: For transient errors, implement exponential backoff

---

## Troubleshooting

### Common Issues

#### Server Not Starting

**Symptom**: MCP client shows "connection failed" or "server not found"

**Solutions**:

1. Verify `dist/index.js` exists: `ls dist/index.js`
2. Check Node.js version: `node --version` (must be 18+)
3. Verify absolute path in configuration
4. Check environment variables are set correctly

#### Database Connection Failed

**Symptom**: Tools return "Memory repository not initialized"

**Solutions**:

1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Check database credentials in environment
3. Verify database exists: `psql -h localhost -U postgres -c '\l'`
4. Run migrations: `npm run db:migrate`

#### Embedding Generation Failed

**Symptom**: Memory storage fails with embedding error

**Solutions**:

1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check embedding model is installed: `ollama list`
3. Install model if missing: `ollama pull nomic-embed-text`
4. For testing, use mock model: `EMBEDDING_MODEL=mock`

#### Tools Not Appearing

**Symptom**: MCP client doesn't show ThoughtMCP tools

**Solutions**:

1. Restart the MCP client
2. Check configuration file syntax (valid JSON)
3. Verify server path is absolute
4. Check server logs for initialization errors

### Debug Mode

Enable debug logging for troubleshooting:

```json
"env": {
  "LOG_LEVEL": "DEBUG",
  "NODE_ENV": "development"
}
```

### Health Check

Verify server health programmatically:

```typescript
const result = await client.callTool("placeholder", {});
// Should return: { success: true, data: { status: "Phase 13: MCP Server Integration" } }
```

---

## See Also

- **[MCP Tools Reference](mcp-tools.md)** - Complete tool documentation
- **[Environment Guide](environment.md)** - Environment configuration
- **[Deployment Guide](deployment.md)** - Production deployment
- **[Troubleshooting Guide](troubleshooting.md)** - Detailed troubleshooting

---

**Last Updated**: December 2025
**Version**: 0.5.0
