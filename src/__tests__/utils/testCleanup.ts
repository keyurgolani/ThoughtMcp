/**
 * Test cleanup utilities for managing temporary files and directories
 */

import { promises as fs } from "fs";
import { join } from "path";

export class TestCleanup {
  private static createdDirectories: Set<string> = new Set();
  private static createdFiles: Set<string> = new Set();
  private static originalEnv: NodeJS.ProcessEnv = {};

  /**
   * Initialize test cleanup - call this in beforeAll or beforeEach
   */
  static initialize(): void {
    // Save original environment
    this.originalEnv = { ...process.env };
    this.createdDirectories.clear();
    this.createdFiles.clear();
  }

  /**
   * Register a directory for cleanup
   */
  static registerDirectory(path: string): void {
    this.createdDirectories.add(path);
  }

  /**
   * Register a file for cleanup
   */
  static registerFile(path: string): void {
    this.createdFiles.add(path);
  }

  /**
   * Create a temporary test directory and register it for cleanup
   */
  static async createTempDir(basePath: string = "./tmp"): Promise<string> {
    const testId = Math.random().toString(36).substring(7);
    const tempDir = join(basePath, `test-${testId}`);

    await fs.mkdir(tempDir, { recursive: true });
    this.registerDirectory(tempDir);

    return tempDir;
  }

  /**
   * Create a temporary brain directory for cognitive tests
   */
  static async createTempBrainDir(): Promise<string> {
    const brainDir = await this.createTempDir("./tmp");
    process.env.COGNITIVE_BRAIN_DIR = brainDir;
    return brainDir;
  }

  /**
   * Clean up all registered files and directories
   */
  static async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Clean up files first
    for (const filePath of this.createdFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          errors.push(error as Error);
        }
      }
    }

    // Clean up directories
    for (const dirPath of this.createdDirectories) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          errors.push(error as Error);
        }
      }
    }

    // Clean up common tmp patterns
    await this.cleanupTmpPatterns();

    // Restore environment
    process.env = { ...this.originalEnv };

    // Clear tracking sets
    this.createdDirectories.clear();
    this.createdFiles.clear();

    // Report errors if any (but don't throw to avoid breaking tests)
    if (errors.length > 0) {
      console.warn(`Test cleanup encountered ${errors.length} errors:`, errors);
    }
  }

  /**
   * Clean up common temporary file patterns
   */
  private static async cleanupTmpPatterns(): Promise<void> {
    const patterns = [
      "./tmp/test-*",
      "./tmp/test-brain*",
      "./tmp/test-data*",
      "./test-data",
    ];

    for (const pattern of patterns) {
      try {
        if (pattern.includes("*")) {
          // Handle glob patterns
          const basePath = pattern.split("*")[0];
          const baseDir = basePath.substring(0, basePath.lastIndexOf("/"));
          const prefix = basePath.substring(basePath.lastIndexOf("/") + 1);

          try {
            const entries = await fs.readdir(baseDir);
            for (const entry of entries) {
              if (entry.startsWith(prefix)) {
                const fullPath = join(baseDir, entry);
                await fs.rm(fullPath, { recursive: true, force: true });
              }
            }
          } catch (error) {
            // Directory might not exist, ignore
          }
        } else {
          // Handle exact paths
          await fs.rm(pattern, { recursive: true, force: true });
        }
      } catch (error) {
        // Ignore cleanup errors for patterns
      }
    }
  }

  /**
   * Clean up specific brain directory
   */
  static async cleanupBrainDir(brainDir?: string): Promise<void> {
    const targetDir = brainDir || process.env.COGNITIVE_BRAIN_DIR;
    if (targetDir) {
      try {
        await fs.rm(targetDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore if directory doesn't exist
      }
    }
  }

  /**
   * Get a unique test identifier
   */
  static getTestId(): string {
    return Math.random().toString(36).substring(7);
  }

  /**
   * Create a unique test file path
   */
  static getTestFilePath(
    baseName: string,
    extension: string = ".json"
  ): string {
    const testId = this.getTestId();
    const fileName = `${baseName}-${testId}${extension}`;
    const filePath = join("./tmp", fileName);
    this.registerFile(filePath);
    return filePath;
  }

  /**
   * Ensure tmp directory exists
   */
  static async ensureTmpDir(): Promise<void> {
    try {
      await fs.mkdir("./tmp", { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

/**
 * Global test setup function
 */
export function setupTestEnvironment(): void {
  TestCleanup.initialize();
}

/**
 * Global test cleanup function
 */
export async function cleanupTestEnvironment(): Promise<void> {
  await TestCleanup.cleanup();
}
