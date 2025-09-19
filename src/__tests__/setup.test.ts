/**
 * Basic setup tests to verify project structure
 */

import { describe, it, expect } from 'vitest';
import { ProcessingMode, ReasoningType } from '../types/core.js';
import { TOOL_SCHEMAS } from '../types/mcp.js';
import { ConfigManager } from '../utils/config.js';
import { Logger, LogLevel } from '../utils/logger.js';

describe('Project Setup', () => {
  describe('Core Types', () => {
    it('should have ProcessingMode enum', () => {
      expect(ProcessingMode.BALANCED).toBe('balanced');
      expect(ProcessingMode.INTUITIVE).toBe('intuitive');
      expect(ProcessingMode.DELIBERATIVE).toBe('deliberative');
    });

    it('should have ReasoningType enum', () => {
      expect(ReasoningType.PATTERN_MATCH).toBe('pattern_match');
      expect(ReasoningType.LOGICAL_INFERENCE).toBe('logical_inference');
    });
  });

  describe('MCP Tool Schemas', () => {
    it('should have all required tool schemas', () => {
      expect(TOOL_SCHEMAS.think).toBeDefined();
      expect(TOOL_SCHEMAS.remember).toBeDefined();
      expect(TOOL_SCHEMAS.recall).toBeDefined();
      expect(TOOL_SCHEMAS.analyze_reasoning).toBeDefined();
    });

    it('should have proper schema structure', () => {
      const thinkSchema = TOOL_SCHEMAS.think;
      expect(thinkSchema.name).toBe('think');
      expect(thinkSchema.description).toBeDefined();
      expect(thinkSchema.inputSchema).toBeDefined();
      expect(thinkSchema.inputSchema.properties.input).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should create config manager with defaults', () => {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      
      expect(config.default_mode).toBe(ProcessingMode.BALANCED);
      expect(config.working_memory_capacity).toBe(7);
      expect(config.enable_emotion).toBe(true);
    });

    it('should validate configuration', () => {
      const configManager = new ConfigManager();
      expect(() => configManager.validateConfig()).not.toThrow();
    });

    it('should handle configuration overrides', () => {
      const configManager = new ConfigManager({
        temperature: 0.5,
        working_memory_capacity: 5
      });
      
      expect(configManager.get('temperature')).toBe(0.5);
      expect(configManager.get('working_memory_capacity')).toBe(5);
    });
  });

  describe('Logger', () => {
    it('should create logger instance', () => {
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
    });

    it('should log messages', () => {
      const logger = Logger.getInstance();
      logger.clearLogs();
      
      logger.info('test', 'Test message');
      const logs = logger.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].component).toBe('test');
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    it('should filter logs by level', () => {
      const logger = Logger.getInstance();
      logger.clearLogs();
      
      logger.debug('test', 'Debug message');
      logger.info('test', 'Info message');
      logger.error('test', 'Error message');
      
      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
    });
  });
});