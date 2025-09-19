/**
 * MCP server interfaces and types
 */

import type { ThoughtResult } from "../types/core.js";
import {
  AnalysisResult,
  AnalyzeReasoningArgs,
  MemoryResult,
  RecallArgs,
  RecallResult,
  RememberArgs,
  ThinkArgs,
} from "../types/mcp.js";

// Main MCP server interface
export interface IMCPServer {
  initialize(): Promise<void>;
  registerTools(): void;
  handleRequest(
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown>;
  shutdown(): Promise<void>;
}

// Tool handler interfaces
export interface IToolHandler {
  handleThink(args: ThinkArgs): Promise<ThoughtResult>;
  handleRemember(args: RememberArgs): Promise<MemoryResult>;
  handleRecall(args: RecallArgs): Promise<RecallResult>;
  handleAnalyzeReasoning(args: AnalyzeReasoningArgs): Promise<AnalysisResult>;
}

// Session management interface
export interface ISessionManager {
  createSession(sessionId: string): Session;
  getSession(sessionId: string): Session | undefined;
  deleteSession(sessionId: string): boolean;
  cleanupExpiredSessions(): void;
}

export interface Session {
  id: string;
  created_at: number;
  last_activity: number;
  context: Record<string, unknown>;
  memory_context: string[];
}

// Configuration management interface
export interface IConfigManager {
  loadConfig(): Promise<Record<string, unknown>>;
  getConfig(key: string): unknown;
  setConfig(key: string, value: unknown): void;
  validateConfig(config: Record<string, unknown>): boolean;
}

// Error handling interface
export interface IErrorHandler {
  handleError(error: Error, context?: Record<string, unknown>): ErrorResponse;
  logError(error: Error, context?: Record<string, unknown>): void;
  isRetryableError(error: Error): boolean;
}

export interface ErrorResponse {
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Response formatting interface
export interface IResponseFormatter {
  formatThoughtResult(result: ThoughtResult): Record<string, unknown>;
  formatMemoryResult(result: MemoryResult): Record<string, unknown>;
  formatRecallResult(result: RecallResult): Record<string, unknown>;
  formatAnalysisResult(result: AnalysisResult): Record<string, unknown>;
  formatError(error: Error): ErrorResponse;
}
