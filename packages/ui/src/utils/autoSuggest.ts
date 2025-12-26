/**
 * Auto-Suggest Utilities
 *
 * Provides utility functions for detecting keywords in text and
 * suggesting related memories for linking.
 *
 * Requirements: 44.3
 */

import type { Memory } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface SuggestedMemory {
  /** The suggested memory */
  memory: Memory;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Keywords that matched */
  matchedKeywords: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Common stop words to exclude from keyword extraction.
 * These words are too common to be useful for finding related memories.
 */
const STOP_WORDS = new Set([
  // Articles
  'a',
  'an',
  'the',
  // Pronouns
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'he',
  'she',
  'it',
  'they',
  'them',
  'this',
  'that',
  'these',
  'those',
  'who',
  'what',
  'which',
  'whom',
  // Prepositions
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'up',
  'about',
  'into',
  'over',
  'after',
  // Conjunctions
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  // Verbs (common)
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'shall',
  'get',
  'got',
  'make',
  'made',
  // Adverbs
  'not',
  'no',
  'yes',
  'very',
  'just',
  'also',
  'only',
  'now',
  'then',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'some',
  'any',
  'most',
  'more',
  'less',
  'much',
  'many',
  'few',
  'other',
  'such',
  'same',
  // Other common words
  'as',
  'if',
  'than',
  'because',
  'while',
  'although',
  'though',
  'unless',
  'until',
  'since',
  'before',
  'after',
  'during',
  'through',
  'between',
  'among',
  'against',
  'without',
  'within',
  'along',
  'across',
  'behind',
  'below',
  'above',
  'under',
  'around',
  'near',
  'like',
  'even',
  'still',
  'already',
  'always',
  'never',
  'often',
  'sometimes',
  'usually',
  'really',
  'actually',
  'probably',
  'maybe',
  'perhaps',
  'however',
  'therefore',
  'thus',
  'hence',
  'otherwise',
  'instead',
  'rather',
  'quite',
  'too',
  'enough',
  'almost',
  'nearly',
  'ever',
  'ago',
  'away',
  'back',
  'down',
  'off',
  'out',
  'well',
  'way',
  'thing',
  'things',
  'something',
  'anything',
  'nothing',
  'everything',
  'someone',
  'anyone',
  'everyone',
  'nobody',
  'one',
  'two',
  'three',
  'first',
  'second',
  'last',
  'new',
  'old',
  'good',
  'bad',
  'great',
  'little',
  'big',
  'small',
  'long',
  'short',
  'high',
  'low',
  'right',
  'left',
  'next',
  'own',
  'same',
  'different',
  'able',
  'need',
  'want',
  'try',
  'use',
  'used',
  'using',
  'work',
  'know',
  'think',
  'see',
  'look',
  'come',
  'go',
  'take',
  'give',
  'find',
  'tell',
  'say',
  'said',
  'ask',
  'put',
  'keep',
  'let',
  'begin',
  'seem',
  'help',
  'show',
  'hear',
  'play',
  'run',
  'move',
  'live',
  'believe',
  'hold',
  'bring',
  'happen',
  'write',
  'provide',
  'sit',
  'stand',
  'lose',
  'pay',
  'meet',
  'include',
  'continue',
  'set',
  'learn',
  'change',
  'lead',
  'understand',
  'watch',
  'follow',
  'stop',
  'create',
  'speak',
  'read',
  'allow',
  'add',
  'spend',
  'grow',
  'open',
  'walk',
  'win',
  'offer',
  'remember',
  'love',
  'consider',
  'appear',
  'buy',
  'wait',
  'serve',
  'die',
  'send',
  'expect',
  'build',
  'stay',
  'fall',
  'cut',
  'reach',
  'kill',
  'remain',
]);

/**
 * Minimum word length for keyword extraction.
 * Words shorter than this are excluded.
 */
const MIN_KEYWORD_LENGTH = 3;

/**
 * Maximum number of keywords to extract from text.
 */
const MAX_KEYWORDS = 10;

/**
 * Minimum relevance score for a memory to be suggested.
 */
const MIN_RELEVANCE_SCORE = 0.1;

/**
 * Maximum number of suggested memories to return.
 */
const MAX_SUGGESTIONS = 5;

// ============================================================================
// Keyword Extraction
// ============================================================================

/**
 * Extracts meaningful keywords from text content.
 * Filters out stop words, short words, and duplicates.
 * Returns keywords sorted by frequency (most frequent first).
 *
 * @param text - Text content to extract keywords from
 * @param maxKeywords - Maximum number of keywords to return (default: 10)
 * @returns Array of extracted keywords
 *
 * Requirements: 44.3
 */
export function extractKeywords(text: string, maxKeywords: number = MAX_KEYWORDS): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize text: lowercase and remove special characters except spaces
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedText) {
    return [];
  }

  // Split into words
  const words = normalizedText.split(' ');

  // Count word frequencies (excluding stop words and short words)
  const wordCounts = new Map<string, number>();

  for (const word of words) {
    // Skip stop words and short words
    if (word.length < MIN_KEYWORD_LENGTH || STOP_WORDS.has(word)) {
      continue;
    }

    // Skip words that are all numbers
    if (/^\d+$/.test(word)) {
      continue;
    }

    const count = wordCounts.get(word) ?? 0;
    wordCounts.set(word, count + 1);
  }

  // Sort by frequency (descending) and return top keywords
  const sortedKeywords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);

  return sortedKeywords;
}

// ============================================================================
// Memory Matching
// ============================================================================

/**
 * Calculates relevance score between keywords and a memory.
 * Higher scores indicate better matches.
 *
 * Scoring:
 * - Keyword in memory keywords: 1.0 per match
 * - Keyword in memory tags: 0.8 per match
 * - Keyword in memory content: 0.5 per match
 * - Keyword in memory category: 0.3 per match
 *
 * @param keywords - Keywords to match against
 * @param memory - Memory to calculate relevance for
 * @returns Object with relevance score and matched keywords
 *
 * Requirements: 44.3
 */
export function calculateMemoryRelevance(
  keywords: string[],
  memory: Memory
): { score: number; matchedKeywords: string[] } {
  if (keywords.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }

  let score = 0;
  const matchedKeywords: string[] = [];
  const lowerContent = memory.content.toLowerCase();
  const memoryKeywords = new Set(
    (memory.metadata.keywords ?? []).map((k: string) => k.toLowerCase())
  );
  const memoryTags = new Set((memory.metadata.tags ?? []).map((t: string) => t.toLowerCase()));
  const memoryCategory = (memory.metadata.category ?? '').toLowerCase();

  for (const keyword of keywords) {
    let keywordMatched = false;

    // Check memory keywords (highest weight)
    if (memoryKeywords.has(keyword)) {
      score += 1.0;
      keywordMatched = true;
    }

    // Check memory tags
    if (memoryTags.has(keyword)) {
      score += 0.8;
      keywordMatched = true;
    }

    // Check memory content
    if (lowerContent.includes(keyword)) {
      score += 0.5;
      keywordMatched = true;
    }

    // Check memory category
    if (memoryCategory.includes(keyword)) {
      score += 0.3;
      keywordMatched = true;
    }

    if (keywordMatched) {
      matchedKeywords.push(keyword);
    }
  }

  // Normalize score by number of keywords
  const normalizedScore = score / keywords.length;

  return { score: normalizedScore, matchedKeywords };
}

/**
 * Finds memories related to the given text content.
 * Extracts keywords from the text and matches them against available memories.
 * Returns memories sorted by relevance score (highest first).
 *
 * @param text - Text content to find related memories for
 * @param memories - Available memories to search through
 * @param excludeIds - Memory IDs to exclude from results (e.g., current memory)
 * @param maxSuggestions - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggested memories with relevance scores
 *
 * Requirements: 44.3
 */
export function findRelatedMemories(
  text: string,
  memories: Memory[],
  excludeIds: string[] = [],
  maxSuggestions: number = MAX_SUGGESTIONS
): SuggestedMemory[] {
  // Extract keywords from text
  const keywords = extractKeywords(text);

  if (keywords.length === 0 || memories.length === 0) {
    return [];
  }

  // Create set of excluded IDs for fast lookup
  const excludeSet = new Set(excludeIds);

  // Calculate relevance for each memory
  const scoredMemories: SuggestedMemory[] = [];

  for (const memory of memories) {
    // Skip excluded memories
    if (excludeSet.has(memory.id)) {
      continue;
    }

    const { score, matchedKeywords } = calculateMemoryRelevance(keywords, memory);

    // Only include memories with minimum relevance
    if (score >= MIN_RELEVANCE_SCORE) {
      scoredMemories.push({
        memory,
        relevanceScore: score,
        matchedKeywords,
      });
    }
  }

  // Sort by relevance score (descending) and return top suggestions
  scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scoredMemories.slice(0, maxSuggestions);
}

/**
 * Debounced version of findRelatedMemories for use in real-time typing scenarios.
 * Returns a function that can be called with text and will return suggestions
 * after a delay to avoid excessive computation during rapid typing.
 *
 * @param memories - Available memories to search through
 * @param excludeIds - Memory IDs to exclude from results
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Debounced function that returns a promise of suggestions
 *
 * Requirements: 44.3
 */
export function createDebouncedSuggester(
  memories: Memory[],
  excludeIds: string[] = [],
  debounceMs: number = 300
): (text: string) => Promise<SuggestedMemory[]> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (text: string): Promise<SuggestedMemory[]> => {
    return new Promise((resolve) => {
      // Clear previous timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      timeoutId = setTimeout(() => {
        const suggestions = findRelatedMemories(text, memories, excludeIds);
        resolve(suggestions);
      }, debounceMs);
    });
  };
}
