/**
 * Comprehensive Test Suites for ThoughtMCP
 * 
 * This file defines all test suites that integrate with the testing framework
 * and incorporate existing tests while following cognitive architecture principles.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CognitiveTestFramework, TestSuite, TestCase } from './TestFramework.js';
import { CognitiveMCPServer } from '../../server/CognitiveMCPServer.js';
import { ProcessingMode, ReasoningType } from '../../types/core.js';
import {
  createDefaultContext,
  createDefaultThoughtResult,
  createDefaultCognitiveInput,
  createTestDataSet
} from '../../utils/factories.js';
import {
  validateContext,
  validateThoughtResult,
  validateCognitiveInput
} from '../../utils/validation.js';

/**
 * Core Component Test Suite
 */
export const coreComponentSuite: TestSuite = {
  name: 'CoreComponents',
  description: 'Tests for core cognitive architecture components',
  tags: ['unit', 'core', 'cognitive'],
  tests: [
    {
      name: 'SensoryProcessor_BasicInput',
      description: 'Test sensory processing layer with basic input',
      input: {
        text: 'What is consciousness?',
        context: createDefaultContext()
      },
      tags: ['sensory', 'layer1']
    },
    {
      name: 'WorkingMemory_ChunkingTest',
      description: 'Test working memory chunking mechanism',
      input: {
        tokens: ['artificial', 'intelligence', 'machine', 'learning', 'neural', 'networks'],
        capacity: 7
      },
      tags: ['working-memory', 'layer2']
    },
    {
      name: 'ExecutiveProcessor_ReasoningModes',
      description: 'Test executive processor reasoning mode selection',
      input: {
        complexity: 0.8,
        urgency: 0.3,
        available_modes: ['deductive', 'inductive', 'abductive']
      },
      tags: ['executive', 'layer3', 'reasoning']
    }
  ]
};

/**
 * Dual-Process Theory Test Suite
 */
export const dualProcessSuite: TestSuite = {
  name: 'DualProcessTheory',
  description: 'Tests for System 1 and System 2 thinking implementation',
  tags: ['integration', 'dual-process', 'cognitive'],
  tests: [
    {
      name: 'System1_FastProcessing',
      description: 'Test System 1 fast, intuitive processing',
      input: {
        prompt: '2 + 2 = ?',
        mode: ProcessingMode.INTUITIVE,
        expected_speed: 'fast'
      },
      tags: ['system1', 'intuitive']
    },
    {
      name: 'System2_DeliberativeProcessing',
      description: 'Test System 2 slow, deliberate processing',
      input: {
        prompt: 'What are the ethical implications of AI consciousness?',
        mode: ProcessingMode.DELIBERATIVE,
        expected_speed: 'slow'
      },
      tags: ['system2', 'deliberative']
    },
    {
      name: 'ConflictResolution_SystemOverride',
      description: 'Test System 2 override when System 1 is uncertain',
      input: {
        prompt: 'A bat and ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost?',
        uncertainty_threshold: 0.7
      },
      tags: ['conflict-resolution', 'override']
    }
  ]
};

/**
 * Memory Systems Test Suite
 */
export const memorySystemsSuite: TestSuite = {
  name: 'MemorySystems',
  description: 'Tests for episodic and semantic memory systems',
  tags: ['integration', 'memory', 'cognitive'],
  tests: [
    {
      name: 'EpisodicMemory_StorageRetrieval',
      description: 'Test episodic memory storage and retrieval',
      input: {
        episode: {
          content: 'User asked about machine learning algorithms',
          context: createDefaultContext({ domain: 'AI' }),
          emotional_tags: ['curiosity', 'learning']
        },
        retrieval_cue: 'machine learning'
      },
      tags: ['episodic', 'storage', 'retrieval']
    },
    {
      name: 'SemanticMemory_ConceptIntegration',
      description: 'Test semantic memory concept integration',
      input: {
        concepts: [
          { name: 'neural network', relations: ['machine learning', 'AI'] },
          { name: 'deep learning', relations: ['neural network', 'AI'] }
        ]
      },
      tags: ['semantic', 'concepts', 'integration']
    },
    {
      name: 'MemoryConsolidation_EpisodicToSemantic',
      description: 'Test memory consolidation from episodic to semantic',
      input: {
        repeated_episodes: [
          'Neural networks learn patterns',
          'Neural networks use backpropagation',
          'Neural networks have layers'
        ],
        consolidation_threshold: 3
      },
      tags: ['consolidation', 'transfer']
    }
  ]
};

/**
 * Emotional Processing Test Suite
 */
export const emotionalProcessingSuite: TestSuite = {
  name: 'EmotionalProcessing',
  description: 'Tests for emotional processing and somatic markers',
  tags: ['integration', 'emotion', 'cognitive'],
  tests: [
    {
      name: 'EmotionalAssessment_ContentAnalysis',
      description: 'Test emotional content assessment',
      input: {
        content: 'I am excited about the breakthrough in AI research!',
        expected_emotions: ['excitement', 'joy', 'curiosity']
      },
      tags: ['emotion', 'assessment']
    },
    {
      name: 'SomaticMarkers_DecisionBiasing',
      description: 'Test somatic markers influencing decisions',
      input: {
        options: [
          { content: 'Risky investment', pattern_hash: 'risk_pattern' },
          { content: 'Safe investment', pattern_hash: 'safe_pattern' }
        ],
        markers: {
          'risk_pattern': { value: -0.3, confidence: 0.8 },
          'safe_pattern': { value: 0.2, confidence: 0.7 }
        }
      },
      tags: ['somatic-markers', 'decision-biasing']
    },
    {
      name: 'EmotionalModulation_ReasoningInfluence',
      description: 'Test emotional state modulating reasoning',
      input: {
        emotional_state: { valence: 0.7, arousal: 0.6 },
        reasoning_task: 'Evaluate the pros and cons of remote work'
      },
      tags: ['modulation', 'reasoning-influence']
    }
  ]
};

/**
 * Metacognitive Monitoring Test Suite
 */
export const metacognitiveSuite: TestSuite = {
  name: 'MetacognitiveMonitoring',
  description: 'Tests for metacognitive monitoring and bias detection',
  tags: ['integration', 'metacognition', 'cognitive'],
  tests: [
    {
      name: 'ConfidenceAssessment_AccuracyCalibration',
      description: 'Test confidence assessment and calibration',
      input: {
        reasoning_steps: [
          { type: ReasoningType.LOGICAL_INFERENCE, confidence: 0.9 },
          { type: ReasoningType.PATTERN_MATCH, confidence: 0.6 }
        ],
        known_accuracy: 0.75
      },
      tags: ['confidence', 'calibration']
    },
    {
      name: 'BiasDetection_OverconfidenceBias',
      description: 'Test detection of overconfidence bias',
      input: {
        thought_sequence: {
          confidence: 0.95,
          reasoning_quality: 0.6,
          evidence_strength: 0.4
        }
      },
      tags: ['bias-detection', 'overconfidence']
    },
    {
      name: 'MetacognitiveStrategies_ProblemDecomposition',
      description: 'Test metacognitive strategy application',
      input: {
        complex_problem: 'How can we achieve artificial general intelligence?',
        confidence_threshold: 0.6,
        current_confidence: 0.3
      },
      tags: ['strategies', 'decomposition']
    }
  ]
};

/**
 * Stochastic Processing Test Suite
 */
export const stochasticProcessingSuite: TestSuite = {
  name: 'StochasticProcessing',
  description: 'Tests for stochastic neural processing and noise effects',
  tags: ['integration', 'stochastic', 'cognitive'],
  tests: [
    {
      name: 'GaussianNoise_SignalVariability',
      description: 'Test Gaussian noise addition for neural variability',
      input: {
        signal: [0.5, 0.7, 0.3, 0.9],
        noise_level: 0.1,
        iterations: 100
      },
      tags: ['noise', 'variability']
    },
    {
      name: 'StochasticResonance_WeakSignalEnhancement',
      description: 'Test stochastic resonance for weak signal detection',
      input: {
        weak_signal: { strength: 0.2, threshold: 0.3 },
        optimal_noise: 0.15
      },
      tags: ['resonance', 'enhancement']
    },
    {
      name: 'TemperatureControl_CreativityModulation',
      description: 'Test temperature parameter controlling creativity',
      input: {
        base_response: 'Standard answer',
        temperatures: [0.1, 0.7, 1.5],
        creativity_metric: 'diversity'
      },
      tags: ['temperature', 'creativity']
    }
  ]
};

/**
 * Predictive Processing Test Suite
 */
export const predictiveProcessingSuite: TestSuite = {
  name: 'PredictiveProcessing',
  description: 'Tests for predictive processing and Bayesian updating',
  tags: ['integration', 'predictive', 'cognitive'],
  tests: [
    {
      name: 'TopDownPredictions_ContextualExpectations',
      description: 'Test top-down prediction generation',
      input: {
        context: 'The user is asking about machine learning',
        prior_interactions: ['AI questions', 'technical discussions'],
        expected_predictions: ['algorithm questions', 'implementation details']
      },
      tags: ['predictions', 'context']
    },
    {
      name: 'PredictionErrors_ModelUpdating',
      description: 'Test prediction error calculation and model updating',
      input: {
        prediction: 'User will ask about supervised learning',
        actual_input: 'What is unsupervised learning?',
        error_threshold: 0.3
      },
      tags: ['errors', 'updating']
    },
    {
      name: 'BayesianUpdating_BeliefRevision',
      description: 'Test Bayesian belief updating',
      input: {
        prior_belief: { probability: 0.6, confidence: 0.7 },
        new_evidence: { strength: 0.8, contradicts_prior: true },
        expected_posterior: { probability: 0.3, confidence: 0.8 }
      },
      tags: ['bayesian', 'beliefs']
    }
  ]
};

/**
 * Integration Test Suite (incorporating existing server tests)
 */
export const integrationSuite: TestSuite = {
  name: 'Integration',
  description: 'End-to-end integration tests for the complete cognitive system',
  tags: ['integration', 'e2e', 'server'],
  setup: async () => {
    // Setup test server instance
  },
  teardown: async () => {
    // Cleanup test server
  },
  tests: [
    {
      name: 'ThinkTool_CompleteProcessing',
      description: 'Test complete think tool processing pipeline',
      input: {
        input: 'What is consciousness?',
        mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true
      },
      tags: ['think', 'pipeline']
    },
    {
      name: 'MemoryTools_StorageAndRetrieval',
      description: 'Test memory storage and retrieval integration',
      input: {
        remember_request: {
          content: 'Consciousness is the state of being aware',
          type: 'semantic',
          importance: 0.8
        },
        recall_request: {
          cue: 'consciousness awareness',
          type: 'semantic'
        }
      },
      tags: ['memory', 'integration']
    },
    {
      name: 'ReasoningAnalysis_BiasDetection',
      description: 'Test reasoning analysis and bias detection',
      input: {
        reasoning_steps: [
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: 'All humans are mortal',
            confidence: 0.95,
            alternatives: []
          },
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: 'Socrates is human',
            confidence: 0.9,
            alternatives: []
          },
          {
            type: ReasoningType.LOGICAL_INFERENCE,
            content: 'Therefore, Socrates is mortal',
            confidence: 0.85,
            alternatives: []
          }
        ]
      },
      tags: ['reasoning', 'analysis']
    }
  ]
};

/**
 * Performance Test Suite
 */
export const performanceSuite: TestSuite = {
  name: 'Performance',
  description: 'Performance benchmarks and resource usage tests',
  tags: ['performance', 'benchmarks'],
  tests: [
    {
      name: 'ThinkTool_LatencyBenchmark',
      description: 'Benchmark think tool response latency',
      input: {
        inputs: [
          'Simple question',
          'Complex philosophical question about the nature of reality',
          'Technical question requiring detailed reasoning'
        ],
        target_latency: 500, // ms
        iterations: 100
      },
      tags: ['latency', 'benchmark']
    },
    {
      name: 'MemorySystem_ThroughputTest',
      description: 'Test memory system throughput under load',
      input: {
        concurrent_operations: 50,
        operation_types: ['store', 'retrieve', 'consolidate'],
        duration: 60000 // 1 minute
      },
      tags: ['throughput', 'memory']
    },
    {
      name: 'ResourceUsage_MemoryLeakDetection',
      description: 'Detect memory leaks during extended operation',
      input: {
        operations: 1000,
        operation_type: 'think',
        memory_growth_threshold: 0.1 // 10% growth allowed
      },
      tags: ['memory-leak', 'resources']
    }
  ]
};

/**
 * Validation Test Suite (incorporating existing validation tests)
 */
export const validationSuite: TestSuite = {
  name: 'Validation',
  description: 'Data validation and error handling tests',
  tags: ['validation', 'error-handling'],
  tests: [
    {
      name: 'InputValidation_ThinkTool',
      description: 'Test input validation for think tool',
      input: {
        invalid_inputs: [
          { input: '', expected_error: 'input string' },
          { input: 'valid', mode: 'invalid_mode', expected_error: 'processing mode' },
          { input: 'valid', temperature: -1, expected_error: 'temperature' }
        ]
      },
      tags: ['validation', 'think-tool']
    },
    {
      name: 'DataStructure_ValidationCompliance',
      description: 'Test data structure validation compliance',
      input: {
        test_data: createTestDataSet(),
        validation_functions: [
          validateContext,
          validateThoughtResult,
          validateCognitiveInput
        ]
      },
      tags: ['validation', 'data-structures']
    },
    {
      name: 'ErrorHandling_GracefulDegradation',
      description: 'Test graceful error handling and recovery',
      input: {
        error_scenarios: [
          'memory_system_failure',
          'processing_timeout',
          'invalid_configuration'
        ]
      },
      tags: ['error-handling', 'recovery']
    }
  ]
};

/**
 * Factory Test Suite (incorporating existing factory tests)
 */
export const factorySuite: TestSuite = {
  name: 'Factories',
  description: 'Test data factory functions and test data generation',
  tags: ['factories', 'test-data'],
  tests: [
    {
      name: 'DefaultFactories_ValidDataGeneration',
      description: 'Test default factory functions generate valid data',
      input: {
        factories: [
          'createDefaultContext',
          'createDefaultThoughtResult',
          'createDefaultCognitiveInput'
        ]
      },
      tags: ['factories', 'default']
    },
    {
      name: 'ComplexFactories_RealisticDataGeneration',
      description: 'Test complex factory functions generate realistic data',
      input: {
        factory_type: 'complex',
        data_requirements: {
          reasoning_depth: 3,
          emotional_complexity: 'high',
          memory_integration: true
        }
      },
      tags: ['factories', 'complex']
    },
    {
      name: 'TestDataSets_DiversityAndValidity',
      description: 'Test generated test data sets for diversity and validity',
      input: {
        dataset_size: 100,
        diversity_metrics: ['confidence', 'complexity', 'emotional_valence'],
        validation_requirements: 'strict'
      },
      tags: ['test-data', 'diversity']
    }
  ]
};

/**
 * Export all test suites
 */
export const allTestSuites: TestSuite[] = [
  coreComponentSuite,
  dualProcessSuite,
  memorySystemsSuite,
  emotionalProcessingSuite,
  metacognitiveSuite,
  stochasticProcessingSuite,
  predictiveProcessingSuite,
  integrationSuite,
  performanceSuite,
  validationSuite,
  factorySuite
];

/**
 * Test suite registry for easy access
 */
export const testSuiteRegistry = new Map<string, TestSuite>([
  ['core', coreComponentSuite],
  ['dual-process', dualProcessSuite],
  ['memory', memorySystemsSuite],
  ['emotion', emotionalProcessingSuite],
  ['metacognition', metacognitiveSuite],
  ['stochastic', stochasticProcessingSuite],
  ['predictive', predictiveProcessingSuite],
  ['integration', integrationSuite],
  ['performance', performanceSuite],
  ['validation', validationSuite],
  ['factories', factorySuite]
]);

/**
 * Helper function to get test suites by tags
 */
export function getTestSuitesByTags(tags: string[]): TestSuite[] {
  return allTestSuites.filter(suite => 
    suite.tags?.some(tag => tags.includes(tag))
  );
}

/**
 * Helper function to get all tests with specific tags
 */
export function getTestsByTags(tags: string[]): TestCase[] {
  const allTests: TestCase[] = [];
  
  for (const suite of allTestSuites) {
    const matchingTests = suite.tests.filter(test =>
      test.tags?.some(tag => tags.includes(tag))
    );
    allTests.push(...matchingTests);
  }
  
  return allTests;
}