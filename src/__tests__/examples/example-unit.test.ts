/**
 * Example Unit Test
 *
 * This example demonstrates TDD best practices with a simple calculator.
 * Follow this pattern for all unit tests.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Simple calculator class for demonstration
class Calculator {
  private result: number = 0;

  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error("Division by zero");
    }
    return a / b;
  }

  setResult(value: number): void {
    this.result = value;
  }

  getResult(): number {
    return this.result;
  }

  clear(): void {
    this.result = 0;
  }
}

describe("Calculator", () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe("add", () => {
    it("should add two positive numbers", () => {
      const result = calculator.add(2, 3);
      expect(result).toBe(5);
    });

    it("should add two negative numbers", () => {
      const result = calculator.add(-2, -3);
      expect(result).toBe(-5);
    });

    it("should add positive and negative numbers", () => {
      const result = calculator.add(5, -3);
      expect(result).toBe(2);
    });

    it("should handle zero", () => {
      const result = calculator.add(5, 0);
      expect(result).toBe(5);
    });
  });

  describe("subtract", () => {
    it("should subtract two positive numbers", () => {
      const result = calculator.subtract(5, 3);
      expect(result).toBe(2);
    });

    it("should handle negative result", () => {
      const result = calculator.subtract(3, 5);
      expect(result).toBe(-2);
    });
  });

  describe("multiply", () => {
    it("should multiply two positive numbers", () => {
      const result = calculator.multiply(3, 4);
      expect(result).toBe(12);
    });

    it("should handle zero", () => {
      const result = calculator.multiply(5, 0);
      expect(result).toBe(0);
    });

    it("should handle negative numbers", () => {
      const result = calculator.multiply(-3, 4);
      expect(result).toBe(-12);
    });
  });

  describe("divide", () => {
    it("should divide two positive numbers", () => {
      const result = calculator.divide(10, 2);
      expect(result).toBe(5);
    });

    it("should handle decimal results", () => {
      const result = calculator.divide(10, 3);
      expect(result).toBeCloseTo(3.333, 3);
    });

    it("should throw error on division by zero", () => {
      expect(() => calculator.divide(10, 0)).toThrow("Division by zero");
    });
  });

  describe("result management", () => {
    it("should set and get result", () => {
      calculator.setResult(42);
      expect(calculator.getResult()).toBe(42);
    });

    it("should clear result", () => {
      calculator.setResult(42);
      calculator.clear();
      expect(calculator.getResult()).toBe(0);
    });

    it("should start with zero result", () => {
      expect(calculator.getResult()).toBe(0);
    });
  });
});

/**
 * Key Takeaways:
 *
 * 1. Clear test organization with describe blocks
 * 2. One assertion per test (mostly)
 * 3. Descriptive test names
 * 4. Test normal cases and edge cases
 * 5. Test error conditions
 * 6. Use beforeEach for setup
 * 7. Tests are independent
 * 8. Fast execution
 */
