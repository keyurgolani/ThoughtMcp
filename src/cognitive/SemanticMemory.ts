/**
 * Semantic Memory System
 * 
 * Implements embedding-based similarity search for semantic memories.
 * Handles storage, retrieval, and relationship management of concepts.
 */

import { ISemanticMemory, ComponentStatus } from '../interfaces/cognitive.js';
import { Concept, Relation } from '../types/core.js';

export interface SemanticMemoryConfig {
  capacity: number;
  embedding_dim: number;
  similarity_threshold: number;
  activation_decay: number;
  relation_strength_threshold: number;
  max_relations_per_concept: number;
}

export class SemanticMemory implements ISemanticMemory {
  private concepts: Map<string, Concept> = new Map();
  private relations: Map<string, Relation> = new Map();
  private embeddingIndex: Map<string, number[]> = new Map();
  private activationIndex: Map<string, number> = new Map();
  private config: SemanticMemoryConfig;
  private initialized: boolean = false;
  private lastActivity: number = 0;

  constructor(config?: Partial<SemanticMemoryConfig>) {
    this.config = {
      capacity: 50000,
      embedding_dim: 768,
      similarity_threshold: 0.7,
      activation_decay: 0.05,
      relation_strength_threshold: 0.3,
      max_relations_per_concept: 20,
      ...config
    };
  }

  async initialize(config?: Partial<SemanticMemoryConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.concepts.clear();
    this.relations.clear();
    this.embeddingIndex.clear();
    this.activationIndex.clear();
    
    this.initialized = true;
    this.lastActivity = Date.now();
  }

  async process(input: any): Promise<any> {
    // Generic process method for CognitiveComponent interface
    if (typeof input === 'object' && input.concept) {
      return this.store(input.concept);
    }
    throw new Error('Invalid input for SemanticMemory.process()');
  }

  reset(): void {
    this.concepts.clear();
    this.relations.clear();
    this.embeddingIndex.clear();
    this.activationIndex.clear();
    this.lastActivity = Date.now();
  }

  getStatus(): ComponentStatus {
    return {
      name: 'SemanticMemory',
      initialized: this.initialized,
      active: this.concepts.size > 0,
      last_activity: this.lastActivity,
    };
  }

  /**
   * Store a concept in semantic memory
   */
  store(concept: Concept): string {
    this.lastActivity = Date.now();
    
    // Generate ID if not provided
    const conceptId = concept.id || this.generateConceptId(concept.content);
    
    // Generate embedding if not provided
    const embedding = concept.embedding || this.generateEmbedding(concept.content);
    
    // Store the concept
    const storedConcept: Concept = {
      ...concept,
      id: conceptId,
      embedding,
      activation: concept.activation || 1.0,
      last_accessed: Date.now(),
      relations: concept.relations || []
    };
    
    this.concepts.set(conceptId, storedConcept);
    this.embeddingIndex.set(conceptId, embedding);
    this.activationIndex.set(conceptId, storedConcept.activation);
    
    // Apply capacity management after storing
    if (this.concepts.size > this.config.capacity) {
      this.pruneLeastActiveConcepts();
    }
    
    return conceptId;
  }

  /**
   * Retrieve concepts based on similarity to cue
   */
  retrieve(cue: string, threshold: number = this.config.similarity_threshold): Concept[] {
    this.lastActivity = Date.now();
    
    const cueEmbedding = this.generateEmbedding(cue);
    const matches: Array<{ concept: Concept; similarity: number }> = [];
    
    // Compute similarity with all concepts
    for (const [id, concept] of this.concepts) {
      const embedding = this.embeddingIndex.get(id);
      if (!embedding) continue;
      
      const similarity = this.computeCosineSimilarity(cueEmbedding, embedding);
      
      if (similarity >= threshold) {
        matches.push({ concept, similarity });
        
        // Update activation for retrieved concepts
        this.updateActivation(id, 0.1);
      }
    }
    
    // Sort by similarity and return concepts
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .map(match => match.concept);
  }

  /**
   * Add a relation between two concepts
   */
  addRelation(from: string, to: string, type: string, strength: number): void {
    this.lastActivity = Date.now();
    
    // Validate concepts exist
    if (!this.concepts.has(from) || !this.concepts.has(to)) {
      throw new Error(`Cannot create relation: concept(s) not found`);
    }
    
    // Check strength threshold
    if (strength < this.config.relation_strength_threshold) {
      return;
    }
    
    const relationId = `${from}-${type}-${to}`;
    const relation: Relation = { from, to, type, strength };
    
    this.relations.set(relationId, relation);
    
    // Update concept relations
    this.addRelationToConcept(from, relationId);
    this.addRelationToConcept(to, relationId);
  }

  /**
   * Get concepts related to a given concept
   */
  getRelated(conceptId: string): Concept[] {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];
    
    const relatedConcepts: Concept[] = [];
    
    for (const relationId of concept.relations) {
      const relation = this.relations.get(relationId);
      if (!relation) continue;
      
      // Get the other concept in the relation
      const otherConceptId = relation.from === conceptId ? relation.to : relation.from;
      const otherConcept = this.concepts.get(otherConceptId);
      
      if (otherConcept) {
        relatedConcepts.push(otherConcept);
      }
    }
    
    // Sort by activation level
    return relatedConcepts.sort((a, b) => b.activation - a.activation);
  }

  /**
   * Update activation level of a concept
   */
  updateActivation(conceptId: string, delta: number): void {
    const concept = this.concepts.get(conceptId);
    if (!concept) return;
    
    const newActivation = Math.max(0, Math.min(1, concept.activation + delta));
    
    const updatedConcept: Concept = {
      ...concept,
      activation: newActivation,
      last_accessed: Date.now()
    };
    
    this.concepts.set(conceptId, updatedConcept);
    this.activationIndex.set(conceptId, newActivation);
  }

  /**
   * Apply activation decay to all concepts
   */
  applyDecay(): void {
    const currentTime = Date.now();
    
    for (const [id, concept] of this.concepts) {
      const timeSinceAccess = (currentTime - concept.last_accessed) / (1000 * 60 * 60); // hours
      const decayAmount = this.config.activation_decay * timeSinceAccess;
      const newActivation = Math.max(0, concept.activation - decayAmount);
      
      // Only update if there's actual decay
      if (newActivation !== concept.activation) {
        this.updateActivation(id, newActivation - concept.activation);
      }
    }
  }

  /**
   * Find concepts by content similarity
   */
  findSimilarConcepts(conceptId: string, maxResults: number = 10): Concept[] {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];
    
    const embedding = this.embeddingIndex.get(conceptId);
    if (!embedding) return [];
    
    const similarities: Array<{ concept: Concept; similarity: number }> = [];
    
    for (const [id, otherConcept] of this.concepts) {
      if (id === conceptId) continue;
      
      const otherEmbedding = this.embeddingIndex.get(id);
      if (!otherEmbedding) continue;
      
      const similarity = this.computeCosineSimilarity(embedding, otherEmbedding);
      similarities.push({ concept: otherConcept, similarity });
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults)
      .map(item => item.concept);
  }

  /**
   * Get concept by ID
   */
  getConcept(conceptId: string): Concept | undefined {
    return this.concepts.get(conceptId);
  }

  /**
   * Get all concepts with activation above threshold
   */
  getActiveConcepts(threshold: number = 0.1): Concept[] {
    return Array.from(this.concepts.values())
      .filter(concept => concept.activation >= threshold)
      .sort((a, b) => b.activation - a.activation);
  }

  /**
   * Get relations of a specific type
   */
  getRelationsByType(type: string): Relation[] {
    return Array.from(this.relations.values())
      .filter(relation => relation.type === type);
  }

  // Private helper methods

  private generateConceptId(content: any): string {
    const contentStr = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `concept_${Math.abs(hash).toString(16)}`;
  }

  private generateEmbedding(content: any): number[] {
    // Simple embedding generation (in production, use a proper embedding model)
    const contentStr = JSON.stringify(content).toLowerCase();
    const embedding = new Array(this.config.embedding_dim).fill(0);
    
    // Hash-based embedding generation
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      const index = char % this.config.embedding_dim;
      embedding[index] += Math.sin(char * 0.1) * 0.1;
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  private computeCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private addRelationToConcept(conceptId: string, relationId: string): void {
    const concept = this.concepts.get(conceptId);
    if (!concept) return;
    
    // Check if we've reached the maximum relations limit
    if (concept.relations.length >= this.config.max_relations_per_concept) {
      // Remove the weakest relation
      this.removeWeakestRelation(conceptId);
    }
    
    const updatedConcept: Concept = {
      ...concept,
      relations: [...concept.relations, relationId]
    };
    
    this.concepts.set(conceptId, updatedConcept);
  }

  private removeWeakestRelation(conceptId: string): void {
    const concept = this.concepts.get(conceptId);
    if (!concept || concept.relations.length === 0) return;
    
    let weakestRelationId = '';
    let weakestStrength = Infinity;
    
    for (const relationId of concept.relations) {
      const relation = this.relations.get(relationId);
      if (relation && relation.strength < weakestStrength) {
        weakestStrength = relation.strength;
        weakestRelationId = relationId;
      }
    }
    
    if (weakestRelationId) {
      // Remove from concept
      const updatedRelations = concept.relations.filter(id => id !== weakestRelationId);
      const updatedConcept: Concept = {
        ...concept,
        relations: updatedRelations
      };
      this.concepts.set(conceptId, updatedConcept);
      
      // Remove the relation entirely
      this.relations.delete(weakestRelationId);
    }
  }

  private pruneLeastActiveConcepts(): void {
    // Remove concepts until we're at capacity
    const conceptEntries = Array.from(this.concepts.entries());
    const sortedByActivation = conceptEntries.sort((a, b) => a[1].activation - b[1].activation);
    const toRemove = this.concepts.size - this.config.capacity;
    
    for (let i = 0; i < toRemove && i < sortedByActivation.length; i++) {
      const [conceptId] = sortedByActivation[i];
      this.removeConcept(conceptId);
    }
  }

  private removeConcept(conceptId: string): void {
    const concept = this.concepts.get(conceptId);
    if (!concept) return;
    
    // Remove all relations involving this concept
    for (const relationId of concept.relations) {
      this.relations.delete(relationId);
    }
    
    // Remove from all indexes
    this.concepts.delete(conceptId);
    this.embeddingIndex.delete(conceptId);
    this.activationIndex.delete(conceptId);
    
    // Remove references from other concepts
    for (const [id, otherConcept] of this.concepts) {
      const updatedRelations = otherConcept.relations.filter(relationId => {
        const relation = this.relations.get(relationId);
        return relation && relation.from !== conceptId && relation.to !== conceptId;
      });
      
      if (updatedRelations.length !== otherConcept.relations.length) {
        this.concepts.set(id, {
          ...otherConcept,
          relations: updatedRelations
        });
      }
    }
  }
}