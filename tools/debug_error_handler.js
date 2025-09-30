#!/usr/bin/env node

// Test the ErrorHandler with the same pattern used in the server
import { MetacognitionModule } from "./dist/cognitive/MetacognitionModule.js";
import { ErrorHandler } from "./dist/utils/ErrorHandler.js";

async function testErrorHandler() {
  console.log("Testing ErrorHandler with MetacognitionModule...");

  const metacognitionModule = new MetacognitionModule();

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
    console.log("Testing direct call...");
    const startTime1 = Date.now();
    const directResult = metacognitionModule.assessReasoning(testSteps);
    const endTime1 = Date.now();
    console.log(`Direct call completed in ${endTime1 - startTime1}ms`);
    console.log("Direct result success:", !!directResult);

    console.log("\nTesting with ErrorHandler...");
    const startTime2 = Date.now();

    const operationResult = await ErrorHandler.withErrorHandling(
      async () => metacognitionModule.assessReasoning(testSteps),
      "MetacognitionModule",
      { enableFallbacks: true, maxRetries: 2 }
    );

    const endTime2 = Date.now();
    console.log(`ErrorHandler call completed in ${endTime2 - startTime2}ms`);
    console.log("ErrorHandler result:", {
      success: operationResult.success,
      hasData: !!operationResult.data,
      hasError: !!operationResult.error,
      errorMessage: operationResult.error?.message,
    });
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testErrorHandler().catch(console.error);
