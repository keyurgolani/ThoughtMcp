/**
 * Custom Assertions for Thought Tests
 *
 * Provides domain-specific assertions for better test readability:
 * - Memory validation
 * - Embedding validation
 * - Performance validation
 * - Confidence validation
 */

import { expect } from "vitest";
import type { MemorySector, TestMemory } from "./test-fixtures";

/**
 * Assert that a value is a valid memory object
 */
export function assertValidMemory(memory: unknown): asserts memory is TestMemory {
  expect(memory).toBeDefined();
  expect(memory).toBeTypeOf("object");

  const mem = memory as TestMemory;

  expect(mem.id).toBeDefined();
  expect(mem.id).toBeTypeOf("string");
  expect(mem.content).toBeDefined();
  expect(mem.content).toBeTypeOf("string");
  expect(mem.createdAt).toBeInstanceOf(Date);
  expect(mem.lastAccessed).toBeInstanceOf(Date);
  expect(mem.accessCount).toBeTypeOf("number");
  expect(mem.accessCount).toBeGreaterThanOrEqual(0);
  expect(mem.salience).toBeTypeOf("number");
  expect(mem.salience).toBeGreaterThanOrEqual(0);
  expect(mem.salience).toBeLessThanOrEqual(1);
  expect(mem.strength).toBeTypeOf("number");
  expect(mem.strength).toBeGreaterThanOrEqual(0);
  expect(mem.strength).toBeLessThanOrEqual(1);
  expect(mem.userId).toBeDefined();
  expect(mem.primarySector).toBeDefined();
  expect(["episodic", "semantic", "procedural", "emotional", "reflective"]).toContain(
    mem.primarySector
  );
}

/**
 * Assert that a value is a valid embedding vector
 */
export function assertValidEmbedding(
  embedding: unknown,
  expectedDimension: number = 1536
): asserts embedding is number[] {
  expect(embedding).toBeDefined();
  expect(Array.isArray(embedding)).toBe(true);

  const emb = embedding as number[];

  expect(emb.length).toBe(expectedDimension);

  for (const value of emb) {
    expect(value).toBeTypeOf("number");
    expect(Number.isFinite(value)).toBe(true);
  }
}

/**
 * Assert that embeddings are normalized (unit length)
 */
export function assertNormalizedEmbedding(embedding: number[]): void {
  let magnitude = 0;

  for (const value of embedding) {
    magnitude += value * value;
  }

  magnitude = Math.sqrt(magnitude);

  // Allow small floating point error
  expect(magnitude).toBeCloseTo(1.0, 5);
}

/**
 * Assert that two embeddings have expected similarity
 */
export function assertEmbeddingSimilarity(
  embedding1: number[],
  embedding2: number[],
  expectedSimilarity: number,
  tolerance: number = 0.1
): void {
  expect(embedding1.length).toBe(embedding2.length);

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    mag1 += embedding1[i] * embedding1[i];
    mag2 += embedding2[i] * embedding2[i];
  }

  const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));

  expect(similarity).toBeGreaterThanOrEqual(expectedSimilarity - tolerance);
  expect(similarity).toBeLessThanOrEqual(expectedSimilarity + tolerance);
}

/**
 * Assert that execution time meets target
 */
export function assertLatencyTarget(
  actualMs: number,
  targetMs: number,
  operation: string = "Operation"
): void {
  if (actualMs > targetMs) {
    throw new Error(`${operation} latency ${actualMs}ms exceeds target ${targetMs}ms`);
  }

  expect(actualMs).toBeLessThanOrEqual(targetMs);
}

/**
 * Assert that percentile latencies meet targets
 */
export function assertPercentileTargets(
  latencies: number[],
  targets: { p50?: number; p95?: number; p99?: number }
): void {
  const sorted = [...latencies].sort((a, b) => a - b);

  if (targets.p50) {
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    assertLatencyTarget(p50, targets.p50, "p50");
  }

  if (targets.p95) {
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    assertLatencyTarget(p95, targets.p95, "p95");
  }

  if (targets.p99) {
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    assertLatencyTarget(p99, targets.p99, "p99");
  }
}

/**
 * Assert that confidence is calibrated
 */
export function assertCalibratedConfidence(
  predicted: number,
  actual: number,
  tolerance: number = 0.1
): void {
  expect(predicted).toBeTypeOf("number");
  expect(predicted).toBeGreaterThanOrEqual(0);
  expect(predicted).toBeLessThanOrEqual(1);

  expect(actual).toBeTypeOf("number");
  expect(actual).toBeGreaterThanOrEqual(0);
  expect(actual).toBeLessThanOrEqual(1);

  const error = Math.abs(predicted - actual);

  if (error > tolerance) {
    throw new Error(
      `Confidence calibration error ${error.toFixed(3)} exceeds tolerance ${tolerance}`
    );
  }

  expect(error).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that accuracy meets target
 */
export function assertAccuracyTarget(
  correct: number,
  total: number,
  targetAccuracy: number,
  metric: string = "Accuracy"
): void {
  expect(total).toBeGreaterThan(0);

  const accuracy = correct / total;

  if (accuracy < targetAccuracy) {
    throw new Error(
      `${metric} ${(accuracy * 100).toFixed(1)}% below target ${(targetAccuracy * 100).toFixed(1)}%`
    );
  }

  expect(accuracy).toBeGreaterThanOrEqual(targetAccuracy);
}

/**
 * Assert that value is within range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  label: string = "Value"
): void {
  if (value < min || value > max) {
    throw new Error(`${label} ${value} outside range [${min}, ${max}]`);
  }

  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Assert that overhead is within acceptable limit
 */
export function assertOverheadLimit(
  baselineMs: number,
  actualMs: number,
  maxOverheadPercent: number,
  operation: string = "Operation"
): void {
  const overhead = ((actualMs - baselineMs) / baselineMs) * 100;

  if (overhead > maxOverheadPercent) {
    throw new Error(
      `${operation} overhead ${overhead.toFixed(1)}% exceeds limit ${maxOverheadPercent}%`
    );
  }

  expect(overhead).toBeLessThanOrEqual(maxOverheadPercent);
}

/**
 * Assert that array contains unique values
 */
export function assertUniqueValues<T>(array: T[], label: string = "Array"): void {
  const uniqueSet = new Set(array);

  if (uniqueSet.size !== array.length) {
    throw new Error(
      `${label} contains duplicate values (${array.length} items, ${uniqueSet.size} unique)`
    );
  }

  expect(uniqueSet.size).toBe(array.length);
}

/**
 * Assert that value is a valid sector
 */
export function assertValidSector(sector: unknown): asserts sector is MemorySector {
  expect(sector).toBeDefined();
  expect(["episodic", "semantic", "procedural", "emotional", "reflective"]).toContain(sector);
}

/**
 * Assert that emotion state is valid
 */
export function assertValidEmotionState(emotion: unknown): void {
  expect(emotion).toBeDefined();
  expect(emotion).toBeTypeOf("object");

  const em = emotion as {
    valence: number;
    arousal: number;
    dominance: number;
    confidence: number;
  };

  assertInRange(em.valence, -1, 1, "Valence");
  assertInRange(em.arousal, 0, 1, "Arousal");
  assertInRange(em.dominance, -1, 1, "Dominance");
  assertInRange(em.confidence, 0, 1, "Confidence");
}

/**
 * Measure execution time of async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const durationMs = endTime - startTime;

  return { result, durationMs };
}

/**
 * Measure multiple executions and return statistics
 */
export async function measureMultipleExecutions<T>(
  fn: () => Promise<T>,
  iterations: number = 100
): Promise<{
  results: T[];
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
}> {
  const results: T[] = [];
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { result, durationMs } = await measureExecutionTime(fn);
    results.push(result);
    latencies.push(durationMs);
  }

  const sorted = [...latencies].sort((a, b) => a - b);

  return {
    results,
    latencies,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    min: Math.min(...latencies),
    max: Math.max(...latencies),
  };
}
