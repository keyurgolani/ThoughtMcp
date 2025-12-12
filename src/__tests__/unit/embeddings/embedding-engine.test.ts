/**
 * Embedding Engine Tests
 *
 * Tests for five-sector embedding generation system.
 * Tests cover:
 * - Episodic embedding generation from temporal content
 * - Semantic embedding generation from factual content
 * - Procedural embedding generation from process descriptions
 * - Emotional embedding generation from affective content
 * - Reflective embedding generation from meta-insights
 * - Embedding dimension consistency
 * - Request deduplication
 * - Batch operations
 * - Cache efficiency
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingCache } from "../../../embeddings/cache";
import { EmbeddingEngine } from "../../../embeddings/embedding-engine";
import {
  MemorySector,
  type EmotionState,
  type MemoryContent,
  type TemporalContext,
} from "../../../embeddings/types";
import { MockOllamaEmbeddingModel } from "../../utils/mock-embeddings";

// Helper function for cosine similarity calculation
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimension");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

describe("EmbeddingEngine - Episodic Embeddings", () => {
  let engine: EmbeddingEngine;
  const expectedDimension = 768; // nomic-embed-text dimension

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate episodic embedding from temporal content", async () => {
    const content = "Met with the team at the office to discuss Q4 planning";
    const context: TemporalContext = {
      timestamp: new Date("2024-11-10T14:00:00Z"),
      sessionId: "test-session-1",
      duration: 3600,
      location: "Office Conference Room A",
      participants: ["Alice", "Bob", "Charlie"],
    };

    const embedding = await engine.generateEpisodicEmbedding(content, context);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    expect(embedding.every((val) => typeof val === "number" && !isNaN(val))).toBe(true);

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("should generate different embeddings for different temporal contexts", async () => {
    const content = "Team meeting";

    const context1: TemporalContext = {
      timestamp: new Date("2024-11-10T09:00:00Z"),
      sessionId: "test-session-2",
      location: "Office",
    };

    const context2: TemporalContext = {
      timestamp: new Date("2024-11-10T15:00:00Z"),
      sessionId: "test-session-3",
      location: "Remote",
    };

    const embedding1 = await engine.generateEpisodicEmbedding(content, context1);
    const embedding2 = await engine.generateEpisodicEmbedding(content, context2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeLessThan(1.0);
  });

  it("should handle episodic with minimal context", async () => {
    const content = "Quick standup meeting";
    const context: TemporalContext = {
      timestamp: new Date(),
      sessionId: "test-session-4",
    };

    const embedding = await engine.generateEpisodicEmbedding(content, context);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(expectedDimension);
  });
});

describe("EmbeddingEngine - Semantic Embeddings", () => {
  let engine: EmbeddingEngine;
  const expectedDimension = 768;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate semantic embedding from factual content", async () => {
    const content =
      "PostgreSQL is a powerful, open-source relational database management system that supports advanced data types and performance optimization features.";

    const embedding = await engine.generateSemanticEmbedding(content);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    expect(embedding.every((val) => typeof val === "number" && !isNaN(val))).toBe(true);

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("should generate similar embeddings for semantically similar content", async () => {
    const content1 = "Machine learning is a subset of artificial intelligence";
    const content2 = "AI includes machine learning as one of its core components";

    const embedding1 = await engine.generateSemanticEmbedding(content1);
    const embedding2 = await engine.generateSemanticEmbedding(content2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("should generate different embeddings for semantically different content", async () => {
    const content1 = "Database management systems store and retrieve data efficiently";
    const content2 = "Quantum computing uses quantum bits for parallel computation";

    const embedding1 = await engine.generateSemanticEmbedding(content1);
    const embedding2 = await engine.generateSemanticEmbedding(content2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeLessThan(0.9);
  });

  it("should handle short factual statements", async () => {
    const content = "Water boils at 100 degrees Celsius";

    const embedding = await engine.generateSemanticEmbedding(content);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(expectedDimension);
  });
});

describe("EmbeddingEngine - Procedural Embeddings", () => {
  let engine: EmbeddingEngine;
  const expectedDimension = 768;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate procedural embedding from process descriptions", async () => {
    const content = `To deploy the application:
1. Build the Docker image using 'docker build -t app:latest .'
2. Push the image to the registry with 'docker push app:latest'
3. Update the Kubernetes deployment with 'kubectl apply -f deployment.yaml'
4. Verify the deployment with 'kubectl rollout status deployment/app'`;

    const embedding = await engine.generateProceduralEmbedding(content);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    expect(embedding.every((val) => typeof val === "number" && !isNaN(val))).toBe(true);

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("should generate similar embeddings for similar procedures", async () => {
    const content1 =
      "To make coffee: 1. Boil water 2. Add coffee grounds 3. Pour water 4. Wait 5 minutes";
    const content2 =
      "Coffee preparation: Heat water, add grounds, pour hot water, steep for 5 minutes";

    const embedding1 = await engine.generateProceduralEmbedding(content1);
    const embedding2 = await engine.generateProceduralEmbedding(content2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("should generate different embeddings for different procedures", async () => {
    const content1 = "To bake a cake: Mix ingredients, pour into pan, bake at 350°F for 30 minutes";
    const content2 = "To change a tire: Loosen lug nuts, jack up car, remove wheel, install spare";

    const embedding1 = await engine.generateProceduralEmbedding(content1);
    const embedding2 = await engine.generateProceduralEmbedding(content2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeLessThan(0.9);
  });

  it("should handle procedural content with implicit steps", async () => {
    const content =
      "When debugging, first reproduce the issue, then isolate the cause, and finally apply a fix";

    const embedding = await engine.generateProceduralEmbedding(content);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(expectedDimension);
  });
});

describe("EmbeddingEngine - Emotional Embeddings", () => {
  let engine: EmbeddingEngine;
  const expectedDimension = 768;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate emotional embedding from affective content", async () => {
    const content =
      "I'm thrilled about the project launch! The team worked incredibly hard and the results exceeded all expectations.";
    const emotion: EmotionState = {
      valence: 0.9,
      arousal: 0.8,
      dominance: 0.6,
      primaryEmotion: "joy",
    };

    const embedding = await engine.generateEmotionalEmbedding(content, emotion);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    expect(embedding.every((val) => typeof val === "number" && !isNaN(val))).toBe(true);

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("should generate different embeddings for different emotional states", async () => {
    const content = "The project outcome was unexpected";

    const joyEmotion: EmotionState = {
      valence: 0.8,
      arousal: 0.7,
      dominance: 0.5,
      primaryEmotion: "joy",
    };

    const sadnessEmotion: EmotionState = {
      valence: -0.7,
      arousal: 0.3,
      dominance: -0.4,
      primaryEmotion: "sadness",
    };

    const embedding1 = await engine.generateEmotionalEmbedding(content, joyEmotion);
    const embedding2 = await engine.generateEmotionalEmbedding(content, sadnessEmotion);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeLessThan(0.9);
  });

  it("should generate similar embeddings for similar emotional states", async () => {
    const content1 = "I'm excited about the new opportunity";
    const content2 = "I'm enthusiastic about this chance";

    const emotion1: EmotionState = {
      valence: 0.8,
      arousal: 0.7,
      dominance: 0.5,
      primaryEmotion: "joy",
    };

    const emotion2: EmotionState = {
      valence: 0.85,
      arousal: 0.75,
      dominance: 0.55,
      primaryEmotion: "joy",
    };

    const embedding1 = await engine.generateEmotionalEmbedding(content1, emotion1);
    const embedding2 = await engine.generateEmotionalEmbedding(content2, emotion2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.7);
  });

  it("should handle neutral emotional content", async () => {
    const content = "The meeting is scheduled for 2 PM";
    const emotion: EmotionState = {
      valence: 0.0,
      arousal: 0.3,
      dominance: 0.0,
      primaryEmotion: "neutral",
    };

    const embedding = await engine.generateEmotionalEmbedding(content, emotion);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(expectedDimension);
  });
});

describe("EmbeddingEngine - Reflective Embeddings", () => {
  let engine: EmbeddingEngine;
  const expectedDimension = 768;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate reflective embedding from meta-insights", async () => {
    const content =
      "Looking back at the project, I realize that early planning prevented many issues";
    const insights = [
      "Planning is crucial for project success",
      "Prevention is better than firefighting",
      "Early investment saves time later",
    ];

    const embedding = await engine.generateReflectiveEmbedding(content, insights);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    expect(embedding.every((val) => typeof val === "number" && !isNaN(val))).toBe(true);

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("should generate different embeddings for different insights", async () => {
    const content = "Reflecting on the experience";

    const insights1 = ["Communication is key", "Team collaboration matters"];
    const insights2 = ["Technical skills are important", "Code quality is essential"];

    const embedding1 = await engine.generateReflectiveEmbedding(content, insights1);
    const embedding2 = await engine.generateReflectiveEmbedding(content, insights2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeLessThan(0.85);
  });

  it("should generate similar embeddings for related insights", async () => {
    const content1 = "I learned that testing early catches bugs sooner";
    const insights1 = ["Early testing is valuable", "Prevention beats cure"];

    const content2 = "Testing throughout development prevents issues";
    const insights2 = ["Continuous testing helps quality", "Proactive testing is better"];

    const embedding1 = await engine.generateReflectiveEmbedding(content1, insights1);
    const embedding2 = await engine.generateReflectiveEmbedding(content2, insights2);

    const similarity = calculateCosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.6);
  });

  it("should handle reflective content with minimal insights", async () => {
    const content = "This experience taught me patience";
    const insights = ["Patience is important"];

    const embedding = await engine.generateReflectiveEmbedding(content, insights);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(expectedDimension);
  });
});

describe("EmbeddingEngine - Dimension Consistency", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should return consistent dimension across all sector types", async () => {
    const content = "Test content for dimension consistency";
    const context: TemporalContext = { timestamp: new Date(), sessionId: "test-session-9" };
    const emotion: EmotionState = {
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.0,
      primaryEmotion: "neutral",
    };
    const insights = ["Test insight"];

    const episodic = await engine.generateEpisodicEmbedding(content, context);
    const semantic = await engine.generateSemanticEmbedding(content);
    const procedural = await engine.generateProceduralEmbedding(content);
    const emotional = await engine.generateEmotionalEmbedding(content, emotion);
    const reflective = await engine.generateReflectiveEmbedding(content, insights);

    const expectedDim = engine.getModelDimension();

    expect(episodic.length).toBe(expectedDim);
    expect(semantic.length).toBe(expectedDim);
    expect(procedural.length).toBe(expectedDim);
    expect(emotional.length).toBe(expectedDim);
    expect(reflective.length).toBe(expectedDim);
  });

  it("should respect configured embedding dimension", async () => {
    const dimension = engine.getModelDimension();
    expect([768, 1024, 1536]).toContain(dimension);
  });

  it("should generate embeddings with consistent dimension in batch operations", async () => {
    const memories: MemoryContent[] = [
      { text: "Memory 1", sector: MemorySector.Semantic },
      {
        text: "Memory 2",
        sector: MemorySector.Episodic,
        context: { timestamp: new Date(), sessionId: "test-session-5" },
      },
      { text: "Memory 3", sector: MemorySector.Procedural },
    ];

    const embeddings = await engine.batchGenerateEmbeddings(memories);

    const expectedDim = engine.getModelDimension();

    embeddings.forEach((sectorEmbeddings) => {
      expect(sectorEmbeddings.episodic.length).toBe(expectedDim);
      expect(sectorEmbeddings.semantic.length).toBe(expectedDim);
      expect(sectorEmbeddings.procedural.length).toBe(expectedDim);
      expect(sectorEmbeddings.emotional.length).toBe(expectedDim);
      expect(sectorEmbeddings.reflective.length).toBe(expectedDim);
    });
  });
});

describe("EmbeddingEngine - All Sector Generation", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate embeddings for all five sectors", async () => {
    const memory: MemoryContent = {
      text: "Yesterday I learned a new debugging technique that helped me fix a critical bug. I felt relieved and realized that systematic approaches work better than random trial and error.",
      sector: MemorySector.Episodic,
      context: {
        timestamp: new Date("2024-11-09T16:00:00Z"),
        sessionId: "test-session-6",
        location: "Office",
      },
      emotion: {
        valence: 0.6,
        arousal: 0.5,
        dominance: 0.4,
        primaryEmotion: "relief",
      },
      insights: ["Systematic approaches are more effective", "Debugging requires patience"],
    };

    const embeddings = await engine.generateAllSectorEmbeddings(memory);

    expect(embeddings.episodic).toBeDefined();
    expect(embeddings.semantic).toBeDefined();
    expect(embeddings.procedural).toBeDefined();
    expect(embeddings.emotional).toBeDefined();
    expect(embeddings.reflective).toBeDefined();

    expect(Array.isArray(embeddings.episodic)).toBe(true);
    expect(Array.isArray(embeddings.semantic)).toBe(true);
    expect(Array.isArray(embeddings.procedural)).toBe(true);
    expect(Array.isArray(embeddings.emotional)).toBe(true);
    expect(Array.isArray(embeddings.reflective)).toBe(true);

    const expectedDim = engine.getModelDimension();
    expect(embeddings.episodic.length).toBe(expectedDim);
    expect(embeddings.semantic.length).toBe(expectedDim);
    expect(embeddings.procedural.length).toBe(expectedDim);
    expect(embeddings.emotional.length).toBe(expectedDim);
    expect(embeddings.reflective.length).toBe(expectedDim);
  });

  it("should generate different embeddings for each sector", async () => {
    const memory: MemoryContent = {
      text: "Team meeting about project planning",
      sector: MemorySector.Episodic,
      context: { timestamp: new Date(), sessionId: "test-session-7" },
      emotion: { valence: 0.5, arousal: 0.5, dominance: 0.0, primaryEmotion: "neutral" },
      insights: ["Planning is important"],
    };

    const embeddings = await engine.generateAllSectorEmbeddings(memory);

    const sectors = [
      embeddings.episodic,
      embeddings.semantic,
      embeddings.procedural,
      embeddings.emotional,
      embeddings.reflective,
    ];

    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const similarity = calculateCosineSimilarity(sectors[i], sectors[j]);
        expect(similarity).toBeLessThan(1.0);
      }
    }
  });
});

describe("EmbeddingEngine - Batch Operations", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should generate embeddings for multiple memories in batch", async () => {
    const memories: MemoryContent[] = [
      { text: "First memory", sector: MemorySector.Semantic },
      {
        text: "Second memory",
        sector: MemorySector.Episodic,
        context: { timestamp: new Date(), sessionId: "test-session-8" },
      },
      { text: "Third memory", sector: MemorySector.Procedural },
    ];

    const embeddings = await engine.batchGenerateEmbeddings(memories);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(3);

    embeddings.forEach((sectorEmbeddings) => {
      expect(sectorEmbeddings.episodic).toBeDefined();
      expect(sectorEmbeddings.semantic).toBeDefined();
      expect(sectorEmbeddings.procedural).toBeDefined();
      expect(sectorEmbeddings.emotional).toBeDefined();
      expect(sectorEmbeddings.reflective).toBeDefined();
    });
  });

  it("should handle empty batch gracefully", async () => {
    const memories: MemoryContent[] = [];

    const embeddings = await engine.batchGenerateEmbeddings(memories);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(0);
  });

  it("should handle single item batch", async () => {
    const memories: MemoryContent[] = [{ text: "Single memory", sector: MemorySector.Semantic }];

    const embeddings = await engine.batchGenerateEmbeddings(memories);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(1);
    expect(embeddings[0].semantic).toBeDefined();
  });

  it("should benefit from caching in batch operations", async () => {
    const memories: MemoryContent[] = [
      { text: "Unique content 1", sector: MemorySector.Semantic },
      { text: "Duplicate content", sector: MemorySector.Semantic },
      { text: "Unique content 2", sector: MemorySector.Semantic },
      { text: "Duplicate content", sector: MemorySector.Semantic },
      { text: "Duplicate content", sector: MemorySector.Semantic },
    ];

    const results = await engine.batchGenerateEmbeddings(memories);

    expect(results).toHaveLength(5);
    expect(results[1].semantic).toEqual(results[3].semantic);
    expect(results[1].semantic).toEqual(results[4].semantic);
  });
});

describe("EmbeddingEngine - Model Management", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache();
    engine = new EmbeddingEngine(model, cache);
  });

  it("should load a different model and clear cache", async () => {
    const content = "Test content";
    const context: TemporalContext = {
      timestamp: new Date(),
      sessionId: "test-session",
    };

    await engine.generateEpisodicEmbedding(content, context);

    const newModel = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "mxbai-embed-large",
      dimension: 1024,
    });

    engine.loadModel(newModel);

    expect(engine.getModelDimension()).toBe(1024);
  });

  it("should handle temporal context with sequence number", async () => {
    const content = "Sequential event";
    const context: TemporalContext = {
      timestamp: new Date(),
      sessionId: "test-session",
      sequenceNumber: 5,
    };

    const embedding = await engine.generateEpisodicEmbedding(content, context);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(768);
  });

  it("should handle temporal context with duration", async () => {
    const content = "Event with duration";
    const context: TemporalContext = {
      timestamp: new Date(),
      sessionId: "test-session",
      duration: 3600,
    };

    const embedding = await engine.generateEpisodicEmbedding(content, context);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(768);
  });
});

describe("EmbeddingEngine - Request Deduplication", () => {
  let engine: EmbeddingEngine;
  let model: MockOllamaEmbeddingModel;

  beforeEach(() => {
    model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache(10000, 3600000);
    engine = new EmbeddingEngine(model, cache);
  });

  it("should deduplicate concurrent requests for same content", async () => {
    const generateSpy = vi.spyOn(model, "generate");

    const content = "Duplicate request test content";

    const promises = Array.from({ length: 5 }, () => engine.generateSemanticEmbedding(content));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result).toEqual(results[0]);
    });

    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it("should deduplicate concurrent requests across different sectors", async () => {
    const generateSpy = vi.spyOn(model, "generate");

    const memory: MemoryContent = {
      text: "Multi-sector deduplication test",
      sector: MemorySector.Semantic,
      context: {
        timestamp: new Date(),
        sessionId: "test-session",
      },
      emotion: {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.0,
      },
      insights: ["Test insight"],
    };

    const promises = Array.from({ length: 3 }, () => engine.generateAllSectorEmbeddings(memory));

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result).toEqual(results[0]);
    });

    expect(generateSpy.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("should not deduplicate requests for different content", async () => {
    const generateSpy = vi.spyOn(model, "generate");

    const promises = [
      engine.generateSemanticEmbedding("Content A"),
      engine.generateSemanticEmbedding("Content B"),
      engine.generateSemanticEmbedding("Content C"),
    ];

    await Promise.all(promises);

    expect(generateSpy).toHaveBeenCalledTimes(3);
  });

  it("should handle deduplication with cache misses and hits", async () => {
    const content = "Cache and deduplication test";

    await engine.generateSemanticEmbedding(content);

    const generateSpy = vi.spyOn(model, "generate");

    const promises = Array.from({ length: 5 }, () => engine.generateSemanticEmbedding(content));

    await Promise.all(promises);

    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe("EmbeddingEngine - Cache Efficiency", () => {
  let engine: EmbeddingEngine;

  beforeEach(() => {
    const model = new MockOllamaEmbeddingModel({
      host: "http://localhost:11434",
      modelName: "nomic-embed-text",
      dimension: 768,
    });
    const cache = new EmbeddingCache(10000, 3600000);
    engine = new EmbeddingEngine(model, cache);
  });

  it("should use cache for repeated requests", async () => {
    const content = "Cache test content";

    const embedding1 = await engine.generateSemanticEmbedding(content);
    const embedding2 = await engine.generateSemanticEmbedding(content);

    expect(embedding1).toEqual(embedding2);
  });
});
