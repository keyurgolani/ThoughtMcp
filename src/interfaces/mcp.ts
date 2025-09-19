/**
 * MCP server interfaces and types
 */

import { 
  ThinkArgs, 
  RememberArgs, 
  RecallArgs, 
  AnalyzeReasoningArgs,
  MemoryResult,
  RecallResult,
  AnalysisResult
} from '../types/mcp.js';
import type { ThoughtResult } from '../types/core.js';

// Main MCP server interface
export interface IMCPServer {
  initialize(): Promise<void>;
  registerTools(): void;
  handleRequest(method: string, params: any): Promise<any>;
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
  context: any;
  memory_context: string[];
}

// Configuration management interface
export interface IConfigManager {
  loadConfig(): Promise<any>;
  getConfig(key: string): any;
  setConfig(key: string, value: any): void;
  validateConfig(config: any): boolean;
}

// Error handling interface
export interface IErrorHandler {
  handleError(error: Error, context?: any): ErrorResponse;
  logError(error: Error, context?: any): void;
  isRetryableError(error: Error): boolean;
}

export interface ErrorResponse {
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

// Response formatting interface
export interface IResponseFormatter {
  formatThoughtResult(result: ThoughtResult): any;
  formatMemoryResult(result: MemoryResult): any;
  formatRecallResult(result: RecallResult): any;
  formatAnalysisResult(result: AnalysisResult): any;
  formatError(error: Error): ErrorResponse;
}