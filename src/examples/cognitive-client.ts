#!/usr/bin/env node

/**
 * Example client demonstrating all cognitive tools in the ThoughtMCP server
 * This client shows how to interact with the cognitive architecture through MCP
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

// Response schemas for MCP tool calls - MCP format with content array
const MCPResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    })
  ),
});

interface MemoryItem {
  content: string;
  similarity?: number | undefined;
  type?: string | undefined;
  timestamp?: number | undefined;
}

interface CognitiveClient {
  client: Client;
  transport: StdioClientTransport;
}

class ThoughtMCPClient {
  private cognitiveClient: CognitiveClient | null = null;

  get client(): CognitiveClient {
    if (!this.cognitiveClient) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.cognitiveClient;
  }

  async connect(): Promise<void> {
    console.log("🧠 Connecting to ThoughtMCP server...");

    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
    });

    const client = new Client(
      {
        name: "cognitive-client-example",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    this.cognitiveClient = { client, transport };
    console.log("✅ Connected to ThoughtMCP server");
  }

  async disconnect(): Promise<void> {
    if (this.cognitiveClient) {
      await this.cognitiveClient.client.close();
      console.log("👋 Disconnected from ThoughtMCP server");
    }
  }

  async demonstrateThinking(): Promise<void> {
    if (!this.cognitiveClient) throw new Error("Not connected");

    console.log("\n🤔 Demonstrating cognitive thinking...");

    const examples = [
      {
        input: "What are the ethical implications of artificial intelligence?",
        mode: "deliberative",
        description:
          "Complex ethical reasoning requiring deliberative processing",
      },
      {
        input: "The sky is blue today",
        mode: "intuitive",
        description: "Simple observation using intuitive processing",
      },
      {
        input: "How can we solve climate change?",
        mode: "creative",
        description: "Creative problem-solving for complex global issue",
      },
    ];

    for (const example of examples) {
      console.log(`\n📝 ${example.description}`);
      console.log(`Input: "${example.input}"`);
      console.log(`Mode: ${example.mode}`);

      try {
        const result = await this.cognitiveClient.client.request(
          {
            method: "tools/call",
            params: {
              name: "think",
              arguments: {
                input: example.input,
                mode: example.mode,
                enable_emotion: true,
                enable_metacognition: true,
                max_depth: 10,
                temperature: 0.7,
              },
            },
          },
          MCPResponseSchema
        );

        // Parse the JSON response from MCP format
        const responseData = JSON.parse(result.content[0].text);

        const data = responseData.data || responseData;

        console.log("🧠 Thought Result:");
        console.log(
          `  Content: ${data.content || data.response || "No content"}`
        );
        console.log(`  Confidence: ${data.confidence || "N/A"}`);
        console.log(`  Reasoning Steps: ${data.reasoning_path?.length || 0}`);

        if (data.emotional_context) {
          console.log(
            `  Emotional Context: ${JSON.stringify(
              data.emotional_context,
              null,
              2
            )}`
          );
        }
      } catch (error) {
        console.error(`❌ Error in thinking: ${error}`);
      }
    }
  }

  async demonstrateMemory(): Promise<void> {
    if (!this.cognitiveClient) throw new Error("Not connected");

    console.log("\n🧠 Demonstrating memory systems...");

    // Store episodic memories
    const episodicMemories = [
      {
        content: "I learned about quantum computing in my physics class today",
        importance: 0.8,
        emotional_tags: ["curiosity", "excitement"],
      },
      {
        content: "Had a great conversation about AI ethics with a colleague",
        importance: 0.7,
        emotional_tags: ["engagement", "thoughtfulness"],
      },
    ];

    console.log("\n💾 Storing episodic memories...");
    for (const memory of episodicMemories) {
      try {
        await this.cognitiveClient.client.request(
          {
            method: "tools/call",
            params: {
              name: "remember",
              arguments: {
                content: memory.content,
                type: "episodic",
                importance: memory.importance,
                emotional_tags: memory.emotional_tags,
              },
            },
          },
          MCPResponseSchema
        );
        console.log(`✅ Stored: "${memory.content}"`);
      } catch (error) {
        console.error(`❌ Error storing memory: ${error}`);
      }
    }

    // Store semantic knowledge
    const semanticKnowledge = [
      {
        content:
          "Quantum computers use quantum bits (qubits) that can exist in superposition",
        importance: 0.9,
      },
      {
        content:
          "AI ethics involves considerations of fairness, transparency, and accountability",
        importance: 0.8,
      },
    ];

    console.log("\n📚 Storing semantic knowledge...");
    for (const knowledge of semanticKnowledge) {
      try {
        await this.cognitiveClient.client.request(
          {
            method: "tools/call",
            params: {
              name: "remember",
              arguments: {
                content: knowledge.content,
                type: "semantic",
                importance: knowledge.importance,
              },
            },
          },
          MCPResponseSchema
        );
        console.log(`✅ Stored: "${knowledge.content}"`);
      } catch (error) {
        console.error(`❌ Error storing knowledge: ${error}`);
      }
    }

    // Demonstrate memory recall
    const recallQueries = ["quantum computing", "AI ethics", "physics class"];

    console.log("\n🔍 Demonstrating memory recall...");
    for (const query of recallQueries) {
      try {
        const result = await this.cognitiveClient.client.request(
          {
            method: "tools/call",
            params: {
              name: "recall",
              arguments: {
                cue: query,
                type: "both",
                max_results: 5,
                threshold: 0.3,
              },
            },
          },
          MCPResponseSchema
        );

        // Parse the JSON response from MCP format
        const responseData = JSON.parse(result.content[0].text);
        const data = responseData.data || responseData;

        console.log(`\n🎯 Recall for "${query}":`);
        if (data.memories && data.memories.length > 0) {
          data.memories.forEach((memory: MemoryItem, index: number) => {
            console.log(
              `  ${index + 1}. ${
                memory.content
              } (similarity: ${memory.similarity?.toFixed(3)})`
            );
          });
        } else {
          console.log("  No memories found");
        }
      } catch (error) {
        console.error(`❌ Error in recall: ${error}`);
      }
    }
  }

  async demonstrateReasoningAnalysis(): Promise<void> {
    if (!this.cognitiveClient) throw new Error("Not connected");

    console.log("\n🔬 Demonstrating reasoning analysis...");

    const reasoningSteps = [
      {
        type: "premise",
        content: "All humans are mortal",
        confidence: 0.95,
      },
      {
        type: "premise",
        content: "Socrates is human",
        confidence: 0.9,
      },
      {
        type: "inference",
        content: "Therefore, Socrates is mortal",
        confidence: 0.85,
      },
    ];

    try {
      const result = await this.cognitiveClient.client.request(
        {
          method: "tools/call",
          params: {
            name: "analyze_reasoning",
            arguments: {
              reasoning_steps: reasoningSteps,
            },
          },
        },
        MCPResponseSchema
      );

      // Parse the JSON response from MCP format
      const responseData = JSON.parse(result.content[0].text);
      const data = responseData.data || responseData;

      console.log("📊 Reasoning Analysis Results:");
      console.log(`  Overall Quality: ${data.overall_quality || "N/A"}`);
      console.log(`  Coherence Score: ${data.coherence_score || "N/A"}`);
      console.log(`  Detected Biases: ${data.biases?.length || 0}`);

      if (data.suggestions && data.suggestions.length > 0) {
        console.log("  Suggestions:");
        data.suggestions.forEach((suggestion: string, index: number) => {
          console.log(`    ${index + 1}. ${suggestion}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error in reasoning analysis: ${error}`);
    }
  }

  async runFullDemo(): Promise<void> {
    try {
      await this.connect();

      console.log("\n🚀 Starting comprehensive ThoughtMCP demonstration...");
      console.log("=".repeat(60));

      await this.demonstrateThinking();
      await this.demonstrateMemory();
      await this.demonstrateReasoningAnalysis();

      console.log("\n" + "=".repeat(60));
      console.log("🎉 Demo completed successfully!");
    } catch (error) {
      console.error(`❌ Demo failed: ${error}`);
    } finally {
      await this.disconnect();
    }
  }
}

// Performance benchmarking functionality
class PerformanceBenchmark {
  private client: ThoughtMCPClient;

  constructor() {
    this.client = new ThoughtMCPClient();
  }

  async benchmarkThinking(): Promise<void> {
    console.log("\n⚡ Running thinking performance benchmark...");

    const testCases = [
      { input: "Simple question", mode: "intuitive", expected_time: 100 },
      {
        input: "Complex philosophical question about consciousness",
        mode: "deliberative",
        expected_time: 500,
      },
      {
        input: "Creative writing prompt",
        mode: "creative",
        expected_time: 300,
      },
    ];

    await this.client.connect();

    for (const testCase of testCases) {
      const startTime = Date.now();

      try {
        await this.client.client.client.request(
          {
            method: "tools/call",
            params: {
              name: "think",
              arguments: {
                input: testCase.input,
                mode: testCase.mode,
              },
            },
          },
          MCPResponseSchema
        );

        const duration = Date.now() - startTime;
        const performance =
          duration <= testCase.expected_time ? "✅ GOOD" : "⚠️ SLOW";

        console.log(
          `  ${testCase.mode}: ${duration}ms ${performance} (expected: <${testCase.expected_time}ms)`
        );
      } catch (error) {
        console.error(`  ${testCase.mode}: ❌ FAILED - ${error}`);
      }
    }

    await this.client.disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--benchmark")) {
    const benchmark = new PerformanceBenchmark();
    await benchmark.benchmarkThinking();
  } else {
    const client = new ThoughtMCPClient();
    await client.runFullDemo();
  }
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PerformanceBenchmark, ThoughtMCPClient };
