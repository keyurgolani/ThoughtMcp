#!/usr/bin/env node

/**
 * Simple launcher script for the ThoughtMCP cognitive client demo
 * This script imports and runs the compiled TypeScript example
 */

import {
  PerformanceBenchmark,
  ThoughtMCPClient,
} from "../dist/examples/cognitive-client.js";

async function main() {
  const args = process.argv.slice(2);

  console.log("🧠 ThoughtMCP Cognitive Architecture Demo");
  console.log("=========================================");

  if (args.includes("--benchmark") || args.includes("-b")) {
    console.log("Running performance benchmarks...\n");
    const benchmark = new PerformanceBenchmark();
    await benchmark.benchmarkThinking();
  } else {
    console.log("Running comprehensive cognitive demo...\n");
    const client = new ThoughtMCPClient();
    await client.runFullDemo();
  }
}

main().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exit(1);
});
