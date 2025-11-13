/**
 * Example Async Test
 *
 * This example demonstrates testing asynchronous operations.
 * Follow this pattern for testing promises and async/await.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { retryWithBackoff, sleep, waitFor } from "../utils/test-helpers";

// Simple async service for demonstration
class AsyncService {
  private data: Map<string, string> = new Map();

  async fetchData(key: string): Promise<string> {
    await sleep(10); // Simulate network delay

    const value = this.data.get(key);
    if (!value) {
      throw new Error(`Key not found: ${key}`);
    }

    return value;
  }

  async saveData(key: string, value: string): Promise<void> {
    await sleep(10); // Simulate network delay
    this.data.set(key, value);
  }

  async deleteData(key: string): Promise<boolean> {
    await sleep(10); // Simulate network delay
    return this.data.delete(key);
  }

  async batchFetch(keys: string[]): Promise<Map<string, string>> {
    await sleep(20); // Simulate network delay

    const results = new Map<string, string>();
    for (const key of keys) {
      const value = this.data.get(key);
      if (value) {
        results.set(key, value);
      }
    }

    return results;
  }

  clear(): void {
    this.data.clear();
  }
}

describe("AsyncService", () => {
  let service: AsyncService;

  beforeEach(() => {
    service = new AsyncService();
  });

  describe("fetchData", () => {
    it("should fetch existing data", async () => {
      // Arrange
      await service.saveData("key1", "value1");

      // Act
      const result = await service.fetchData("key1");

      // Assert
      expect(result).toBe("value1");
    });

    it("should throw error for non-existent key", async () => {
      // Act & Assert
      await expect(service.fetchData("nonexistent")).rejects.toThrow("Key not found");
    });

    it("should handle concurrent fetches", async () => {
      // Arrange
      await service.saveData("key1", "value1");
      await service.saveData("key2", "value2");

      // Act: Fetch concurrently
      const [result1, result2] = await Promise.all([
        service.fetchData("key1"),
        service.fetchData("key2"),
      ]);

      // Assert
      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
    });
  });

  describe("saveData", () => {
    it("should save data successfully", async () => {
      // Act
      await service.saveData("key1", "value1");

      // Assert
      const result = await service.fetchData("key1");
      expect(result).toBe("value1");
    });

    it("should overwrite existing data", async () => {
      // Arrange
      await service.saveData("key1", "value1");

      // Act
      await service.saveData("key1", "value2");

      // Assert
      const result = await service.fetchData("key1");
      expect(result).toBe("value2");
    });
  });

  describe("deleteData", () => {
    it("should delete existing data", async () => {
      // Arrange
      await service.saveData("key1", "value1");

      // Act
      const deleted = await service.deleteData("key1");

      // Assert
      expect(deleted).toBe(true);
      await expect(service.fetchData("key1")).rejects.toThrow();
    });

    it("should return false for non-existent key", async () => {
      // Act
      const deleted = await service.deleteData("nonexistent");

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe("batchFetch", () => {
    it("should fetch multiple keys", async () => {
      // Arrange
      await service.saveData("key1", "value1");
      await service.saveData("key2", "value2");
      await service.saveData("key3", "value3");

      // Act
      const results = await service.batchFetch(["key1", "key2", "key3"]);

      // Assert
      expect(results.size).toBe(3);
      expect(results.get("key1")).toBe("value1");
      expect(results.get("key2")).toBe("value2");
      expect(results.get("key3")).toBe("value3");
    });

    it("should handle partial results", async () => {
      // Arrange
      await service.saveData("key1", "value1");
      // key2 doesn't exist
      await service.saveData("key3", "value3");

      // Act
      const results = await service.batchFetch(["key1", "key2", "key3"]);

      // Assert
      expect(results.size).toBe(2);
      expect(results.has("key1")).toBe(true);
      expect(results.has("key2")).toBe(false);
      expect(results.has("key3")).toBe(true);
    });
  });

  describe("async utilities", () => {
    it("should wait for condition", async () => {
      // Arrange
      let ready = false;
      setTimeout(() => {
        ready = true;
      }, 50);

      // Act & Assert
      await waitFor(() => ready, 1000, 10);
      expect(ready).toBe(true);
    });

    it("should retry on failure", async () => {
      // Arrange
      let attempts = 0;
      const flaky = async (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      };

      // Act
      const result = await retryWithBackoff(flaky, 3, 10);

      // Assert
      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });
  });
});

/**
 * Key Takeaways:
 *
 * 1. Use async/await for async tests
 * 2. Test promise resolution and rejection
 * 3. Test concurrent operations
 * 4. Use test utilities for common patterns
 * 5. Test error handling
 * 6. Keep tests fast (use short delays)
 * 7. Test retry logic and timeouts
 * 8. Clean up async resources
 */
