#!/usr/bin/env node

// Simple test script to debug the reasoning analysis issue
import { CognitiveMCPServer } from "./dist/server/CognitiveMCPServer.js";

async function testReasoningAnalysis() {
  console.log("Starting reasoning analysis debug test...");

  const server = new CognitiveMCPServer();

  const testSteps = [
    {
      type: "premise",
      content: "All cats are mammals",
      confidence: 0.95,
      alternatives: [],
    },
    {
      type: "premise",
      content: "Fluffy is a cat",
      confidence: 0.9,
      alternatives: [],
    },
    {
      type: "conclusion",
      content: "Therefore, Fluffy is a mammal",
      confidence: 0.9,
      alternatives: [],
    },
  ];

  try {
    console.log("Calling handleAnalyzeReasoning directly...");
    const startTime = Date.now();

    const result = await server.handleAnalyzeReasoning({
      reasoning_steps: testSteps,
    });

    const endTime = Date.now();
    console.log(`Analysis completed in ${endTime - startTime}ms`);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error during analysis:", error);
  }
}

testReasoningAnalysis().catch(console.error);
