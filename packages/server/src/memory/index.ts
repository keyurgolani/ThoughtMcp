/**
 * Memory System Module
 *
 * Exports memory repository and types for memory creation, storage, and retrieval.
 */

export {
  ArchiveManager,
  ArchiveManagerError,
  DEFAULT_ARCHIVE_CONFIG,
  createArchiveManager,
  type ArchiveConfig,
  type ArchiveResult,
  type ArchiveStats,
  type ArchivedMemory,
  type RestoreResult,
} from "./archive-manager.js";
export {
  ConsolidationEngine,
  ConsolidationEngineError,
  DEFAULT_CONSOLIDATION_CONFIG,
  createConsolidationEngine,
  type ConsolidationConfig,
  type ConsolidationResult,
  type MemoryCluster,
} from "./consolidation-engine.js";
export {
  ConsolidationScheduler,
  ConsolidationSchedulerError,
  DEFAULT_SCHEDULER_CONFIG,
  createConsolidationScheduler,
  type SchedulerConfig,
  type SchedulerStatus,
} from "./consolidation-scheduler.js";
export {
  ContentValidator,
  createContentValidator,
  truncateContent,
  type ContentValidationError,
  type ContentValidationResult,
  type ContentValidatorOptions,
} from "./content-validator.js";
export {
  ExportImportError,
  ExportImportService,
  createExportImportService,
  type ExportFilter,
  type ExportResult,
  type ExportedMemory,
  type ImportOptions,
  type ImportResult,
  type ValidationResult,
} from "./export-import-service.js";
export {
  HealthMonitor,
  HealthMonitorError,
  createHealthMonitor,
  type ForgettingCandidates,
  type HealthRecommendation,
  type MemoryCountsByAge,
  type MemoryCountsBySector,
  type MemoryHealthResponse,
  type StorageMetrics,
} from "./health-monitor.js";
export { MemoryRepository } from "./memory-repository.js";
export {
  MetadataMerger,
  createMetadataMerger,
  type MetadataMergeResult,
  type MetadataUpdate,
} from "./metadata-merger.js";
export {
  DEFAULT_PRUNING_CRITERIA,
  PruningService,
  PruningServiceError,
  createPruningService,
  type ForgettingCandidate,
  type ForgettingReason,
  type PruningCriteria,
  type PruningResult,
} from "./pruning-service.js";
export {
  QualityAnalyzer,
  QualityAnalyzerError,
  createQualityAnalyzer,
  type AccessPattern,
  type AccessPatternType,
  type DuplicateCandidate,
  type QualityMetrics,
  type QualityTrend,
} from "./quality-analyzer.js";
export {
  TaggingError,
  TaggingService,
  createTaggingService,
  type MemoryTag,
  type TagSearchOperator,
  type TagStatistics,
  type TagSuggestion,
} from "./tagging-service.js";
export * from "./types.js";
