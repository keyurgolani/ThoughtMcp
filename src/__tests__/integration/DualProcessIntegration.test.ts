/**
 * Integration tests for the dual-process thinking system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DualProcessController } from '../../cognitive/DualProcessController.js';
import { CognitiveInput, ProcessingMode } from '../../types/core.js';

describe('Dual Process Integration', () => {
  let controller: DualProcessController;
  let baseInput: CognitiveInput;

  beforeEach(async () => {
    controller = new DualProcessController();
    await controller.initialize({});

    baseInput = {
      input: '',
      context: {
        session_id: 'integration-test',
        domain: 'testing',
        urgency: 0.5,
        complexity: 0.5
      },
      mode: ProcessingMode.BALANCED,
      configuration: {
        default_mode: ProcessingMode.BALANCED,
        enable_emotion: true,
        enable_metacognition: true,
        enable_prediction: true,
        working_memory_capacity: 7,
        episodic_memory_size: 1000,
        semantic_memory_size: 5000,
        consolidation_interval: 60000,
        noise_level: 0.1,
        temperature: 0.7,
        attention_threshold: 0.3,
        max_reasoning_depth: 5,
        timeout_ms: 30000,
        max_concurrent_sessions: 10,
        confidence_threshold: 0.6,
        system2_activation_threshold: 0.6,
        memory_retrieval_threshold: 0.3
      }
    };
  });

  describe('System Integration', () => {
    it('should process simple questions with System 1 only', async () => {
      const input = {
        ...baseInput,
        input: 'What color is the sky?',
        mode: ProcessingMode.INTUITIVE
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.dual_process_info.system2_confidence).toBeNull();
      expect(result.metadata.processing_time_ms).toBeLessThan(500);
    });

    it('should process complex questions with both systems', async () => {
      const input = {
        ...baseInput,
        input: 'Analyze the complex relationship between economic growth, environmental sustainability, and social equity in developing nations',
        mode: ProcessingMode.DELIBERATIVE
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.dual_process_info.system1_confidence).toBeDefined();
      expect(result.metadata.dual_process_info.system2_confidence).toBeDefined();
      expect(result.reasoning_path.length).toBeGreaterThan(3);
    });

    it('should handle balanced mode appropriately', async () => {
      const input = {
        ...baseInput,
        input: 'How can we solve the problem of climate change?',
        mode: ProcessingMode.BALANCED
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning_path.length).toBeGreaterThan(0);
    });

    it('should blend results when both systems are used', async () => {
      const input = {
        ...baseInput,
        input: 'What are the pros and cons of artificial intelligence?',
        mode: ProcessingMode.BALANCED
      };

      const result = await controller.process(input);

      if (result.metadata.dual_process_info.system2_confidence) {
        // If both systems were used, check for blending
        expect(result.content.length).toBeGreaterThan(50);
        expect(result.reasoning_path.length).toBeGreaterThan(2);
      }

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Mode Switching', () => {
    it('should respect explicit mode requests', async () => {
      const intuitiveInput = {
        ...baseInput,
        input: 'This is a complex analytical problem requiring deep thought',
        mode: ProcessingMode.INTUITIVE
      };

      const result = await controller.process(intuitiveInput);

      // Even with complex input, intuitive mode should be respected
      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info.dual_process_decision.reasoning).toContain('intuitive');
    });

    it('should activate System 2 for deliberative mode', async () => {
      const deliberativeInput = {
        ...baseInput,
        input: 'Simple question',
        mode: ProcessingMode.DELIBERATIVE
      };

      const result = await controller.process(deliberativeInput);

      // Even with simple input, deliberative mode should activate System 2
      expect(result).toBeDefined();
      expect(result.metadata.dual_process_info.system2_confidence).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle conflicting system outputs', async () => {
      const input = {
        ...baseInput,
        input: 'This is a moderately complex question that might generate different responses from each system',
        mode: ProcessingMode.BALANCED
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);

      if (result.metadata.dual_process_info.conflict_resolution) {
        expect(result.metadata.dual_process_info.conflict_resolution.selected_system).toMatch(/system1|system2|hybrid/);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete processing within reasonable time limits', async () => {
      const inputs = [
        'Simple question',
        'What is the meaning of life?',
        'Analyze the complex relationships between multiple variables in a systematic way',
        'How do we solve world hunger while maintaining economic growth?'
      ];

      for (const inputText of inputs) {
        const startTime = Date.now();
        
        const result = await controller.process({
          ...baseInput,
          input: inputText
        });

        const processingTime = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        controller.process({
          ...baseInput,
          input: `Test question ${i + 1}: What is the answer to this?`
        })
      );

      const results = await Promise.all(requests);

      expect(results.length).toBe(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty input gracefully', async () => {
      const input = {
        ...baseInput,
        input: ''
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle malformed context', async () => {
      const input = {
        ...baseInput,
        input: 'Test question',
        context: {
          ...baseInput.context,
          urgency: 2.0, // Invalid urgency value
          complexity: -1 // Invalid complexity value
        }
      };

      const result = await controller.process(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Emotional Context Integration', () => {
    it('should assess emotional context appropriately', async () => {
      const emotionalInput = {
        ...baseInput,
        input: 'I am really worried about this terrible situation and need help'
      };

      const result = await controller.process(emotionalInput);

      expect(result).toBeDefined();
      expect(result.emotional_context).toBeDefined();
      expect(result.emotional_context.valence).toBeLessThan(0.5); // Should detect negative emotion
    });

    it('should handle positive emotional content', async () => {
      const positiveInput = {
        ...baseInput,
        input: 'I love this amazing opportunity and feel great about it'
      };

      const result = await controller.process(positiveInput);

      expect(result).toBeDefined();
      expect(result.emotional_context).toBeDefined();
      expect(result.emotional_context.valence).toBeGreaterThan(0); // Should detect positive emotion
    });
  });
});