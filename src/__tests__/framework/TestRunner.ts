/**
 * Test Runner for ThoughtMCP Testing Framework
 * 
 * This runner orchestrates the execution of all test suites and provides
 * comprehensive reporting and analysis capabilities.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  CognitiveTestFramework, 
  PerformanceTestFramework, 
  MemoryTestFramework,
  TestReport,
  CognitiveTestResult
} from './TestFramework.js';
import { 
  allTestSuites, 
  testSuiteRegistry, 
  getTestSuitesByTags,
  getTestsByTags 
} from './TestSuites.js';
import { CognitiveMCPServer } from '../../server/CognitiveMCPServer.js';
import { ProcessingMode } from '../../types/core.js';
import { Logger } from '../../utils/logger.js';

/**
 * Main Test Runner Class
 */
export class ThoughtMCPTestRunner {
  private cognitiveFramework: CognitiveTestFramework;
  private performanceFramework: PerformanceTestFramework;
  private memoryFramework: MemoryTestFramework;
  private server: CognitiveMCPServer;
  private logger: Logger;

  constructor() {
    this.cognitiveFramework = new CognitiveTestFramework();
    this.performanceFramework = new PerformanceTestFramework();
    this.memoryFramework = new MemoryTestFramework();
    this.server = new CognitiveMCPServer();
    this.logger = Logger.getInstance();
  }

  /**
   * Initialize the test environment
   */
  async initialize(): Promise<void> {
    this.logger.info('TestRunner', 'Initializing test environment...');
    
    // Register all test suites
    for (const suite of allTestSuites) {
      this.cognitiveFramework.registerSuite(suite);
    }

    // Initialize server for integration tests
    await this.server.initialize();
    
    this.logger.info('TestRunner', 'Test environment initialized successfully');
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestReport> {
    this.logger.info('TestRunner', 'Starting comprehensive test run...');
    
    const startTime = performance.now();
    
    try {
      // Run cognitive architecture tests
      const cognitiveResults = await this.cognitiveFramework.runAllSuites();
      
      // Run performance benchmarks
      await this.runPerformanceBenchmarks();
      
      // Run memory system tests
      await this.runMemorySystemTests();
      
      // Generate comprehensive report
      const report = this.cognitiveFramework.generateReport();
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      this.logger.info('TestRunner', `Test run completed in ${totalTime.toFixed(2)}ms`);
      this.logTestSummary(report);
      
      return report;
    } catch (error) {
      this.logger.error('TestRunner', `Test run failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run tests by specific tags
   */
  async runTestsByTags(tags: string[]): Promise<TestReport> {
    this.logger.info('TestRunner', `Running tests with tags: ${tags.join(', ')}`);
    
    const targetSuites = getTestSuitesByTags(tags);
    const results = new Map<string, CognitiveTestResult[]>();
    
    for (const suite of targetSuites) {
      const suiteResults = await this.cognitiveFramework.runSuite(suite);
      results.set(suite.name, suiteResults);
    }
    
    return this.generateCustomReport(results);
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(): Promise<void> {
    this.logger.info('TestRunner', 'Running performance benchmarks...');
    
    // Think tool latency benchmark
    await this.performanceFramework.runPerformanceBenchmark(
      'think_latency',
      async () => {
        await this.server.handleThink({
          input: 'What is the nature of consciousness?',
          mode: ProcessingMode.BALANCED
        });
      }
    );

    // Memory operations benchmark
    await this.performanceFramework.runPerformanceBenchmark(
      'memory_operations',
      async () => {
        await this.server.handleRemember({
          content: 'Test memory content',
          type: 'semantic',
          importance: 0.7
        });
        
        await this.server.handleRecall({
          cue: 'test memory',
          type: 'semantic'
        });
      }
    );

    // Complex reasoning benchmark
    await this.performanceFramework.runPerformanceBenchmark(
      'complex_reasoning',
      async () => {
        await this.server.handleThink({
          input: 'Analyze the ethical implications of artificial general intelligence and propose a framework for responsible development.',
          mode: ProcessingMode.DELIBERATIVE,
          enable_emotion: true,
          enable_metacognition: true,
          max_depth: 10
        });
      }
    );

    const benchmarks = this.performanceFramework.getBenchmarks();
    this.logger.info('TestRunner', `Performance benchmarks completed: ${benchmarks.size} benchmarks`);
  }

  /**
   * Run memory system specific tests
   */
  async runMemorySystemTests(): Promise<void> {
    this.logger.info('TestRunner', 'Running memory system tests...');
    
    // Test memory consolidation
    const consolidationResult = await this.memoryFramework.testMemoryConsolidation(
      this.server.getMemorySystem()
    );
    
    // Test memory decay
    const decayResult = await this.memoryFramework.testMemoryDecay(
      this.server.getMemorySystem()
    );
    
    this.logger.info('TestRunner', `Memory consolidation test: ${consolidationResult ? 'PASSED' : 'FAILED'}`);
    this.logger.info('TestRunner', `Memory decay test: ${decayResult ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Run cognitive compliance validation
   */
  async validateCognitiveCompliance(): Promise<boolean> {
    this.logger.info('TestRunner', 'Validating cognitive architecture compliance...');
    
    const complianceTests = [
      this.testHierarchicalProcessing(),
      this.testDualProcessTheory(),
      this.testMemoryIntegration(),
      this.testEmotionalProcessing(),
      this.testMetacognition(),
      this.testPredictiveProcessing(),
      this.testStochasticProcessing()
    ];

    const results = await Promise.all(complianceTests);
    const overallCompliance = results.every(result => result);
    
    this.logger.info('TestRunner', `Cognitive compliance: ${overallCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    
    return overallCompliance;
  }

  /**
   * Test hierarchical processing compliance
   */
  private async testHierarchicalProcessing(): Promise<boolean> {
    const result = await this.server.handleThink({
      input: 'Test hierarchical processing',
      mode: ProcessingMode.BALANCED
    });

    // Check if multiple processing layers were used
    const componentsUsed = result.metadata?.components_used || [];
    const hasMultipleLayers = componentsUsed.length >= 3;
    
    this.logger.debug('TestRunner', `Hierarchical processing: ${hasMultipleLayers ? 'PASS' : 'FAIL'}`);
    return hasMultipleLayers;
  }

  /**
   * Test dual-process theory compliance
   */
  private async testDualProcessTheory(): Promise<boolean> {
    // Test System 1 (intuitive) processing
    const system1Result = await this.server.handleThink({
      input: '2 + 2 = ?',
      mode: ProcessingMode.INTUITIVE
    });

    // Test System 2 (deliberative) processing
    const system2Result = await this.server.handleThink({
      input: 'What are the philosophical implications of consciousness?',
      mode: ProcessingMode.DELIBERATIVE
    });

    const system1Fast = system1Result.metadata.processing_time_ms < 200;
    const system2Slow = system2Result.metadata.processing_time_ms > 200;
    const hasDualProcess = system1Fast && system2Slow;
    
    this.logger.debug('TestRunner', `Dual-process theory: ${hasDualProcess ? 'PASS' : 'FAIL'}`);
    return hasDualProcess;
  }

  /**
   * Test memory integration compliance
   */
  private async testMemoryIntegration(): Promise<boolean> {
    // Store a memory
    await this.server.handleRemember({
      content: 'Memory integration test content',
      type: 'semantic',
      importance: 0.8
    });

    // Test if memory is used in reasoning
    const result = await this.server.handleThink({
      input: 'Tell me about memory integration',
      mode: ProcessingMode.BALANCED
    });

    const hasMemoryRetrieval = result.metadata.memory_retrievals > 0;
    
    this.logger.debug('TestRunner', `Memory integration: ${hasMemoryRetrieval ? 'PASS' : 'FAIL'}`);
    return hasMemoryRetrieval;
  }

  /**
   * Test emotional processing compliance
   */
  private async testEmotionalProcessing(): Promise<boolean> {
    const result = await this.server.handleThink({
      input: 'I am excited about this breakthrough in AI!',
      mode: ProcessingMode.BALANCED,
      enable_emotion: true
    });

    const hasEmotionalContext = result.emotional_context !== undefined;
    
    this.logger.debug('TestRunner', `Emotional processing: ${hasEmotionalContext ? 'PASS' : 'FAIL'}`);
    return hasEmotionalContext;
  }

  /**
   * Test metacognition compliance
   */
  private async testMetacognition(): Promise<boolean> {
    const result = await this.server.handleThink({
      input: 'Complex reasoning task requiring self-monitoring',
      mode: ProcessingMode.BALANCED,
      enable_metacognition: true
    });

    const hasConfidenceAssessment = result.confidence !== undefined;
    
    this.logger.debug('TestRunner', `Metacognition: ${hasConfidenceAssessment ? 'PASS' : 'FAIL'}`);
    return hasConfidenceAssessment;
  }

  /**
   * Test predictive processing compliance
   */
  private async testPredictiveProcessing(): Promise<boolean> {
    const result = await this.server.handleThink({
      input: 'What will happen next in this conversation?',
      mode: ProcessingMode.BALANCED
    });

    // Check if predictive elements are present in the response
    const hasPredictiveElements = result.content.toLowerCase().includes('predict') ||
                                 result.content.toLowerCase().includes('expect') ||
                                 result.content.toLowerCase().includes('likely');
    
    this.logger.debug('TestRunner', `Predictive processing: ${hasPredictiveElements ? 'PASS' : 'FAIL'}`);
    return hasPredictiveElements;
  }

  /**
   * Test stochastic processing compliance
   */
  private async testStochasticProcessing(): Promise<boolean> {
    const results = [];
    
    // Run the same input multiple times with high temperature
    for (let i = 0; i < 5; i++) {
      const result = await this.server.handleThink({
        input: 'Generate a creative response',
        mode: ProcessingMode.CREATIVE,
        temperature: 1.5
      });
      results.push(result.content);
    }

    // Check for variability in responses
    const uniqueResponses = new Set(results);
    const hasVariability = uniqueResponses.size > 1;
    
    this.logger.debug('TestRunner', `Stochastic processing: ${hasVariability ? 'PASS' : 'FAIL'}`);
    return hasVariability;
  }

  /**
   * Generate a custom test report
   */
  private generateCustomReport(results: Map<string, CognitiveTestResult[]>): TestReport {
    const allResults = Array.from(results.values()).flat();
    
    return {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.passed).length,
      failedTests: allResults.filter(r => !r.passed).length,
      averageExecutionTime: this.calculateAverageExecutionTime(allResults),
      averageMemoryUsage: this.calculateAverageMemoryUsage(allResults),
      cognitiveComplianceScore: this.calculateAverageCognitiveCompliance(allResults),
      overallBiasScore: this.calculateAverageBiasScore(allResults),
      detailedResults: results
    };
  }

  /**
   * Log test summary
   */
  private logTestSummary(report: TestReport): void {
    this.logger.info('TestRunner', '=== TEST SUMMARY ===');
    this.logger.info('TestRunner', `Total Tests: ${report.totalTests}`);
    this.logger.info('TestRunner', `Passed: ${report.passedTests}`);
    this.logger.info('TestRunner', `Failed: ${report.failedTests}`);
    this.logger.info('TestRunner', `Success Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(2)}%`);
    this.logger.info('TestRunner', `Average Execution Time: ${report.averageExecutionTime.toFixed(2)}ms`);
    this.logger.info('TestRunner', `Average Memory Usage: ${(report.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    this.logger.info('TestRunner', `Cognitive Compliance Score: ${(report.cognitiveComplianceScore * 100).toFixed(2)}%`);
    this.logger.info('TestRunner', `Overall Bias Score: ${(report.overallBiasScore * 100).toFixed(2)}%`);
    this.logger.info('TestRunner', '==================');
  }

  // Helper calculation methods
  private calculateAverageExecutionTime(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.metrics.executionTime, 0) / results.length;
  }

  private calculateAverageMemoryUsage(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.metrics.memoryUsage, 0) / results.length;
  }

  private calculateAverageCognitiveCompliance(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.cognitiveCompliance.score, 0) / results.length;
  }

  private calculateAverageBiasScore(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.biasDetection.overallBiasScore, 0) / results.length;
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    this.logger.info('TestRunner', 'Cleaning up test environment...');
    
    if (this.server.isInitialized()) {
      await this.server.shutdown();
    }
    
    this.logger.info('TestRunner', 'Test environment cleaned up successfully');
  }
}

/**
 * Vitest integration - Main test runner
 */
describe('ThoughtMCP Comprehensive Test Suite', () => {
  let testRunner: ThoughtMCPTestRunner;

  beforeAll(async () => {
    testRunner = new ThoughtMCPTestRunner();
    await testRunner.initialize();
  });

  afterAll(async () => {
    await testRunner.cleanup();
  });

  it('should run all cognitive architecture tests', async () => {
    const report = await testRunner.runAllTests();
    
    expect(report.totalTests).toBeGreaterThan(0);
    expect(report.passedTests).toBeGreaterThan(0);
    expect(report.passedTests / report.totalTests).toBeGreaterThanOrEqual(0.8); // 80% pass rate
  }, 300000); // 5 minute timeout for comprehensive tests

  it('should validate cognitive architecture compliance', async () => {
    const isCompliant = await testRunner.validateCognitiveCompliance();
    expect(isCompliant).toBe(true);
  }, 60000);

  it('should run unit tests', async () => {
    const report = await testRunner.runTestsByTags(['unit']);
    expect(report.passedTests / report.totalTests).toBeGreaterThanOrEqual(0.9); // 90% pass rate for unit tests
  });

  it('should run integration tests', async () => {
    const report = await testRunner.runTestsByTags(['integration']);
    expect(report.passedTests / report.totalTests).toBeGreaterThanOrEqual(0.8); // 80% pass rate for integration tests
  });

  it('should run performance tests', async () => {
    const report = await testRunner.runTestsByTags(['performance']);
    expect(report.averageExecutionTime).toBeLessThan(1000); // Average under 1 second
  });

  it('should run validation tests', async () => {
    const report = await testRunner.runTestsByTags(['validation']);
    expect(report.passedTests / report.totalTests).toBe(1); // 100% pass rate for validation tests
  });
});

export { ThoughtMCPTestRunner };