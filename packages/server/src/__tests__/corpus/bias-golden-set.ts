import { BiasType } from "../../bias/types.js";

export interface GoldenTestCase {
  name: string;
  text: string;
  expectedBiases: BiasType[];
}

export const GOLDEN_QUESTIONS: GoldenTestCase[] = [
  // --- Confirmation Bias ---
  {
    name: "Confirmation - Supports my view",
    text: "The new data clearly supports my view that we should proceed.",
    expectedBiases: [BiasType.CONFIRMATION],
  },
  {
    name: "Confirmation - As expected",
    text: "It worked exactly as I expected, which proves my point entirely.",
    expectedBiases: [BiasType.CONFIRMATION],
  },

  // --- Status Quo / Framing Bias ---
  {
    name: "Framing - Status Quo - No need to change",
    text: "There is no need to change the current process; it has worked before.",
    expectedBiases: [BiasType.FRAMING],
  },
  {
    name: "Framing - Status Quo - Always done it this way",
    text: "We have always done it this way, so we should stick with what works.",
    expectedBiases: [BiasType.FRAMING],
  },

  // --- Bandwagon / Social Proof Bias ---
  {
    name: "Bandwagon - Industry Standard",
    text: "Everyone uses this library, so it must be the industry standard.",
    expectedBiases: [BiasType.BANDWAGON],
  },
  {
    name: "Bandwagon - Popular Choice",
    text: "It is the most popular choice among developers right now.",
    expectedBiases: [BiasType.BANDWAGON],
  },
  {
    name: "Bandwagon - Big Tech Companies",
    text: "All the big tech companies are doing microservices, so we should too.",
    expectedBiases: [BiasType.BANDWAGON],
  },
  {
    name: "Bandwagon - Everyone Else",
    text: "Everyone else is using this framework, we don't want to be left behind.",
    expectedBiases: [BiasType.BANDWAGON],
  },
  {
    name: "Bandwagon - The Trend",
    text: "This is the trend right now, all the leading companies are adopting it.",
    expectedBiases: [BiasType.BANDWAGON],
  },

  // --- Anchoring Bias ---
  {
    name: "Anchoring - Initial Value",
    text: "Starting from the initial value of $100, we can adjust slightly.",
    expectedBiases: [BiasType.ANCHORING],
  },
  {
    name: "Anchoring - Original Price",
    text: "The original price was high, so this discount looks like a great deal.",
    expectedBiases: [BiasType.ANCHORING],
  },

  // --- Availability Bias ---
  {
    name: "Availability - Recent Example",
    text: "I saw a recent example of this failing just last week.",
    expectedBiases: [BiasType.AVAILABILITY],
  },
  {
    name: "Availability - Just Happened",
    text: "It just happened to my colleague, so it's a major risk.",
    expectedBiases: [BiasType.AVAILABILITY],
  },

  // --- Recency Bias ---
  // Note: Recency often overlaps with Availability in text patterns, but has specific keywords
  // BiasPatternRecognizer defines Recency differently but let's try to hit it if possible or skip if logic is complex (it checks timestamps usually)
  // Text detector checks "Dismissal of historical data"
  // Let's assume the text detector might not catch Recency easily without context, but we will try.
  // Actually, TEXT_BIAS_PATTERNS doesn't seem to explicitly list RECENCY as a TEXT_BIAS_PATTERN type?
  // Wait, let me check the file content again.
  // Lines 51-277 show logic. Patterns for CONFIRMATION, FRAMING, REPRESENTATIVENESS, ANCHORING, AVAILABILITY, SUNK_COST, ATTRIBUTION.
  // Recency seems missing from TEXT_BIAS_PATTERNS in the `bias-pattern-recognizer.ts` snippet I saw!
  // It has `detectRecencyBias` method, but `detectBiasesFromText` uses `TEXT_BIAS_PATTERNS`.
  // Let's verify if Recency is in `TEXT_BIAS_PATTERNS`.
  // Viewing lines 51-277... It has 7 patterns. Recency is likely missing or named differently.
  // Ah, looking closer at the file content in previous step...
  // Line 51 starts `TEXT_BIAS_PATTERNS`.
  // 53: Confirmation
  // 92: Framing (Status Quo)
  // 122: Representativeness (Bandwagon)
  // 158: Anchoring
  // 189: Availability
  // 220: Sunk Cost
  // 254: Attribution
  // It seems Recency is NOT in `TEXT_BIAS_PATTERNS`. `detectRecencyBias` logic relies on timestamps (Line 631).
  // So `detectBiasesFromText` won't find Recency. I will omit Recency from "Text" Golden Set.

  // --- Sunk Cost Fallacy ---
  {
    name: "Sunk Cost - Already Invested",
    text: "We have already invested so much time, we can't give up now.",
    expectedBiases: [BiasType.SUNK_COST],
  },
  {
    name: "Sunk Cost - Wasted Effort",
    text: "Stopping now would mean all that effort was wasted effort.",
    expectedBiases: [BiasType.SUNK_COST],
  },

  // --- Attribution Bias ---
  {
    name: "Attribution - Their Fault",
    text: "It's their fault that the project failed, not mine.",
    expectedBiases: [BiasType.ATTRIBUTION],
  },
  {
    name: "Attribution - Bad Luck",
    text: "I failed due to bad luck and unfair circumstances.",
    expectedBiases: [BiasType.ATTRIBUTION],
  },

  // --- Clean Text ---
  {
    name: "Clean - Systematic",
    text: "We analyzed the data systematically and found a correlation.",
    expectedBiases: [],
  },
];
