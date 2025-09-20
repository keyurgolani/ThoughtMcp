#!/usr/bin/env node

/**
 * Validation script for MCP configuration
 * Helps users verify their setup is working correctly
 */

import { CognitiveMCPServer } from "../dist/server/CognitiveMCPServer.js";

async function validateMCPConfig() {
  console.log("🧠 ThoughtMCP Configuration Validator");
  console.log("=====================================\n");

  try {
    // Test server initialization
    console.log("1. Testing server initialization...");
    const server = new CognitiveMCPServer();
    await server.initialize(true); // Test mode
    console.log("   ✅ Server initialized successfully\n");

    // Test environment variable reading
    console.log("2. Checking environment configuration...");
    const envVars = {
      COGNITIVE_DEFAULT_MODE:
        process.env.COGNITIVE_DEFAULT_MODE || "balanced (default)",
      COGNITIVE_ENABLE_EMOTION:
        process.env.COGNITIVE_ENABLE_EMOTION || "true (default)",
      COGNITIVE_ENABLE_METACOGNITION:
        process.env.COGNITIVE_ENABLE_METACOGNITION || "true (default)",
      COGNITIVE_WORKING_MEMORY_CAPACITY:
        process.env.COGNITIVE_WORKING_MEMORY_CAPACITY || "7 (default)",
      COGNITIVE_EPISODIC_MEMORY_SIZE:
        process.env.COGNITIVE_EPISODIC_MEMORY_SIZE || "1000 (default)",
      COGNITIVE_SEMANTIC_MEMORY_SIZE:
        process.env.COGNITIVE_SEMANTIC_MEMORY_SIZE || "5000 (default)",
      COGNITIVE_TEMPERATURE:
        process.env.COGNITIVE_TEMPERATURE || "0.7 (default)",
      COGNITIVE_TIMEOUT_MS:
        process.env.COGNITIVE_TIMEOUT_MS || "30000 (default)",
      COGNITIVE_BRAIN_DIR:
        process.env.COGNITIVE_BRAIN_DIR || "~/.brain (default)",
      LOG_LEVEL: process.env.LOG_LEVEL || "INFO (default)",
    };

    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log("   ✅ Environment configuration loaded\n");

    // Test basic functionality
    console.log("3. Testing basic cognitive functionality...");

    // Test a simple think operation
    const thinkResult = await server.handleThink({
      input: "Test cognitive processing",
      mode: "balanced",
    });

    if (thinkResult && thinkResult.content) {
      console.log("   ✅ Think operation successful");
    } else {
      console.log("   ⚠️  Think operation returned unexpected result");
    }

    // Test memory operations
    const rememberResult = await server.handleRemember({
      content: "Test memory storage",
      type: "semantic",
      importance: 0.5,
    });

    if (rememberResult && rememberResult.success) {
      console.log("   ✅ Memory storage successful");
    } else {
      console.log("   ⚠️  Memory storage returned unexpected result");
    }

    const recallResult = await server.handleRecall({
      cue: "test",
      type: "both",
      max_results: 5,
    });

    if (recallResult && Array.isArray(recallResult.memories)) {
      console.log("   ✅ Memory recall successful");
    } else {
      console.log("   ⚠️  Memory recall returned unexpected result");
    }

    console.log("\n🎉 Configuration validation completed successfully!");
    console.log("\nYour ThoughtMCP server is ready to use with:");
    console.log("   npx thoughtmcp@latest");
    console.log("\nOr in your MCP configuration:");
    console.log('   "command": "npx", "args": ["thoughtmcp@latest"]');
  } catch (error) {
    console.error("\n❌ Configuration validation failed:");
    console.error(`   Error: ${error.message}`);
    console.error("\nPlease check your configuration and try again.");
    console.error("For help, visit: https://github.com/keyurgolani/ThoughtMcp");
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMCPConfig();
}
