#!/usr/bin/env npx tsx
/**
 * Capture Ollama Embeddings Script
 *
 * Captures real embeddings from Ollama server for common test strings
 * and saves them to a JSON cache file for use in mock embeddings.
 *
 * Usage:
 *   npm run test:capture-embeddings
 *   npx tsx scripts/capture-ollama-embeddings.ts
 *
 * Requirements:
 *   - Ollama server running (ollama serve)
 *   - nomic-embed-text model pulled (ollama pull nomic-embed-text)
 *
 * Environment variables:
 *   - OLLAMA_HOST: Ollama server URL (default: http://localhost:11434)
 *   - EMBEDDING_MODEL: Model to use (default: nomic-embed-text)
 *   - EMBEDDING_DIMENSION: Expected dimension (default: 768)
 */

import * as fs from "fs";
import * as path from "path";

// Import common test strings
import {
  COMMON_TEST_STRINGS,
  type CachedEmbedding,
  type EmbeddingCache,
} from "../src/__tests__/utils/ollama-embeddings-cache";

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION ?? "768", 10);
const OUTPUT_FILE = path.join(__dirname, "../src/__tests__/utils/ollama-embeddings-cache.json");

interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Check if Ollama server is available
 */
async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the required model is available
 */
async function checkModelAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];

    return models.some((m) => m === EMBEDDING_MODEL || m.startsWith(`${EMBEDDING_MODEL}:`));
  } catch {
    return false;
  }
}

/**
 * Generate embedding for a single text using Ollama
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaEmbeddingResponse;

  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error("Invalid response from Ollama API");
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(data.embedding.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return data.embedding;
  }

  return data.embedding.map((val) => val / magnitude);
}

/**
 * Main capture function
 */
async function captureEmbeddings(): Promise<void> {
  console.log("🦙 Ollama Embedding Capture Script");
  console.log("==================================\n");

  // Check Ollama availability
  console.log(`Checking Ollama server at ${OLLAMA_HOST}...`);
  const ollamaAvailable = await checkOllamaAvailability();

  if (!ollamaAvailable) {
    console.error("❌ Ollama server is not available.");
    console.error("   Please start Ollama with: ollama serve");
    process.exit(1);
  }
  console.log("✅ Ollama server is running\n");

  // Check model availability
  console.log(`Checking for model: ${EMBEDDING_MODEL}...`);
  const modelAvailable = await checkModelAvailability();

  if (!modelAvailable) {
    console.error(`❌ Model '${EMBEDDING_MODEL}' is not available.`);
    console.error(`   Please pull it with: ollama pull ${EMBEDDING_MODEL}`);
    process.exit(1);
  }
  console.log(`✅ Model '${EMBEDDING_MODEL}' is available\n`);

  // Capture embeddings
  console.log(`Capturing embeddings for ${COMMON_TEST_STRINGS.length} test strings...`);
  console.log(`Expected dimension: ${EMBEDDING_DIMENSION}\n`);

  const cache: EmbeddingCache = {
    metadata: {
      version: "1.0.0",
      model: EMBEDDING_MODEL,
      dimension: EMBEDDING_DIMENSION,
      capturedAt: new Date().toISOString(),
      entryCount: 0,
    },
    embeddings: {},
  };

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < COMMON_TEST_STRINGS.length; i++) {
    const text = COMMON_TEST_STRINGS[i];
    const progress = `[${i + 1}/${COMMON_TEST_STRINGS.length}]`;

    try {
      const embedding = await generateEmbedding(text);

      // Validate dimension
      if (embedding.length !== EMBEDDING_DIMENSION) {
        console.warn(
          `⚠️  ${progress} Dimension mismatch for "${text.substring(0, 30)}...": ` +
            `expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
        );
      }

      const entry: CachedEmbedding = {
        text,
        embedding,
        model: EMBEDDING_MODEL,
        dimension: embedding.length,
        capturedAt: new Date().toISOString(),
      };

      cache.embeddings[text] = entry;
      successCount++;

      // Show progress
      const truncatedText = text.length > 40 ? text.substring(0, 40) + "..." : text;
      console.log(`✅ ${progress} "${truncatedText}"`);
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${progress} Failed: ${errorMessage}`);
    }

    // Small delay to avoid overwhelming Ollama
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Update metadata
  cache.metadata.entryCount = successCount;

  // Write cache file
  console.log(`\nWriting cache to ${OUTPUT_FILE}...`);

  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cache, null, 2), "utf-8");
    console.log("✅ Cache file written successfully\n");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to write cache file: ${errorMessage}`);
    process.exit(1);
  }

  // Summary
  console.log("Summary");
  console.log("-------");
  console.log(`Total strings: ${COMMON_TEST_STRINGS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Dimension: ${EMBEDDING_DIMENSION}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  if (errorCount > 0) {
    console.log("\n⚠️  Some embeddings failed to capture.");
    process.exit(1);
  }

  console.log("\n✅ All embeddings captured successfully!");
}

// Run the script
captureEmbeddings().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
