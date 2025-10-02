# ThoughtMCP Tool Comparison Matrix

## Quick Reference Guide

| Tool                       | Purpose                    | Speed       | Complexity | Best For                  | Avoid When               |
| -------------------------- | -------------------------- | ----------- | ---------- | ------------------------- | ------------------------ |
| **think**                  | General reasoning          | Fast-Slow\* | Low-High\* | Most questions, decisions | Simple facts             |
| **remember**               | Store information          | Fast        | Low        | Saving insights           | Already stored info      |
| **recall**                 | Find information           | Fast        | Low        | Finding past info         | No relevant memories     |
| **analyze_reasoning**      | Check thinking quality     | Medium      | Medium     | Important decisions       | Simple questions         |
| **analyze_systematically** | Structured problem solving | Slow        | High       | Complex business problems | Quick decisions          |
| **think_parallel**         | Multiple perspectives      | Slow        | High       | Strategic decisions       | Time-sensitive tasks     |
| **decompose_problem**      | Break down complexity      | Medium      | Medium     | Large projects            | Simple tasks             |
| **think_probabilistic**    | Handle uncertainty         | Medium      | High       | Risk assessment           | Certain situations       |
| **analyze_memory_usage**   | Memory health check        | Fast        | Low        | Memory maintenance        | Fresh start              |
| **optimize_memory**        | Clean up memory            | Medium      | Medium     | Performance issues        | Important info at risk   |
| **recover_memory**         | Restore lost info          | Medium      | Medium     | Forgotten important info  | Info never stored        |
| **forgetting_audit**       | Review memory changes      | Fast        | Low        | Transparency needs        | No memory changes        |
| **forgetting_policy**      | Set memory rules           | Medium      | High       | Automated management      | Manual control preferred |

\*Speed and complexity depend on the mode used

## Detailed Comparison

### By Use Case

#### 🤔 **Thinking and Reasoning**

| Scenario                   | Recommended Tool         | Alternative              | Why                  |
| -------------------------- | ------------------------ | ------------------------ | -------------------- |
| Quick question             | `think` (intuitive)      | -                        | Fast, direct answers |
| Complex decision           | `think` (deliberative)   | `think_parallel`         | Thorough analysis    |
| Creative problem           | `think` (creative)       | `think_parallel`         | Innovation focus     |
| Multiple viewpoints needed | `think_parallel`         | `analyze_systematically` | Diverse perspectives |
| Structured approach needed | `analyze_systematically` | `decompose_problem`      | Proven frameworks    |
| Overwhelming problem       | `decompose_problem`      | `analyze_systematically` | Breaks complexity    |
| Uncertain situation        | `think_probabilistic`    | `think` (analytical)     | Handles uncertainty  |

#### 💾 **Memory Operations**

| Scenario                 | Recommended Tool       | Alternative | Why                        |
| ------------------------ | ---------------------- | ----------- | -------------------------- |
| Save new insight         | `remember`             | -           | Primary storage function   |
| Find past information    | `recall`               | -           | Primary retrieval function |
| Memory feels slow        | `analyze_memory_usage` | -           | Diagnostic first           |
| Too much clutter         | `optimize_memory`      | -           | Cleanup function           |
| Can't remember something | `recover_memory`       | `recall`    | Specialized recovery       |
| Check what was forgotten | `forgetting_audit`     | -           | Transparency function      |
| Set memory rules         | `forgetting_policy`    | -           | Automation function        |

#### 🔍 **Quality and Analysis**

| Scenario                 | Recommended Tool                 | Alternative             | Why                  |
| ------------------------ | -------------------------------- | ----------------------- | -------------------- |
| Check reasoning quality  | `analyze_reasoning`              | -                       | Specialized analysis |
| Improve thinking process | `analyze_reasoning`              | `think` (metacognitive) | Quality focus        |
| Learn from decisions     | `analyze_reasoning` + `remember` | -                       | Capture learnings    |

### By Time Available

#### ⚡ **Quick (< 5 seconds)**

- `think` (intuitive mode)
- `remember`
- `recall`
- `analyze_memory_usage`
- `forgetting_audit`

#### ⏱️ **Medium (5-30 seconds)**

- `think` (balanced/analytical mode)
- `analyze_reasoning`
- `decompose_problem`
- `think_probabilistic`
- `optimize_memory`
- `recover_memory`
- `forgetting_policy`

#### 🐌 **Slow (30+ seconds)**

- `think` (deliberative/creative mode)
- `analyze_systematically`
- `think_parallel`

### By Expertise Level

#### 👶 **Beginner**

**Start with these:**

- `think` (balanced mode) - Safe, general-purpose
- `remember` - Simple storage
- `recall` - Simple retrieval

**Avoid initially:**

- `think_parallel` - Complex output
- `forgetting_policy` - Advanced configuration
- `think_probabilistic` - Requires understanding of uncertainty

#### 🎓 **Intermediate**

**Add these:**

- `think` (different modes) - Explore capabilities
- `analyze_reasoning` - Improve thinking
- `decompose_problem` - Handle complexity
- `analyze_memory_usage` - Maintain performance

#### 🧠 **Advanced**

**Use all tools:**

- `think_parallel` - Maximum insight
- `analyze_systematically` - Professional frameworks
- `think_probabilistic` - Handle uncertainty
- `forgetting_policy` - Automated management

### By Problem Type

#### 📊 **Business/Strategic**

1. `analyze_systematically` - Use proven frameworks
2. `think_parallel` - Multiple perspectives
3. `think_probabilistic` - Handle market uncertainty
4. `analyze_reasoning` - Validate decisions

#### 🎨 **Creative/Innovation**

1. `think` (creative mode) - Generate ideas
2. `think_parallel` - Diverse approaches
3. `decompose_problem` - Structure creativity
4. `remember` - Capture insights

#### 🔧 **Technical/Engineering**

1. `think` (analytical mode) - Logical approach
2. `decompose_problem` - Break complexity
3. `analyze_systematically` - Engineering methods
4. `analyze_reasoning` - Validate logic

#### 🎯 **Personal/Life Decisions**

1. `think` (deliberative mode) - Careful consideration
2. `recall` - Learn from past experiences
3. `analyze_reasoning` - Check for biases
4. `remember` - Store decision rationale

#### 📚 **Learning/Education**

1. `think` (balanced mode) - Understand concepts
2. `remember` - Store knowledge
3. `recall` - Connect ideas
4. `analyze_reasoning` - Improve understanding

### Performance Considerations

#### 🚀 **High Performance Setup**

```json
{
  "primary_tools": ["think", "remember", "recall"],
  "modes": ["intuitive", "balanced"],
  "avoid": ["think_parallel", "analyze_systematically"],
  "settings": {
    "timeout": 10000,
    "temperature": 0.3
  }
}
```

#### 🎯 **High Quality Setup**

```json
{
  "primary_tools": ["think", "analyze_reasoning", "think_parallel"],
  "modes": ["deliberative", "analytical"],
  "settings": {
    "timeout": 30000,
    "temperature": 0.7,
    "enable_metacognition": true
  }
}
```

#### 🎨 **Creative Setup**

```json
{
  "primary_tools": ["think", "think_parallel", "decompose_problem"],
  "modes": ["creative", "balanced"],
  "settings": {
    "timeout": 20000,
    "temperature": 1.2,
    "enable_emotion": true
  }
}
```

## Common Mistakes to Avoid

### ❌ **Wrong Tool Selection**

| Mistake                                         | Better Choice                | Why                              |
| ----------------------------------------------- | ---------------------------- | -------------------------------- |
| Using `think_parallel` for simple questions     | `think` (intuitive)          | Overkill, slower                 |
| Using `think` (intuitive) for complex decisions | `think` (deliberative)       | Insufficient analysis            |
| Using `remember` for already stored info        | `recall` first               | Avoid duplicates                 |
| Using `optimize_memory` without analysis        | `analyze_memory_usage` first | Understand before acting         |
| Using `recover_memory` for never-stored info    | `think` or research          | Can't recover what wasn't stored |

### ❌ **Wrong Mode Selection**

| Situation          | Wrong Mode   | Right Mode   | Impact                |
| ------------------ | ------------ | ------------ | --------------------- |
| Time pressure      | deliberative | intuitive    | Too slow              |
| Important decision | intuitive    | deliberative | Insufficient analysis |
| Creative task      | analytical   | creative     | Limited innovation    |
| Data analysis      | creative     | analytical   | Unfocused approach    |

### ❌ **Wrong Workflow**

| Mistake            | Better Workflow            | Why                      |
| ------------------ | -------------------------- | ------------------------ |
| Decide → Remember  | Think → Analyze → Remember | Missing quality check    |
| Remember → Think   | Recall → Think             | Use existing knowledge   |
| Optimize → Analyze | Analyze → Optimize         | Understand before acting |

## Tool Combinations That Work Well

### 🔄 **Common Workflows**

#### Decision Making Flow

```
think (deliberative) → analyze_reasoning → remember
```

#### Learning Flow

```
think (balanced) → remember → recall (to connect)
```

#### Problem Solving Flow

```
decompose_problem → think_parallel → analyze_reasoning → remember
```

#### Memory Maintenance Flow

```
analyze_memory_usage → optimize_memory → forgetting_audit
```

#### Creative Process Flow

```
think (creative) → think_parallel → analyze_reasoning → remember
```

### 🎯 **Advanced Combinations**

#### Strategic Planning

```
analyze_systematically → think_parallel → think_probabilistic → analyze_reasoning → remember
```

#### Research and Analysis

```
recall → think (analytical) → analyze_reasoning → remember
```

#### Complex Problem Solving

```
decompose_problem → analyze_systematically → think_parallel → analyze_reasoning → remember
```

## Quick Start Recommendations

### 🚀 **First Week**

- Use `think` for all questions (try different modes)
- Use `remember` to save insights
- Use `recall` to find information

### 📈 **Second Week**

- Add `analyze_reasoning` for important decisions
- Try `decompose_problem` for complex tasks
- Use `analyze_memory_usage` to check performance

### 🎓 **Third Week**

- Experiment with `think_parallel` for strategic questions
- Try `analyze_systematically` for business problems
- Set up basic `forgetting_policy` rules

### 🧠 **Advanced Usage**

- Use `think_probabilistic` for uncertainty
- Implement automated memory management
- Create custom workflows for your use cases

This matrix should help you choose the right tool for any situation. Start simple and gradually explore more advanced capabilities as you become comfortable with the system.
