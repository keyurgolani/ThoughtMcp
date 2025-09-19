/**
 * Test Configuration for ThoughtMCP Testing Framework
 * 
 * This configuration file defines test parameters, thresholds, and settings
 * for the comprehensive testing framework.
 */

import { ProcessingMode } from '../../types/core.js';

export interface TestConfig {
  // Performance thresholds
  performance: {
    maxExecutionTime: {
      think: number;
      remember: number;
      recall: number;
      analyze: number;
    };
    maxMemoryUsage: {
      think: number;
      remember: number;
      recall: number;
      analyze: number;
    };
    minThroughput: {
      concurrent_operations: number;
      operations_per_second: number;
    };
  };

  // Cognitive compliance thresholds
  cognitive: {
    minComplianceScore: number;
    requiredComponents: string[];
    processingModes: ProcessingMode[];
    memoryIntegrationRequired: boolean;
    emotionalProcessingRequired: boolean;
    metacognitionRequired: boolean;
  };

  // Bias detection thresholds
  bias: {
    maxOverallBiasScore: number;
    maxConfidenceBias: number;
    maxAvailabilityBias: number;
    maxConfirmationBias: number;
    maxAnchoringBias: number;
  };

  // Test execution settings
  execution: {
    defaultTimeout: number;
    performanceIterations: number;
    stressTestDuration: number;
    concurrentTestLimit: number;
    retryAttempts: number;
  };

  // Memory system test settings
  memory: {
    consolidationTestDuration: number;
    decayTestDuration: number;
    maxMemoryLeakGrowth: number;
    memoryPressureThreshold: number;
  };

  // Validation settings
  validation: {
    strictMode: boolean;
    requireAllFields: boolean;
    validateTypeConsistency: boolean;
    checkBoundaryConditions: boolean;
  };

  // Logging and reporting
  reporting: {
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    generateDetailedReports: boolean;
    saveTestArtifacts: boolean;
    exportMetrics: boolean;
  };
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: TestConfig = {
  performance: {
    maxExecutionTime: {
      think: 1000,      // 1 second
      remember: 200,    // 200ms
      recall: 500,      // 500ms
      analyze: 300      // 300ms
    },
    maxMemoryUsage: {
      think: 50 * 1024 * 1024,    // 50MB
      remember: 10 * 1024 * 1024, // 10MB
      recall: 20 * 1024 * 1024,   // 20MB
      analyze: 15 * 1024 * 1024   // 15MB
    },
    minThroughput: {
      concurrent_operations: 10,
      operations_per_second: 5
    }
  },

  cognitive: {
    minComplianceScore: 0.8,
    requiredComponents: [
      'sensory_processor',
      'working_memory',
      'executive_processor',
      'dual_process',
      'memory_system',
      'emotional_processor',
      'metacognition'
    ],
    processingModes: [
      ProcessingMode.INTUITIVE,
      ProcessingMode.DELIBERATIVE,
      ProcessingMode.BALANCED,
      ProcessingMode.CREATIVE,
      ProcessingMode.ANALYTICAL
    ],
    memoryIntegrationRequired: true,
    emotionalProcessingRequired: true,
    metacognitionRequired: true
  },

  bias: {
    maxOverallBiasScore: 0.3,
    maxConfidenceBias: 0.2,
    maxAvailabilityBias: 0.4,
    maxConfirmationBias: 0.3,
    maxAnchoringBias: 0.25
  },

  execution: {
    defaultTimeout: 30000,        // 30 seconds
    performanceIterations: 100,
    stressTestDuration: 60000,    // 1 minute
    concurrentTestLimit: 20,
    retryAttempts: 3
  },

  memory: {
    consolidationTestDuration: 5000,   // 5 seconds
    decayTestDuration: 10000,          // 10 seconds
    maxMemoryLeakGrowth: 0.1,          // 10% growth
    memoryPressureThreshold: 0.8       // 80% of available memory
  },

  validation: {
    strictMode: true,
    requireAllFields: true,
    validateTypeConsistency: true,
    checkBoundaryConditions: true
  },

  reporting: {
    logLevel: 'INFO',
    generateDetailedReports: true,
    saveTestArtifacts: true,
    exportMetrics: true
  }
};

/**
 * Development test configuration (more lenient)
 */
export const DEV_TEST_CONFIG: TestConfig = {
  ...DEFAULT_TEST_CONFIG,
  performance: {
    ...DEFAULT_TEST_CONFIG.performance,
    maxExecutionTime: {
      think: 2000,
      remember: 400,
      recall: 1000,
      analyze: 600
    }
  },
  cognitive: {
    ...DEFAULT_TEST_CONFIG.cognitive,
    minComplianceScore: 0.6
  },
  bias: {
    ...DEFAULT_TEST_CONFIG.bias,
    maxOverallBiasScore: 0.5
  },
  execution: {
    ...DEFAULT_TEST_CONFIG.execution,
    performanceIterations: 10,
    stressTestDuration: 10000
  },
  validation: {
    ...DEFAULT_TEST_CONFIG.validation,
    strictMode: false,
    requireAllFields: false
  },
  reporting: {
    ...DEFAULT_TEST_CONFIG.reporting,
    logLevel: 'DEBUG'
  }
};

/**
 * Production test configuration (strict)
 */
export const PROD_TEST_CONFIG: TestConfig = {
  ...DEFAULT_TEST_CONFIG,
  performance: {
    ...DEFAULT_TEST_CONFIG.performance,
    maxExecutionTime: {
      think: 500,
      remember: 100,
      recall: 250,
      analyze: 150
    }
  },
  cognitive: {
    ...DEFAULT_TEST_CONFIG.cognitive,
    minComplianceScore: 0.95
  },
  bias: {
    ...DEFAULT_TEST_CONFIG.bias,
    maxOverallBiasScore: 0.15,
    maxConfidenceBias: 0.1,
    maxAvailabilityBias: 0.2,
    maxConfirmationBias: 0.15,
    maxAnchoringBias: 0.1
  },
  execution: {
    ...DEFAULT_TEST_CONFIG.execution,
    performanceIterations: 1000,
    stressTestDuration: 300000,  // 5 minutes
    concurrentTestLimit: 50
  },
  validation: {
    ...DEFAULT_TEST_CONFIG.validation,
    strictMode: true,
    requireAllFields: true,
    validateTypeConsistency: true,
    checkBoundaryConditions: true
  },
  reporting: {
    ...DEFAULT_TEST_CONFIG.reporting,
    logLevel: 'WARN'
  }
};

/**
 * Get test configuration based on environment
 */
export function getTestConfig(): TestConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PROD_TEST_CONFIG;
    case 'development':
      return DEV_TEST_CONFIG;
    case 'test':
    default:
      return DEFAULT_TEST_CONFIG;
  }
}

/**
 * Test data sets for different scenarios
 */
export const TEST_DATA_SETS = {
  simple: {
    inputs: [
      'Hello',
      'What is 2+2?',
      'Tell me about AI'
    ],
    expectedComplexity: 'low',
    expectedProcessingTime: 100
  },

  moderate: {
    inputs: [
      'Explain the concept of machine learning',
      'What are the ethical implications of AI?',
      'How does neural network training work?'
    ],
    expectedComplexity: 'medium',
    expectedProcessingTime: 500
  },

  complex: {
    inputs: [
      'Analyze the philosophical implications of artificial consciousness and propose a framework for determining machine sentience',
      'Design a comprehensive approach to AI safety that addresses alignment, robustness, and interpretability',
      'Evaluate the potential societal impacts of artificial general intelligence and recommend governance structures'
    ],
    expectedComplexity: 'high',
    expectedProcessingTime: 2000
  },

  edge_cases: {
    inputs: [
      '',
      'a'.repeat(10000),
      '🤖🧠💭🔬🎯',
      'What is the meaning of life, the universe, and everything? Please provide a comprehensive analysis covering philosophical, scientific, and existential perspectives while considering multiple cultural viewpoints and addressing potential counterarguments.'
    ],
    expectedBehavior: 'graceful_handling'
  }
};

/**
 * Cognitive architecture test patterns
 */
export const COGNITIVE_TEST_PATTERNS = {
  hierarchical_processing: {
    input: 'Process this through all cognitive layers',
    expectedComponents: ['sensory', 'working_memory', 'executive'],
    minComponentCount: 3
  },

  dual_process_system1: {
    input: '2 + 2 = ?',
    expectedMode: ProcessingMode.INTUITIVE,
    maxProcessingTime: 100
  },

  dual_process_system2: {
    input: 'What are the long-term implications of quantum computing for cryptography?',
    expectedMode: ProcessingMode.DELIBERATIVE,
    minProcessingTime: 200
  },

  memory_integration: {
    setup: 'Store: "Quantum computers use qubits"',
    input: 'Tell me about quantum computing',
    expectedMemoryRetrieval: true
  },

  emotional_processing: {
    input: 'I am devastated by this terrible news',
    expectedEmotions: ['sadness', 'distress'],
    expectedValence: 'negative'
  },

  metacognitive_monitoring: {
    input: 'I am not sure about this complex topic',
    expectedConfidenceRange: [0.2, 0.6],
    expectedSelfAssessment: true
  },

  stochastic_processing: {
    input: 'Generate a creative story',
    temperature: 1.5,
    iterations: 5,
    expectedVariability: 0.8
  }
};

export default getTestConfig;