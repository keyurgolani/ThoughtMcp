# ThoughtMCP in Agentic Environments - Usage Examples

This document shows practical examples of using ThoughtMCP in different AI development environments.

## Table of Contents

- [Kiro IDE Examples](#kiro-ide-examples)
- [Claude Desktop Examples](#claude-desktop-examples)
- [Cursor IDE Examples](#cursor-ide-examples)
- [Void Editor Examples](#void-editor-examples)
- [Cross-Environment Patterns](#cross-environment-patterns)

## Kiro IDE Examples

### Code Review with Cognitive Analysis

````markdown
# In Kiro chat

I need to review this React component. Can you think through it systematically?

```typescript
function UserProfile({ userId, onUpdate }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => onUpdate(user.id)}>Update</button>
    </div>
  );
}
```
````

Please remember any patterns or issues you find for future reviews.

````

**Expected Response:**
ThoughtMCP will analyze the code systematically, identify potential issues (like missing error handling, null checks), and store the patterns for future reference.

### Learning Session with Memory

```markdown
# Building knowledge over time in Kiro
I'm learning about microservices architecture. Let's have a structured learning session:

1. Think through the key concepts I should understand
2. Remember my current progress (I've covered service discovery and API gateways)
3. Recall what we discussed about distributed systems last week
4. Suggest next topics based on my learning pattern
````

### Project Planning

```markdown
# In Kiro project planning

Help me plan this new feature using systematic thinking:

Feature: Real-time collaborative document editing
Requirements:

- Multiple users can edit simultaneously
- Changes sync in real-time
- Conflict resolution needed
- Works offline with sync when reconnected

Think through the architecture, remember key decisions for the project, and consider technical challenges.
```

## Claude Desktop Examples

### Research and Analysis

```
I'm researching the impact of AI on software development. Can you:

1. Think through this topic using deliberative reasoning
2. Consider multiple perspectives (developers, companies, users)
3. Remember key insights for future discussions
4. Analyze the quality of reasoning and potential biases

Focus on both opportunities and challenges, and provide confidence levels for your conclusions.
```

### Creative Writing Assistant

```
I'm writing a science fiction story about AI consciousness. Help me develop this using creative thinking:

Setting: 2045, AI systems have developed self-awareness
Conflict: Humans debate whether AIs deserve rights
Character: An AI researcher who discovers their AI has emotions

Think creatively about:
- Plot developments and twists
- Character motivations and arcs
- Philosophical themes to explore
- Emotional resonance with readers

Remember the character and plot elements we develop for consistency across our writing sessions.
```

### Decision Making

```
I need to make a complex business decision about whether to pivot our startup. Here's the situation:

Current product: B2B analytics dashboard (slow growth, high churn)
Pivot option: AI-powered customer service automation (hot market, more competition)
Resources: 6 months runway, 4 developers, limited marketing budget

Think through this decision systematically:
1. Analyze pros and cons of each option
2. Consider market timing and competitive landscape
3. Evaluate our team's strengths and weaknesses
4. Factor in emotional and psychological aspects
5. Provide confidence levels and identify key uncertainties

Remember this decision process and outcome for future strategic discussions.
```

## Cursor IDE Examples

### Code Architecture Decisions

```typescript
// In Cursor, working on a new React app
// Ask ThoughtMCP to help with architecture decisions

/*
@thought-mcp I'm designing the state management for this e-commerce app.
Think through the options:

1. Redux Toolkit (familiar, predictable, verbose)
2. Zustand (simple, lightweight, less ecosystem)
3. React Context + useReducer (built-in, can get complex)
4. Jotai (atomic, modern, learning curve)

Consider:
- Team experience (junior to mid-level React developers)
- App complexity (product catalog, cart, user auth, orders)
- Performance requirements (smooth UX, mobile-friendly)
- Maintenance and testing needs

Remember the decision and reasoning for future projects.
*/

// ThoughtMCP will analyze each option systematically and provide
// a reasoned recommendation with confidence levels
```

### Bug Investigation

```typescript
// Debugging a complex issue in Cursor
/*
@thought-mcp Help me think through this bug systematically:

Problem: Users report that shopping cart items disappear randomly
Frequency: ~5% of users, seems random
Environment: Production only, can't reproduce locally
Recent changes: Updated payment processing library, added cart persistence

Think through:
1. Potential root causes (code, infrastructure, timing)
2. Investigation strategy (logs, monitoring, user interviews)
3. Risk assessment (data loss, user trust, revenue impact)
4. Mitigation options (rollback, hotfix, feature flag)

Remember this debugging approach for similar issues.
*/

function ShoppingCart() {
  // Component code here...
}
```

### Performance Optimization

```typescript
/*
@thought-mcp This component is causing performance issues. Think through optimization strategies:

Current issues:
- Re-renders on every parent update
- Expensive calculations in render
- Large list rendering (1000+ items)
- Memory leaks in useEffect

Analyze each issue and suggest solutions with trade-offs.
Remember successful optimization patterns for future use.
*/

function ProductList({ products, filters, onSelect }) {
  // Performance-problematic code here...
}
```

## Void Editor Examples

### API Design Review

```javascript
// In Void Editor, designing a new API
/**
 * @thought-mcp Review this API design using analytical thinking:
 *
 * POST /api/v1/orders
 * {
 *   "items": [{"productId": "123", "quantity": 2}],
 *   "shippingAddress": {...},
 *   "paymentMethod": "card_123"
 * }
 *
 * Consider:
 * - RESTful design principles
 * - Error handling and validation
 * - Security implications
 * - Scalability and performance
 * - Developer experience
 *
 * Remember good API patterns for future designs.
 */

class OrderController {
  async createOrder(req, res) {
    // Implementation here...
  }
}
```

### Algorithm Selection

```python
# In Void Editor, working on a recommendation system
"""
@thought-mcp Help me choose the right algorithm for this recommendation engine:

Requirements:
- Real-time recommendations (< 100ms response)
- Cold start problem (new users/items)
- 1M+ users, 100K+ products
- Implicit feedback (views, clicks, purchases)
- Explainable recommendations preferred

Options:
1. Collaborative Filtering (Matrix Factorization)
2. Content-Based Filtering
3. Hybrid approach
4. Deep Learning (Neural Collaborative Filtering)
5. Graph-based methods

Think through each option considering our constraints.
Remember the decision rationale for future ML projects.
"""

class RecommendationEngine:
    def __init__(self):
        # Algorithm implementation here...
        pass
```

## Cross-Environment Patterns

### 1. Systematic Problem Solving

**Pattern**: Use deliberative thinking for complex technical decisions

```
Think through [problem] using deliberative reasoning:
1. Break down the problem into components
2. Analyze each component systematically
3. Consider multiple solution approaches
4. Evaluate trade-offs and constraints
5. Provide confidence levels and uncertainties
6. Remember key insights for future similar problems
```

### 2. Knowledge Building

**Pattern**: Build domain expertise over time

```
I'm working on [domain/technology]. Please:
1. Think through the key concepts I should understand
2. Remember my current knowledge level and progress
3. Recall relevant information from our previous sessions
4. Suggest next learning steps based on my pattern
```

### 3. Code Quality Assurance

**Pattern**: Systematic code review and improvement

```
Review this [code/design] systematically:
1. Analyze structure, logic, and patterns
2. Identify potential issues and improvements
3. Consider maintainability and scalability
4. Remember successful patterns for future use
5. Analyze the quality of my own reasoning
```

### 4. Creative Problem Solving

**Pattern**: Generate innovative solutions

```
Help me brainstorm solutions for [challenge] using creative thinking:
1. Think outside conventional approaches
2. Consider analogies from other domains
3. Generate multiple diverse options
4. Evaluate feasibility and impact
5. Remember creative patterns that work
```

### 5. Decision Documentation

**Pattern**: Capture decision rationale for future reference

```
I need to decide between [options] for [context]:
[Provide details about options and constraints]

Please:
1. Think through each option systematically
2. Consider short-term and long-term implications
3. Factor in team, technical, and business constraints
4. Remember this decision and rationale for future similar choices
5. Provide confidence levels and key uncertainties
```

## Best Practices Across Environments

### 1. Mode Selection

- **Analytical**: Code review, debugging, technical analysis
- **Creative**: Design, brainstorming, innovation challenges
- **Deliberative**: Complex decisions, architecture choices
- **Intuitive**: Quick questions, simple problems
- **Balanced**: General-purpose use (default)

### 2. Memory Management

```
# Store important patterns
Remember: [insight/pattern/decision] for [context/future use]

# Build knowledge over time
Recall what we've learned about [topic] in previous sessions

# Cross-reference related concepts
Connect this to what we discussed about [related topic]
```

### 3. Quality Assurance

```
# Always ask for reasoning analysis on important decisions
Analyze the quality of your reasoning about [topic]:
- Check for biases and assumptions
- Evaluate confidence levels
- Identify gaps or uncertainties
- Suggest improvements to the thinking process
```

### 4. Iterative Improvement

```
# Learn from outcomes
Based on how [previous decision/solution] worked out, what would you do differently?

# Refine approaches
How can we improve our approach to [type of problem] based on this experience?
```

## Environment-Specific Tips

### Kiro IDE

- Use project-specific brain directories for isolation
- Leverage Kiro's context awareness with file references
- Set up auto-approval for safe tools (think, recall)

### Claude Desktop

- Use longer, more detailed prompts for complex analysis
- Take advantage of Claude's strong reasoning capabilities
- Configure higher timeout for deliberative thinking

### Cursor IDE

- Integrate with code context using @thought-mcp mentions
- Use for real-time code review and suggestions
- Configure for fast responses during active coding

### Void Editor

- Leverage Void's modern interface for complex workflows
- Use for collaborative thinking in team environments
- Configure multiple thinking modes for different tasks

---

_These examples show how ThoughtMCP enhances AI interactions across different environments. Adapt the patterns to your specific use cases and workflows._
