# ThoughtMCP User Guide

## Welcome to ThoughtMCP

ThoughtMCP is a production-ready cognitive architecture that provides AI systems with persistent memory, parallel reasoning, and metacognitive capabilities. This guide will help you get started and make the most of ThoughtMCP's features.

## Table of Contents

- [Getting Started](#getting-started)
- [MCP Tools Reference](#mcp-tools-reference)
- [Common Workflows](#common-workflows)
- [Configuration Options](#configuration-options)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before using ThoughtMCP, ensure you have:

- **Node.js 18+** installed
- **PostgreSQL 14+** with pgvector extension
- **Ollama** (optional, for local embeddings)

### Quick Setup

1. **Install ThoughtMCP**:

   ```bash
   npm install thoughtmcp
   ```

2. **Start PostgreSQL with pgvector**:

   ```bash
   docker-compose up -d postgres
   ```

3. **Configure environment**:

   ```bash
   cp .env.example .env.development
   # Edit .env.development with your settings
   ```

4. **Initialize database**:

   ```bash
   npm run db:setup
   ```

5. **Start the MCP server**:
   ```bash
   npm start
   ```

### Connecting to Your IDE

#### Kiro IDE

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/path/to/thoughtmcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/thoughtmcp",
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### Claude Desktop

Add to Claude Desktop's MCP configuration:

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/path/to/thoughtmcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/thoughtmcp"
      }
    }
  }
}
```

---

## MCP Tools Reference

ThoughtMCP exposes the following MCP tools for AI assistants to use:

### Memory Operations

#### store_memory

Store a new memory with automatic embedding generation and waypoint connections.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | Memory content to store |
| userId | string | Yes | User ID for memory isolation |
| sessionId | string | Yes | Session ID for context tracking |
| primarySector | string | Yes | Memory sector (episodic, semantic, procedural, emotional, reflective) |
| metadata | object | No | Keywords, tags, category, importance |

**Example**:

```json
{
  "content": "User prefers dark mode for all applications",
  "userId": "user-123",
  "sessionId": "session-456",
  "primarySector": "semantic",
  "metadata": {
    "keywords": ["preference", "dark mode", "ui"],
    "tags": ["settings", "user-preference"],
    "importance": 0.8
  }
}
```

**Memory Sectors Explained**:

- **episodic**: Events, experiences, temporal memories ("Met with Sarah yesterday")
- **semantic**: Facts, concepts, knowledge ("PostgreSQL uses MVCC for concurrency")
- **procedural**: How-to knowledge, skills ("To deploy, run npm run build first")
- **emotional**: Feelings, emotional context ("User was frustrated with slow response")
- **reflective**: Meta-insights, learnings ("This approach works better for complex problems")

---

#### retrieve_memories

Retrieve memories using composite scoring (0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight).

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID for memory isolation |
| text | string | No | Search query for vector similarity |
| sectors | array | No | Sectors to search (default: all) |
| primarySector | string | No | Filter by primary sector |
| minStrength | number | No | Minimum strength (0-1) |
| minSalience | number | No | Minimum salience (0-1) |
| dateRange | object | No | Filter by date range |
| metadata | object | No | Filter by keywords, tags, category |
| limit | number | No | Max results (default: 10, max: 100) |
| offset | number | No | Pagination offset |

**Example**:

```json
{
  "userId": "user-123",
  "text": "dark mode preference",
  "sectors": ["semantic", "episodic"],
  "minStrength": 0.5,
  "limit": 10
}
```

---

#### update_memory

Update an existing memory. Content changes trigger embedding regeneration.

**Parameters**:
| Parameter | Type | Required | Description |
|-------|----------|-------------|
| memoryId | string | Yes | Memory ID to update |
| userId | string | Yes | User ID for ownership verification |
| content | string | No | New content (triggers re-embedding) |
| strength | number | No | New strength (0-1) |
| salience | number | No | New salience (0-1) |
| metadata | object | No | Updated metadata |

**Example**:

```json
{
  "memoryId": "mem-abc123",
  "userId": "user-123",
  "content": "User strongly prefers dark mode for all applications",
  "metadata": {
    "importance": 0.9
  }
}
```

---

#### delete_memory

Delete a memory with soft or hard delete options.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| memoryId | string | Yes | Memory ID to delete |
| userId | string | Yes | User ID for ownership verification |
| soft | boolean | No | Soft delete (true) or hard delete (false, default) |

**Example**:

```json
{
  "memoryId": "mem-abc123",
  "userId": "user-123",
  "soft": false
}
```

---

#### search_memories

Advanced search with full-text, vector similarity, and metadata filtering.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID for memory isolation |
| text | string | No | Full-text query (supports AND, OR, NOT) |
| sectors | array | No | Sectors to search |
| minStrength | number | No | Minimum strength |
| metadata | object | No | Metadata filters |
| limit | number | No | Max results |

**Example**:

```json
{
  "userId": "user-123",
  "text": "dark mode AND preference",
  "metadata": {
    "tags": ["settings"]
  },
  "limit": 20
}
```

---

### Reasoning Operations

#### think

Execute parallel reasoning with four concurrent streams.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| problem | string | Yes | Problem description |
| context | object | No | Additional context |
| mode | string | No | Reasoning mode (parallel, analytical, creative, critical, synthetic) |
| timeout | number | No | Timeout in ms (default: 30000) |

**Example**:

```json
{
  "problem": "How can we improve database query performance?",
  "context": {
    "currentLatency": "500ms",
    "targetLatency": "100ms",
    "constraints": ["no downtime", "limited budget"]
  },
  "mode": "parallel"
}
```

**Reasoning Streams**:

- **Analytical**: Logical decomposition, systematic analysis
- **Creative**: Brainstorming, innovative solutions
- **Critical**: Risk assessment, assumption challenging
- **Synthetic**: Pattern recognition, holistic integration

---

#### analyze_systematically

Apply a systematic thinking framework to a problem.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| problem | string | Yes | Problem description |
| framework | string | No | Framework to use (auto-selected if not specified) |
| context | object | No | Additional context |

**Available Frameworks**:

- `scientific-method`: Hypothesis-driven investigation
- `design-thinking`: User-centered problem solving
- `systems-thinking`: Holistic system analysis
- `critical-thinking`: Logical evaluation
- `root-cause-analysis`: Finding underlying causes

**Example**:

```json
{
  "problem": "Users are abandoning the checkout process",
  "framework": "design-thinking",
  "context": {
    "dropOffRate": "45%",
    "stage": "payment"
  }
}
```

---

### Metacognitive Operations

#### assess_confidence

Assess confidence in reasoning results.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reasoning | string | Yes | Reasoning to assess |
| evidence | array | No | Supporting evidence |
| domain | string | No | Domain for calibration |

**Example**:

```json
{
  "reasoning": "The performance issue is caused by missing database indexes",
  "evidence": [
    "Query execution plan shows sequential scan",
    "Adding index reduced query time by 90%"
  ],
  "domain": "technical"
}
```

**Response includes**:

- Overall confidence (0-1)
- Evidence quality score
- Reasoning coherence score
- Uncertainty classification
- Recommended actions

---

#### detect_bias

Detect cognitive biases in reasoning.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reasoning | string | Yes | Reasoning to analyze |
| context | object | No | Additional context |

**Detectable Biases**:

- Confirmation bias
- Anchoring bias
- Availability bias
- Recency bias
- Representativeness bias
- Framing effects
- Sunk cost fallacy
- Attribution bias

**Example**:

```json
{
  "reasoning": "We should continue with this approach because we've already invested 6 months",
  "context": {
    "projectStatus": "behind schedule"
  }
}
```

---

#### detect_emotion

Analyze emotional content using the Circumplex model.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| text | string | Yes | Text to analyze |
| includeDiscrete | boolean | No | Include discrete emotions (default: true) |

**Example**:

```json
{
  "text": "I'm really excited about this new feature! It's going to be amazing.",
  "includeDiscrete": true
}
```

**Response includes**:

- Valence (-1 to +1): Positive/negative
- Arousal (0 to 1): Activation level
- Dominance (-1 to +1): Control level
- Discrete emotions: joy, sadness, anger, fear, etc.

---

## Common Workflows

### Workflow 1: Building User Context

Store user preferences and context for personalized interactions:

```
1. store_memory: "User prefers concise responses" (semantic)
2. store_memory: "User is working on a React project" (episodic)
3. store_memory: "User gets frustrated with verbose explanations" (emotional)
```

Later, retrieve context:

```
retrieve_memories: { text: "user preferences", limit: 5 }
```

### Workflow 2: Problem Solving with Memory

1. **Retrieve relevant memories**:

   ```json
   {
     "userId": "user-123",
     "text": "database optimization",
     "sectors": ["procedural", "semantic"]
   }
   ```

2. **Apply systematic thinking**:

   ```json
   {
     "problem": "Slow database queries",
     "framework": "root-cause-analysis"
   }
   ```

3. **Store the solution**:
   ```json
   {
     "content": "Added composite index on (user_id, created_at) - reduced query time by 80%",
     "primarySector": "procedural",
     "metadata": { "tags": ["database", "optimization", "solution"] }
   }
   ```

### Workflow 3: Learning from Interactions

1. **Assess confidence** in your reasoning
2. **Detect biases** that might affect conclusions
3. **Store reflective memories** about what worked

```json
{
  "content": "Root cause analysis works well for performance issues",
  "primarySector": "reflective",
  "metadata": { "importance": 0.8 }
}
```

### Workflow 4: Emotional Intelligence

1. **Detect emotion** in user messages
2. **Adjust response style** based on emotional state
3. **Store emotional context** for future reference

```json
{
  "content": "User was frustrated during debugging session - needed more patience",
  "primarySector": "emotional"
}
```

---

## Configuration Options

### Environment Variables

| Variable            | Default                | Description                                 |
| ------------------- | ---------------------- | ------------------------------------------- |
| DATABASE_URL        | -                      | PostgreSQL connection string                |
| DB_HOST             | localhost              | Database host                               |
| DB_PORT             | 5432                   | Database port                               |
| DB_NAME             | thoughtmcp             | Database name                               |
| DB_USER             | postgres               | Database user                               |
| DB_PASSWORD         | -                      | Database password                           |
| DB_POOL_SIZE        | 20                     | Connection pool size                        |
| EMBEDDING_MODEL     | nomic-embed-text       | Embedding model name                        |
| EMBEDDING_DIMENSION | 768                    | Embedding vector dimension                  |
| OLLAMA_HOST         | http://localhost:11434 | Ollama server URL                           |
| LOG_LEVEL           | INFO                   | Logging level (DEBUG, INFO, WARN, ERROR)    |
| NODE_ENV            | development            | Environment (development, production, test) |
| CACHE_TTL           | 300                    | Query cache TTL in seconds                  |
| MAX_PROCESSING_TIME | 30000                  | Max processing time in ms                   |

### Memory Decay Configuration

Memories decay over time following the Ebbinghaus forgetting curve:

```
strength = initial × exp(-λ × time)
```

Sector-specific decay rates:

- **Episodic**: 1.5× (faster decay)
- **Semantic**: 0.5× (slower decay)
- **Procedural**: 0.8×
- **Emotional**: 1.2×
- **Reflective**: 0.6× (slowest decay)

Memories are reinforced (+0.3 strength) when accessed.

---

## FAQ

### How many memories can ThoughtMCP store?

ThoughtMCP is designed to handle 100,000+ memories per user with sub-200ms retrieval times.

### What embedding models are supported?

- **Ollama models**: nomic-embed-text, e5, bge (local, free)
- **OpenAI**: text-embedding-3-small (cloud, paid)

### How does memory decay work?

Memories naturally decay over time but are reinforced when accessed. Important memories (high importance score) decay slower. Memories below 0.2 strength become pruning candidates.

### Can I use ThoughtMCP without PostgreSQL?

No, PostgreSQL with pgvector is required for vector similarity search and persistent storage.

### How do I backup my memories?

Use standard PostgreSQL backup tools:

```bash
pg_dump thoughtmcp > backup.sql
```

### What's the difference between soft and hard delete?

- **Soft delete**: Sets strength to 0, preserves data (recoverable)
- **Hard delete**: Removes memory and all related data (permanent)

---

## Troubleshooting

### Common Issues

#### "Connection refused" to database

1. Check PostgreSQL is running: `docker-compose ps`
2. Verify connection settings in `.env`
3. Test connection: `psql -h localhost -U thoughtmcp_dev -d thoughtmcp_dev`

#### "pgvector extension not found"

Install and enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Slow memory retrieval

1. Check indexes exist: `npm run db:setup`
2. Rebuild indexes: `REINDEX TABLE memory_embeddings;`
3. Vacuum database: `VACUUM ANALYZE;`

#### Embedding generation fails

1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Pull the model: `ollama pull nomic-embed-text`
3. Verify OLLAMA_HOST environment variable

#### Memory not found after storing

1. Check userId matches between store and retrieve
2. Verify memory wasn't soft-deleted (strength > 0)
3. Check for transaction rollback in logs

### Getting Help

- **Documentation**: See `docs/` directory
- **GitHub Issues**: Report bugs and request features
- **Troubleshooting Guide**: See [troubleshooting.md](troubleshooting.md)

---

## Next Steps

- **[API Reference](api.md)** - Detailed API documentation
- **[Examples](examples.md)** - Code examples for all features
- **[Architecture](architecture.md)** - System design and internals
- **[Development](development.md)** - Contributing to ThoughtMCP

---

**Last Updated**: December 2025
**Version**: 0.5.0
