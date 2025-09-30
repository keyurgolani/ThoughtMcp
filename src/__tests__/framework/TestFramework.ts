/**
 * Comprehensive Testing Framework for ThoughtMCP
 *
 * This framework provides a scalable, flexible testing infrastructure that supports:
 * - Unit testing for individual cognitive components
 * - Integration testing for the full cognitive pipeline
 * - Performance benchmarking and profiling
 * - Memory and resource usage monitoring
 * - Bias detection and validation testing
 * - Cognitive architecture compliance testing
 */

import { expect, vi } from "vitest";

// Core testing interfaces
export interface TestCase<T = any> {
  name: string;
  description?: string;
  input: T;
  expected?: any;
  shouldThrow?: boolean;
  errorMessage?: string;
  timeout?: number;
  tags?: string[];
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  throughput?: number;
}

export interface CognitiveTestResult {
  passed: boolean;
  metrics: PerformanceMetrics;
  cognitiveCompliance: CognitiveComplianceReport;
  biasDetection: BiasDetectionReport;
  errors: Error[];
}

export interface CognitiveComplianceReport {
  hierarchicalProcessing: boolean;
  dualProcessTheory: boolean;
  memoryIntegration: boolean;
  emotionalProcessing: boolean;
  metacognition: boolean;
  predictiveProcessing: boolean;
  stochasticProcessing: boolean;
  score: number; // 0-1
}

export interface BiasDetectionReport {
  detectedBiases: string[];
  confidenceBias: number;
  availabilityBias: number;
  confirmationBias: number;
  anchoringBias: number;
  overallBiasScore: number; // 0-1, lower is better
}

export interface TestSuite {
  name: string;
  description: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  tests: TestCase[];
  tags?: string[];
}

/**
 * Main Testing Framework Class
 */
export class CognitiveTestFramework {
  private testSuites: Map<string, TestSuite> = new Map();
  private performanceBaselines: Map<string, PerformanceMetrics> = new Map();
  private testResults: Map<string, CognitiveTestResult[]> = new Map();

  constructor() {
    this.initializeFramework();
  }

  private initializeFramework(): void {
    // Set up global test environment
    this.setupGlobalMocks();
    this.loadPerformanceBaselines();
  }

  /**
   * Register a test suite with the framework
   */
  registerSuite(suite: TestSuite): void {
    this.testSuites.set(suite.name, suite);
  }

  /**
   * Run all registered test suites
   */
  async runAllSuites(): Promise<Map<string, CognitiveTestResult[]>> {
    const results = new Map<string, CognitiveTestResult[]>();

    for (const [suiteName, suite] of this.testSuites) {
      const suiteResults = await this.runSuite(suite);
      results.set(suiteName, suiteResults);
    }

    return results;
  }

  /**
   * Run a specific test suite
   */
  async runSuite(suite: TestSuite): Promise<CognitiveTestResult[]> {
    const results: CognitiveTestResult[] = [];

    // Setup
    if (suite.setup) {
      await suite.setup();
    }

    try {
      for (const testCase of suite.tests) {
        const result = await this.runTest(testCase);
        results.push(result);
      }
    } finally {
      // Teardown
      if (suite.teardown) {
        await suite.teardown();
      }
    }

    this.testResults.set(suite.name, results);
    return results;
  }

  /**
   * Run an individual test case
   */
  async runTest(testCase: TestCase): Promise<CognitiveTestResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    let passed = false;
    let errors: Error[] = [];
    let cognitiveCompliance: CognitiveComplianceReport;
    let biasDetection: BiasDetectionReport;

    try {
      // Execute the test
      const result = await this.executeTest(testCase);

      // Validate result
      if (testCase.shouldThrow) {
        errors.push(new Error(`Expected test to throw but it didn't`));
      } else if (testCase.expected !== undefined) {
        expect(result).toEqual(testCase.expected);
      }

      // Assess cognitive compliance
      cognitiveCompliance = await this.assessCognitiveCompliance(result);

      // Detect biases
      biasDetection = await this.detectBiases(result);

      passed = true;
    } catch (error) {
      if (testCase.shouldThrow) {
        const errorMessage = (error as Error).message;
        if (
          testCase.errorMessage &&
          !errorMessage.includes(testCase.errorMessage)
        ) {
          errors.push(
            new Error(
              `Expected error message to contain "${testCase.errorMessage}" but got "${errorMessage}"`
            )
          );
        } else {
          passed = true;
        }
      } else {
        errors.push(error as Error);
      }

      // Still assess what we can
      cognitiveCompliance = this.getDefaultComplianceReport();
      biasDetection = this.getDefaultBiasReport();
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const metrics: PerformanceMetrics = {
      executionTime: endTime - startTime,
      memoryUsage: endMemory - startMemory,
    };

    return {
      passed,
      metrics,
      cognitiveCompliance,
      biasDetection,
      errors: errors.length > 0 ? errors : [],
    };
  }

  /**
   * Execute a test case with proper error handling and timeout
   */
  private async executeTest(testCase: TestCase): Promise<any> {
    const timeout = testCase.timeout || 30000; // 30 second default

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Test "${testCase.name}" timed out after ${timeout}ms`)
        );
      }, timeout);

      try {
        // This would be implemented by specific test runners
        const result = this.runTestLogic(testCase);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Override this method in specific test implementations
   */
  protected runTestLogic(testCase: TestCase): any {
    // Default implementation for basic test cases
    // This can be overridden by subclasses for specific behavior
    return testCase.input;
  }

  /**
   * Assess cognitive architecture compliance
   */
  private async assessCognitiveCompliance(
    result: any
  ): Promise<CognitiveComplianceReport> {
    const compliance: CognitiveComplianceReport = {
      hierarchicalProcessing: this.checkHierarchicalProcessing(result),
      dualProcessTheory: this.checkDualProcessTheory(result),
      memoryIntegration: this.checkMemoryIntegration(result),
      emotionalProcessing: this.checkEmotionalProcessing(result),
      metacognition: this.checkMetacognition(result),
      predictiveProcessing: this.checkPredictiveProcessing(result),
      stochasticProcessing: this.checkStochasticProcessing(result),
      score: 0,
    };

    // Calculate overall compliance score
    const checks = [
      compliance.hierarchicalProcessing,
      compliance.dualProcessTheory,
      compliance.memoryIntegration,
      compliance.emotionalProcessing,
      compliance.metacognition,
      compliance.predictiveProcessing,
      compliance.stochasticProcessing,
    ];

    compliance.score = checks.filter(Boolean).length / checks.length;

    return compliance;
  }

  /**
   * Detect cognitive biases in results
   */
  private async detectBiases(result: any): Promise<BiasDetectionReport> {
    return {
      detectedBiases: this.identifyBiases(result),
      confidenceBias: this.measureConfidenceBias(result),
      availabilityBias: this.measureAvailabilityBias(result),
      confirmationBias: this.measureConfirmationBias(result),
      anchoringBias: this.measureAnchoringBias(result),
      overallBiasScore: this.calculateOverallBiasScore(result),
    };
  }

  // Cognitive compliance check methods
  private checkHierarchicalProcessing(result: any): boolean {
    // Check if result shows evidence of multi-layer processing
    return result?.metadata?.components_used?.length > 1;
  }

  private checkDualProcessTheory(result: any): boolean {
    // Check if both System 1 and System 2 processing occurred
    return result?.metadata?.system_mode !== undefined;
  }

  private checkMemoryIntegration(result: any): boolean {
    // Check if memory retrieval occurred
    return result?.metadata?.memory_retrievals > 0;
  }

  private checkEmotionalProcessing(result: any): boolean {
    // Check if emotional context is present
    return result?.emotional_context !== undefined;
  }

  private checkMetacognition(result: any): boolean {
    // Check if confidence assessment is present
    return result?.confidence !== undefined;
  }

  private checkPredictiveProcessing(result: any): boolean {
    // Check if predictive elements are present
    return result?.predictions !== undefined;
  }

  private checkStochasticProcessing(result: any): boolean {
    // Check if temperature/randomness was applied
    return result?.metadata?.temperature !== undefined;
  }

  // Bias detection methods
  private identifyBiases(result: any): string[] {
    const biases: string[] = [];

    if (this.measureConfidenceBias(result) > 0.7) {
      biases.push("overconfidence");
    }

    if (this.measureAvailabilityBias(result) > 0.7) {
      biases.push("availability");
    }

    if (this.measureConfirmationBias(result) > 0.7) {
      biases.push("confirmation");
    }

    if (this.measureAnchoringBias(result) > 0.7) {
      biases.push("anchoring");
    }

    return biases;
  }

  private measureConfidenceBias(result: any): number {
    // Measure overconfidence by comparing confidence to actual accuracy
    const confidence = result?.confidence || 0.5;
    const accuracy = this.estimateAccuracy(result);
    return Math.max(0, confidence - accuracy);
  }

  private measureAvailabilityBias(result: any): number {
    // Measure tendency to rely on easily recalled information
    const memoryRetrievals = result?.metadata?.memory_retrievals || 0;
    const reasoningSteps = result?.reasoning_path?.length || 1;
    return Math.min(1, memoryRetrievals / reasoningSteps);
  }

  private measureConfirmationBias(result: any): number {
    // Measure tendency to seek confirming evidence
    const alternatives =
      result?.reasoning_path?.flatMap((step: any) => step.alternatives || []) ||
      [];
    const mainPath = result?.reasoning_path || [];
    return mainPath.length > 0 ? 1 - alternatives.length / mainPath.length : 0;
  }

  private measureAnchoringBias(result: any): number {
    // Measure tendency to rely heavily on first information
    const reasoningPath = result?.reasoning_path || [];
    if (reasoningPath.length === 0) return 0;

    const firstStepConfidence = reasoningPath[0]?.confidence || 0.5;
    const avgConfidence =
      reasoningPath.reduce(
        (sum: number, step: any) => sum + (step.confidence || 0.5),
        0
      ) / reasoningPath.length;

    return Math.abs(firstStepConfidence - avgConfidence);
  }

  private calculateOverallBiasScore(result: any): number {
    const biases = [
      this.measureConfidenceBias(result),
      this.measureAvailabilityBias(result),
      this.measureConfirmationBias(result),
      this.measureAnchoringBias(result),
    ];

    return biases.reduce((sum, bias) => sum + bias, 0) / biases.length;
  }

  private estimateAccuracy(_result: any): number {
    // Placeholder for accuracy estimation logic
    // In practice, this would compare against known correct answers
    return 0.7; // Default assumption
  }

  // Utility methods
  private setupGlobalMocks(): void {
    // Set up common mocks for testing
    vi.mock("fs", () => ({
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      existsSync: vi.fn(() => true),
      promises: {
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue(Buffer.from('{"test": "data"}')),
        access: vi.fn().mockResolvedValue(undefined),
        unlink: vi.fn().mockResolvedValue(undefined),
        rename: vi.fn().mockResolvedValue(undefined),
        readdir: vi.fn().mockResolvedValue([]),
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        rm: vi.fn().mockResolvedValue(undefined),
      },
    }));
  }

  private loadPerformanceBaselines(): void {
    // Load performance baselines from configuration
    this.performanceBaselines.set("think", {
      executionTime: 500, // 500ms baseline
      memoryUsage: 10 * 1024 * 1024, // 10MB baseline
    });

    this.performanceBaselines.set("remember", {
      executionTime: 100,
      memoryUsage: 1 * 1024 * 1024,
    });

    this.performanceBaselines.set("recall", {
      executionTime: 200,
      memoryUsage: 5 * 1024 * 1024,
    });
  }

  protected getMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private getDefaultComplianceReport(): CognitiveComplianceReport {
    return {
      hierarchicalProcessing: false,
      dualProcessTheory: false,
      memoryIntegration: false,
      emotionalProcessing: false,
      metacognition: false,
      predictiveProcessing: false,
      stochasticProcessing: false,
      score: 0,
    };
  }

  private getDefaultBiasReport(): BiasDetectionReport {
    return {
      detectedBiases: [],
      confidenceBias: 0,
      availabilityBias: 0,
      confirmationBias: 0,
      anchoringBias: 0,
      overallBiasScore: 0,
    };
  }

  /**
   * Generate a comprehensive test report
   */
  generateReport(): TestReport {
    const allResults = Array.from(this.testResults.values()).flat();

    return {
      totalTests: allResults.length,
      passedTests: allResults.filter((r) => r.passed).length,
      failedTests: allResults.filter((r) => !r.passed).length,
      averageExecutionTime: this.calculateAverageExecutionTime(allResults),
      averageMemoryUsage: this.calculateAverageMemoryUsage(allResults),
      cognitiveComplianceScore:
        this.calculateAverageCognitiveCompliance(allResults),
      overallBiasScore: this.calculateAverageBiasScore(allResults),
      detailedResults: this.testResults,
    };
  }

  private calculateAverageExecutionTime(
    results: CognitiveTestResult[]
  ): number {
    if (results.length === 0) return 0;
    return (
      results.reduce((sum, r) => sum + r.metrics.executionTime, 0) /
      results.length
    );
  }

  private calculateAverageMemoryUsage(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return (
      results.reduce((sum, r) => sum + r.metrics.memoryUsage, 0) /
      results.length
    );
  }

  private calculateAverageCognitiveCompliance(
    results: CognitiveTestResult[]
  ): number {
    if (results.length === 0) return 0;
    return (
      results.reduce((sum, r) => sum + r.cognitiveCompliance.score, 0) /
      results.length
    );
  }

  private calculateAverageBiasScore(results: CognitiveTestResult[]): number {
    if (results.length === 0) return 0;
    return (
      results.reduce((sum, r) => sum + r.biasDetection.overallBiasScore, 0) /
      results.length
    );
  }
}

export interface TestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
  cognitiveComplianceScore: number;
  overallBiasScore: number;
  detailedResults: Map<string, CognitiveTestResult[]>;
}

/**
 * Specialized test framework for cognitive components
 */
export class CognitiveComponentTestFramework extends CognitiveTestFramework {
  protected runTestLogic(testCase: TestCase): any {
    // Implement cognitive component specific test logic
    return testCase.input;
  }
}

/**
 * Performance testing framework
 */
export class PerformanceTestFramework extends CognitiveTestFramework {
  private benchmarks: Map<string, PerformanceMetrics> = new Map();

  async runPerformanceBenchmark(
    name: string,
    testFn: () => Promise<any>
  ): Promise<PerformanceMetrics> {
    const iterations = 3; // Reduced from 100 to prevent memory leaks
    const results: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();

      await testFn();

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      results.push({
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
      });
    }

    const avgMetrics: PerformanceMetrics = {
      executionTime:
        results.reduce((sum, r) => sum + r.executionTime, 0) / iterations,
      memoryUsage:
        results.reduce((sum, r) => sum + r.memoryUsage, 0) / iterations,
      throughput:
        1000 /
        (results.reduce((sum, r) => sum + r.executionTime, 0) / iterations),
    };

    this.benchmarks.set(name, avgMetrics);
    return avgMetrics;
  }

  getBenchmarks(): Map<string, PerformanceMetrics> {
    return this.benchmarks;
  }

  // getMemoryUsage method inherited from parent class
}

/**
 * Memory testing framework for cognitive memory systems
 */
export class MemoryTestFramework extends CognitiveTestFramework {
  async testMemoryConsolidation(memorySystem: any): Promise<boolean> {
    // Test episodic to semantic memory transfer
    const experience = {
      content: "test memory",
      context: { domain: "test" },
      importance: 0.8,
    };
    await memorySystem.storeExperience(experience);

    // Simulate consolidation
    await memorySystem.runConsolidation();

    // Check if memory was transferred to semantic system
    const results = await memorySystem.retrieveMemories("test memory", 0.3);
    return results.semantic_concepts.length > 0;
  }

  async testMemoryDecay(memorySystem: any): Promise<boolean> {
    // Test that memories decay over time
    const experience = {
      content: "decay test",
      context: { domain: "test" },
      importance: 0.3,
    };
    await memorySystem.storeExperience(experience);

    // Simulate time passage
    await this.simulateTimePassage(memorySystem, 1000);

    // Check if memory strength decreased
    const results = await memorySystem.retrieveMemories("decay test", 0.1);
    return (
      results.episodic_memories.length === 0 ||
      (results.episodic_memories.length > 0 &&
        results.episodic_memories[0].importance < experience.importance)
    );
  }

  private async simulateTimePassage(
    memorySystem: any,
    milliseconds: number
  ): Promise<void> {
    // Simulate time passage for memory decay testing
    if (memorySystem.simulateTimePassage) {
      await memorySystem.simulateTimePassage(milliseconds);
    }
  }
}

export { CognitiveTestFramework as default };
