#!/usr/bin/env node

// Test MCP call directly to the server
import { spawn } from "child_process";
import { setTimeout } from "timers/promises";

async function testMCPCall() {
  console.log("Starting MCP server...");

  // Start the server
  const server = spawn("node", ["dist/index.js"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      LOG_LEVEL: "DEBUG",
      COGNITIVE_TIMEOUT_MS: "30000",
    },
  });

  let serverOutput = "";
  let serverError = "";

  server.stdout.on("data", (data) => {
    serverOutput += data.toString();
    console.log("SERVER OUT:", data.toString().trim());
  });

  server.stderr.on("data", (data) => {
    serverError += data.toString();
    console.log("SERVER ERR:", data.toString().trim());
  });

  // Wait a bit for server to start
  await setTimeout(1000);

  console.log("Sending MCP request...");

  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "analyze_reasoning",
      arguments: {
        reasoning_steps: [
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
        ],
      },
    },
  };

  const startTime = Date.now();

  server.stdin.write(JSON.stringify(request) + "\n");

  // Wait for response or timeout
  let responseReceived = false;
  let response = "";

  const responsePromise = new Promise((resolve) => {
    server.stdout.on("data", (data) => {
      const text = data.toString();
      if (text.includes('"id":1') && text.includes('"result"')) {
        responseReceived = true;
        response = text;
        resolve(text);
      }
    });
  });

  try {
    await Promise.race([
      responsePromise,
      setTimeout(5000), // 5 second timeout
    ]);

    const endTime = Date.now();
    console.log(`\nResponse received in ${endTime - startTime}ms`);

    if (responseReceived) {
      console.log("Response:", response.trim());
    } else {
      console.log("No response received within timeout");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    server.kill();
  }
}

testMCPCall().catch(console.error);
