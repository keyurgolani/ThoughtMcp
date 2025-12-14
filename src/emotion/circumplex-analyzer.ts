/**
 * Circumplex Emotion Analyzer
 *
 * Implements the Circumplex Model of Affect for emotion detection.
 * Analyzes text across three dimensions:
 * - Valence: Emotional positivity/negativity (-1 to +1)
 * - Arousal: Emotional intensity/activation (0 to 1)
 * - Dominance: Sense of control/power (-1 to +1)
 *
 * Uses a lexicon-based approach for fast, deterministic emotion detection.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type {
  CircumplexState,
  EmotionAnalysisOptions,
  EmotionModel,
  EmotionalFeatures,
} from "./types";

/**
 * Emotion lexicons for each dimension
 */
const VALENCE_POSITIVE = new Set([
  "happy",
  "joy",
  "joyful",
  "excited",
  "wonderful",
  "great",
  "excellent",
  "fantastic",
  "amazing",
  "love",
  "loving",
  "loved",
  "delighted",
  "pleased",
  "glad",
  "cheerful",
  "thrilled",
  "ecstatic",
  "elated",
  "blissful",
  "content",
  "satisfied",
  "grateful",
  "thankful",
  "proud",
  "confident",
  "optimistic",
  "hopeful",
  "enthusiastic",
  "passionate",
]);

const VALENCE_NEGATIVE = new Set([
  "sad",
  "sadness",
  "angry",
  "anger",
  "terrible",
  "awful",
  "horrible",
  "hate",
  "hating",
  "hated",
  "disappointed",
  "disappointing",
  "upset",
  "unhappy",
  "miserable",
  "depressed",
  "frustrated",
  "annoyed",
  "irritated",
  "furious",
  "enraged",
  "disgusted",
  "disgusting",
  "ashamed",
  "guilty",
  "regretful",
  "worried",
  "anxious",
  "fearful",
  "scared",
  "terrified",
]);

const AROUSAL_HIGH = new Set([
  "furious",
  "enraged",
  "ecstatic",
  "thrilled",
  "terrified",
  "panicked",
  "excited",
  "enthusiastic",
  "passionate",
  "intense",
  "overwhelming",
  "explosive",
  "frantic",
  "hysterical",
  "agitated",
  "alarmed",
  "shocked",
  "astonished",
  "amazed",
  "exhilarated",
  "angry",
  "outraged",
  "extremely",
]);

const AROUSAL_MEDIUM = new Set([
  "concerned",
  "worried",
  "anxious",
  "interested",
  "curious",
  "alert",
  "attentive",
]);

const AROUSAL_LOW = new Set([
  "calm",
  "calming",
  "relaxed",
  "peaceful",
  "serene",
  "tranquil",
  "bored",
  "boring",
  "tired",
  "sleepy",
  "drowsy",
  "lethargic",
  "sluggish",
  "apathetic",
  "indifferent",
  "passive",
  "quiet",
  "still",
  "gentle",
  "mild",
]);

const DOMINANCE_HIGH = new Set([
  "control",
  "controlling",
  "controlled",
  "power",
  "powerful",
  "confident",
  "command",
  "commanding",
  "authority",
  "authoritative",
  "dominant",
  "dominating",
  "strong",
  "capable",
  "competent",
  "assertive",
  "decisive",
  "determined",
  "independent",
  "autonomous",
]);

const DOMINANCE_LOW = new Set([
  "helpless",
  "powerless",
  "weak",
  "submissive",
  "vulnerable",
  "dependent",
  "incapable",
  "incompetent",
  "uncertain",
  "insecure",
  "timid",
  "meek",
  "passive",
  "controlled",
  "dominated",
  "overwhelmed",
  "defeated",
  "hopeless",
  "trapped",
  "stuck",
]);

/**
 * Intensity markers that amplify emotional arousal
 */
const INTENSITY_AMPLIFIERS = new Set([
  "very",
  "extremely",
  "absolutely",
  "completely",
  "totally",
  "utterly",
  "incredibly",
  "remarkably",
  "exceptionally",
  "extraordinarily",
]);

/**
 * CircumplexEmotionAnalyzer
 *
 * Analyzes text to detect emotional dimensions using the Circumplex Model.
 */
export class CircumplexEmotionAnalyzer {
  private readonly cache: Map<string, CircumplexState>;
  private readonly maxCacheSize: number = 1000;

  constructor(_model: EmotionModel) {
    // Model parameter kept for future extensibility (e.g., ML models)
    this.cache = new Map();
  }

  /**
   * Detect valence (emotional positivity/negativity)
   * @param text - Text to analyze
   * @returns Valence score from -1 (very negative) to +1 (very positive)
   */
  detectValence(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const features = this.extractEmotionalFeatures(text);
    return this.scoreValence(features);
  }

  /**
   * Detect arousal (emotional intensity/activation)
   * @param text - Text to analyze
   * @returns Arousal score from 0 (very calm) to 1 (very intense)
   */
  detectArousal(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const features = this.extractEmotionalFeatures(text);
    return this.scoreArousal(features);
  }

  /**
   * Detect dominance (sense of control/power)
   * @param text - Text to analyze
   * @returns Dominance score from -1 (powerless) to +1 (powerful)
   */
  detectDominance(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const features = this.extractEmotionalFeatures(text);
    return this.scoreDominance(features);
  }

  /**
   * Analyze text across all three circumplex dimensions
   * @param text - Text to analyze
   * @param options - Analysis options
   * @returns Complete circumplex state with confidence
   */
  analyzeCircumplex(text: string, options?: EmotionAnalysisOptions): CircumplexState {
    const cacheResults = options?.cacheResults ?? true;

    // Check cache
    if (cacheResults && this.cache.has(text)) {
      const cached = this.cache.get(text);
      if (cached) {
        return cached;
      }
    }

    // Analyze dimensions
    const valence = this.detectValence(text);
    const arousal = this.detectArousal(text);
    const dominance = this.detectDominance(text);

    // Create state
    const state: CircumplexState = {
      valence,
      arousal,
      dominance,
      confidence: 0, // Will be calculated
      timestamp: new Date(),
    };

    // Calculate confidence
    state.confidence = this.calculateConfidence(state);

    // Cache result
    if (cacheResults) {
      this.cacheResult(text, state);
    }

    return state;
  }

  /**
   * Calculate confidence in the emotion detection
   * @param state - Circumplex state to assess
   * @returns Confidence score from 0 to 1
   */
  calculateConfidence(state: CircumplexState): number {
    // Confidence is based on the strength of emotional signals
    // Neutral emotions (close to 0) have lower confidence
    // Strong emotions (far from 0) have higher confidence

    const valenceStrength = Math.abs(state.valence);
    const arousalStrength = state.arousal; // Already 0-1
    const dominanceStrength = Math.abs(state.dominance);

    // Average the strengths
    const averageStrength = (valenceStrength + arousalStrength + dominanceStrength) / 3;

    // Map to confidence range (0.3 to 0.95)
    // Even weak signals have some confidence
    const confidence = 0.3 + averageStrength * 0.65;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Extract emotional features from text
   * @param text - Text to analyze
   * @returns Extracted emotional features
   */
  private extractEmotionalFeatures(text: string): EmotionalFeatures {
    // Count intensity markers BEFORE normalization (needs punctuation)
    const intensityMarkers = this.countIntensityMarkers(text);

    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);

    const features: EmotionalFeatures = {
      positiveWords: [],
      negativeWords: [],
      highArousalWords: [],
      mediumArousalWords: [],
      lowArousalWords: [],
      highDominanceWords: [],
      lowDominanceWords: [],
      intensityMarkers,
      wordCount: words.length,
    };

    // Classify words
    for (const word of words) {
      if (VALENCE_POSITIVE.has(word)) {
        features.positiveWords.push(word);
      }
      if (VALENCE_NEGATIVE.has(word)) {
        features.negativeWords.push(word);
      }
      if (AROUSAL_HIGH.has(word)) {
        features.highArousalWords.push(word);
      }
      if (AROUSAL_MEDIUM.has(word)) {
        if (features.mediumArousalWords) {
          features.mediumArousalWords.push(word);
        }
      }
      if (AROUSAL_LOW.has(word)) {
        features.lowArousalWords.push(word);
      }
      if (DOMINANCE_HIGH.has(word)) {
        features.highDominanceWords.push(word);
      }
      if (DOMINANCE_LOW.has(word)) {
        features.lowDominanceWords.push(word);
      }
      if (INTENSITY_AMPLIFIERS.has(word)) {
        features.intensityMarkers++;
      }
    }

    return features;
  }

  /**
   * Score valence from features
   * @param features - Extracted emotional features
   * @returns Valence score from -1 to +1
   */
  private scoreValence(features: EmotionalFeatures): number {
    const positiveCount = features.positiveWords.length;
    const negativeCount = features.negativeWords.length;
    const totalEmotional = positiveCount + negativeCount;

    if (totalEmotional === 0) {
      return 0;
    }

    // Calculate raw score
    const rawScore = (positiveCount - negativeCount) / totalEmotional;

    // Apply intensity amplification
    const amplification = 1 + features.intensityMarkers * 0.1;
    const amplifiedScore = rawScore * Math.min(amplification, 1.5);

    // Clamp to valid range
    return Math.max(-1, Math.min(1, amplifiedScore));
  }

  /**
   * Score arousal from features
   * @param features - Extracted emotional features
   * @returns Arousal score from 0 to 1
   */
  private scoreArousal(features: EmotionalFeatures): number {
    const highCount = features.highArousalWords.length;
    const lowCount = features.lowArousalWords.length;
    const mediumCount = features.mediumArousalWords?.length ?? 0;
    const totalArousal = highCount + lowCount + mediumCount;

    // Base arousal from words
    let baseArousal = 0.15; // Low default for neutral/monotone text
    if (totalArousal > 0) {
      // Weighted average: high=1.0, medium=0.5, low=0.0
      baseArousal = (highCount * 1.0 + mediumCount * 0.5 + lowCount * 0.0) / totalArousal;
    }

    // Intensity markers increase arousal
    const intensityBoost = Math.min(features.intensityMarkers * 0.15, 0.4);

    // Combine base and intensity
    const arousal = baseArousal + intensityBoost;

    // Clamp to valid range
    return Math.max(0, Math.min(1, arousal));
  }

  /**
   * Score dominance from features
   * @param features - Extracted emotional features
   * @returns Dominance score from -1 to +1
   */
  private scoreDominance(features: EmotionalFeatures): number {
    const highCount = features.highDominanceWords.length;
    const lowCount = features.lowDominanceWords.length;
    const totalDominance = highCount + lowCount;

    if (totalDominance === 0) {
      return 0;
    }

    // Calculate raw score
    const rawScore = (highCount - lowCount) / totalDominance;

    // Clamp to valid range
    return Math.max(-1, Math.min(1, rawScore));
  }

  /**
   * Normalize text for analysis
   * @param text - Text to normalize
   * @returns Normalized text
   */
  private normalizeText(text: string): string {
    // Remove emojis and special characters but keep words
    return text
      .toLowerCase()
      .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Remove emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Remove misc symbols
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Remove transport symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, "") // Remove misc symbols
      .replace(/[^\w\s]/g, " ") // Remove all non-word, non-space characters
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Count intensity markers in text
   * @param text - Text to analyze
   * @returns Count of intensity markers
   */
  private countIntensityMarkers(text: string): number {
    let count = 0;

    // Count exclamation marks
    count += (text.match(/!/g) ?? []).length;

    // Count question marks (can indicate intensity)
    count += (text.match(/\?/g) ?? []).length * 0.5;

    // Count capital letters (excluding first letter of sentences)
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Cache analysis result
   * @param text - Text key
   * @param state - State to cache
   */
  private cacheResult(text: string, state: CircumplexState): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(text, state);
  }
}
