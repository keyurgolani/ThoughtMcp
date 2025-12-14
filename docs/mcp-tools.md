# ThoughtMCP MCP Tools Reference

## Overview

This document provides comprehensive documentation for all MCP (Model Context Protocol) tools exposed by ThoughtMCP. These tools enable LLM clients to interact with the cognitive architecture for memory management, reasoning, and metacognitive operations.

## Table of Contents

- [Memory Tools](#memory-tools)
  - [store_memory](#store_memory)
  - [retrieve_memories](#retrieve_memories)
  - [update_memory](#update_memory)
  - [delete_memory](#delete_memory)
  - [search_memories](#search_memories)
- [Reasoning Tools](#reasoning-tools)
  - [think](#think)
  - [analyze_systematically](#analyze_systematically)
  - [think_parallel](#think_parallel)
  - [decompose_problem](#decompose_problem)
- [Metacognitive Tools](#metacognitive-tools)
  - [assess_confidence](#assess_confidence)
  - [detect_bias](#detect_bias)
  - [detect_emotion](#detect_emotion)
  - [analyze_reasoning](#analyze_reasoning)
- [Response Format](#response-format)
- [Error Codes](#error-codes)

---

## Memory Tools

### store_memory

Store a new memory with automatic embedding generation and waypoint graph connections.

**Description:**
Creates a new memory in the HMD (Hierarchical Memory Decomposition) system. Automatically generates five-sector embeddings (episodic, semantic, procedural, emotional, reflective) and creates 1-3 waypoint connections to similar existing memories.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "Memory content to store (required, non-empty)"
    },
    "userId": {
      "type": "string",
      "description": "User ID for memory isolation (required)"
    },
    "sessionId": {
      "type": "string",
      "description": "Session ID for context tracking (required)"
    },
    "primarySector": {
      "type": "string",
      "enum": ["episodic", "semantic", "procedural", "emotional", "reflective"],
      "description": "Primary memory sector"
    },
    "metadata": {
      "type": "object",
      "description": "Optional metadata for classification and search",
      "properties": {
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Keywords for search (auto-extracted if not provided)"
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Tags for categorization"
        },
        "category": {
          "type": "string",
          "description": "Category for grouping"
        },
        "context": {
          "type": "string",
          "description": "Additional context information"
        },
        "importance": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Importance score (0-1, default 0.5)"
        }
      }
    }
  },
  "required": ["content", "userId", "sessionId", "primarySector"]
}
```

**Example Request:**

```json
{
  "content": "User prefers dark mode for all applications",
  "userId": "user-123",
  "sessionId": "session-456",
  "primarySector": "semantic",
  "metadata": {
    "keywords": ["preference", "dark mode", "ui"],
    "tags": ["settings", "user-preference"],
    "category": "preferences",
    "importance": 0.8
  }
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "memoryId": "mem-abc123",
    "embeddingsGenerated": 5,
    "linksCreated": 2,
    "salience": 0.75,
    "strength": 1.0
  },
  "metadata": {
    "timestamp": "2025-12-07T10:30:00Z",
    "processingTime": 245,
    "componentsUsed": ["memoryRepository", "embeddingEngine", "graphBuilder"]
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Content cannot be empty",
  "suggestion": "Check that all required fields are provided and content is non-empty. Ensure primarySector is one of: episodic, semantic, procedural, emotional, reflective"
}
```

---

### retrieve_memories

Retrieve memories using composite scoring with vector similarity, metadata filtering, and pagination.

**Description:**
Retrieves memories using a composite scoring formula: `0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight`. Supports filtering by sectors, strength, salience, date range, and metadata.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "User ID for memory isolation (required)"
    },
    "text": {
      "type": "string",
      "description": "Search query text for vector similarity (optional)"
    },
    "sectors": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["episodic", "semantic", "procedural", "emotional", "reflective"]
      },
      "description": "Memory sectors to search (default: all sectors)"
    },
    "primarySector": {
      "type": "string",
      "enum": ["episodic", "semantic", "procedural", "emotional", "reflective"],
      "description": "Filter by primary sector"
    },
    "minStrength": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Minimum memory strength (0-1)"
    },
    "minSalience": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Minimum salience score (0-1)"
    },
    "dateRange": {
      "type": "object",
      "properties": {
        "start": { "type": "string", "format": "date-time" },
        "end": { "type": "string", "format": "date-time" }
      },
      "description": "Filter by creation date range (ISO 8601)"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "keywords": { "type": "array", "items": { "type": "string" } },
        "tags": { "type": "array", "items": { "type": "string" } },
        "category": { "type": "string" }
      },
      "description": "Metadata filters"
    },
    "limit": {
      "type": "number",
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum results to return (default 10, max 100)"
    },
    "offset": {
      "type": "number",
      "minimum": 0,
      "description": "Pagination offset (default 0)"
    }
  },
  "required": ["userId"]
}
```

**Example Request:**

```json
{
  "userId": "user-123",
  "text": "dark mode preference",
  "sectors": ["semantic", "episodic"],
  "minStrength": 0.5,
  "limit": 10
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "mem-abc123",
        "content": "User prefers dark mode for all applications",
        "createdAt": "2025-12-07T10:30:00Z",
        "lastAccessed": "2025-12-07T12:00:00Z",
        "strength": 0.95,
        "salience": 0.75,
        "primarySector": "semantic",
        "metadata": {
          "keywords": ["preference", "dark mode"],
          "tags": ["settings"]
        },
        "score": 0.87
      }
    ],
    "totalCount": 1,
    "scores": { "mem-abc123": 0.87 }
  }
}
```

---

### update_memory

Update an existing memory with selective field updates.

**Description:**
Updates memory fields selectively. Content changes trigger automatic embedding regeneration and waypoint connection updates. Supports updating strength, salience, and metadata.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "memoryId": {
      "type": "string",
      "description": "Memory ID to update (required)"
    },
    "userId": {
      "type": "string",
      "description": "User ID for ownership verification (required)"
    },
    "content": {
      "type": "string",
      "description": "New content (triggers embedding regeneration)"
    },
    "strength": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "New strength value (0-1)"
    },
    "salience": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "New salience value (0-1)"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "keywords": { "type": "array", "items": { "type": "string" } },
        "tags": { "type": "array", "items": { "type": "string" } },
        "category": { "type": "string" },
        "context": { "type": "string" },
        "importance": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "description": "Metadata updates"
    }
  },
  "required": ["memoryId", "userId"]
}
```

**Example Request:**

```json
{
  "memoryId": "mem-abc123",
  "userId": "user-123",
  "content": "User strongly prefers dark mode across all applications",
  "strength": 0.95,
  "metadata": {
    "importance": 0.9
  }
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "memoryId": "mem-abc123",
    "embeddingsRegenerated": true,
    "connectionsUpdated": 2,
    "strength": 0.95,
    "salience": 0.75
  }
}
```

---

### delete_memory

Delete a memory with cascade deletion options.

**Description:**
Supports soft delete (sets strength to 0, preserves data) or hard delete (removes memory and cascades to embeddings, connections, and metadata).

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "memoryId": {
      "type": "string",
      "description": "Memory ID to delete (required)"
    },
    "userId": {
      "type": "string",
      "description": "User ID for ownership verification (required)"
    },
    "soft": {
      "type": "boolean",
      "description": "Soft delete (true) sets strength=0, hard delete (false) removes record (default: false)"
    }
  },
  "required": ["memoryId", "userId"]
}
```

**Example Request:**

```json
{
  "memoryId": "mem-abc123",
  "userId": "user-123",
  "soft": false
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "memoryId": "mem-abc123",
    "deletionType": "hard",
    "message": "Memory and all related data removed"
  }
}
```

---

### search_memories

Advanced memory search combining full-text search, vector similarity, and metadata filtering.

**Description:**
Performs comprehensive search using PostgreSQL full-text search with boolean operators (AND, OR, NOT) and phrase matching. Returns ranked results with composite scores.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "User ID for memory isolation (required)"
    },
    "text": {
      "type": "string",
      "description": "Full-text search query with boolean operators (AND, OR, NOT) and phrase matching"
    },
    "sectors": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["episodic", "semantic", "procedural", "emotional", "reflective"]
      },
      "description": "Memory sectors to search (default: all sectors)"
    },
    "primarySector": {
      "type": "string",
      "enum": ["episodic", "semantic", "procedural", "emotional", "reflective"],
      "description": "Filter by primary sector"
    },
    "minStrength": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Minimum memory strength (0-1)"
    },
    "minSalience": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Minimum salience score (0-1)"
    },
    "dateRange": {
      "type": "object",
      "properties": {
        "start": { "type": "string", "format": "date-time" },
        "end": { "type": "string", "format": "date-time" }
      },
      "description": "Filter by creation date range"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "keywords": { "type": "array", "items": { "type": "string" } },
        "tags": { "type": "array", "items": { "type": "string" } },
        "category": { "type": "string" }
      },
      "description": "Metadata filters"
    },
    "limit": {
      "type": "number",
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum results to return (default 10, max 100)"
    },
    "offset": {
      "type": "number",
      "minimum": 0,
      "description": "Pagination offset (default 0)"
    }
  },
  "required": ["userId"]
}
```

**Example Request (Full-Text Search):**

```json
{
  "userId": "user-123",
  "text": "dark mode AND preference",
  "metadata": { "tags": ["settings"] },
  "limit": 20
}
```

**Success Response (Full-Text):**

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "mem-abc123",
        "content": "User prefers dark mode for all applications",
        "createdAt": "2025-12-07T10:30:00Z",
        "strength": 0.95,
        "salience": 0.75,
        "rank": 0.92,
        "highlight": "User prefers <b>dark mode</b> for all applications",
        "matchedTerms": ["dark", "mode", "preference"]
      }
    ],
    "totalCount": 1,
    "searchType": "full-text"
  }
}
```

---

## Reasoning Tools

### think

Perform reasoning with specified mode (analytical, creative, critical, synthetic, parallel).

**Description:**
Integrates all reasoning components including parallel streams, confidence assessment, and bias detection. Supports single-stream or parallel multi-stream reasoning.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem or question to reason about (required)"
    },
    "mode": {
      "type": "string",
      "enum": ["analytical", "creative", "critical", "synthetic", "parallel"],
      "description": "Reasoning mode: analytical (logical), creative (innovative), critical (skeptical), synthetic (holistic), parallel (all modes simultaneously)"
    },
    "context": {
      "type": "object",
      "description": "Additional context for reasoning (optional)",
      "properties": {
        "background": { "type": "string", "description": "Background information" },
        "constraints": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Constraints to consider"
        },
        "goals": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Goals to achieve"
        }
      }
    }
  },
  "required": ["problem", "mode"]
}
```

**Example Request (Single Stream):**

```json
{
  "problem": "How to optimize database query performance?",
  "mode": "analytical",
  "context": {
    "background": "PostgreSQL database with 1M records",
    "constraints": ["No schema changes", "Minimal downtime"],
    "goals": ["Reduce p95 latency to <100ms"]
  }
}
```

**Success Response (Single Stream):**

```json
{
  "success": true,
  "data": {
    "conclusion": "Implement query caching and add composite indexes",
    "reasoning": ["Analyzed query patterns", "Identified bottlenecks", "Evaluated solutions"],
    "insights": [
      "80% of queries hit same tables",
      "Missing indexes on frequently filtered columns"
    ],
    "confidence": 0.85,
    "processingTime": 2500,
    "status": "completed"
  }
}
```

**Example Request (Parallel):**

```json
{
  "problem": "Should we migrate to microservices architecture?",
  "mode": "parallel",
  "context": {
    "background": "Monolithic application with scaling issues",
    "constraints": ["Limited team size", "6-month timeline"]
  }
}
```

**Success Response (Parallel):**

```json
{
  "success": true,
  "data": {
    "conclusion": "Gradual migration recommended with careful planning",
    "insights": [
      {
        "content": "Scalability benefits significant",
        "sources": ["analytical"],
        "importance": 0.9
      },
      { "content": "Consider strangler fig pattern", "sources": ["creative"], "importance": 0.85 }
    ],
    "recommendations": [
      { "description": "Start with bounded contexts", "priority": 1, "confidence": 0.88 }
    ],
    "conflicts": [
      { "type": "approach", "description": "Timeline vs scope disagreement", "severity": 0.6 }
    ],
    "confidence": 0.82,
    "quality": 0.87
  }
}
```

---

### analyze_systematically

Analyze problem using systematic thinking framework with dynamic framework selection.

**Description:**
Automatically selects optimal framework (Scientific Method, Design Thinking, Systems Thinking, etc.) based on problem characteristics. Supports preferred framework override.

**Available Frameworks:**

| Framework ID               | Name                     | Best For                               |
| -------------------------- | ------------------------ | -------------------------------------- |
| `scientific-method`        | Scientific Method        | Hypothesis testing, empirical problems |
| `design-thinking`          | Design Thinking          | User-centered problems, innovation     |
| `systems-thinking`         | Systems Thinking         | Complex interconnected systems         |
| `critical-thinking`        | Critical Thinking        | Evaluation, argument analysis          |
| `creative-problem-solving` | Creative Problem Solving | Novel solutions, brainstorming         |
| `root-cause-analysis`      | Root Cause Analysis      | Debugging, failure analysis            |
| `first-principles`         | First Principles         | Fundamental understanding              |
| `scenario-planning`        | Scenario Planning        | Future planning, uncertainty           |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem to analyze systematically (required)"
    },
    "preferredFramework": {
      "type": "string",
      "enum": [
        "scientific-method",
        "design-thinking",
        "systems-thinking",
        "critical-thinking",
        "creative-problem-solving",
        "root-cause-analysis",
        "first-principles",
        "scenario-planning"
      ],
      "description": "Preferred framework (optional, overrides automatic selection)"
    },
    "context": {
      "type": "object",
      "properties": {
        "background": { "type": "string" },
        "constraints": { "type": "array", "items": { "type": "string" } },
        "goals": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["problem"]
}
```

**Example Request:**

```json
{
  "problem": "Why is the system experiencing intermittent failures?",
  "context": {
    "background": "Production system with 99.9% SLA",
    "constraints": ["Cannot take system offline"]
  }
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "framework": {
      "id": "root-cause-analysis",
      "name": "Root Cause Analysis",
      "description": "Systematic approach to identify underlying causes"
    },
    "selection": {
      "confidence": 0.92,
      "reason": "Problem characteristics match debugging/failure analysis pattern",
      "isHybrid": false
    },
    "result": {
      "conclusion": "Memory leak in connection pool causing resource exhaustion",
      "steps": ["Define problem", "Collect data", "Identify causes", "Verify root cause"],
      "insights": ["Connection pool not releasing connections", "Memory grows linearly over time"],
      "confidence": 0.88,
      "processingTime": 3200
    },
    "alternatives": [
      {
        "framework": { "id": "systems-thinking", "name": "Systems Thinking" },
        "reason": "Could reveal systemic issues"
      }
    ]
  }
}
```

---

### think_parallel

Execute parallel reasoning streams with coordination and synthesis.

**Description:**
Runs all four reasoning streams (analytical, creative, critical, synthetic) concurrently with synchronization at 25%, 50%, 75% completion. Results are synthesized with conflict preservation and insight attribution.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem to analyze with parallel reasoning (required)"
    },
    "timeout": {
      "type": "number",
      "minimum": 1000,
      "maximum": 60000,
      "description": "Total timeout in milliseconds (default: 30000ms, max: 60000ms)"
    },
    "context": {
      "type": "object",
      "properties": {
        "background": { "type": "string" },
        "constraints": { "type": "array", "items": { "type": "string" } },
        "goals": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["problem"]
}
```

**Example Request:**

```json
{
  "problem": "How should we approach the product roadmap for Q1?",
  "timeout": 30000,
  "context": {
    "background": "SaaS product with growing user base",
    "goals": ["Increase retention", "Launch mobile app"]
  }
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "conclusion": "Prioritize retention features while preparing mobile foundation",
    "insights": [
      {
        "content": "Retention has 3x ROI vs acquisition",
        "sources": ["analytical"],
        "importance": 0.95,
        "confidence": 0.9
      },
      {
        "content": "Mobile-first approach for new features",
        "sources": ["creative"],
        "importance": 0.85,
        "confidence": 0.82
      },
      {
        "content": "Risk of scope creep with parallel tracks",
        "sources": ["critical"],
        "importance": 0.8,
        "confidence": 0.88
      }
    ],
    "recommendations": [
      {
        "description": "Focus 70% on retention, 30% on mobile prep",
        "sources": ["synthetic"],
        "priority": 1,
        "confidence": 0.87,
        "rationale": "Balances immediate needs with strategic goals"
      }
    ],
    "conflicts": [
      {
        "id": "conflict-1",
        "type": "priority",
        "description": "Analytical favors retention-only, Creative wants mobile-first",
        "severity": 0.5,
        "sourceStreams": ["analytical", "creative"]
      }
    ],
    "confidence": 0.85,
    "quality": 0.88
  }
}
```

---

### decompose_problem

Decompose problem into hierarchical sub-problems with dependency mapping.

**Description:**
Breaks complex problems into manageable components and identifies execution order using topological sorting. Supports configurable decomposition depth.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem to decompose (required)"
    },
    "maxDepth": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Maximum decomposition depth (default: 3, max: 5)"
    },
    "context": {
      "type": "object",
      "properties": {
        "background": { "type": "string" },
        "constraints": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["problem"]
}
```

**Example Request:**

```json
{
  "problem": "Build a scalable web application",
  "maxDepth": 3
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "problem": "Build a scalable web application",
    "subProblems": [
      { "id": "problem-1-0", "description": "Build a scalable web application", "depth": 1 },
      {
        "id": "problem-1-0-0",
        "description": "Design system architecture",
        "depth": 2,
        "parent": "problem-1-0"
      },
      {
        "id": "problem-1-0-1",
        "description": "Implement core features",
        "depth": 2,
        "parent": "problem-1-0"
      },
      {
        "id": "problem-1-0-2",
        "description": "Set up infrastructure",
        "depth": 2,
        "parent": "problem-1-0"
      }
    ],
    "dependencies": [
      { "from": "problem-1-0", "to": "problem-1-0-0", "type": "hierarchical" },
      { "from": "problem-1-0", "to": "problem-1-0-1", "type": "hierarchical" }
    ],
    "executionOrder": ["problem-1-0", "problem-1-0-0", "problem-1-0-1", "problem-1-0-2"],
    "totalSubProblems": 4,
    "maxDepth": 3
  }
}
```

---

## Metacognitive Tools

### assess_confidence

Assess confidence in reasoning with multi-dimensional analysis.

**Description:**
Evaluates evidence quality, reasoning coherence, completeness, uncertainty level, and bias freedom. Provides interpretation, warnings, and actionable recommendations.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "reasoning": {
      "type": "string",
      "description": "Reasoning to assess (required)"
    },
    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Supporting evidence (optional)"
    },
    "context": {
      "type": "string",
      "description": "Context for assessment (optional)"
    }
  },
  "required": ["reasoning"]
}
```

**Example Request:**

```json
{
  "reasoning": "Based on benchmark results, the optimization will improve throughput by 40%",
  "evidence": ["Benchmark results showing 40% improvement", "Load test data", "Production metrics"],
  "context": "Production deployment decision"
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "overallConfidence": 0.82,
    "dimensions": {
      "evidenceQuality": 0.85,
      "reasoningCoherence": 0.88,
      "completeness": 0.75,
      "uncertaintyLevel": 0.2,
      "biasFreedom": 0.82
    },
    "interpretation": "High confidence - reasoning is well-supported",
    "warnings": ["Consider edge cases not covered by benchmarks"],
    "recommendations": ["Run A/B test in production", "Monitor for regression"]
  },
  "metadata": {
    "timestamp": "2025-12-07T10:30:00Z",
    "processingTime": 85,
    "componentsUsed": ["confidenceAssessor"]
  }
}
```

---

### detect_bias

Detect cognitive biases in reasoning with real-time monitoring.

**Description:**
Identifies 8 bias types: confirmation, anchoring, availability, recency, representativeness, framing, sunk cost, attribution. Provides severity assessment and correction strategies.

**Supported Bias Types:**

| Bias Type            | Description                                         |
| -------------------- | --------------------------------------------------- |
| `confirmation`       | Favoring information that confirms existing beliefs |
| `anchoring`          | Over-relying on first piece of information          |
| `availability`       | Overweighting easily recalled information           |
| `recency`            | Giving more weight to recent events                 |
| `representativeness` | Judging probability by similarity to stereotypes    |
| `framing`            | Being influenced by how information is presented    |
| `sunk_cost`          | Continuing due to past investment                   |
| `attribution`        | Attributing behavior to character vs situation      |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "reasoning": {
      "type": "string",
      "description": "Reasoning to analyze for biases (required)"
    },
    "context": {
      "type": "string",
      "description": "Context for bias detection (optional)"
    },
    "monitorContinuously": {
      "type": "boolean",
      "description": "Enable continuous monitoring (default: false)"
    }
  },
  "required": ["reasoning"]
}
```

**Example Request:**

```json
{
  "reasoning": "All the data I've seen supports my hypothesis that users prefer feature A",
  "context": "Product research analysis"
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "biases": [
      {
        "type": "confirmation",
        "severity": 0.75,
        "evidence": ["Selective data consideration", "Dismissal of contradicting evidence"],
        "correction": "Actively seek disconfirming evidence",
        "confidence": 0.85
      }
    ],
    "detectionTime": 0.8,
    "monitoringActive": false
  },
  "metadata": {
    "timestamp": "2025-12-07T10:30:00Z",
    "processingTime": 120,
    "componentsUsed": ["biasDetector"]
  }
}
```

---

### detect_emotion

Detect emotions using Circumplex model and discrete classification.

**Description:**
Analyzes text using the Circumplex model (valence, arousal, dominance) and classifies 11 discrete emotions: joy, sadness, anger, fear, disgust, surprise, pride, shame, guilt, gratitude, awe.

**Circumplex Dimensions:**

| Dimension | Range    | Description                         |
| --------- | -------- | ----------------------------------- |
| Valence   | -1 to +1 | Negative to positive emotional tone |
| Arousal   | 0 to 1   | Low to high activation/energy       |
| Dominance | -1 to +1 | Submissive to dominant feeling      |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Text to analyze for emotions (required)"
    },
    "includeDiscrete": {
      "type": "boolean",
      "description": "Include discrete emotion classification (default: true)"
    },
    "context": {
      "type": "string",
      "description": "Context for emotion detection (optional)"
    }
  },
  "required": ["text"]
}
```

**Example Request:**

```json
{
  "text": "I'm really excited about this new project! It's going to be amazing!",
  "includeDiscrete": true,
  "context": "Work communication"
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "circumplex": {
      "valence": 0.85,
      "arousal": 0.78,
      "dominance": 0.65,
      "confidence": 0.88
    },
    "discrete": {
      "primary": "joy",
      "emotions": [
        { "emotion": "joy", "score": 0.88, "intensity": "high" },
        { "emotion": "pride", "score": 0.45, "intensity": "moderate" },
        { "emotion": "awe", "score": 0.32, "intensity": "low" }
      ],
      "confidence": 0.85
    },
    "detectionTime": 45
  },
  "metadata": {
    "timestamp": "2025-12-07T10:30:00Z",
    "processingTime": 45,
    "componentsUsed": ["emotionAnalyzer", "discreteEmotionClassifier"]
  }
}
```

---

### analyze_reasoning

Analyze reasoning quality with comprehensive assessment.

**Description:**
Evaluates coherence, completeness, logical validity, and evidence support. Identifies strengths, weaknesses, and provides improvement recommendations. Optionally includes confidence assessment, bias detection, and emotion analysis.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "reasoning": {
      "type": "string",
      "description": "Reasoning to analyze (required)"
    },
    "context": {
      "type": "string",
      "description": "Context for analysis (optional)"
    },
    "includeConfidence": {
      "type": "boolean",
      "description": "Include confidence assessment (default: true)"
    },
    "includeBias": {
      "type": "boolean",
      "description": "Include bias detection (default: true)"
    },
    "includeEmotion": {
      "type": "boolean",
      "description": "Include emotion analysis (default: false)"
    }
  },
  "required": ["reasoning"]
}
```

**Example Request:**

```json
{
  "reasoning": "Based on our analysis, the proposed solution is optimal because it addresses all requirements while minimizing costs",
  "context": "Technical decision review",
  "includeConfidence": true,
  "includeBias": true,
  "includeEmotion": false
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "quality": {
      "coherence": 0.85,
      "completeness": 0.8,
      "logicalValidity": 0.9,
      "evidenceSupport": 0.75
    },
    "strengths": ["Clear logical structure", "Well-supported claims"],
    "weaknesses": ["Missing alternative perspectives", "Limited evidence"],
    "recommendations": ["Consider counterarguments", "Gather more data"],
    "confidence": {
      "overallConfidence": 0.78,
      "dimensions": { "evidenceQuality": 0.75, "reasoningCoherence": 0.85 }
    },
    "biases": []
  },
  "metadata": {
    "timestamp": "2025-12-07T10:30:00Z",
    "processingTime": 180,
    "componentsUsed": ["confidenceAssessor", "biasDetector"]
  }
}
```

---

## Response Format

All MCP tools return responses in a standardized format:

```typescript
interface MCPResponse {
  success: boolean; // Whether the operation succeeded
  data?: any; // Response data (if successful)
  error?: string; // Error message (if failed)
  suggestion?: string; // Suggestion for fixing error
  metadata?: {
    timestamp: string; // ISO 8601 timestamp
    processingTime: number; // Processing time in milliseconds
    componentsUsed: string[]; // Cognitive components used
    confidence?: number; // Confidence level (0-1)
  };
}
```

---

## Error Codes

Common error scenarios and their solutions:

| Error                               | Cause                       | Solution                                                   |
| ----------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `Server not initialized`            | Server startup incomplete   | Wait for initialization to complete                        |
| `Memory repository not initialized` | Database connection failed  | Check database configuration                               |
| `Tool not found`                    | Invalid tool name           | Use one of the documented tool names                       |
| `Missing required parameter`        | Required field not provided | Check input schema for required fields                     |
| `Memory not found`                  | Invalid memoryId            | Verify memoryId exists and belongs to user                 |
| `Content cannot be empty`           | Empty content string        | Provide non-empty content                                  |
| `Invalid sector`                    | Unknown memory sector       | Use: episodic, semantic, procedural, emotional, reflective |
| `Timeout exceeded`                  | Processing took too long    | Reduce complexity or increase timeout                      |

---

## Best Practices

### Memory Management

1. **Use appropriate sectors**: Choose the primary sector that best matches the memory type
   - `episodic`: Events, experiences, temporal information
   - `semantic`: Facts, concepts, general knowledge
   - `procedural`: How-to, processes, skills
   - `emotional`: Feelings, emotional experiences
   - `reflective`: Insights, meta-observations

2. **Add meaningful metadata**: Keywords and tags improve search accuracy

3. **Set appropriate importance**: Higher importance (0.8-1.0) for critical information

4. **Use soft delete for recovery**: Soft delete preserves data for potential recovery

### Reasoning

1. **Choose the right mode**:
   - `analytical`: For logical, data-driven problems
   - `creative`: For innovation and brainstorming
   - `critical`: For evaluation and risk assessment
   - `synthetic`: For integration and holistic views
   - `parallel`: For complex decisions requiring multiple perspectives

2. **Provide context**: Background, constraints, and goals improve reasoning quality

3. **Use systematic analysis**: For complex problems, use `analyze_systematically` with framework selection

### Metacognitive Tools

1. **Assess confidence before decisions**: Use `assess_confidence` for important decisions

2. **Check for biases**: Run `detect_bias` on reasoning before finalizing conclusions

3. **Consider emotional context**: Use `detect_emotion` when emotional factors are relevant

---

## See Also

- **[API Reference](api.md)** - Internal API documentation
- **[Architecture Guide](architecture.md)** - System architecture
- **[User Guide](user-guide.md)** - Getting started guide
- **[Examples](examples.md)** - Usage examples

---

**Last Updated**: December 2025
**Version**: 0.5.0
