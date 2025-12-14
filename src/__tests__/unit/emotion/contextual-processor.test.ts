/**
 * Tests for Contextual Emotion Processor
 *
 * Tests the contextual emotion processing system that adjusts emotion detection
 * based on conversation history, cultural factors, professional context, and
 * situational factors.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ContextualEmotionProcessor } from "../../../emotion/contextual-processor";
import type {
  ContextualProcessingOptions,
  CulturalContext,
  EmotionModel,
  Message,
  ProfessionalContext,
  Situation,
} from "../../../emotion/types";

describe("ContextualEmotionProcessor", () => {
  let processor: ContextualEmotionProcessor;
  let mockModel: EmotionModel;

  beforeEach(() => {
    mockModel = {
      name: "lexicon-based",
      version: "1.0.0",
    };
    processor = new ContextualEmotionProcessor(mockModel);
  });

  describe("Conversation History Analysis", () => {
    it("should detect emotion with no conversation history", () => {
      const text = "I'm feeling happy today.";
      const result = processor.processWithContext(text);

      expect(result.circumplex).toBeDefined();
      expect(result.circumplex.valence).toBeGreaterThan(0);
      expect(result.discreteEmotions).toBeDefined();
    });

    it("should adjust emotion based on previous negative messages", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "I'm so frustrated with this project.",
          timestamp: new Date(Date.now() - 60000),
        },
        {
          id: "2",
          text: "Nothing is working as expected.",
          timestamp: new Date(Date.now() - 30000),
        },
      ];

      const text = "I guess this is okay.";
      const options: ContextualProcessingOptions = { conversationHistory: history };
      const result = processor.processWithContext(text, options);

      expect(result.contextFactors).toBeDefined();
      expect(result.contextFactors?.conversationTone).toBe("negative");
    });

    it("should adjust emotion based on previous positive messages", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "This is going great!",
          timestamp: new Date(Date.now() - 60000),
        },
        {
          id: "2",
          text: "I'm really excited about the progress.",
          timestamp: new Date(Date.now() - 30000),
        },
      ];

      const text = "This is okay.";
      const options: ContextualProcessingOptions = { conversationHistory: history };
      const result = processor.processWithContext(text, options);

      expect(result.contextFactors).toBeDefined();
      expect(result.contextFactors?.conversationTone).toBe("positive");
    });

    it("should detect emotional trend from conversation history", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "I'm frustrated.",
          timestamp: new Date(Date.now() - 120000),
        },
        {
          id: "2",
          text: "Things are getting better.",
          timestamp: new Date(Date.now() - 60000),
        },
        {
          id: "3",
          text: "I'm feeling much better now!",
          timestamp: new Date(Date.now() - 30000),
        },
      ];

      const text = "Everything is great!";
      const options: ContextualProcessingOptions = { conversationHistory: history };
      const result = processor.processWithContext(text, options);

      expect(result.contextFactors?.emotionalTrend).toBe("improving");
    });

    it("should handle empty conversation history", () => {
      const text = "I'm happy.";
      const options: ContextualProcessingOptions = { conversationHistory: [] };
      const result = processor.processWithContext(text, options);

      expect(result.circumplex).toBeDefined();
      expect(result.discreteEmotions).toBeDefined();
    });

    it("should weight recent messages more heavily", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "I was happy yesterday.",
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: "2",
          text: "I'm frustrated right now.",
          timestamp: new Date(Date.now() - 1000), // 1 second ago
        },
      ];

      const text = "How are things?";
      const options: ContextualProcessingOptions = { conversationHistory: history };
      const result = processor.processWithContext(text, options);

      // Recent frustration should dominate
      expect(result.contextFactors?.conversationTone).toBe("negative");
    });
  });

  describe("Cultural Factor Consideration", () => {
    it("should adjust for high expressiveness culture", () => {
      const culturalContext: CulturalContext = {
        culture: "latin",
        emotionExpressiveness: "high",
        directness: "direct",
      };

      const text = "I'm happy!";
      const options: ContextualProcessingOptions = { culturalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments).toBeDefined();
      expect(result.adjustments?.culturalAdjustment).toBeDefined();
    });

    it("should adjust for low expressiveness culture", () => {
      const culturalContext: CulturalContext = {
        culture: "eastern",
        emotionExpressiveness: "low",
        directness: "indirect",
      };

      const text = "I'm quite pleased.";
      const options: ContextualProcessingOptions = { culturalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments).toBeDefined();
      expect(result.adjustments?.culturalAdjustment).toBeDefined();
      // Low expressiveness cultures may understate emotions
      expect(result.adjustments?.culturalAdjustment?.reason).toContain("expressiveness");
    });

    it("should handle indirect communication style", () => {
      const culturalContext: CulturalContext = {
        culture: "eastern",
        emotionExpressiveness: "medium",
        directness: "indirect",
      };

      const text = "Perhaps this could be improved.";
      const options: ContextualProcessingOptions = { culturalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments?.culturalAdjustment).toBeDefined();
    });
  });

  describe("Professional Context Adjustment", () => {
    it("should adjust for formal professional setting", () => {
      const professionalContext: ProfessionalContext = {
        setting: "formal",
        relationship: "superior",
        domain: "legal",
      };

      const text = "I have concerns about this approach.";
      const options: ContextualProcessingOptions = { professionalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments).toBeDefined();
      expect(result.adjustments?.professionalAdjustment).toBeDefined();
    });

    it("should adjust for informal setting", () => {
      const professionalContext: ProfessionalContext = {
        setting: "informal",
        relationship: "peer",
        domain: "tech",
      };

      const text = "This is awesome!";
      const options: ContextualProcessingOptions = { professionalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments?.professionalAdjustment).toBeDefined();
    });

    it("should adjust for client relationship", () => {
      const professionalContext: ProfessionalContext = {
        setting: "formal",
        relationship: "client",
        domain: "consulting",
      };

      const text = "We need to discuss some issues.";
      const options: ContextualProcessingOptions = { professionalContext };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments?.professionalAdjustment).toBeDefined();
    });
  });

  describe("Situational Factor Integration", () => {
    it("should adjust for high urgency situation", () => {
      const situation: Situation = {
        urgency: "high",
        stakes: "high",
        privacy: "private",
      };

      const text = "We need to act now.";
      const options: ContextualProcessingOptions = { situation };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments).toBeDefined();
      expect(result.adjustments?.situationalAdjustment).toBeDefined();
    });

    it("should adjust for low stakes situation", () => {
      const situation: Situation = {
        urgency: "low",
        stakes: "low",
        privacy: "public",
      };

      const text = "This is fine.";
      const options: ContextualProcessingOptions = { situation };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments?.situationalAdjustment).toBeDefined();
    });

    it("should adjust for time of day", () => {
      const situation: Situation = {
        urgency: "medium",
        stakes: "medium",
        privacy: "private",
        timeOfDay: "night",
      };

      const text = "I'm tired.";
      const options: ContextualProcessingOptions = { situation };
      const result = processor.processWithContext(text, options);

      expect(result.adjustments?.situationalAdjustment).toBeDefined();
    });
  });

  describe("Context-Adjusted Accuracy", () => {
    it("should improve accuracy with full context", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "I've been working on this all day.",
          timestamp: new Date(Date.now() - 3600000),
        },
      ];

      const culturalContext: CulturalContext = {
        culture: "western",
        emotionExpressiveness: "medium",
        directness: "direct",
      };

      const professionalContext: ProfessionalContext = {
        setting: "informal",
        relationship: "peer",
        domain: "tech",
      };

      const situation: Situation = {
        urgency: "medium",
        stakes: "medium",
        privacy: "private",
        timeOfDay: "evening",
      };

      const text = "I'm exhausted but satisfied.";
      const options: ContextualProcessingOptions = {
        conversationHistory: history,
        culturalContext,
        professionalContext,
        situation,
      };

      const result = processor.processWithContext(text, options);

      expect(result.circumplex).toBeDefined();
      expect(result.discreteEmotions).toBeDefined();
      expect(result.contextFactors).toBeDefined();
      expect(result.adjustments).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should have lower confidence with no context", () => {
      const text = "I'm feeling something.";
      const result = processor.processWithContext(text);

      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe("Processing Speed", () => {
    it("should process emotion with context in under 200ms", () => {
      const history: Message[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: `Message ${i}`,
        timestamp: new Date(Date.now() - i * 60000),
      }));

      const culturalContext: CulturalContext = {
        culture: "western",
        emotionExpressiveness: "medium",
        directness: "direct",
      };

      const text = "I'm happy with the progress.";
      const options: ContextualProcessingOptions = {
        conversationHistory: history,
        culturalContext,
      };

      const startTime = Date.now();
      processor.processWithContext(text, options);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it("should process multiple messages efficiently", () => {
      const texts = ["I'm happy.", "I'm sad.", "I'm angry.", "I'm excited.", "I'm calm."];

      const startTime = Date.now();
      texts.forEach((text) => processor.processWithContext(text));
      const endTime = Date.now();

      const avgTime = (endTime - startTime) / texts.length;
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty text", () => {
      const result = processor.processWithContext("");

      expect(result.circumplex).toBeDefined();
      expect(result.circumplex.valence).toBe(0);
      expect(result.circumplex.arousal).toBe(0);
      expect(result.circumplex.dominance).toBe(0);
    });

    it("should handle text with only whitespace", () => {
      const result = processor.processWithContext("   \n\t  ");

      expect(result.circumplex).toBeDefined();
      expect(result.discreteEmotions).toBeDefined();
    });

    it("should handle missing context gracefully", () => {
      const text = "I'm happy.";
      const options: ContextualProcessingOptions = {
        conversationHistory: undefined,
        culturalContext: undefined,
        professionalContext: undefined,
        situation: undefined,
      };

      const result = processor.processWithContext(text, options);

      expect(result.circumplex).toBeDefined();
      expect(result.discreteEmotions).toBeDefined();
    });

    it("should handle conflicting context signals", () => {
      const history: Message[] = [
        {
          id: "1",
          text: "I'm so happy!",
          timestamp: new Date(Date.now() - 60000),
        },
      ];

      const situation: Situation = {
        urgency: "high",
        stakes: "high",
        privacy: "private",
      };

      const text = "Everything is terrible.";
      const options: ContextualProcessingOptions = {
        conversationHistory: history,
        situation,
      };

      const result = processor.processWithContext(text, options);

      expect(result.circumplex).toBeDefined();
      expect(result.circumplex.valence).toBeLessThan(0);
    });

    it("should handle very long conversation history", () => {
      const history: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: `Message ${i} with some emotional content`,
        timestamp: new Date(Date.now() - i * 60000),
      }));

      const text = "Current message.";
      const options: ContextualProcessingOptions = { conversationHistory: history };

      const startTime = Date.now();
      const result = processor.processWithContext(text, options);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200);
    });

    it("should handle special characters and emojis", () => {
      const text = "I'm 😊 happy!!! @#$%";
      const result = processor.processWithContext(text);

      expect(result.circumplex).toBeDefined();
      expect(result.circumplex.valence).toBeGreaterThan(0);
    });
  });
});
