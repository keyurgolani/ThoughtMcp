import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMClient } from "../../../ai/llm-client.js";
import { AnalyticalStreamProcessor } from "../../../reasoning/streams/analytical-stream.js";
import { Problem, StreamStatus, StreamType } from "../../../reasoning/types.js";

// Mock LLM Client
vi.mock("../../../ai/llm-client.js");

// Mock fetch for LLM availability check
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AnalyticalStreamProcessor Class (AI Integration)", () => {
  let processor: AnalyticalStreamProcessor;
  let mockLLM: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLM = {
      chat: vi.fn(),
      streamChat: vi.fn(),
    };
    // @ts-ignore - mock injection
    processor = new AnalyticalStreamProcessor(mockLLM as LLMClient);
  });

  it("should bind schema and return structured result when LLM is available", async () => {
    const problem: Problem = {
      id: "p1",
      description: "Why is the system slow?",
      context: "Node.js app with Postgres",
      complexity: "moderate",
    };

    // Mock LLM availability check - return a chat model (not embedding model)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3" }] }),
    });

    // Mock successful AI response
    const mockOutput = {
      reasoning: ["Step 1", "Step 2"],
      conclusion: "Database index missing",
      insights: [
        {
          content: "High latency in DB",
          confidence: 0.9,
          importance: 0.8,
        },
      ],
      confidence: 0.95,
    };

    mockLLM.streamChat.mockResolvedValue(JSON.stringify(mockOutput));

    const result = await processor.process(problem);

    // Verify LLM was called
    expect(mockLLM.streamChat).toHaveBeenCalledTimes(1);

    // Check call arguments (Prompt Binding Verification)
    const callArgs = mockLLM.streamChat.mock.calls[0];
    const messages = callArgs[0];
    const systemMsg = messages.find((m: any) => m.role === "system");

    // Verify Schema-Prompt Binding
    expect(systemMsg.content).toContain("!!! CRITICAL INSTRUCTION !!!");
    expect(systemMsg.content).toContain("You must output valid JSON");
    expect(systemMsg.content).toContain('"type": "object"'); // JSON Schema signature

    // Verify Result Structure
    expect(result.streamType).toBe(StreamType.ANALYTICAL);
    expect(result.conclusion).toBe("Database index missing");
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0].content).toBe("High latency in DB");
  });

  it("should fall back to rule-based analysis when LLM is unavailable", async () => {
    const problem: Problem = {
      id: "p1",
      description: "Test problem for rule-based fallback",
      context: "Test context",
    };

    // Mock LLM availability check - no models available
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    });

    const result = await processor.process(problem);

    // Should complete with rule-based analysis
    expect(result.status).toBe(StreamStatus.COMPLETED);
    expect(result.streamType).toBe(StreamType.ANALYTICAL);
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    // LLM should not be called
    expect(mockLLM.streamChat).not.toHaveBeenCalled();
  });

  it("should fall back to rule-based analysis when LLM call fails", async () => {
    const problem: Problem = {
      id: "p1",
      description: "Fail test",
      context: "Test context",
    };

    // Mock LLM availability check - LLM is available
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3" }] }),
    });

    // Mock LLM failure
    mockLLM.streamChat.mockRejectedValue(new Error("Ollama down"));

    const result = await processor.process(problem);

    // Should fall back to rule-based and complete successfully
    expect(result.status).toBe(StreamStatus.COMPLETED);
    expect(result.streamType).toBe(StreamType.ANALYTICAL);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
