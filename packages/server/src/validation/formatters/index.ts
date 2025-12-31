/**
 * Error Formatters Module
 *
 * Exports interface-specific error formatters for REST, MCP, and UI interfaces.
 * Provides consistent error formatting across all interfaces.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.3, 8.4
 */

// Types
export type {
  ErrorFormatter,
  MCPValidationErrorResponse,
  RESTFieldErrorDetails,
  RESTValidationErrorResponse,
  UIValidationErrorResponse,
} from "./types.js";

// REST Formatter
export { RESTFormatter, createRESTFormatter } from "./rest-formatter.js";

// MCP Formatter
export { MCPFormatter, createMCPFormatter } from "./mcp-formatter.js";

// UI Formatter
export { UIFormatter, createUIFormatter } from "./ui-formatter.js";
