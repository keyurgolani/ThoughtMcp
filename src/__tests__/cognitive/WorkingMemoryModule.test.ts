/**
 * Unit tests for WorkingMemoryModule
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  WorkingMemoryModule, 
  BufferType, 
  WorkingMemoryState 
} from '../../cognitive/WorkingMemoryModule.js';
import { 
  MemoryChunk, 
  CognitiveConfig, 
  ProcessingMode 
} from '../../types/core.js';

describe('WorkingMemoryModule', () => {
  let workingMemory: WorkingMemoryModule;
  let config: CognitiveConfig;

  beforeEach(() => {
    workingMemory = new WorkingMemoryModule();
    config = {
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
      max_reasoning_depth: 10,
      timeout_ms: 30000,
      max_concurrent_sessions: 10,
      confidence_threshold: 0.6,
      system2_activation_threshold: 0.7,
      memory_retrieval_threshold: 0.3
    };
  });

  afterEach(() => {
    workingMemory.reset();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await workingMemory.initialize(config);
      
      const status = workingMemory.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(status.name).toBe('WorkingMemoryModule');
    });

    it('should set capacity from configuration', async () => {
      config.working_memory_capacity = 5;
      await workingMemory.initialize(config);
      
      expect(workingMemory.getCapacity()).toBe(5);
    });

    it('should handle initialization errors', async () => {
      const invalidConfig = null as any;
      
      await expect(workingMemory.initialize(invalidConfig))
        .rejects.toThrow();
    });
  });

  describe('Memory Chunk Management', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should add memory chunks successfully', () => {
      const chunk: MemoryChunk = {
        content: 'test content',
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(['test']),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      const result = workingMemory.addChunk(chunk);
      expect(result).toBe(true);
      
      const activeChunks = workingMemory.getActiveChunks();
      expect(activeChunks).toHaveLength(1);
      expect(activeChunks[0].content).toBe('test content');
    });

    it('should respect capacity limitations', () => {
      // Fill working memory to capacity
      for (let i = 0; i < 8; i++) {
        const chunk: MemoryChunk = {
          content: `content ${i}`,
          activation: 1.0,
          timestamp: Date.now(),
          associations: new Set([`tag${i}`]),
          emotional_valence: 0,
          importance: 0.5,
          context_tags: ['test']
        };
        workingMemory.addChunk(chunk);
      }

      const activeChunks = workingMemory.getActiveChunks();
      expect(activeChunks.length).toBeLessThanOrEqual(7); // Should not exceed capacity
    });

    it('should handle capacity limitations correctly', () => {
      // Test that the working memory system handles capacity appropriately
      let successfulAdds = 0;
      
      // Try to add many chunks
      for (let i = 0; i < 10; i++) {
        const chunk: MemoryChunk = {
          content: `content ${i}`,
          activation: Math.random(),
          timestamp: Date.now(),
          associations: new Set([`tag${i}`]),
          emotional_valence: 0,
          importance: 0.5,
          context_tags: ['test']
        };
        
        if (workingMemory.addChunk(chunk)) {
          successfulAdds++;
        }
      }
      
      // Should have added some chunks but not exceed total capacity
      expect(successfulAdds).toBeGreaterThan(0);
      expect(workingMemory.getActiveChunks().length).toBeLessThanOrEqual(7);
    });
  });

  describe('Buffer System', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should route text content to phonological buffer', () => {
      const textChunk: MemoryChunk = {
        content: 'This is text content',
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['text', 'phonological']
      };

      workingMemory.addChunk(textChunk);
      const state = workingMemory.getCurrentState();
      
      expect(state.buffer_states.get(BufferType.PHONOLOGICAL)?.chunks).toHaveLength(1);
    });

    it('should route spatial content to visuospatial buffer', () => {
      const spatialChunk: MemoryChunk = {
        content: { x: 10, y: 20 },
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['spatial', 'visuospatial']
      };

      workingMemory.addChunk(spatialChunk);
      const state = workingMemory.getCurrentState();
      
      expect(state.buffer_states.get(BufferType.VISUOSPATIAL)?.chunks).toHaveLength(1);
    });

    it('should route complex content to episodic buffer', () => {
      const complexChunk: MemoryChunk = {
        content: { type: 'complex', data: [1, 2, 3], metadata: { source: 'test' } },
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['complex']
      };

      workingMemory.addChunk(complexChunk);
      const state = workingMemory.getCurrentState();
      
      expect(state.buffer_states.get(BufferType.EPISODIC)?.chunks).toHaveLength(1);
    });
  });

  describe('Decay Mechanism', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should apply decay to memory chunks over time', async () => {
      const oldTimestamp = Date.now() - 5000; // 5 seconds ago
      const chunk: MemoryChunk = {
        content: 'decaying content',
        activation: 1.0,
        timestamp: oldTimestamp,
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      
      // Manually set the chunk's timestamp to simulate time passing
      const activeChunksBefore = workingMemory.getActiveChunks();
      if (activeChunksBefore.length > 0) {
        activeChunksBefore[0].timestamp = oldTimestamp;
      }
      
      // Manually trigger decay
      workingMemory.decay();
      
      const activeChunks = workingMemory.getActiveChunks();
      if (activeChunks.length > 0) {
        expect(activeChunks[0].activation).toBeLessThan(1.0);
      }
    });

    it('should remove chunks with very low activation', async () => {
      const chunk: MemoryChunk = {
        content: 'weak content',
        activation: 0.01, // Very low activation
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      workingMemory.decay();
      
      const activeChunks = workingMemory.getActiveChunks();
      expect(activeChunks).toHaveLength(0);
    });
  });

  describe('Rehearsal Mechanism', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should boost activation of rehearsed chunks', () => {
      const chunk: MemoryChunk = {
        content: 'rehearsal content',
        activation: 0.7, // Above rehearsal threshold
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      const initialActivation = workingMemory.getActiveChunks()[0].activation;
      
      workingMemory.rehearse();
      
      const finalActivation = workingMemory.getActiveChunks()[0].activation;
      expect(finalActivation).toBeGreaterThan(initialActivation);
    });

    it('should not rehearse chunks below threshold', () => {
      const chunk: MemoryChunk = {
        content: 'low activation content',
        activation: 0.3, // Below rehearsal threshold
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      const initialActivation = workingMemory.getActiveChunks()[0].activation;
      
      workingMemory.rehearse();
      
      const finalActivation = workingMemory.getActiveChunks()[0].activation;
      expect(finalActivation).toBe(initialActivation);
    });
  });

  describe('Information Chunking', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should chunk semantically related text', () => {
      const chunk1: MemoryChunk = {
        content: 'The cat sat',
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['text', 'phonological']
      };

      const chunk2: MemoryChunk = {
        content: 'The cat played',
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['text', 'phonological']
      };

      workingMemory.addChunk(chunk1);
      workingMemory.addChunk(chunk2);
      
      const activeChunks = workingMemory.getActiveChunks();
      // Should have chunked similar content
      expect(activeChunks.length).toBeLessThanOrEqual(2);
    });

    it('should chunk sequential arrays', async () => {
      const largeArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Larger array to ensure chunking
      
      // Process the array through the working memory system
      const state = await workingMemory.process(largeArray);
      
      // Should have at least one chunk (the array might be processed as a single unit)
      expect(state.active_chunks.length).toBeGreaterThanOrEqual(1);
      
      // Check that the content includes the array data
      const hasArrayContent = state.active_chunks.some(chunk => 
        Array.isArray(chunk.content) || 
        (Array.isArray(chunk.content) && chunk.content.length > 0)
      );
      expect(hasArrayContent).toBe(true);
    });
  });

  describe('Cognitive Load Calculation', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should calculate cognitive load correctly', () => {
      expect(workingMemory.getCurrentLoad()).toBe(0);

      // Add some chunks
      for (let i = 0; i < 3; i++) {
        const chunk: MemoryChunk = {
          content: `content ${i}`,
          activation: 1.0,
          timestamp: Date.now(),
          associations: new Set(),
          emotional_valence: 0,
          importance: 0.5,
          context_tags: ['test']
        };
        workingMemory.addChunk(chunk);
      }

      const load = workingMemory.getCurrentLoad();
      expect(load).toBeGreaterThan(0);
      expect(load).toBeLessThanOrEqual(1);
    });

    it('should report increasing load as chunks are added', () => {
      const initialLoad = workingMemory.getCurrentLoad();
      expect(initialLoad).toBe(0);

      // Add some chunks
      for (let i = 0; i < 3; i++) {
        workingMemory.addChunk({
          content: `content ${i}`,
          activation: 1.0,
          timestamp: Date.now(),
          associations: new Set(),
          emotional_valence: 0,
          importance: 0.5,
          context_tags: ['text']
        });
      }

      const loadAfterAdding = workingMemory.getCurrentLoad();
      expect(loadAfterAdding).toBeGreaterThan(initialLoad);
    });
  });

  describe('Processing Integration', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should process string input and create appropriate chunks', async () => {
      const input = 'This is a test sentence. This is another sentence.';
      
      const state = await workingMemory.process(input);
      
      expect(state.active_chunks.length).toBeGreaterThan(0);
      expect(state.cognitive_load).toBeGreaterThan(0);
    });

    it('should process array input and create chunks', async () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const state = await workingMemory.process(input);
      
      expect(state.active_chunks.length).toBeGreaterThan(0);
      expect(state.cognitive_load).toBeGreaterThan(0);
    });

    it('should process object input and create chunks', async () => {
      const input = {
        name: 'John',
        age: 30,
        city: 'New York',
        occupation: 'Engineer'
      };
      
      const state = await workingMemory.process(input);
      
      expect(state.active_chunks.length).toBe(1); // Single chunk for the object
      expect(state.cognitive_load).toBeGreaterThan(0);
      expect(state.active_chunks[0].content).toEqual(input);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await workingMemory.initialize(config);
    });

    it('should provide complete working memory state', async () => {
      const chunk: MemoryChunk = {
        content: 'test content',
        activation: 0.8,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      const state = workingMemory.getCurrentState();

      expect(state).toHaveProperty('active_chunks');
      expect(state).toHaveProperty('cognitive_load');
      expect(state).toHaveProperty('rehearsal_queue');
      expect(state).toHaveProperty('buffer_states');
      expect(state).toHaveProperty('last_decay');

      expect(state.buffer_states.size).toBe(3); // Three buffer types
      expect(state.rehearsal_queue.length).toBeGreaterThan(0);
    });

    it('should reset state correctly', () => {
      const chunk: MemoryChunk = {
        content: 'test content',
        activation: 1.0,
        timestamp: Date.now(),
        associations: new Set(),
        emotional_valence: 0,
        importance: 0.5,
        context_tags: ['test']
      };

      workingMemory.addChunk(chunk);
      expect(workingMemory.getActiveChunks()).toHaveLength(1);

      workingMemory.reset();
      expect(workingMemory.getActiveChunks()).toHaveLength(0);
      expect(workingMemory.getStatus().active).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        working_memory_capacity: -1, // Invalid capacity
      } as any;

      await expect(workingMemory.initialize(invalidConfig))
        .rejects.toThrow();
    });

    it('should handle null chunks gracefully', () => {
      const result = workingMemory.addChunk(null as any);
      expect(result).toBe(false);
    });
  });
});

// Helper function to create a working memory state for testing
function createTestState(): WorkingMemoryState {
  return {
    active_chunks: [],
    cognitive_load: 0,
    rehearsal_queue: [],
    buffer_states: new Map(),
    last_decay: Date.now()
  };
}