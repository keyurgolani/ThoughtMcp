# ThoughtMCP Cognitive Architecture Complete Rebuild - Requirements Document

## Introduction

This specification defines the comprehensive rebuild of ThoughtMCP's cognitive architecture, transforming it from a basic cognitive system into a production-ready, biologically-inspired AI brain construct. The rebuild integrates Hierarchical Memory Decomposition (HMD) with PostgreSQL persistence, real-time systematic thinking capabilities, parallel reasoning streams, dynamic framework selection, confidence calibration, bias detection, emotional intelligence, and metacognitive monitoring.

The system SHALL provide persistent cross-session memory, sub-200ms retrieval performance at scale, 95%+ test coverage, and cost-efficient operation (<$10/month per 100k memories). This rebuild addresses current limitations including lack of persistence, memory-dependent reasoning, sequential processing constraints, limited bias detection, absence of systematic thinking frameworks, and insufficient cognitive transparency.

## Glossary

- **ThoughtMCP_System**: The complete cognitive architecture system including memory, reasoning, and metacognitive components
- **HMD**: Hierarchical Memory Decomposition - multi-sector memory architecture with five specialized embedding types
- **Memory_Sector**: One of five specialized memory types (Episodic, Semantic, Procedural, Emotional, Reflective)
- **Waypoint_Graph**: Sparse graph structure where each memory links to 1-3 most similar memories
- **Composite_Score**: Weighted retrieval score combining similarity (0.6), salience (0.2), recency (0.1), and link weight (0.1)
- **Temporal_Decay**: Exponential memory strength reduction over time following Ebbinghaus forgetting curve
- **Reinforcement**: Strength boost (+0.3) applied when memory is accessed or explicitly reinforced
- **Parallel_Reasoning**: Concurrent execution of 4 reasoning streams (Analytical, Creative, Critical, Synthetic)
- **Framework_Selection**: Dynamic choice of systematic thinking framework based on problem characteristics
- **Confidence_Calibration**: Metacognitive assessment ensuring predicted confidence matches actual performance within ±10%
- **Bias_Detection**: Real-time identification of cognitive biases (confirmation, anchoring, availability, etc.)
- **Emotion_Detection**: Multi-dimensional emotion analysis using Circumplex model (valence, arousal, dominance)
- **PostgreSQL_Database**: Production-grade relational database with pgvector extension for vector operations
- **Embedding_Model**: Local or cloud-based model generating vector representations (Ollama, E5, BGE, OpenAI)
- **MCP_Tool**: Model Context Protocol tool exposed for LLM interaction
- **Test_Coverage**: Percentage of code executed by automated tests (target: 95%+)
- **Retrieval_Latency**: Time from query to result delivery (targets: p50<100ms, p95<200ms, p99<500ms)

## Requirements

### Requirement 1: PostgreSQL Foundation and HMD Memory System

**User Story:** As a developer, I want persistent memory storage with Hierarchical Memory Decomposition so that memories survive across sessions and provide nuanced multi-sector retrieval.

#### Acceptance Criteria

1. WHEN the ThoughtMCP_System starts, THEN the ThoughtMCP_System SHALL establish a PostgreSQL_Database connection with connection pooling and the connection SHALL succeed within 5 seconds
2. WHEN a memory is created, THEN the ThoughtMCP_System SHALL generate five sector-specific embeddings (Episodic, Semantic, Procedural, Emotional, Reflective) and the ThoughtMCP_System SHALL store all embeddings in the memory_embeddings table within 500 milliseconds
3. WHEN a memory is stored, THEN the ThoughtMCP_System SHALL create 1 to 3 Waypoint_Graph connections to similar existing memories and each connection SHALL have a similarity score above 0.7 threshold
4. WHEN a retrieval query is executed with 100,000 memories in the PostgreSQL_Database, THEN the ThoughtMCP_System SHALL return results using Composite_Score ranking and the Retrieval_Latency SHALL be less than 200 milliseconds at p95
5. WHEN the ThoughtMCP_System restarts, THEN the ThoughtMCP_System SHALL restore all previously stored memories from the PostgreSQL_Database and zero memories SHALL be lost

### Requirement 2: Temporal Decay and Memory Lifecycle

**User Story:** As a system administrator, I want automatic memory decay and reinforcement so that relevant memories persist while stale memories are pruned efficiently.

#### Acceptance Criteria

1. WHEN 24 hours elapse since a memory was last accessed, THEN the ThoughtMCP_System SHALL apply Temporal_Decay using the formula strength = initial × exp(-λ × time) and the memory strength SHALL decrease according to sector-specific decay rates
2. WHEN a memory is accessed or retrieved, THEN the ThoughtMCP_System SHALL apply Reinforcement by adding 0.3 to the current strength value and the strength SHALL not exceed 1.0 maximum
3. WHEN a memory strength falls below 0.2 threshold and importance is below 0.3 threshold, THEN the ThoughtMCP_System SHALL mark the memory as a pruning candidate and the memory SHALL be eligible for deletion
4. WHEN the background decay scheduler runs daily at 2 AM, THEN the ThoughtMCP_System SHALL process all memories in batches of 1000 and the processing SHALL complete within 30 minutes for 100,000 memories
5. WHEN Temporal_Decay reduces storage by 30 to 50 percent over 90 days, THEN the ThoughtMCP_System SHALL maintain retrieval accuracy above 90 percent and no critical memories SHALL be lost

### Requirement 3: Memory Search and Retrieval

**User Story:** As a user, I want fast and accurate memory retrieval using multiple search strategies so that I can find relevant information quickly across large memory stores.

#### Acceptance Criteria

1. WHEN a search query is submitted, THEN the ThoughtMCP_System SHALL execute vector similarity search using pgvector cosine distance operator and the search SHALL utilize IVFFlat indexes for performance
2. WHEN full-text search is requested, THEN the ThoughtMCP_System SHALL use PostgreSQL ts_vector with GIN indexes and the search SHALL support boolean operators and phrase matching
3. WHEN metadata filtering is applied with keywords or tags, THEN the ThoughtMCP_System SHALL filter using GIN indexes on array columns and the filtering SHALL complete within 50 milliseconds
4. WHEN similar memories are requested, THEN the ThoughtMCP_System SHALL calculate similarity using keyword overlap (30%), tag similarity (25%), content similarity (20%), category matching (15%), and temporal proximity (10%) and the ThoughtMCP_System SHALL return memories ranked by composite similarity score
5. WHEN retrieval is performed on 100,000 memories, THEN the ThoughtMCP_System SHALL achieve p50 Retrieval_Latency below 100 milliseconds and p95 Retrieval_Latency below 200 milliseconds and p99 Retrieval_Latency below 500 milliseconds

### Requirement 4: Parallel Reasoning Streams

**User Story:** As a user, I want parallel reasoning capabilities so that complex problems are analyzed from multiple perspectives simultaneously.

#### Acceptance Criteria

1. WHEN a complex problem is submitted for reasoning, THEN the ThoughtMCP_System SHALL execute four Parallel_Reasoning streams concurrently (Analytical, Creative, Critical, Synthetic) and all streams SHALL process independently
2. WHEN Parallel_Reasoning streams execute, THEN the ThoughtMCP_System SHALL complete all four streams within 30 seconds total timeout and each individual stream SHALL have a 10 second timeout
3. WHEN reasoning streams reach 25, 50, and 75 percent completion, THEN the ThoughtMCP_System SHALL synchronize streams and share selective insights and the synchronization overhead SHALL be less than 10 percent of total processing time
4. WHEN reasoning streams produce conflicting conclusions, THEN the ThoughtMCP_System SHALL preserve all conflicts in the synthesis and the ThoughtMCP_System SHALL provide explanations for each conflicting viewpoint
5. WHEN Parallel_Reasoning completes, THEN the ThoughtMCP_System SHALL synthesize results from all streams and the synthesis SHALL include insights attributed to source streams and ranked recommendations

### Requirement 5: Dynamic Framework Selection

**User Story:** As a user, I want automatic selection of appropriate thinking frameworks so that problems are approached with the most suitable systematic methodology.

#### Acceptance Criteria

1. WHEN a problem is submitted, THEN the ThoughtMCP_System SHALL classify the problem across four dimensions (complexity: simple/moderate/complex, uncertainty: low/medium/high, stakes: routine/important/critical, time pressure: none/moderate/high) and the classification SHALL complete within 2 seconds
2. WHEN problem classification is complete, THEN the ThoughtMCP_System SHALL select the optimal Framework_Selection from eight available frameworks (Scientific Method, Design Thinking, Systems Thinking, Critical Thinking, Creative Problem Solving, Root Cause Analysis, First Principles, Scenario Planning) and the selection accuracy SHALL exceed 80 percent
3. WHEN a single framework is insufficient, THEN the ThoughtMCP_System SHALL create a hybrid framework combining 2 to 3 complementary frameworks and the hybrid SHALL maintain coherent execution flow
4. WHEN framework execution encounters obstacles, THEN the ThoughtMCP_System SHALL detect the obstacle within 5 seconds and the ThoughtMCP_System SHALL adapt the strategy or switch frameworks dynamically
5. WHEN framework selection is evaluated over 100 problems, THEN the ThoughtMCP_System SHALL demonstrate improving selection accuracy through learning and the accuracy SHALL increase by at least 5 percent over the evaluation period

### Requirement 6: Confidence Calibration System

**User Story:** As a user, I want accurate confidence assessments so that I can trust the system's self-evaluation and make informed decisions.

#### Acceptance Criteria

1. WHEN the ThoughtMCP_System produces a reasoning result, THEN the ThoughtMCP_System SHALL assess confidence across five dimensions (evidence quality, reasoning coherence, completeness, uncertainty level, bias freedom) and the assessment SHALL complete within 100 milliseconds
2. WHEN confidence is predicted, THEN the ThoughtMCP_System SHALL calibrate the prediction using historical performance data and the predicted confidence SHALL match actual performance within ±10 percent
3. WHEN confidence is below 0.5 threshold, THEN the ThoughtMCP_System SHALL provide explicit warnings and the ThoughtMCP_System SHALL recommend actions such as seeking more information or switching to deliberative mode
4. WHEN the ThoughtMCP_System accumulates 1000 prediction-outcome pairs, THEN the ThoughtMCP_System SHALL train domain-specific Confidence_Calibration models and the calibration accuracy SHALL improve by at least 15 percent
5. WHEN confidence is communicated to users, THEN the ThoughtMCP_System SHALL provide clear interpretation guidance and the ThoughtMCP_System SHALL explain the factors contributing to the confidence level

### Requirement 7: Bias Detection and Mitigation

**User Story:** As a user, I want automatic bias detection so that reasoning is more objective and systematic errors are identified and corrected.

#### Acceptance Criteria

1. WHEN reasoning is performed, THEN the ThoughtMCP_System SHALL monitor for eight bias types (confirmation bias, anchoring bias, availability bias, recency bias, representativeness bias, framing effects, sunk cost fallacy, attribution bias) and the monitoring SHALL occur in real-time
2. WHEN a bias is detected, THEN the ThoughtMCP_System SHALL identify the bias within 2 to 3 seconds and the ThoughtMCP_System SHALL assess the bias severity on a scale from 0 to 1
3. WHEN biases are evaluated across 100 reasoning tasks, THEN the ThoughtMCP_System SHALL achieve a Bias_Detection rate exceeding 70 percent for known bias patterns and false positive rate SHALL be below 15 percent
4. WHEN a bias is detected, THEN the ThoughtMCP_System SHALL apply appropriate correction strategies (devil's advocate, perspective-taking, evidence reweighting) and the correction SHALL reduce bias impact by at least 40 percent
5. WHEN Bias_Detection operates, THEN the ThoughtMCP_System SHALL maintain performance overhead below 15 percent of total reasoning time and the detection SHALL not significantly impact user experience

### Requirement 8: Emotion Detection and Emotional Intelligence

**User Story:** As a user, I want emotion-aware reasoning so that the system understands emotional context and responds appropriately.

#### Acceptance Criteria

1. WHEN user input is processed, THEN the ThoughtMCP_System SHALL detect emotions using the Circumplex model (valence: -1 to +1, arousal: 0 to 1, dominance: -1 to +1) and the ThoughtMCP_System SHALL classify discrete emotions (joy, sadness, anger, fear, disgust, surprise, pride, shame, guilt, gratitude, awe)
2. WHEN Emotion_Detection is performed, THEN the ThoughtMCP_System SHALL achieve detection accuracy exceeding 75 percent compared to human labels and the detection SHALL complete within 200 milliseconds
3. WHEN emotional state is detected, THEN the ThoughtMCP_System SHALL adjust reasoning behavior appropriately (high arousal increases risk aversion, positive valence increases persistence, negative valence triggers conservative approach) and the adjustments SHALL feel natural to users
4. WHEN emotional trajectory is tracked over a session, THEN the ThoughtMCP_System SHALL identify emotional shifts and patterns and the ThoughtMCP_System SHALL recognize triggers for emotional changes
5. WHEN empathic responses are generated, THEN the ThoughtMCP_System SHALL match emotional tone appropriately in 80 percent of interactions and user-reported empathy ratings SHALL exceed 4 out of 5

### Requirement 9: Metacognitive Monitoring and Self-Improvement

**User Story:** As a system administrator, I want metacognitive monitoring so that the system continuously improves its reasoning strategies and learns from experience.

#### Acceptance Criteria

1. WHEN reasoning is performed, THEN the ThoughtMCP_System SHALL track performance metrics (reasoning quality, confidence accuracy, bias detection effectiveness, framework selection appropriateness, user satisfaction) and the tracking SHALL occur automatically for all operations
2. WHEN performance patterns are identified, THEN the ThoughtMCP_System SHALL analyze success and failure patterns and the ThoughtMCP_System SHALL identify which strategies work best for which problem types
3. WHEN strategy effectiveness is measured over 30 days, THEN the ThoughtMCP_System SHALL demonstrate performance improvement of 5 to 10 percent per month and the improvement SHALL be measurable across multiple quality dimensions
4. WHEN user feedback is provided, THEN the ThoughtMCP_System SHALL integrate the feedback into learning systems and the ThoughtMCP_System SHALL adjust strategy selection and bias sensitivity based on feedback
5. WHEN metacognitive overhead is measured, THEN the ThoughtMCP_System SHALL maintain overhead below 15 percent of total processing time and the monitoring SHALL not degrade user experience

### Requirement 10: Production Hardening and Quality Assurance

**User Story:** As a quality assurance engineer, I want comprehensive testing and monitoring so that the system is reliable, performant, and ready for production deployment.

#### Acceptance Criteria

1. WHEN the codebase is analyzed, THEN the ThoughtMCP_System SHALL achieve Test_Coverage exceeding 95 percent and all critical paths SHALL have 100 percent coverage
2. WHEN performance is measured, THEN the ThoughtMCP_System SHALL meet all latency targets (memory retrieval p95<200ms, parallel reasoning<30s, confidence assessment<100ms, bias detection overhead<15%, emotion detection<200ms) and the targets SHALL be validated through automated benchmarks
3. WHEN the ThoughtMCP_System operates in production, THEN the ThoughtMCP_System SHALL achieve 99.9 percent uptime and mean time to detect (MTTD) SHALL be less than 5 minutes and mean time to resolve (MTTR) SHALL be less than 1 hour
4. WHEN errors occur, THEN the ThoughtMCP_System SHALL handle errors gracefully with automatic recovery and the ThoughtMCP_System SHALL log all errors with actionable context and user-friendly error messages SHALL be provided
5. WHEN cost is measured, THEN the ThoughtMCP_System SHALL operate at less than $10 per month per 100,000 memories using local embeddings and the system SHALL support horizontal scaling to 1 million memories per user

### Requirement 11: MCP Tool Integration

**User Story:** As a developer, I want comprehensive MCP tools so that all cognitive capabilities are accessible through the Model Context Protocol.

#### Acceptance Criteria

1. WHEN MCP_Tool registration occurs, THEN the ThoughtMCP_System SHALL expose all cognitive capabilities through MCP tools (memory operations, reasoning modes, systematic thinking, bias detection, emotion analysis, metacognitive monitoring) and all tools SHALL have comprehensive parameter schemas
2. WHEN an MCP_Tool is invoked, THEN the ThoughtMCP_System SHALL validate all parameters and the ThoughtMCP_System SHALL return helpful error messages for invalid inputs with suggestions for correction
3. WHEN MCP_Tool responses are generated, THEN the ThoughtMCP_System SHALL use standardized response format with metadata (timestamp, processing time, cognitive components used, confidence level) and user guidance (next steps, related tools, workflow suggestions)
4. WHEN MCP tools are tested, THEN the ThoughtMCP_System SHALL respond correctly to all valid requests and the response time SHALL meet tool-specific latency targets
5. WHEN the MCP server starts, THEN the ThoughtMCP_System SHALL initialize within 10 seconds and all tools SHALL be immediately available for use

### Requirement 12: Test Framework and Development Setup

**User Story:** As a developer, I want a modern test framework and development setup so that I can efficiently develop, test, and validate cognitive features.

#### Acceptance Criteria

1. WHEN the test framework is configured, THEN the ThoughtMCP_System SHALL use Vitest with TypeScript support and ES modules and the framework SHALL support unit tests, integration tests, end-to-end tests, and performance tests
2. WHEN tests are executed, THEN the ThoughtMCP_System SHALL provide test isolation with automatic cleanup and the tests SHALL support PostgreSQL test database with setup and teardown utilities
3. WHEN test utilities are used, THEN the ThoughtMCP_System SHALL provide test data factories, mock embeddings, database fixtures, and custom assertions and the utilities SHALL simplify test creation
4. WHEN development environment is set up, THEN the ThoughtMCP_System SHALL provide Docker Compose for PostgreSQL with pgvector and the setup SHALL include database initialization scripts and migration system
5. WHEN npm scripts are executed, THEN the ThoughtMCP_System SHALL provide scripts for development (dev, build, clean), testing (test, test:unit, test:integration, test:coverage), database (db:setup, db:migrate, db:reset), and quality (lint, format, typecheck, validate) and all scripts SHALL execute without errors

### Requirement 13: Workspace Cleanup and Organization

**User Story:** As a developer, I want a clean workspace with only essential files so that the codebase is maintainable and free of legacy artifacts.

#### Acceptance Criteria

1. WHEN workspace cleanup is performed, THEN the ThoughtMCP_System SHALL reset all local changes to remote branch state and the ThoughtMCP_System SHALL remove all untracked files and directories
2. WHEN old implementations are removed, THEN the ThoughtMCP_System SHALL delete all existing cognitive implementation files (src/cognitive/, src/server/, src/utils/, src/types/, src/interfaces/) and the ThoughtMCP_System SHALL preserve only src/index.ts as entry point
3. WHEN old tests are removed, THEN the ThoughtMCP_System SHALL delete the entire src/**tests**/ directory and all test files and the workspace SHALL be ready for new test framework
4. WHEN old documentation is removed, THEN the ThoughtMCP_System SHALL delete docs/ and examples/ directories and the ThoughtMCP_System SHALL preserve only README.md and LICENSE
5. WHEN environment configuration is cleaned, THEN the ThoughtMCP_System SHALL remove legacy environment variables from MCP configuration and the ThoughtMCP_System SHALL retain only required PostgreSQL variables (DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_POOL_SIZE, EMBEDDING_MODEL, EMBEDDING_DIMENSION, LOG_LEVEL, NODE_ENV)
