/**
 * RequestDeduplicator Tests
 *
 * Tests for the request deduplication module.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRequestDeduplicator,
  generateRequestKey,
  getDefaultDeduplicator,
  RequestDeduplicator,
  setDefaultDeduplicator,
} from "../../api/request-deduplicator";

describe("RequestDeduplicator", () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = createRequestDeduplicator();
    // Reset default deduplicator
    setDefaultDeduplicator(null);
  });

  afterEach(() => {
    deduplicator.clearAll();
    setDefaultDeduplicator(null);
  });

  describe("generateRequestKey", () => {
    it("should generate key from endpoint and empty params", () => {
      const key = generateRequestKey("/api/v1/memory/recall");
      expect(key).toBe("/api/v1/memory/recall:{}");
    });

    it("should generate key from endpoint and params", () => {
      const key = generateRequestKey("/api/v1/memory/recall", {
        userId: "user-123",
        limit: 10,
      });
      expect(key).toContain("/api/v1/memory/recall:");
      expect(key).toContain("userId");
      expect(key).toContain("user-123");
    });

    it("should generate deterministic keys regardless of param order", () => {
      const key1 = generateRequestKey("/api/v1/memory/recall", {
        userId: "user-123",
        limit: 10,
        offset: 0,
      });
      const key2 = generateRequestKey("/api/v1/memory/recall", {
        offset: 0,
        limit: 10,
        userId: "user-123",
      });
      expect(key1).toBe(key2);
    });

    it("should exclude undefined and null values from key", () => {
      const key1 = generateRequestKey("/api/v1/memory/recall", {
        userId: "user-123",
        limit: undefined,
        offset: null,
      });
      const key2 = generateRequestKey("/api/v1/memory/recall", {
        userId: "user-123",
      });
      expect(key1).toBe(key2);
    });

    it("should generate different keys for different endpoints", () => {
      const key1 = generateRequestKey("/api/v1/memory/recall", { userId: "user-123" });
      const key2 = generateRequestKey("/api/v1/memory/search", { userId: "user-123" });
      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different params", () => {
      const key1 = generateRequestKey("/api/v1/memory/recall", { userId: "user-123" });
      const key2 = generateRequestKey("/api/v1/memory/recall", { userId: "user-456" });
      expect(key1).not.toBe(key2);
    });
  });

  describe("getOrCreate", () => {
    it("should create new request when none exists", async () => {
      const factory = vi.fn().mockResolvedValue({ data: "test" });
      const key = "test-key";

      const result = await deduplicator.getOrCreate(key, factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: "test" });
    });

    it("should return existing promise for duplicate requests", async () => {
      let resolvePromise: (value: { data: string }) => void;
      const promise = new Promise<{ data: string }>((resolve) => {
        resolvePromise = resolve;
      });
      const factory = vi.fn().mockReturnValue(promise);
      const key = "test-key";

      // Start two requests simultaneously
      const promise1 = deduplicator.getOrCreate(key, factory);
      const promise2 = deduplicator.getOrCreate(key, factory);

      // Factory should only be called once
      expect(factory).toHaveBeenCalledTimes(1);

      // Both promises should be the same
      expect(promise1).toBe(promise2);

      // Resolve and verify both get the same result
      resolvePromise!({ data: "shared-result" });
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual({ data: "shared-result" });
      expect(result2).toEqual({ data: "shared-result" });
    });

    it("should share result among multiple callers", async () => {
      let resolvePromise: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });
      const factory = vi.fn().mockReturnValue(promise);
      const key = "test-key";

      // Start multiple requests
      const promises = [
        deduplicator.getOrCreate(key, factory),
        deduplicator.getOrCreate(key, factory),
        deduplicator.getOrCreate(key, factory),
      ];

      // Factory should only be called once
      expect(factory).toHaveBeenCalledTimes(1);

      // Resolve
      resolvePromise!(42);
      const results = await Promise.all(promises);

      // All should get the same result
      expect(results).toEqual([42, 42, 42]);
    });

    it("should clear cache after request completes successfully", async () => {
      const factory = vi.fn().mockResolvedValue("result");
      const key = "test-key";

      await deduplicator.getOrCreate(key, factory);

      // Cache should be cleared
      expect(deduplicator.isInFlight(key)).toBe(false);

      // New request should call factory again
      await deduplicator.getOrCreate(key, factory);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should clear cache after request fails", async () => {
      const error = new Error("Request failed");
      const factory = vi.fn().mockRejectedValue(error);
      const key = "test-key";

      await expect(deduplicator.getOrCreate(key, factory)).rejects.toThrow("Request failed");

      // Cache should be cleared
      expect(deduplicator.isInFlight(key)).toBe(false);

      // New request should call factory again
      await expect(deduplicator.getOrCreate(key, factory)).rejects.toThrow("Request failed");
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should propagate error to all waiting callers", async () => {
      let rejectPromise: (error: Error) => void;
      const promise = new Promise<string>((_, reject) => {
        rejectPromise = reject;
      });
      const factory = vi.fn().mockReturnValue(promise);
      const key = "test-key";

      // Start multiple requests
      const promise1 = deduplicator.getOrCreate(key, factory);
      const promise2 = deduplicator.getOrCreate(key, factory);
      const promise3 = deduplicator.getOrCreate(key, factory);

      // Reject the promise
      const error = new Error("Shared error");
      rejectPromise!(error);

      // All should receive the same error
      await expect(promise1).rejects.toThrow("Shared error");
      await expect(promise2).rejects.toThrow("Shared error");
      await expect(promise3).rejects.toThrow("Shared error");
    });
  });

  describe("forceNew", () => {
    it("should bypass existing in-flight request", async () => {
      let resolveFirst: (value: string) => void;
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
      const firstFactory = vi.fn().mockReturnValue(firstPromise);
      const secondFactory = vi.fn().mockResolvedValue("forced-result");
      const key = "test-key";

      // Start first request
      const promise1 = deduplicator.getOrCreate(key, firstFactory);

      // Force new request
      const promise2 = deduplicator.forceNew(key, secondFactory);

      // Both factories should be called
      expect(firstFactory).toHaveBeenCalledTimes(1);
      expect(secondFactory).toHaveBeenCalledTimes(1);

      // Resolve first request
      resolveFirst!("first-result");

      // Get results
      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe("first-result");
      expect(result2).toBe("forced-result");
    });

    it("should create new request when none exists", async () => {
      const factory = vi.fn().mockResolvedValue("result");
      const key = "test-key";

      const result = await deduplicator.forceNew(key, factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("should clear cache after forced request completes", async () => {
      const factory = vi.fn().mockResolvedValue("result");
      const key = "test-key";

      await deduplicator.forceNew(key, factory);

      expect(deduplicator.isInFlight(key)).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove specific key from cache", async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const factory = vi.fn().mockReturnValue(promise);
      const key = "test-key";

      deduplicator.getOrCreate(key, factory);
      expect(deduplicator.isInFlight(key)).toBe(true);

      deduplicator.clear(key);
      expect(deduplicator.isInFlight(key)).toBe(false);

      // Resolve to avoid unhandled rejection
      resolvePromise!("result");
    });

    it("should not affect other keys", async () => {
      let resolve1: (value: string) => void;
      let resolve2: (value: string) => void;
      const promise1 = new Promise<string>((resolve) => {
        resolve1 = resolve;
      });
      const promise2 = new Promise<string>((resolve) => {
        resolve2 = resolve;
      });

      deduplicator.getOrCreate("key1", () => promise1);
      deduplicator.getOrCreate("key2", () => promise2);

      deduplicator.clear("key1");

      expect(deduplicator.isInFlight("key1")).toBe(false);
      expect(deduplicator.isInFlight("key2")).toBe(true);

      // Resolve to avoid unhandled rejections
      resolve1!("result1");
      resolve2!("result2");
    });
  });

  describe("clearAll", () => {
    it("should remove all keys from cache", async () => {
      let resolve1: (value: string) => void;
      let resolve2: (value: string) => void;
      const promise1 = new Promise<string>((resolve) => {
        resolve1 = resolve;
      });
      const promise2 = new Promise<string>((resolve) => {
        resolve2 = resolve;
      });

      deduplicator.getOrCreate("key1", () => promise1);
      deduplicator.getOrCreate("key2", () => promise2);

      expect(deduplicator.getInFlightCount()).toBe(2);

      deduplicator.clearAll();

      expect(deduplicator.getInFlightCount()).toBe(0);
      expect(deduplicator.isInFlight("key1")).toBe(false);
      expect(deduplicator.isInFlight("key2")).toBe(false);

      // Resolve to avoid unhandled rejections
      resolve1!("result1");
      resolve2!("result2");
    });
  });

  describe("isInFlight", () => {
    it("should return true for in-flight request", async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const factory = vi.fn().mockReturnValue(promise);
      const key = "test-key";

      deduplicator.getOrCreate(key, factory);

      expect(deduplicator.isInFlight(key)).toBe(true);

      // Resolve to avoid unhandled rejection
      resolvePromise!("result");
    });

    it("should return false for non-existent key", () => {
      expect(deduplicator.isInFlight("non-existent")).toBe(false);
    });

    it("should return false after request completes", async () => {
      const factory = vi.fn().mockResolvedValue("result");
      const key = "test-key";

      await deduplicator.getOrCreate(key, factory);

      expect(deduplicator.isInFlight(key)).toBe(false);
    });
  });

  describe("getInFlightCount", () => {
    it("should return 0 when no requests in flight", () => {
      expect(deduplicator.getInFlightCount()).toBe(0);
    });

    it("should return correct count of in-flight requests", async () => {
      let resolve1: (value: string) => void;
      let resolve2: (value: string) => void;
      let resolve3: (value: string) => void;
      const promise1 = new Promise<string>((resolve) => {
        resolve1 = resolve;
      });
      const promise2 = new Promise<string>((resolve) => {
        resolve2 = resolve;
      });
      const promise3 = new Promise<string>((resolve) => {
        resolve3 = resolve;
      });

      deduplicator.getOrCreate("key1", () => promise1);
      deduplicator.getOrCreate("key2", () => promise2);
      deduplicator.getOrCreate("key3", () => promise3);

      expect(deduplicator.getInFlightCount()).toBe(3);

      // Resolve to avoid unhandled rejections
      resolve1!("result1");
      resolve2!("result2");
      resolve3!("result3");
    });
  });

  describe("maxAge option", () => {
    it("should expire old requests", async () => {
      vi.useFakeTimers();

      const shortLivedDeduplicator = createRequestDeduplicator({ maxAge: 1000 });
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const factory1 = vi.fn().mockReturnValue(promise);
      const factory2 = vi.fn().mockResolvedValue("new-result");
      const key = "test-key";

      // Start first request
      shortLivedDeduplicator.getOrCreate(key, factory1);

      // Advance time past maxAge
      vi.advanceTimersByTime(1500);

      // New request should create new factory call
      const result = await shortLivedDeduplicator.getOrCreate(key, factory2);

      expect(factory1).toHaveBeenCalledTimes(1);
      expect(factory2).toHaveBeenCalledTimes(1);
      expect(result).toBe("new-result");

      // Resolve first promise to avoid unhandled rejection
      resolvePromise!("old-result");

      vi.useRealTimers();
    });
  });

  describe("default instance", () => {
    it("should create default instance on first access", () => {
      const instance1 = getDefaultDeduplicator();
      const instance2 = getDefaultDeduplicator();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(RequestDeduplicator);
    });

    it("should allow setting custom default instance", () => {
      const custom = createRequestDeduplicator({ maxAge: 5000 });
      setDefaultDeduplicator(custom);

      expect(getDefaultDeduplicator()).toBe(custom);
    });

    it("should create new instance after setting null", () => {
      const original = getDefaultDeduplicator();
      setDefaultDeduplicator(null);
      const newInstance = getDefaultDeduplicator();

      expect(newInstance).not.toBe(original);
    });
  });
});
