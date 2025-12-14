/**
 * Framework Registry
 *
 * Singleton registry that manages all available systematic thinking frameworks.
 * Provides lookup, metadata retrieval, and framework management capabilities.
 */

import { CriticalThinkingFramework } from "./frameworks/critical-thinking.js";
import { DesignThinkingFramework } from "./frameworks/design-thinking.js";
import { RootCauseAnalysisFramework } from "./frameworks/root-cause-analysis.js";
import { ScientificMethodFramework } from "./frameworks/scientific-method.js";
import { SystemsThinkingFramework } from "./frameworks/systems-thinking.js";
import type { ThinkingFramework } from "./types.js";

/**
 * Framework metadata for lightweight operations
 */
export interface FrameworkMetadata {
  id: string;
  name: string;
  description: string;
  version?: string;
}

/**
 * Framework Registry Singleton
 *
 * Manages all available systematic thinking frameworks and provides
 * lookup and metadata retrieval capabilities.
 */
export class FrameworkRegistry {
  private static instance: FrameworkRegistry;
  private frameworks: Map<string, ThinkingFramework>;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.frameworks = new Map();
    this.registerFrameworks();
  }

  /**
   * Get the singleton instance of FrameworkRegistry
   */
  public static getInstance(): FrameworkRegistry {
    if (!FrameworkRegistry.instance) {
      FrameworkRegistry.instance = new FrameworkRegistry();
    }
    return FrameworkRegistry.instance;
  }

  /**
   * Register all available frameworks
   */
  private registerFrameworks(): void {
    const frameworkInstances: ThinkingFramework[] = [
      new ScientificMethodFramework(),
      new DesignThinkingFramework(),
      new SystemsThinkingFramework(),
      new CriticalThinkingFramework(),
      new RootCauseAnalysisFramework(),
    ];

    for (const framework of frameworkInstances) {
      this.frameworks.set(framework.id, framework);
    }
  }

  /**
   * Get a framework by its ID
   *
   * @param id - Framework identifier
   * @returns Framework instance or undefined if not found
   */
  public getFramework(id: string): ThinkingFramework | undefined {
    if (!id || typeof id !== "string") {
      return undefined;
    }
    return this.frameworks.get(id);
  }

  /**
   * Get all registered frameworks
   *
   * @returns Array of all framework instances
   */
  public getAllFrameworks(): ThinkingFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get all framework IDs
   *
   * @returns Array of framework identifiers
   */
  public getFrameworkIds(): string[] {
    return Array.from(this.frameworks.keys());
  }

  /**
   * Get framework metadata without full framework instance
   *
   * @param id - Framework identifier
   * @returns Framework metadata or undefined if not found
   */
  public getFrameworkMetadata(id: string): FrameworkMetadata | undefined {
    const framework = this.getFramework(id);
    if (!framework) {
      return undefined;
    }

    return {
      id: framework.id,
      name: framework.name,
      description: framework.description,
      version: framework.version,
    };
  }

  /**
   * Get metadata for all registered frameworks
   *
   * @returns Array of framework metadata
   */
  public getAllFrameworksMetadata(): FrameworkMetadata[] {
    return this.getAllFrameworks().map((framework) => ({
      id: framework.id,
      name: framework.name,
      description: framework.description,
      version: framework.version,
    }));
  }
}
