/**
 * Memory-related types for the forgetting system
 */

export type RiskLevel = "low" | "medium" | "high";

export interface Memory {
  id: string;
  content: string;
  importance: number;
  created_at: number;
  access_count: number;
  protected: boolean;
}

export interface ForgettingRisk {
  level: RiskLevel;
  score: number;
  factors: string[];
}

export interface ForgettingStrategy {
  name: string;
  evaluate(memory: Memory): Promise<number>;
}
