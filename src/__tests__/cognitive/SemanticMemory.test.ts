/**
 * Unit tests for SemanticMemory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticMemory } from '../../cognitive/SemanticMemory.js';
import { Concept } from '../../types/core.js';

describe('SemanticMemory', () => {
  let semanticMemory: SemanticMemory;

  beforeEach(async () => {
    semanticMemory = new SemanticMemory({
      capacity: 100,
      embedding_dim: 64, // Smaller for testing
      similarity_threshold: 0.7,
      activation_decay: 0.05,
      relation_strength_threshold: 0.3,
      max_relations_per_concept: 10
    });

    await semanticMemory.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const status = semanticMemory.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.name).toBe('SemanticMemory');
    });

    it('should start with empty memory', () => {
      const activeConcepts = semanticMemory.getActiveConcepts();
      expect(activeConcepts.length).toBe(0);
    });
  });

  describe('concept storage', () => {
    it('should store a concept successfully', () => {
      const concept: Concept = {
        id: 'test-concept-1',
        content: { type: 'knowledge', value: 'Machine learning is a subset of AI' },
        relations: [],
        activation: 0.8,
        last_accessed: Date.now()
      };

      const conceptId = semanticMemory.store(concept);
      
      expect(conceptId).toBe('test-concept-1');
      
      const storedConcept = semanticMemory.getConcept(conceptId);
      expect(storedConcept).toBeDefined();
      expect(storedConcept?.content).toEqual(concept.content);
    });

    it('should generate ID if not provided', () => {
      const concept: Concept = {
        id: '',
        content: { type: 'knowledge', value: 'Neural networks learn patterns' },
        relations: [],
        activation: 0.7,
        last_accessed: Date.now()
      };

      const conceptId = semanticMemory.store(concept);
      
      expect(conceptId).toBeDefined();
      expect(typeof conceptId).toBe('string');
      expect(conceptId.length).toBeGreaterThan(0);
    });

    it('should generate embeddings automatically', () => {
      const concept: Concept = {
        id: 'test-embedding',
        content: { text: 'Deep learning uses neural networks' },
        relations: [],
        activation: 0.6,
        last_accessed: Date.now()
      };

      const conceptId = semanticMemory.store(concept);
      const storedConcept = semanticMemory.getConcept(conceptId);
      
      expect(storedConcept?.embedding).toBeDefined();
      expect(storedConcept?.embedding?.length).toBe(64); // Our test embedding dimension
    });
  });

  describe('concept retrieval', () => {
    beforeEach(() => {
      // Store test concepts
      const concepts: Concept[] = [
        {
          id: 'ml-concept',
          content: { text: 'Machine learning algorithms learn from data' },
          relations: [],
          activation: 0.9,
          last_accessed: Date.now()
        },
        {
          id: 'ai-concept',
          content: { text: 'Artificial intelligence mimics human cognition' },
          relations: [],
          activation: 0.8,
          last_accessed: Date.now()
        },
        {
          id: 'cooking-concept',
          content: { text: 'Cooking involves preparing food with heat' },
          relations: [],
          activation: 0.6,
          last_accessed: Date.now()
        }
      ];

      concepts.forEach(concept => semanticMemory.store(concept));
    });

    it('should retrieve concepts based on similarity', () => {
      const results = semanticMemory.retrieve('machine learning', 0.1);
      
      expect(results.length).toBeGreaterThan(0);
      // Should find the ML concept
      const mlConcept = results.find(c => c.id === 'ml-concept');
      expect(mlConcept).toBeDefined();
    });

    it('should respect similarity threshold', () => {
      const highThreshold = semanticMemory.retrieve('learning', 0.9);
      const lowThreshold = semanticMemory.retrieve('learning', 0.1);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it('should update activation on retrieval', () => {
      const concept = semanticMemory.getConcept('ml-concept');
      const initialActivation = concept?.activation || 0;
      
      semanticMemory.retrieve('machine learning', 0.1);
      
      const updatedConcept = semanticMemory.getConcept('ml-concept');
      const updatedActivation = updatedConcept?.activation || 0;
      
      expect(updatedActivation).toBeGreaterThanOrEqual(initialActivation);
    });

    it('should return concepts sorted by similarity', () => {
      const results = semanticMemory.retrieve('artificial intelligence', 0.1);
      
      if (results.length > 1) {
        // Results should be sorted by relevance (we can't easily test exact similarity scores)
        expect(results[0].id).toBe('ai-concept'); // Most relevant should be first
      }
    });
  });

  describe('concept relations', () => {
    beforeEach(() => {
      // Store related concepts
      const concepts: Concept[] = [
        {
          id: 'parent-concept',
          content: { text: 'Artificial Intelligence' },
          relations: [],
          activation: 0.9,
          last_accessed: Date.now()
        },
        {
          id: 'child-concept',
          content: { text: 'Machine Learning' },
          relations: [],
          activation: 0.8,
          last_accessed: Date.now()
        }
      ];

      concepts.forEach(concept => semanticMemory.store(concept));
    });

    it('should add relations between concepts', () => {
      semanticMemory.addRelation('parent-concept', 'child-concept', 'contains', 0.8);
      
      const parentConcept = semanticMemory.getConcept('parent-concept');
      const childConcept = semanticMemory.getConcept('child-concept');
      
      expect(parentConcept?.relations.length).toBeGreaterThan(0);
      expect(childConcept?.relations.length).toBeGreaterThan(0);
    });

    it('should retrieve related concepts', () => {
      semanticMemory.addRelation('parent-concept', 'child-concept', 'contains', 0.8);
      
      const relatedToParent = semanticMemory.getRelated('parent-concept');
      const relatedToChild = semanticMemory.getRelated('child-concept');
      
      expect(relatedToParent.length).toBe(1);
      expect(relatedToChild.length).toBe(1);
      expect(relatedToParent[0].id).toBe('child-concept');
      expect(relatedToChild[0].id).toBe('parent-concept');
    });

    it('should respect relation strength threshold', () => {
      // This should not create a relation (below threshold)
      semanticMemory.addRelation('parent-concept', 'child-concept', 'weak-link', 0.1);
      
      const parentConcept = semanticMemory.getConcept('parent-concept');
      expect(parentConcept?.relations.length).toBe(0);
    });

    it('should handle non-existent concepts in relations', () => {
      expect(() => {
        semanticMemory.addRelation('non-existent', 'child-concept', 'test', 0.8);
      }).toThrow();
    });

    it('should get relations by type', () => {
      semanticMemory.addRelation('parent-concept', 'child-concept', 'contains', 0.8);
      semanticMemory.addRelation('child-concept', 'parent-concept', 'part-of', 0.7);
      
      const containsRelations = semanticMemory.getRelationsByType('contains');
      const partOfRelations = semanticMemory.getRelationsByType('part-of');
      
      expect(containsRelations.length).toBe(1);
      expect(partOfRelations.length).toBe(1);
      expect(containsRelations[0].type).toBe('contains');
      expect(partOfRelations[0].type).toBe('part-of');
    });
  });

  describe('activation management', () => {
    beforeEach(() => {
      const concept: Concept = {
        id: 'activation-test',
        content: { text: 'Test activation' },
        relations: [],
        activation: 0.5,
        last_accessed: Date.now()
      };

      semanticMemory.store(concept);
    });

    it('should update concept activation', () => {
      semanticMemory.updateActivation('activation-test', 0.2);
      
      const concept = semanticMemory.getConcept('activation-test');
      expect(concept?.activation).toBe(0.7);
    });

    it('should clamp activation between 0 and 1', () => {
      semanticMemory.updateActivation('activation-test', 1.0); // Should clamp to 1.0
      let concept = semanticMemory.getConcept('activation-test');
      expect(concept?.activation).toBe(1.0);

      semanticMemory.updateActivation('activation-test', -2.0); // Should clamp to 0.0
      concept = semanticMemory.getConcept('activation-test');
      expect(concept?.activation).toBe(0.0);
    });

    it('should get active concepts above threshold', () => {
      // Store concepts with different activation levels
      const concepts: Concept[] = [
        {
          id: 'high-activation',
          content: { text: 'High activation concept' },
          relations: [],
          activation: 0.9,
          last_accessed: Date.now()
        },
        {
          id: 'low-activation',
          content: { text: 'Low activation concept' },
          relations: [],
          activation: 0.05,
          last_accessed: Date.now()
        }
      ];

      concepts.forEach(concept => semanticMemory.store(concept));

      const activeConcepts = semanticMemory.getActiveConcepts(0.1);
      
      expect(activeConcepts.length).toBe(2); // high-activation and activation-test (0.5)
      expect(activeConcepts.find(c => c.id === 'low-activation')).toBeUndefined();
    });
  });

  describe('similarity search', () => {
    beforeEach(() => {
      const concepts: Concept[] = [
        {
          id: 'target-concept',
          content: { text: 'Neural networks process information' },
          relations: [],
          activation: 0.8,
          last_accessed: Date.now()
        },
        {
          id: 'similar-concept',
          content: { text: 'Deep networks learn patterns' },
          relations: [],
          activation: 0.7,
          last_accessed: Date.now()
        },
        {
          id: 'different-concept',
          content: { text: 'Cooking recipes use ingredients' },
          relations: [],
          activation: 0.6,
          last_accessed: Date.now()
        }
      ];

      concepts.forEach(concept => semanticMemory.store(concept));
    });

    it('should find similar concepts', () => {
      const similarConcepts = semanticMemory.findSimilarConcepts('target-concept', 5);
      
      expect(similarConcepts.length).toBeGreaterThan(0);
      expect(similarConcepts.length).toBeLessThanOrEqual(5);
      
      // Should not include the target concept itself
      expect(similarConcepts.find(c => c.id === 'target-concept')).toBeUndefined();
    });

    it('should limit results to maxResults parameter', () => {
      const similarConcepts = semanticMemory.findSimilarConcepts('target-concept', 1);
      expect(similarConcepts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('decay mechanism', () => {
    it('should apply decay to concept activations', () => {
      const pastTime = Date.now() - 3600000; // 1 hour ago
      const concept: Concept = {
        id: 'decay-test',
        content: { text: 'Test decay mechanism' },
        relations: [],
        activation: 0.8,
        last_accessed: pastTime
      };

      semanticMemory.store(concept);
      
      // Manually set the last_accessed to ensure decay occurs
      const storedConcept = semanticMemory.getConcept('decay-test');
      if (storedConcept) {
        storedConcept.last_accessed = pastTime;
      }
      
      const initialActivation = semanticMemory.getConcept('decay-test')?.activation || 0;
      
      semanticMemory.applyDecay();
      
      const decayedActivation = semanticMemory.getConcept('decay-test')?.activation || 0;
      
      expect(decayedActivation).toBeLessThan(initialActivation);
    });
  });

  describe('capacity management', () => {
    it('should enforce capacity limits', async () => {
      const smallMemory = new SemanticMemory({ capacity: 2 });
      await smallMemory.initialize();
      
      // Store 3 concepts (exceeds capacity)
      for (let i = 0; i < 3; i++) {
        const concept: Concept = {
          id: `concept-${i}`,
          content: { text: `Concept ${i}` },
          relations: [],
          activation: 0.1 + (i * 0.1), // Different activation levels
          last_accessed: Date.now()
        };
        smallMemory.store(concept);
      }

      const activeConcepts = smallMemory.getActiveConcepts(0.0);
      expect(activeConcepts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('should handle invalid process input', async () => {
      await expect(semanticMemory.process('invalid')).rejects.toThrow();
    });

    it('should handle valid process input', async () => {
      const concept: Concept = {
        id: 'process-test',
        content: { text: 'Process test concept' },
        relations: [],
        activation: 0.5,
        last_accessed: Date.now()
      };

      const result = await semanticMemory.process({ concept });
      expect(typeof result).toBe('string');
    });

    it('should handle retrieval of non-existent concept', () => {
      const concept = semanticMemory.getConcept('non-existent');
      expect(concept).toBeUndefined();
    });

    it('should handle relations for non-existent concept', () => {
      const related = semanticMemory.getRelated('non-existent');
      expect(related).toEqual([]);
    });
  });

  describe('reset functionality', () => {
    it('should reset memory state', () => {
      const concept: Concept = {
        id: 'reset-test',
        content: { text: 'Test reset' },
        relations: [],
        activation: 0.5,
        last_accessed: Date.now()
      };

      semanticMemory.store(concept);
      expect(semanticMemory.getActiveConcepts().length).toBe(1);

      semanticMemory.reset();
      expect(semanticMemory.getActiveConcepts().length).toBe(0);
    });
  });
});