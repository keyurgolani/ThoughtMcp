# Getting Started with ThoughtMCP

Welcome! This guide will get you up and running with ThoughtMCP in just a few minutes.

## What You'll Learn

- How to install and set up ThoughtMCP
- The four main thinking tools and what they do
- How to run your first cognitive AI interaction
- Where to go next for more advanced features

## Prerequisites

- **Node.js** 18.0+ installed on your system
- **npm** for package management
- Basic familiarity with command line

## Quick Start (5 minutes)

### 1. Install ThoughtMCP

```bash
# Clone the repository
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Start the Server

```bash
# Start in development mode
npm run dev
```

You should see output indicating the MCP server is running and ready to accept connections.

### 3. Try Your First Thinking Session

ThoughtMCP provides four main tools. Let's try the `think` tool:

**Example: Ask for advice**

```json
{
  "tool": "think",
  "arguments": {
    "input": "I'm trying to decide between two job offers. One pays more but has longer hours, the other has better work-life balance but lower pay. How should I think about this decision?",
    "mode": "deliberative"
  }
}
```

**What happens:**

- ThoughtMCP analyzes your question systematically
- It considers multiple factors and perspectives
- It provides structured reasoning with confidence levels
- It suggests ways to improve the decision-making process

### 4. Try Memory Features

**Store an experience:**

```json
{
  "tool": "remember",
  "arguments": {
    "content": "When choosing between job offers, work-life balance often matters more than salary for long-term satisfaction",
    "type": "semantic",
    "importance": 0.8
  }
}
```

**Recall relevant knowledge:**

```json
{
  "tool": "recall",
  "arguments": {
    "cue": "job decision work-life balance",
    "type": "both"
  }
}
```

## The Four Thinking Tools

### 🧠 Think

**What it does:** Processes complex questions using human-like reasoning

**When to use:**

- Making decisions
- Analyzing problems
- Planning approaches
- Understanding complex topics

**Example use cases:**

- "How should I approach this technical problem?"
- "What are the pros and cons of this business strategy?"
- "Help me understand this complex concept"

### 💾 Remember

**What it does:** Stores experiences and knowledge for future use

**When to use:**

- After learning something important
- To build domain expertise
- To remember successful approaches
- To store case studies

**Example use cases:**

- Storing lessons learned from projects
- Building knowledge bases
- Remembering successful strategies
- Creating case study libraries

### 🔍 Recall

**What it does:** Finds relevant past experiences and knowledge

**When to use:**

- Before making decisions
- When facing similar problems
- To leverage past experience
- To find relevant examples

**Example use cases:**

- "What similar problems have I solved?"
- "What do I know about this topic?"
- "Find relevant case studies"
- "What lessons apply here?"

### 🔬 Analyze Reasoning

**What it does:** Checks thinking quality and identifies potential biases

**When to use:**

- After complex reasoning
- For important decisions
- To improve thinking quality
- To catch potential errors

**Example use cases:**

- Quality checking important decisions
- Identifying reasoning biases
- Improving argument strength
- Validating conclusions

## Next Steps

Now that you've tried the basics, here are some paths to explore:

### For Practical Use

- **[Examples](../examples/)** - See real-world applications
- **[Configuration Guide](../guides/configuration.md)** - Customize behavior
- **[Integration Guide](../guides/integration.md)** - Add to your applications

### For Understanding

- **[Basic Concepts](basic-concepts.md)** - Understand how it works
- **[Architecture Overview](../architecture/)** - Learn about the cognitive system
- **[Memory Systems](../guides/memory-systems.md)** - Deep dive into memory

### For Development

- **[API Reference](../api/)** - Complete technical documentation
- **[Development Setup](../development/)** - Set up for contributing
- **[Performance Tuning](../guides/performance-tuning.md)** - Optimize for your needs

## Troubleshooting

**Server won't start?**

- Check Node.js version: `node --version` (should be 18.0+)
- Try: `npm run clean && npm install && npm run build`

**Getting errors?**

- Check the logs for specific error messages
- Ensure all dependencies installed correctly
- See our [troubleshooting guide](../guides/troubleshooting.md)

**Need help?**

- Check [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues)
- Start a [Discussion](https://github.com/keyurgolani/ThoughtMcp/discussions)
- Review the [FAQ](../guides/faq.md)

---

_Ready to dive deeper? Check out [Basic Concepts](basic-concepts.md) to understand how ThoughtMCP thinks._
