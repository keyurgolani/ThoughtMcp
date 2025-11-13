/**
 * Database Connection Manager
 *
 * PostgreSQL connection management with pooling, transactions, and error handling.
 * Implements connection pooling, automatic reconnection, and comprehensive error handling.
 */

import { Pool, type PoolClient } from "pg";

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolSize: number; // default 20
  connectionTimeout: number; // default 5000ms
  idleTimeout: number; // default 30000ms
}

/**
 * Pool statistics interface
 */
export interface PoolStatistics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
}

/**
 * Database Connection Manager class
 * Manages PostgreSQL connections with pooling, transactions, and error handling
 */
export class DatabaseConnectionManager {
  pool: Pool | null = null;
  config: DatabaseConfig;
  private maxRetries = 3; // Max connection attempts
  private retryDelay = 1000; // Start with 1 second
  private hasConnected = false; // Track if connect() was ever called

  constructor(config: Partial<DatabaseConfig>) {
    // Apply defaults - but preserve explicit empty strings for validation
    this.config = {
      host: config.host ?? "localhost",
      port: config.port ?? 5432,
      database: config.database ?? "",
      user: config.user ?? "",
      password: config.password ?? "",
      poolSize: config.poolSize ?? 20,
      connectionTimeout: config.connectionTimeout ?? 5000,
      idleTimeout: config.idleTimeout ?? 30000,
    };
  }

  /**
   * Validate configuration before connecting
   */
  private validateConfig(): void {
    if (!this.config.host || this.config.host.trim() === "") {
      throw new Error("Invalid configuration: host is required");
    }
    if (this.config.port <= 0 || this.config.port > 65535) {
      throw new Error("Invalid configuration: port must be between 1 and 65535");
    }
    if (!this.config.database || this.config.database.trim() === "") {
      throw new Error("Invalid configuration: database is required");
    }
    if (!this.config.user || this.config.user.trim() === "") {
      throw new Error("Invalid configuration: user is required");
    }
    if (this.config.poolSize <= 0) {
      throw new Error("Invalid configuration: poolSize must be greater than 0");
    }
    if (this.config.connectionTimeout < 0) {
      throw new Error("Invalid configuration: connectionTimeout must be non-negative");
    }
    if (this.config.idleTimeout < 0) {
      throw new Error("Invalid configuration: idleTimeout must be non-negative");
    }
  }

  /**
   * Connect to PostgreSQL with connection pooling
   * Implements retry logic with exponential backoff
   */
  async connect(): Promise<void> {
    // If already connected, return
    if (this.pool) {
      return;
    }

    // Validate configuration
    this.validateConfig();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.pool = new Pool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          max: this.config.poolSize,
          connectionTimeoutMillis: this.config.connectionTimeout,
          idleTimeoutMillis: this.config.idleTimeout,
        });

        // Test connection
        await this.pool.query("SELECT 1");
        this.hasConnected = true;
        return;
      } catch (error) {
        lastError = error as Error;

        // Clean up failed pool
        if (this.pool) {
          try {
            await this.pool.end();
          } catch {
            // Ignore cleanup errors
          }
          this.pool = null;
        }

        // If this was the last attempt, throw
        if (attempt === this.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(this.retryDelay * 2 ** (attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error("Failed to connect to database");
  }

  /**
   * Disconnect from PostgreSQL and clean up resources
   */
  async disconnect(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.end();
    } finally {
      this.pool = null;
    }
  }

  /**
   * Get a connection from the pool
   * Automatically reconnects if connection was lost after initial connect
   */
  async getConnection(): Promise<PoolClient> {
    // If never connected, throw error
    if (!this.pool && !this.hasConnected) {
      throw new Error("Not connected. Call connect() first.");
    }

    // If was connected but lost connection, reconnect
    if (!this.pool && this.hasConnected) {
      await this.connect();
    }

    if (!this.pool) {
      throw new Error("Failed to establish database connection");
    }

    return await this.pool.connect();
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(client: PoolClient): void {
    client.release();
  }

  /**
   * Begin a transaction
   * Returns a client that should be used for all transaction operations
   */
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.getConnection();
    await client.query("BEGIN");
    return client;
  }

  /**
   * Commit a transaction and release the client
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a transaction and release the client
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   * Returns true if database is accessible, false otherwise
   * Completes within 1 second with timeout
   */
  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      // Create a promise that times out after 1 second
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Health check timeout")), 1000);
      });

      const queryPromise = this.pool.query("SELECT 1");

      await Promise.race([queryPromise, timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): PoolStatistics {
    if (!this.pool) {
      throw new Error("Pool not initialized. Call connect() first.");
    }

    const totalConnections = this.pool.totalCount;
    const idleConnections = this.pool.idleCount;
    const waitingClients = this.pool.waitingCount;
    const activeConnections = totalConnections - idleConnections;

    return {
      totalConnections,
      idleConnections,
      activeConnections,
      waitingClients,
    };
  }
}
