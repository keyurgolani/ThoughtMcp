/**
 * Global test setup and teardown
 */

import {
  cleanupTestEnvironment,
  setupTestEnvironment,
} from "./utils/testCleanup.js";

export async function setup(): Promise<void> {
  console.log("🧹 Setting up test environment...");
  setupTestEnvironment();

  // Ensure tmp directory exists
  const { promises: fs } = await import("fs");
  try {
    await fs.mkdir("./tmp", { recursive: true });
  } catch {
    // Directory might already exist
  }
}

export async function teardown(): Promise<void> {
  console.log("🧹 Cleaning up test environment...");
  await cleanupTestEnvironment();
  console.log("✅ Test cleanup completed");
}
