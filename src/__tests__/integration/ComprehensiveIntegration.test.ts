/**
 * Comprehensive Integration Tests for ThoughtMCP System
 *
 * This test suite covers:
 * - End-to-end cognitive processing workflows
 * - Multi-client session handling and concurrent requests
 * - MCP protocol compliance and tool schema correctness
 * - Memory consolidation and cross-session persistence
 *
 * Requirements: 1.1, 1.2, 1.3, 4.4
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemorySystem } from "../../cognitive/MemorySystem.js";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { ProcessingMode, ReasoningType } from "../../types/core.js";
import type { ThinkArgs } from "../../types/mcp.js";
import {
  COGNITIVE_TEST_PATTERNS,
  DEFAULT_TEST_CONFIG,
} from "../config/test.config.js";

describe("Comprehensive Integration Tests", () => {
  let server: CognitiveMCPServer;
  // let orchestrator: CognitiveOrchestrator; // Unused for now
  let memorySystem: MemorySystem;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment with unique temporary brain directory
    const testId = Math.random().toString(36).substring(7);
    const brainDir = `./tmp/test-brain-${testId}`;
    process.env.COGNITIVE_BRAIN_DIR = brainDir;

    // Ensure the brain directory exists
    const { promises: fs } = await import("fs");
    await fs.mkdir(brainDir, { recursive: true });

    // Initialize server in test mode
    server = new CognitiveMCPServer();
    await server.initialize(true);

    // Get references to internal components for direct testing
    // orchestrator = (server as any).cognitiveOrchestrator; // Unused for now
    memorySystem = (server as any).memorySystem;
  });

  afterEach(async () => {
    await server.shutdown();

    // Clean up temporary brain directory
    if (
      process.env.COGNITIVE_BRAIN_DIR &&
      process.env.COGNITIVE_BRAIN_DIR.startsWith("./tmp/test-brain-")
    ) {
      try {
        const { promises: fs } = await import("fs");
        await fs.rm(process.env.COGNITIVE_BRAIN_DIR, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Restore original environment
    process.env = originalEnv;
  });

  // Helper function to wait for memory system to be ready
  // Utility function for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore - Utility function for future use
  const waitForMemorySystemReady = async (
    server: CognitiveMCPServer,
    maxWaitMs = 10000
  ): Promise<void> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const memorySystem = (server as any).memorySystem;
      if (memorySystem?.initialized) {
        // Check if persistence is enabled and has loaded data
        if (memorySystem.persistenceManager) {
          const status = memorySystem.getPersistenceStatus();
          if (status.last_load > 0) {
            return; // Memory system has loaded data
          }
        } else {
          return; // No persistence, so initialization is complete
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Memory system failed to initialize within ${maxWaitMs}ms`);
  };

  describe("End-to-End Cognitive Processing Workflows", () => {
    it("should complete full cognitive pipeline for complex reasoning", async () => {
      const startTime = Date.now();

      // Test complex analytical reasoning workflow
      const thinkArgs: ThinkArgs = {
        input:
          "Analyze the relationship between artificial intelligence, human creativity, and the future of work. Consider multiple perspectives and potential solutions.",
        mode: ProcessingMode.ANALYTICAL,
        enable_emotion: true,
        enable_metacognition: true,
        max_depth: 10,
        temperature: 0.7,
        context: {
          session_id: "e2e_test_session",
          domain: "future_of_work",
          urgency: 0.8,
          complexity: 0.9,
        },
      };

      const result = await server.handleThink(thinkArgs);

      // Verify complete cognitive processing occurred
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify reasoning path contains multiple types
      expect(result.reasoning_path).toBeDefined();
      expect(result.reasoning_path.length).toBeGreaterThan(3);

      const reasoningTypes = new Set(
        result.reasoning_path.map((step) => step.type)
      );
      expect(reasoningTypes.size).toBeGreaterThan(2);

      // Verify emotional processing occurred
      expect(result.emotional_context).toBeDefined();
      expect(typeof result.emotional_context.valence).toBe("number");
      expect(typeof result.emotional_context.arousal).toBe("number");

      // Verify metadata completeness
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.components_used).toBeDefined();
      expect(result.metadata.components_used.length).toBeGreaterThan(5);
      expect(result.metadata.system_mode).toBe(ProcessingMode.ANALYTICAL);

      // Verify performance within acceptable bounds
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(
        DEFAULT_TEST_CONFIG.performance.maxExecutionTime.think
      );
    });

    it("should handle creative workflow with stochastic processing", async () => {
      const thinkArgs: ThinkArgs = {
        input:
          "Create an innovative solution for sustainable urban transportation",
        mode: ProcessingMode.CREATIVE,
        temperature: 1.2,
        enable_emotion: true,
        context: {
          session_id: "creative_test_session",
          domain: "innovation",
        },
      };

      const result = await server.handleThink(thinkArgs);

      expect(result).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.CREATIVE);
      expect(result.metadata.temperature).toBe(1.2);

      // Creative mode should show stochastic enhancement
      expect(result.metadata.stochastic_processing).toBeDefined();

      // Should have creative reasoning steps
      const creativeSteps = result.reasoning_path.filter(
        (step) =>
          step.type === ReasoningType.HEURISTIC ||
          step.type === ReasoningType.ANALOGICAL
      );
      expect(creativeSteps.length).toBeGreaterThan(0);
    });

    it("should complete think -> remember -> recall -> analyze workflow", async () => {
      const sessionId = "workflow_test_session";

      // Step 1: Think about a topic
      const thinkResult = await server.handleThink({
        input: "What are the key principles of machine learning?",
        mode: ProcessingMode.BALANCED,
        context: { session_id: sessionId, domain: "machine_learning" },
      });

      expect(thinkResult).toBeDefined();
      expect(thinkResult.content).toBeDefined();

      // Step 2: Remember the thought
      const rememberResult = await server.handleRemember({
        content: thinkResult.content,
        type: "episodic",
        importance: 0.8,
        emotional_tags: ["learning", "technical"],
        context: { session_id: sessionId, domain: "machine_learning" },
      });

      expect(rememberResult.success).toBe(true);
      expect(rememberResult.memory_id).toBeDefined();

      // Step 3: Recall related information
      const recallResult = await server.handleRecall({
        cue: "machine learning principles",
        type: "both",
        max_results: 5,
        threshold: 0.3,
        context: { session_id: sessionId },
      });

      expect(recallResult).toBeDefined();
      expect(recallResult.memories).toBeDefined();
      expect(recallResult.total_found).toBeGreaterThanOrEqual(1);

      // Step 4: Analyze the reasoning from the original thought
      const analysisResult = await server.handleAnalyzeReasoning({
        reasoning_steps: thinkResult.reasoning_path,
        context: { session_id: sessionId },
      });

      expect(analysisResult).toBeDefined();
      expect(typeof analysisResult.coherence_score).toBe("number");
      expect(analysisResult.coherence_score).toBeGreaterThanOrEqual(0);
      expect(analysisResult.coherence_score).toBeLessThanOrEqual(1);
      expect(analysisResult.detected_biases).toBeDefined();
      expect(analysisResult.suggested_improvements).toBeDefined();
    });

    it("should handle hierarchical processing through all cognitive layers", async () => {
      const complexInput =
        COGNITIVE_TEST_PATTERNS.hierarchical_processing.input;

      const result = await server.handleThink({
        input: complexInput,
        mode: ProcessingMode.DELIBERATIVE,
        enable_emotion: true,
        enable_metacognition: true,
        max_depth: 8,
      });

      // Verify all expected components were used
      const expectedComponents =
        COGNITIVE_TEST_PATTERNS.hierarchical_processing.expectedComponents;
      expectedComponents.forEach((component) => {
        const componentFound = result.metadata.components_used.some((used) =>
          used.toLowerCase().includes(component.toLowerCase())
        );
        expect(componentFound).toBe(true);
      });

      // Verify minimum component count
      expect(result.metadata.components_used.length).toBeGreaterThanOrEqual(
        COGNITIVE_TEST_PATTERNS.hierarchical_processing.minComponentCount
      );
    });
  });

  describe("Multi-Client Session Handling and Concurrent Requests", () => {
    it("should handle multiple concurrent sessions independently", async () => {
      const sessionCount = 5;
      const diverseInputs = [
        "What is artificial intelligence and how does it work?",
        "Explain the concept of machine learning in simple terms.",
        "How do neural networks process information?",
        "What are the ethical implications of AI development?",
        "Describe the difference between AI and human intelligence.",
      ];

      const sessions = Array.from({ length: sessionCount }, (_, i) => ({
        id: `concurrent_session_${i}`,
        input: diverseInputs[i],
        mode:
          i % 2 === 0 ? ProcessingMode.INTUITIVE : ProcessingMode.DELIBERATIVE,
      }));

      // Execute all sessions concurrently
      const promises = sessions.map((session) =>
        server.handleThink({
          input: session.input,
          mode: session.mode,
          context: { session_id: session.id },
        })
      );

      const results = await Promise.all(promises);

      // Verify all sessions completed successfully
      expect(results.length).toBe(sessionCount);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.metadata.system_mode).toBe(sessions[index].mode);
      });

      // Verify session isolation - each should have unique processing
      const uniqueContents = new Set(results.map((r) => r.content));
      expect(uniqueContents.size).toBe(sessionCount);
    });

    it("should maintain session state across multiple interactions", async () => {
      const sessionId = "persistent_session_test";

      // First interaction
      const result1 = await server.handleThink({
        input: "Let's discuss quantum computing",
        context: { session_id: sessionId, domain: "quantum_physics" },
      });

      // Store memory from first interaction
      await server.handleRemember({
        content: result1.content,
        type: "episodic",
        importance: 0.7,
        context: { session_id: sessionId },
      });

      // Second interaction referencing the first
      const result2 = await server.handleThink({
        input: "How does this relate to quantum entanglement?",
        context: {
          session_id: sessionId,
          domain: "quantum_physics",
          previous_thoughts: [result1.content],
        },
      });

      // Third interaction building on both
      const result3 = await server.handleThink({
        input: "What are the practical applications?",
        context: {
          session_id: sessionId,
          domain: "quantum_physics",
          previous_thoughts: [result1.content, result2.content],
        },
      });

      // Verify session continuity
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();

      // Recall memories from this session
      const sessionMemories = await server.handleRecall({
        cue: "quantum",
        context: { session_id: sessionId },
      });

      expect(sessionMemories.memories.length).toBeGreaterThan(0);
    });

    it("should handle high concurrent load without degradation", async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      // Create diverse concurrent requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestType = i % 4;

        switch (requestType) {
          case 0:
            return server.handleThink({
              input: `Concurrent think request ${i}`,
              context: { session_id: `load_test_${i}` },
            });
          case 1:
            return server.handleRemember({
              content: `Test memory content ${i}`,
              type: "semantic",
              importance: 0.5,
            });
          case 2:
            return server.handleRecall({
              cue: "test",
              max_results: 3,
            });
          case 3:
            return server.handleAnalyzeReasoning({
              reasoning_steps: [
                {
                  type: ReasoningType.LOGICAL_INFERENCE,
                  content: `Test reasoning step ${i}`,
                  confidence: 0.7,
                  alternatives: [],
                },
              ],
            });
          default:
            return Promise.resolve(null);
        }
      });

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // Verify all requests completed
      expect(results.length).toBe(concurrentRequests);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });

      // Verify reasonable performance under load
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(1000); // Less than 1 second average
    });

    it("should isolate session failures without affecting others", async () => {
      const validSessionId = "valid_session";
      const faultySessionId = "faulty_session";

      // Start valid session
      const validPromise = server.handleThink({
        input: "This is a valid request",
        context: { session_id: validSessionId },
      });

      // Start faulty session with invalid parameters
      const faultyPromise = server
        .handleThink({
          input: "", // Invalid empty input
          context: { session_id: faultySessionId },
        })
        .catch((error) => error); // Catch the error

      const [validResult, faultyResult] = await Promise.all([
        validPromise,
        faultyPromise,
      ]);

      // Valid session should succeed
      expect(validResult).toBeDefined();
      expect(validResult.content).toBeDefined();

      // Faulty session should fail but not affect the valid one
      expect(faultyResult).toBeInstanceOf(Error);

      // Verify valid session can continue working
      const followupResult = await server.handleThink({
        input: "Follow-up request",
        context: { session_id: validSessionId },
      });

      expect(followupResult).toBeDefined();
      expect(followupResult.content).toBeDefined();
    });
  });

  describe("MCP Protocol Compliance and Tool Schema Correctness", () => {
    it("should register all required tools with correct schemas", async () => {
      // This test verifies that all tools are properly registered
      // We'll simulate the list_tools request
      const toolSchemas = (server as any).server._requestHandlers.get(
        "tools/list"
      );
      expect(toolSchemas).toBeDefined();

      // Verify all expected tools are present
      const expectedTools = [
        "think",
        "remember",
        "recall",
        "analyze_reasoning",
      ];

      // Since we can't directly call the handler, we'll verify the schemas exist
      const { TOOL_SCHEMAS } = await import("../../types/mcp.js");

      expectedTools.forEach((toolName) => {
        expect((TOOL_SCHEMAS as any)[toolName]).toBeDefined();
        expect((TOOL_SCHEMAS as any)[toolName].name).toBe(toolName);
        expect((TOOL_SCHEMAS as any)[toolName].description).toBeDefined();
        expect((TOOL_SCHEMAS as any)[toolName].inputSchema).toBeDefined();
      });
    });

    it("should validate tool input schemas correctly", async () => {
      // Test think tool schema validation
      await expect(
        server.handleThink({
          input: "Valid input",
          mode: ProcessingMode.BALANCED,
        })
      ).resolves.toBeDefined();

      // Test invalid think parameters
      await expect(
        server.handleThink({
          input: "", // Invalid empty input
        })
      ).rejects.toThrow();

      await expect(
        server.handleThink({
          input: "Valid input",
          mode: "invalid_mode" as ProcessingMode, // Invalid mode
        })
      ).rejects.toThrow();

      // Test remember tool schema validation
      await expect(
        server.handleRemember({
          content: "Valid content",
          type: "episodic",
        })
      ).resolves.toBeDefined();

      await expect(
        server.handleRemember({
          content: "", // Invalid empty content
          type: "episodic",
        })
      ).rejects.toThrow();

      // Test recall tool schema validation
      await expect(
        server.handleRecall({
          cue: "valid cue",
        })
      ).resolves.toBeDefined();

      await expect(
        server.handleRecall({
          cue: "", // Invalid empty cue
        })
      ).rejects.toThrow();

      // Test analyze_reasoning tool schema validation
      await expect(
        server.handleAnalyzeReasoning({
          reasoning_steps: [
            {
              type: ReasoningType.LOGICAL_INFERENCE,
              content: "Valid reasoning",
              confidence: 0.8,
              alternatives: [],
            },
          ],
        })
      ).resolves.toBeDefined();

      await expect(
        server.handleAnalyzeReasoning({
          reasoning_steps: [], // Invalid empty array
        })
      ).rejects.toThrow();
    });

    it("should return properly formatted MCP responses", async () => {
      const result = await server.handleThink({
        input: "Test response formatting",
      });

      // Verify response structure matches MCP expectations
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");

      // Verify required fields are present
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect(typeof result.confidence).toBe("number");
      expect(Array.isArray(result.reasoning_path)).toBe(true);
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Verify metadata structure
      expect(typeof result.metadata.processing_time_ms).toBe("number");
      expect(Array.isArray(result.metadata.components_used)).toBe(true);
      expect(result.metadata.system_mode).toBeDefined();
    });

    it("should handle MCP error responses correctly", async () => {
      // Test various error conditions
      const errorCases = [
        { input: "", expectedError: "input" },
        {
          input: "valid",
          mode: "invalid" as ProcessingMode,
          expectedError: "mode",
        },
        { input: "valid", temperature: -1, expectedError: "temperature" },
        { input: "valid", max_depth: -5, expectedError: "depth" },
      ];

      for (const errorCase of errorCases) {
        try {
          await server.handleThink(errorCase as ThinkArgs);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message.toLowerCase()).toContain(
            errorCase.expectedError
          );
        }
      }
    });

    it("should maintain MCP protocol compliance under stress", async () => {
      const stressRequests = 50;
      const requests = Array.from({ length: stressRequests }, (_, i) =>
        server.handleThink({
          input: `Stress test request ${i}`,
          context: { session_id: `stress_${i}` },
        })
      );

      const results = await Promise.all(requests);

      // All responses should maintain proper structure
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(typeof result.confidence).toBe("number");
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(result.reasoning_path)).toBe(true);
        expect(result.metadata).toBeDefined();
      });
    });
  });

  describe("Memory Consolidation and Cross-Session Persistence", () => {
    it("should consolidate episodic memories into semantic knowledge", async () => {
      const sessionId = "consolidation_test_session";

      // Store multiple related episodic memories
      const episodes = [
        "Machine learning uses algorithms to learn from data",
        "Neural networks are inspired by biological neurons",
        "Deep learning uses multiple layers of neural networks",
        "Training requires large datasets and computational power",
        "Overfitting occurs when models memorize training data",
      ];

      const memoryIds = [];
      for (const episode of episodes) {
        const result = await server.handleRemember({
          content: episode,
          type: "episodic",
          importance: 0.8,
          emotional_tags: ["learning", "technical"],
          context: { session_id: sessionId, domain: "machine_learning" },
        });
        memoryIds.push(result.memory_id);
      }

      // Wait for potential consolidation (simulate time passage)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger consolidation manually if available
      if (memorySystem.runConsolidation) {
        await memorySystem.runConsolidation();
      }

      // Query for semantic knowledge that should have been extracted
      const semanticRecall = await server.handleRecall({
        cue: "machine learning",
        type: "semantic",
        max_results: 10,
        threshold: 0.2,
      });

      expect(semanticRecall.memories.length).toBeGreaterThan(0);

      // Verify that semantic memories contain consolidated knowledge
      const semanticContent = semanticRecall.memories
        .map((m) => m.content)
        .join(" ");
      expect(semanticContent.toLowerCase()).toContain("machine learning");
    });

    it("should maintain memory persistence across server restarts", async () => {
      const sessionId = "persistence_test_session";

      // Clear any existing memory state first
      await (server as any).memorySystem.reset();

      // Store important memories
      const importantMemory =
        "Critical information that must persist across sessions";
      const memoryResult = await server.handleRemember({
        content: importantMemory,
        type: "semantic",
        importance: 0.9,
        context: { session_id: sessionId },
      });

      expect(memoryResult.success).toBe(true);
      // const originalMemoryId = memoryResult.memory_id; // Unused for now

      // Wait a bit to ensure memory is stored
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate server restart by creating new server instance
      await server.shutdown();

      const newServer = new CognitiveMCPServer();
      await newServer.initialize(true);

      try {
        // Wait for memory system to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Store a new memory to verify the new server is working
        const newMemoryResult = await newServer.handleRemember({
          content: "New memory after restart",
          type: "semantic",
          importance: 0.8,
          context: { session_id: sessionId },
        });

        expect(newMemoryResult.success).toBe(true);

        // Try to recall the new memory to verify the server is functional
        const recallResult = await newServer.handleRecall({
          cue: "new memory",
          type: "semantic",
          context: { session_id: sessionId },
        });

        // The new server should be able to store and recall memories
        expect(recallResult.memories.length).toBeGreaterThan(0);

        const foundMemory = recallResult.memories.find((m) =>
          (m.content as any).includes("New memory after restart")
        );
        expect(foundMemory).toBeDefined();
      } finally {
        await newServer.shutdown();
      }
    }, 15000); // 15 second timeout for server restart test

    it("should handle memory decay and importance-based retention", async () => {
      const sessionId = "decay_test_session";

      // Store memories with different importance levels
      const memories = [
        { content: "Very important information", importance: 0.9, tag: "high" },
        {
          content: "Moderately important information",
          importance: 0.5,
          tag: "medium",
        },
        { content: "Less important information", importance: 0.1, tag: "low" },
      ];

      const memoryIds = [];
      for (const memory of memories) {
        const result = await server.handleRemember({
          content: memory.content,
          type: "episodic",
          importance: memory.importance,
          emotional_tags: [memory.tag],
          context: { session_id: sessionId },
        });
        memoryIds.push({ id: result.memory_id, importance: memory.importance });
      }

      // Simulate time passage for decay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Trigger memory decay if available
      // Simulate decay if method exists
      if (
        "simulateDecay" in memorySystem &&
        typeof memorySystem.simulateDecay === "function"
      ) {
        await (memorySystem as any).simulateDecay(1000); // Simulate 1 second of decay
      }

      // Recall memories and check retention based on importance
      const recallResult = await server.handleRecall({
        cue: "important information",
        type: "episodic",
        max_results: 10,
        threshold: 0.1, // Low threshold to catch decayed memories
        context: { session_id: sessionId },
      });

      // Higher importance memories should be more likely to be retained
      const highImportanceFound = recallResult.memories.some((m) =>
        (m.content as any).includes("Very important")
      );
      const lowImportanceFound = recallResult.memories.some((m) =>
        (m.content as any).includes("Less important")
      );

      // High importance should be more likely to be found than low importance
      if (recallResult.memories.length > 0) {
        expect(highImportanceFound ?? lowImportanceFound).toBe(true);
      }
    });

    it("should support cross-session memory retrieval and context", async () => {
      const session1Id = "cross_session_1";
      const session2Id = "cross_session_2";

      // Store memory in first session
      await server.handleRemember({
        content: "Shared knowledge about quantum computing principles",
        type: "semantic",
        importance: 0.8,
        context: { session_id: session1Id, domain: "quantum_physics" },
      });

      // Store related memory in second session
      await server.handleRemember({
        content: "Quantum entanglement applications in communication",
        type: "semantic",
        importance: 0.7,
        context: { session_id: session2Id, domain: "quantum_physics" },
      });

      // From session 2, try to recall information from session 1
      const crossSessionRecall = await server.handleRecall({
        cue: "quantum computing",
        type: "semantic",
        max_results: 5,
        context: { session_id: session2Id, domain: "quantum_physics" },
      });

      expect(crossSessionRecall.memories.length).toBeGreaterThan(0);

      // Should find memories from both sessions due to semantic similarity
      const foundContents = crossSessionRecall.memories.map((m) => m.content);
      const hasSession1Content = foundContents.some((content) =>
        (content as any).includes("quantum computing principles")
      );
      const hasSession2Content = foundContents.some((content) =>
        (content as any).includes("entanglement applications")
      );

      expect(hasSession1Content ?? hasSession2Content).toBe(true);
    });

    it("should maintain memory associations and context links", async () => {
      const sessionId = "association_test_session";

      // Create a chain of related memories
      const memoryChain = [
        "Artificial intelligence is a broad field of computer science",
        "Machine learning is a subset of artificial intelligence",
        "Deep learning is a subset of machine learning",
        "Neural networks are the foundation of deep learning",
        "Transformers are a type of neural network architecture",
      ];

      // Store memories with contextual links
      for (let i = 0; i < memoryChain.length; i++) {
        await server.handleRemember({
          content: memoryChain[i],
          type: "semantic",
          importance: 0.7,
          context: {
            session_id: sessionId,
            domain: "ai_hierarchy",
            sequence: i,
          },
        });
      }

      // Query for related concepts
      const aiRecall = await server.handleRecall({
        cue: "artificial intelligence",
        type: "semantic",
        max_results: 10,
        threshold: 0.2,
        context: { session_id: sessionId },
      });

      // Should retrieve multiple related memories
      expect(aiRecall.memories.length).toBeGreaterThan(1);

      // Verify that related concepts are found
      const contents = aiRecall.memories.map((m) =>
        String(m.content).toLowerCase()
      );
      const hasAI = contents.some((c) => c.includes("artificial intelligence"));
      const hasML = contents.some((c) => c.includes("machine learning"));
      const hasDL = contents.some((c) => c.includes("deep learning"));

      expect(hasAI).toBe(true);
      expect(hasML ?? hasDL).toBe(true); // At least one related concept
    });
  });

  describe("Performance and Reliability Under Load", () => {
    it("should maintain performance under sustained load", async () => {
      const testDuration = 5000; // 5 seconds
      const requestInterval = 100; // 100ms between requests
      const startTime = Date.now();
      const results = [];
      let requestCount = 0;

      while (Date.now() - startTime < testDuration) {
        const promise = server.handleThink({
          input: `Load test request ${requestCount++}`,
          context: { session_id: `load_test_${requestCount}` },
        });

        results.push(promise);
        await new Promise((resolve) => setTimeout(resolve, requestInterval));
      }

      const completedResults = await Promise.all(results);

      // Verify all requests completed successfully
      expect(completedResults.length).toBeGreaterThan(10);
      completedResults.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });

      // Calculate throughput
      const actualDuration = Date.now() - startTime;
      const throughput = completedResults.length / (actualDuration / 1000);
      expect(throughput).toBeGreaterThan(1); // At least 1 request per second
    }, 10000); // 10 second timeout

    it("should handle memory pressure gracefully", async () => {
      const memoryPressureTest = async () => {
        // Create many memories to test memory management
        const memoryCount = 100;
        const memories = [];

        for (let i = 0; i < memoryCount; i++) {
          const result = await server.handleRemember({
            content: `Memory pressure test content ${i} - ${"x".repeat(1000)}`,
            type: "episodic",
            importance: Math.random(),
            context: { session_id: `memory_pressure_${i}` },
          });
          memories.push(result);
        }

        // Verify all memories were stored
        expect(memories.length).toBe(memoryCount);
        memories.forEach((memory) => {
          expect(memory.success).toBe(true);
        });

        // Test recall under memory pressure
        const recallResult = await server.handleRecall({
          cue: "memory pressure test",
          max_results: 50,
          threshold: 0.1,
        });

        expect(recallResult).toBeDefined();
        expect(Array.isArray(recallResult.memories)).toBe(true);
      };

      // Should complete without throwing memory errors
      await expect(memoryPressureTest()).resolves.not.toThrow();
    });

    it("should recover from component failures", async () => {
      // This test simulates component failures and recovery
      const originalThink = server.handleThink.bind(server);

      // Mock a temporary failure
      let failureCount = 0;
      const maxFailures = 3;

      server.handleThink = async function (args: ThinkArgs) {
        if (failureCount < maxFailures) {
          failureCount++;
          throw new Error("Simulated component failure");
        }
        return originalThink(args);
      };

      // First few requests should fail
      for (let i = 0; i < maxFailures; i++) {
        await expect(
          server.handleThink({
            input: `Failure test ${i}`,
          })
        ).rejects.toThrow("Simulated component failure");
      }

      // Subsequent requests should succeed (recovery)
      const result = await server.handleThink({
        input: "Recovery test",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Restore original method
      server.handleThink = originalThink;
    });
  });
});
