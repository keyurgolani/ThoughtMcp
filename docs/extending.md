# ThoughtMCP Extension Guide

This guide explains how to extend ThoughtMCP with new memory sectors, reasoning frameworks, bias detection patterns, and emotion types.

## Table of Contents

1. [Adding New Memory Sectors](#adding-new-memory-sectors)
2. [Adding New Reasoning Frameworks](#adding-new-reasoning-frameworks)
3. [Adding New Bias Detection Patterns](#adding-new-bias-detection-patterns)
4. [Extending Emotion Detection](#extending-emotion-detection)
5. [Plugin Architecture](#plugin-architecture)

---

## Adding New Memory Sectors

The HMD (Hierarchical Memory Decomposition) system supports five memory sectors by default. You can add new sectors for specialized use cases.

### Step 1: Define the Sector Type

Add the new sector to `src/embeddings/types.ts`:

```typescript
export enum MemorySector {
  Episodic = "episodic",
  Semantic = "semantic",
  Procedural = "procedural",
  Emotional = "emotional",
  Reflective = "reflective",
  // Add your new sector
  Spatial = "spatial", // Example: spatial/location memory
}
```

### Step 2: Update SectorEmbeddings Interface

```typescript
export interface SectorEmbeddings {
  episodic: number[];
  semantic: number[];
  procedural: number[];
  emotional: number[];
  reflective: number[];
  spatial?: number[]; // Optional for backward compatibility
}
```

### Step 3: Implement Sector-Specific Embedding Generation

In `src/embeddings/embedding-engine.ts`, add a method for your sector:

```typescript
async generateSpatialEmbedding(
  content: string,
  context?: SpatialContext
): Promise<number[]> {
  // Enhance content with spatial context
  const enhancedContent = context
    ? `Location: ${context.location}. Coordinates: ${context.coordinates}. ${content}`
    : content;

  return this.model.generate(enhancedContent);
}
```

### Step 4: Update Database Schema

Create a migration to support the new sector:

```sql
-- Migration: Add spatial sector support
-- Ensure memory_embeddings table accepts 'spatial' sector
ALTER TABLE memory_embeddings
  DROP CONSTRAINT IF EXISTS valid_sector;

ALTER TABLE memory_embeddings
  ADD CONSTRAINT valid_sector
  CHECK (sector IN ('episodic', 'semantic', 'procedural', 'emotional', 'reflective', 'spatial'));

-- Create vector index for new sector
CREATE INDEX idx_embeddings_spatial_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WHERE sector = 'spatial';
```

### Step 5: Configure Decay Rate

In `src/temporal/sector-config.ts`, add decay configuration:

```typescript
const DEFAULT_SECTOR_MULTIPLIERS: Record<string, number> = {
  episodic: 1.0,
  semantic: 0.5,
  procedural: 0.3,
  emotional: 0.8,
  reflective: 0.4,
  spatial: 0.6, // Spatial memories decay moderately
};
```

### Step 6: Write Tests

```typescript
describe("Spatial Memory Sector", () => {
  it("should generate spatial embeddings with location context", async () => {
    const embedding = await engine.generateSpatialEmbedding("Meeting at the coffee shop", {
      location: "Downtown",
      coordinates: "40.7128,-74.0060",
    });

    expect(embedding).toHaveLength(768);
  });
});
```

---

## Adding New Reasoning Frameworks

ThoughtMCP supports dynamic framework selection from a library of thinking frameworks.

### Step 1: Create Framework Class

Create a new file in `src/framework/frameworks/`:

```typescript
// src/framework/frameworks/six-thinking-hats.ts
import { BaseFramework } from "../base-framework";
import type { FrameworkStep, ProblemCharacteristics } from "../types";

export class SixThinkingHatsFramework extends BaseFramework {
  constructor() {
    super({
      id: "six-thinking-hats",
      name: "Six Thinking Hats",
      description:
        "Parallel thinking method using six colored hats representing different perspectives",
      bestSuitedFor: [
        {
          complexity: "moderate",
          uncertainty: "medium",
          stakes: "important",
          timePressure: "moderate",
        },
        { complexity: "complex", uncertainty: "high", stakes: "critical", timePressure: "none" },
      ],
      expectedDuration: 1800000, // 30 minutes
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createWhiteHatStep(),
      this.createRedHatStep(),
      this.createBlackHatStep(),
      this.createYellowHatStep(),
      this.createGreenHatStep(),
      this.createBlueHatStep(),
    ];
  }

  private createWhiteHatStep(): FrameworkStep {
    return {
      id: "white-hat",
      name: "White Hat - Facts",
      description: "Focus on available data and information",
      order: 1,
      optional: false,
      async execute(context, previousResults) {
        // Implementation
        return {
          stepId: "white-hat",
          success: true,
          output: "Facts and data analysis...",
          insights: ["Key fact 1", "Key fact 2"],
          processingTime: 1000,
          confidence: 0.9,
        };
      },
      async validate(context, previousResults) {
        return { valid: true, issues: [] };
      },
    };
  }

  // Implement other hat steps...
}
```

### Step 2: Register the Framework

In `src/framework/framework-registry.ts`:

```typescript
import { SixThinkingHatsFramework } from "./frameworks/six-thinking-hats";

export class FrameworkRegistry {
  private frameworks: Map<string, ThinkingFramework> = new Map();

  constructor() {
    this.registerDefaultFramews();
  }

  private registerDefaultFrameworks(): void {
    // Existing frameworks...
    this.register(new SixThinkingHatsFramework());
  }

  register(framework: ThinkingFramework): void {
    this.frameworks.set(framework.id, framework);
  }
}
```

### Step 3: Update Framework Selector

In `src/framework/framework-selector.ts`, add selection logic:

```typescript
private getFrameworkScores(classification: ProblemClassification): Map<string, number> {
  const scores = new Map<string, number>();

  // Add scoring for new framework
  if (classification.complexity === 'moderate' &&
      classification.uncertainty === 'medium') {
    scores.set('six-thinking-hats', 0.85);
  }

  return scores;
}
```

### Step 4: Write Tests

```typescript
describe("SixThinkingHatsFramework", () => {
  let framework: SixThinkingHatsFramework;

  beforeEach(() => {
    framework = new SixThinkingHatsFramework();
  });

  it("should have six steps for six hats", () => {
    expect(framework.steps).toHaveLength(6);
  });

  it("should execute all hat perspectives", async () => {
    const result = await framework.execute(problem, context);
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(6);
  });
});
```

---

## Adding New Bias Detection Patterns

The bias detection system monitors for cognitive biases during reasoning.

### Step 1: Define the Bias Type

In `src/bias/types.ts`:

```typescript
export enum BiasType {
  CONFIRMATION = "confirmation",
  ANCHORING = "anchoring",
  // ... existing types
  DUNNING_KRUGER = "dunning_kruger", // New bias type
}
```

### Step 2: Create Bias Detector

Create a detector in `src/bias/bias-pattern-recognizer.ts`:

```typescript
private detectDunningKrugerBias(reasoning: ReasoningChain): DetectedBias | null {
  // Look for overconfidence with limited evidence
  const hasLimitedEvidence = reasoning.evidence.length < 3;
  const hasHighConfidence = (reasoning.confidence ?? 0) > 0.8;
  const lacksUncertaintyAcknowledgment = !reasoning.steps.some(
    step => step.content.toLowerCase().includes('uncertain') ||
            step.content.toLowerCase().includes('might') ||
            step.content.toLowerCase().includes('possibly')
  );

  if (hasLimitedEvidence && hasHighConfidence && lacksUncertaintyAcknowledgment) {
    return {
      type: BiasType.DUNNING_KRUGER,
      severity: 0.7,
      confidence: 0.75,
      evidence: [
        `Only ${reasoning.evidence.length} pieces of evidence`,
        `Confidence level: ${reasoning.confidence}`,
        'No uncertainty acknowledgment in reasoning'
      ],
      location: {
        stepIndex: reasoning.steps.length - 1,
        reasoning: reasoning.conclusion
      },
      explanation: 'High confidence expressed despite limited evidence and no acknowledgment of uncertainty',
      detectedAt: new Date()
    };
  }

  return null;
}
```

### Step 3: Add Correction Strategy

In `src/bias/bias-correction-engine.ts`:

```typescript
private correctDunningKrugerBias(
  bias: DetectedBias,
  reasoning: ReasoningChain
): CorrectedReasoning {
  // Add uncertainty acknowledgment
  const correctedSteps = reasoning.steps.map(step => ({
    ...step,
    content: step.type === 'conclusion'
      ? `Based on limited evidence, ${step.content.toLowerCase()}`
      : step.content
  }));

  // Reduce confidence
  const correctedConfidence = Math.min((reasoning.confidence ?? 0.5) * 0.7, 0.6);

  return {
    original: reasoning,
    corrected: {
      ...reasoning,
      steps: correctedSteps,
      confidence: correctedConfidence
    },
    biasesCorrected: [bias],
    correctionsApplied: [{
      bias,
      strategy: 'uncertainty_injection',
      changes: [{
        type: 'assumption_challenged',
        location: bias.location,
        before: reasoning.conclusion,
        after: `Based on limited evidence, ${reasoning.conclusion.toLowerCase()}`,
        rationale: 'Added uncertainty acknowledgment to counter overconfidence'
      }],
      impactReduction: 0.4
    }],
    effectivenessScore: 0.7,
    timestamp: new Date()
  };
}
```

### Step 4: Write Tests

```typescript
describe("Dunning-Kruger Bias Detection", () => {
  it("should detect overconfidence with limited evidence", () => {
    const reasoning: ReasoningChain = {
      id: "test",
      steps: [
        { id: "1", content: "This is definitely correct", type: "conclusion", confidence: 0.95 },
      ],
      branches: [],
      assumptions: [],
      inferences: [],
      evidence: [{ id: "e1", content: "Single source", source: "web" }],
      conclusion: "This is definitely correct",
      confidence: 0.95,
    };

    const biases = recognizer.detectBiases(reasoning);

    expect(biases).toContainEqual(expect.objectContaining({ type: BiasType.DUNNING_KRUGER }));
  });
});
```

---

## Extending Emotion Detection

The emotion detection system uses both Circumplex model and discrete emotions.

### Step 1: Add New Emotion Type

In `src/emotion/types.ts`:

```typescript
export type EmotionType =
  | "joy"
  | "sadness"
  // ... existing types
  | "nostalgia" // New emotion type
  | "anticipation";
```

### Step 2: Add Detection Logic

In `src/emotion/discrete-emotion-classifier.ts`:

```typescript
private detectNostalgia(text: string): number {
  const nostalgiaIndicators = [
    'remember when',
    'back in the day',
    'used to',
    'those were the days',
    'miss the old',
    'reminds me of',
    'childhood',
    'memories of'
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  for (const indicator of nostalgiaIndicators) {
    if (lowerText.includes(indicator)) {
      score += 0.2;
    }
  }

  // Check for past tense verbs combined with positive sentiment
  const hasPastTense = /\b(was|were|had|used to)\b/i.test(text);
  const hasPositiveSentiment = this.hasPositiveWords(text);

  if (hasPastTense && hasPositiveSentiment) {
    score += 0.3;
  }

  return Math.min(score, 1.0);
}

classifyEmotions(text: string): EmotionClassification[] {
  const classifications: EmotionClassification[] = [];

  // ... existing emotion detection

  const nostalgiaScore = this.detectNostalgia(text);
  if (nostalgiaScore > 0.3) {
    classifications.push({
      emotion: 'nostalgia',
      intensity: nostalgiaScore,
      confidence: 0.7,
      evidence: this.extractNostalgiaEvidence(text)
    });
  }

  return classifications;
}
```

### Step 3: Update Circumplex Mapping

In `src/emotion/circumplex-analyzer.ts`:

```typescript
private emotionToCircumplex: Record<EmotionType, CircumplexState> = {
  joy: { valence: 0.8, arousal: 0.6, dominance: 0.5 },
  // ... existing mappings
  nostalgia: { valence: 0.3, arousal: 0.2, dominance: -0.1 },  // Bittersweet, calm, slightly passive
  anticipation: { valence: 0.5, arousal: 0.7, dominance: 0.3 }
};
```

### Step 4: Write Tests

```typescript
describe("Nostalgia Detection", () => {
  it("should detect nostalgia in reminiscent text", () => {
    const text = "I remember when we used to play in the park. Those were the days.";

    const emotions = classifier.classifyEmotions(text);

    expect(emotions).toContainEqual(
      expect.objectContaining({
        emotion: "nostalgia",
        intensity: expect.any(Number),
      })
    );
  });
});
```

---

## Plugin Architecture

ThoughtMCP supports a plugin architecture for extending functionality without modifying core code.

### Plugin Interface

```typescript
// src/plugins/types.ts
export interface ThoughtMCPPlugin {
  /** Unique plugin identifier */
  id: string;

  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Initialize the plugin */
  initialize(context: PluginContext): Promise<void>;

  /** Cleanup when plugin is unloaded */
  destroy(): Promise<void>;
}

export interface PluginContext {
  /** Register a new memory sector */
  registerMemorySector(sector: MemorySectorDefinition): void;

  /** Register a new framework */
  registerFramework(framework: ThinkingFramework): void;

  /** Register a new bias detector */
  registerBiasDetector(detector: BiasDetector): void;

  /** Register a new emotion type */
  registerEmotionType(emotion: EmotionTypeDefinition): void;

  /** Access to core services */
  services: {
    memory: MemoryRepository;
    embedding: EmbeddingEngine;
    reasoning: ReasoningOrchestrator;
  };
}
```

### Creating a Plugin

```typescript
// my-plugin/index.ts
import type { ThoughtMCPPlugin, PluginContext } from "thoughtmcp/plugins";

export class MyCustomPlugin implements ThoughtMCPPlugin {
  id = "my-custom-plugin";
  name = "My Custom Plugin";
  version = "1.0.0";

  async initialize(context: PluginContext): Promise<void> {
    // Register custom memory sector
    context.registerMemorySector({
      id: "custom",
      name: "Custom Sector",
      decayRate: 0.5,
      generateEmbedding: async (content) => {
        // Custom embedding logic
        return context.services.embedding.generate(content);
      },
    });

    // Register custom framework
    context.registerFramework(new MyCustomFramework());

    // Register custom bias detector
    context.registerBiasDetector({
      biasType: "custom_bias",
      detect: (reasoning) => this.detectCustomBias(reasoning),
      assessSeverity: (bias) => bias.severity,
    });
  }

  async destroy(): Promise<void> {
    // Cleanup resources
  }

  private detectCustomBias(reasoning: ReasoningChain): DetectedBias | null {
    // Custom detection logic
    return null;
  }
}
```

### Loading Plugins

```typescript
// In your application
import { PluginManager } from "thoughtmcp/plugins";
import { MyCustomPlugin } from "my-plugin";

const pluginManager = new PluginManager();

// Load plugin
await pluginManager.load(new MyCustomPlugin());

// Unload plugin
await pluginManager.unload("my-custom-plugin");
```

---

## Best Practices

### 1. Backward Compatibility

- Make new fields optional when extending interfaces
- Use feature flags for experimental features
- Provide migration paths for breaking changes

### 2. Testing

- Write unit tests for all new functionality
- Include integration tests for cross-component interactions
- Test edge cases and error conditions

### 3. Documentation

- Document all public APIs with JSDoc
- Update relevant guides when adding features
- Include usage examples

### 4. Performance

- Profile new features for performance impact
- Use caching where appropriate
- Consider async operations for heavy processing

---

## See Also

- **[Architecture Guide](./architecture.md)** - System design
- **[API Reference](./api.md)** - API documentation
- **[Development Guide](./development.md)** - Development workflow
- **[Contributing Guide](./contributing.md)** - Contribution guidelines

---

**Last Updated**: December 2025
**Version**: 0.5.0
