import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MemoryGraphScene } from './components/3d';
import { UsernameModal } from './components/auth';
import {
  CleanModeController,
  CognitiveResultModal,
  CognitiveToolsPanel,
  ConnectionTooltip,
  CreateMemoryModal,
  FloatingTooltipTrigger,
  MemoryPreviewModal,
  MiniMap,
  NeighborPreviewPanel,
  RelatedMemoriesSidebar,
  SearchFilterPanel,
  TagFilterPanel,
  graphEdgeToMiniMapEdge,
  graphNodeToMiniMapNode,
  type CognitiveToolResult,
  type ConnectedMemory,
  type CreateMemorySaveResult,
  type RelatedMemory,
  type TagWithCount,
} from './components/hud';
import {
  MainNavigation,
  PageTransition,
  QuickAccessPanel,
  type ScreenId,
} from './components/navigation';
import type { RecentMemory } from './components/navigation/QuickAccessPanel';
import { useCleanMode } from './hooks/useCleanMode';
import {
  ConfidenceBiasDashboard,
  Dashboard,
  EmotionAnalysis,
  FrameworkAnalysis,
  MemoryExplorer,
  ProblemDecomposition,
  ReasoningConsole,
  type CognitiveSession,
  type GraphPreviewNode,
  type QuickStats,
  type RecentMemoryItem,
  type SuggestedAction,
} from './scenes';
import { useCognitiveStore } from './stores/cognitiveStore';
import { useGraphStore, type NeighborNode } from './stores/graphStore';
import { useMemoryStore } from './stores/memoryStore';
import { useNavigationStore } from './stores/navigationStore';
import { useSessionStore } from './stores/sessionStore';
import { useUIStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';
import type { ViewMode } from './types';
import type { GraphEdge, GraphNode, Memory, MemorySectorType } from './types/api';
import { filterNodesBySector, filterNodesByTags } from './utils/filters';
import { calculateFibonacciSpherePositions } from './utils/visualization';

// Demo recent cognitive sessions (Requirement 50.4)
const DEMO_RECENT_SESSIONS: CognitiveSession[] = [
  {
    id: 'session-1',
    type: 'reasoning',
    title: 'Analyzing transformer architecture trade-offs',
    timestamp: Date.now() - 3600000, // 1 hour ago
    status: 'in-progress',
    preview: 'Comparing attention mechanisms vs recurrent approaches...',
  },
  {
    id: 'session-2',
    type: 'decomposition',
    title: 'Breaking down ML pipeline optimization',
    timestamp: Date.now() - 7200000, // 2 hours ago
    status: 'completed',
    preview: 'Identified 5 sub-problems: data prep, feature engineering...',
  },
  {
    id: 'session-3',
    type: 'analysis',
    title: 'Bias detection in recommendation system',
    timestamp: Date.now() - 86400000, // 1 day ago
    status: 'paused',
    preview: 'Found potential confirmation bias in user feedback loop...',
  },
  {
    id: 'session-4',
    type: 'framework',
    title: 'First principles analysis of embeddings',
    timestamp: Date.now() - 172800000, // 2 days ago
    status: 'completed',
    preview: 'Applied first principles to understand vector representations...',
  },
];

// Helper to convert Memory to GraphNode
function memoryToGraphNode(memory: Memory): GraphNode {
  return {
    id: memory.id,
    content: memory.content,
    primarySector: memory.primarySector,
    salience: memory.salience,
    strength: memory.strength,
    createdAt: memory.createdAt,
    metadata: memory.metadata,
  };
}

// Helper to generate graph preview nodes from memories
function memoriesToGraphPreviewNodes(memories: Memory[]): GraphPreviewNode[] {
  return memories.slice(0, 5).map((mem, index) => {
    // Distribute nodes in a simple pattern
    const positions = [
      { x: 50, y: 50 },
      { x: 30, y: 35 },
      { x: 70, y: 40 },
      { x: 40, y: 70 },
      { x: 65, y: 65 },
    ];
    const pos = positions[index] ?? { x: 50, y: 50 };
    return {
      id: mem.id,
      x: pos.x,
      y: pos.y,
      sector: mem.primarySector,
      activity: mem.salience,
    };
  });
}

// Helper to generate edges from memories (creates connections between first memory and others)
function memoriesToEdges(memories: Memory[]): GraphEdge[] {
  if (memories.length < 2) return [];
  const firstMemory = memories[0];
  if (!firstMemory) return [];

  const linkTypes: Array<'semantic' | 'causal' | 'temporal' | 'analogical'> = [
    'semantic',
    'causal',
    'temporal',
    'analogical',
  ];
  return memories.slice(1, 5).map((mem, index) => ({
    source: firstMemory.id,
    target: mem.id,
    linkType: linkTypes[index % linkTypes.length] ?? 'semantic',
    weight: 0.5 + Math.random() * 0.4,
  }));
}

// Route to ScreenId mapping
const ROUTE_TO_SCREEN: Record<string, ScreenId> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/explorer': 'memory-graph',
  '/memories': 'memory-explorer',
  '/reasoning': 'reasoning-console',
  '/framework': 'framework-analysis',
  '/decomposition': 'problem-decomposition',
  '/confidence-bias': 'confidence-bias',
  '/emotion': 'emotion-analysis',
};

const SCREEN_TO_ROUTE: Record<ScreenId, string> = {
  dashboard: '/dashboard',
  'memory-graph': '/explorer',
  'memory-explorer': '/memories',
  'reasoning-console': '/reasoning',
  'framework-analysis': '/framework',
  'problem-decomposition': '/decomposition',
  'confidence-bias': '/confidence-bias',
  'emotion-analysis': '/emotion',
};

/**
 * Memory Graph Screen Component
 * The main 3D exploration interface with refined panel layout.
 *
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 46.3, 46.4
 */
function MemoryGraphScreen(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [showDebug, setShowDebug] = useState(false);
  const [hoveredNeighbor, setHoveredNeighbor] = useState<NeighborNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cognitiveResult, setCognitiveResult] = useState<CognitiveToolResult | null>(null);
  const [, setHighlightedNodeIds] = useState<string[]>([]);
  const [showConnectionTooltip, setShowConnectionTooltip] = useState(false);

  // Panel visibility states for refined layout (Requirements: 27.1, 27.2, 27.4, 27.5)
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(true);
  const [isAIToolsExpanded, setIsAIToolsExpanded] = useState(false);
  const [showControlsTooltip, setShowControlsTooltip] = useState(false);

  // Tag filtering state (Requirements: 42.3, 42.4)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagPanelCollapsed, setIsTagPanelCollapsed] = useState(true); // Closed by default
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Search filter state (sector, strength, salience filters)
  const [selectedSectors, setSelectedSectors] = useState<MemorySectorType[]>([
    'episodic',
    'semantic',
    'procedural',
    'emotional',
    'reflective',
  ]);
  const [minStrength, setMinStrength] = useState(0);
  const [minSalience, setMinSalience] = useState(0);

  // Warp transition state
  const [warpTargetPosition, setWarpTargetPosition] = useState<[number, number, number] | null>(
    null
  );
  const [warpTargetNodeId, setWarpTargetNodeId] = useState<string | null>(null);
  const [warpTrigger, setWarpTrigger] = useState(0);

  // Clean mode state (Requirements: 46.3, 46.4)
  const { isCleanMode } = useCleanMode();

  const { currentNodeId, currentNode, neighbors, isLoading, error } = useGraphStore();
  const { history, isTransitioning, navigateTo } = useNavigationStore();
  useCognitiveStore();

  // Get user from store
  const userId = useUserStore((state) => state.username);

  // Get memory preview action from uiStore for linked memory navigation
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  // Get memories from central memory store
  const storeMemories = useMemoryStore((state) => state.memories);
  const storeFetchMemories = useMemoryStore((state) => state.fetchMemories);

  // Fetch memories on mount when user is available
  useEffect(() => {
    if (userId !== null && userId !== '') {
      void storeFetchMemories(userId);
    }
  }, [storeFetchMemories, userId]);

  // Use memories from store
  const memories = storeMemories;

  // Generate edges from memories
  const edges = useMemo(() => memoriesToEdges(memories), [memories]);

  const allNodes: GraphNode[] = useMemo(() => memories.map(memoryToGraphNode), [memories]);

  // Extract all unique tags from memories with counts (Requirements: 42.1, 42.2)
  const tagsWithCounts: TagWithCount[] = useMemo(() => {
    const tagCounts = new Map<string, number>();

    for (const memory of memories) {
      const tags = memory.metadata.tags ?? [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [memories]);

  // Filter nodes by selected tags, sectors, strength, and salience (Requirements: 42.3, 42.4)
  const filteredNodes: GraphNode[] = useMemo(() => {
    let nodes = filterNodesByTags(allNodes, selectedTags);
    nodes = filterNodesBySector(nodes, selectedSectors);

    // Filter by minimum strength
    if (minStrength > 0) {
      nodes = nodes.filter((node) => node.strength >= minStrength);
    }

    // Filter by minimum salience
    if (minSalience > 0) {
      nodes = nodes.filter((node) => node.salience >= minSalience);
    }

    return nodes;
  }, [allNodes, selectedTags, selectedSectors, minStrength, minSalience]);

  // Get nodes to highlight when hovering a tag (Requirement 42.6 - will be implemented in task 74.3)
  const tagHighlightedNodeIds: string[] = useMemo(() => {
    if (hoveredTag === null) return [];
    return allNodes
      .filter((node) => {
        const nodeTags = node.metadata.tags ?? [];
        return nodeTags.some((tag: string) => tag.toLowerCase() === hoveredTag.toLowerCase());
      })
      .map((node) => node.id);
  }, [allNodes, hoveredTag]);

  // Use filtered nodes for mini-map
  const miniMapNodes = filteredNodes.map(graphNodeToMiniMapNode);
  const miniMapEdges = edges.map(graphEdgeToMiniMapEdge);

  // Import types for suggested topics and memories
  type SuggestedTopic = {
    name: string;
    type: 'sector' | 'tag' | 'keyword';
    count?: number;
    color?: string;
  };

  type SuggestedMemoryToLink = {
    memory: Memory;
    reason: string;
  };

  // Compute suggested topics for empty state (Requirement 45.5)
  const suggestedTopics: SuggestedTopic[] = useMemo(() => {
    // Get sector counts
    const sectorCounts = new Map<string, number>();
    for (const memory of memories) {
      const sector = memory.primarySector;
      sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
    }

    // Get tag counts
    const tagCounts = new Map<string, number>();
    for (const memory of memories) {
      const tags = memory.metadata.tags ?? [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topics: SuggestedTopic[] = [];

    // Add sectors as topics
    for (const [sector, count] of sectorCounts.entries()) {
      topics.push({
        name: sector,
        type: 'sector',
        count,
      });
    }

    // Add top tags as topics (limit to 3)
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [tag, count] of sortedTags) {
      topics.push({
        name: tag,
        type: 'tag',
        count,
      });
    }

    return topics;
  }, [memories]);

  // Compute suggested memories to link for empty state (Requirement 45.5)
  const suggestedMemoriesToLink: SuggestedMemoryToLink[] = useMemo(() => {
    if (currentNode === null) return [];

    const suggestions: SuggestedMemoryToLink[] = [];
    const currentSector = currentNode.primarySector;

    for (const memory of memories) {
      // Skip the current memory
      if (memory.id === currentNode.id) continue;

      // Check if already linked
      const isLinked = edges.some(
        (edge) =>
          (edge.source === currentNode.id && edge.target === memory.id) ||
          (edge.target === currentNode.id && edge.source === memory.id)
      );

      if (isLinked) continue;

      // Suggest memories from the same sector
      if (memory.primarySector === currentSector) {
        suggestions.push({
          memory,
          reason: 'Same sector',
        });
        continue;
      }

      // Suggest hub nodes (memories with many connections)
      const connectionCount = edges.filter(
        (edge) => edge.source === memory.id || edge.target === memory.id
      ).length;

      if (connectionCount >= 2) {
        suggestions.push({
          memory,
          reason: 'Hub memory',
        });
        continue;
      }

      // Suggest recent memories
      const memoryDate = new Date(memory.lastAccessed).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (memoryDate > oneDayAgo) {
        suggestions.push({
          memory,
          reason: 'Recent',
        });
      }
    }

    // Limit to 3 suggestions
    return suggestions.slice(0, 3);
  }, [currentNode, memories, edges]);

  // Compute related memories for the current node (Requirements: 45.1, 45.2, 45.3, 45.4)
  const relatedMemories: RelatedMemory[] = useMemo(() => {
    if (currentNode === null) return [];

    const related: RelatedMemory[] = [];
    const currentKeywords = new Set(
      (currentNode.metadata.keywords ?? []).map((k: string) => k.toLowerCase())
    );

    for (const memory of memories) {
      // Skip the current memory
      if (memory.id === currentNode.id) continue;

      // Check if there's a direct link (waypoint connection)
      const hasDirectLink = edges.some(
        (edge) =>
          (edge.source === currentNode.id && edge.target === memory.id) ||
          (edge.target === currentNode.id && edge.source === memory.id)
      );

      // Calculate shared keywords
      const memoryKeywords = (memory.metadata.keywords ?? []).map((k: string) => k.toLowerCase());
      const sharedKeywords = memoryKeywords.filter((k: string) => currentKeywords.has(k));

      // Calculate relevance score based on shared keywords and tags
      const memoryTags = new Set((memory.metadata.tags ?? []).map((t: string) => t.toLowerCase()));
      const currentTags = new Set(
        (currentNode.metadata.tags ?? []).map((t: string) => t.toLowerCase())
      );
      const sharedTags = [...memoryTags].filter((t) => currentTags.has(t));

      // Base relevance from keywords and tags
      let relevanceScore = 0;
      if (sharedKeywords.length > 0) {
        relevanceScore += Math.min(sharedKeywords.length * 0.2, 0.6);
      }
      if (sharedTags.length > 0) {
        relevanceScore += Math.min(sharedTags.length * 0.15, 0.3);
      }

      // Boost for direct links
      if (hasDirectLink) {
        relevanceScore = Math.min(relevanceScore + 0.3, 1.0);
      }

      // Only include if there's some relevance
      if (relevanceScore > 0 || hasDirectLink) {
        related.push({
          memory,
          relevanceScore: Math.max(relevanceScore, hasDirectLink ? 0.5 : 0),
          sharedKeywords,
          connectionType: hasDirectLink
            ? 'direct'
            : sharedKeywords.length > 0
              ? 'semantic'
              : 'inferred',
        });
      }
    }

    // Sort by relevance score (descending)
    return related.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [currentNode, memories, edges]);

  // Initialize graph store when memories are loaded
  useEffect(() => {
    if (memories.length === 0) return;

    const loadMemoryData = (): void => {
      const currentMemory = memories[0];
      if (!currentMemory) return;

      const neighborsList = memories.slice(1).map((mem, index) => {
        const edge = edges[index];
        return {
          ...memoryToGraphNode(mem),
          edge: edge ?? {
            source: currentMemory.id,
            target: mem.id,
            linkType: 'semantic' as const,
            weight: 0.5,
          },
        };
      });

      useGraphStore.setState({
        currentNodeId: currentMemory.id,
        currentNode: currentMemory,
        neighbors: neighborsList,
        visibleNodes: new Map(memories.map((m) => [m.id, memoryToGraphNode(m)])),
        edges: edges,
        isLoading: false,
        error: null,
      });

      const contentPreview = currentMemory.content.substring(0, 30) + '...';
      navigateTo(currentMemory.id, contentPreview);
    };

    loadMemoryData();
  }, [memories, edges, navigateTo]);

  const completeNavigation = useCallback(
    (nodeId: string, clickedMemory: Memory): void => {
      const otherMemories = memories.filter((m) => m.id !== nodeId);
      const neighborsList = otherMemories.map((mem) => {
        const existingEdge = edges.find(
          (e) =>
            (e.source === nodeId && e.target === mem.id) ||
            (e.target === nodeId && e.source === mem.id)
        );
        return {
          ...memoryToGraphNode(mem),
          edge: existingEdge ?? {
            source: nodeId,
            target: mem.id,
            linkType: 'semantic' as const,
            weight: 0.5,
          },
        };
      });

      useGraphStore.setState({
        currentNodeId: nodeId,
        currentNode: clickedMemory,
        neighbors: neighborsList,
        isLoading: false,
      });

      const contentPreview = clickedMemory.content.substring(0, 30) + '...';
      navigateTo(nodeId, contentPreview);
    },
    [memories, edges, navigateTo]
  );

  const handleNodeClick = useCallback(
    (nodeId: string): void => {
      if (isTransitioning) return;
      if (nodeId === currentNodeId) return;

      const clickedMemory = memories.find((m) => m.id === nodeId);
      if (!clickedMemory) return;

      const neighbor = neighbors.find((n) => n.id === nodeId);
      if (neighbor) {
        const neighborIndex = neighbors.findIndex((n) => n.id === nodeId);
        const positions = calculateFibonacciSpherePositions(neighbors.length, 8);
        const targetPos = positions[neighborIndex] ?? [0, 0, 0];

        setWarpTargetPosition(targetPos);
        setWarpTargetNodeId(nodeId);
        setWarpTrigger((prev) => prev + 1);
      } else {
        completeNavigation(nodeId, clickedMemory);
      }
    },
    [isTransitioning, currentNodeId, neighbors, memories, completeNavigation]
  );

  // Handle topic click for exploration (Requirement 45.5)
  const handleTopicClick = useCallback(
    (topic: SuggestedTopic): void => {
      // Find a memory with this topic and navigate to it
      let targetMemory: Memory | undefined;

      if (topic.type === 'sector') {
        targetMemory = memories.find(
          (m) => m.primarySector === topic.name && m.id !== currentNodeId
        );
      } else if (topic.type === 'tag') {
        targetMemory = memories.find(
          (m) => (m.metadata.tags ?? []).includes(topic.name) && m.id !== currentNodeId
        );
      }

      if (targetMemory) {
        handleNodeClick(targetMemory.id);
      }
    },
    [currentNodeId, memories, handleNodeClick]
  );

  // Handle create link action (Requirement 45.5)
  const handleCreateLink = useCallback(
    (memoryId: string): void => {
      // In a real implementation, this would create a waypoint link
      // For now, just navigate to the memory
      console.log('Creating link to memory:', memoryId);
      handleNodeClick(memoryId);
    },
    [handleNodeClick]
  );

  // Handle linked memory click - opens the memory in the preview modal
  const handleLinkedMemoryClick = useCallback(
    (memoryId: string): void => {
      const linkedMemory = memories.find((m) => m.id === memoryId);
      if (linkedMemory) {
        openMemoryPreview(linkedMemory);
      }
    },
    [memories, openMemoryPreview]
  );

  const handleWarpComplete = useCallback(
    (nodeId: string): void => {
      const clickedMemory = memories.find((m) => m.id === nodeId);
      if (clickedMemory) {
        completeNavigation(nodeId, clickedMemory);
      }
      setWarpTargetPosition(null);
      setWarpTargetNodeId(null);
    },
    [memories, completeNavigation]
  );

  const handleWarpStart = useCallback((_nodeId: string): void => {
    // Warp started
  }, []);

  const handleNodeHover = useCallback(
    (nodeId: string | null): void => {
      setHoveredNodeId(nodeId);
      if (nodeId !== null && nodeId !== '') {
        const neighbor = neighbors.find((n) => n.id === nodeId);
        setHoveredNeighbor(neighbor ?? null);
        // Show connection tooltip after a short delay (Requirements: 39.3)
        setShowConnectionTooltip(true);
      } else {
        setHoveredNeighbor(null);
        setShowConnectionTooltip(false);
      }
    },
    [neighbors]
  );

  // Compute connected memories for the hovered node (Requirements: 39.3)
  const connectedMemories: ConnectedMemory[] = useMemo(() => {
    if (hoveredNodeId === null || hoveredNodeId === '') return [];

    // Find all edges connected to the hovered node
    const connectedEdges = edges.filter(
      (edge) => edge.source === hoveredNodeId || edge.target === hoveredNodeId
    );

    // Get the connected memory IDs (the other end of each edge)
    const connectedMemoryData: ConnectedMemory[] = [];
    for (const edge of connectedEdges) {
      const connectedId = edge.source === hoveredNodeId ? edge.target : edge.source;
      const memory = memories.find((m) => m.id === connectedId);
      if (memory) {
        connectedMemoryData.push({
          id: memory.id,
          content: memory.content,
          linkType: edge.linkType,
        });
      }
    }

    return connectedMemoryData;
  }, [hoveredNodeId, memories, edges]);

  // Get the title of the hovered node for the tooltip
  const hoveredNodeTitle = useMemo(() => {
    if (hoveredNodeId === null || hoveredNodeId === '') return undefined;
    const memory = memories.find((m) => m.id === hoveredNodeId);
    return memory?.content;
  }, [hoveredNodeId, memories]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      setHoverPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleSearchResultClick = useCallback(
    (nodeId: string): void => {
      handleNodeClick(nodeId);
    },
    [handleNodeClick]
  );

  const handleMiniMapNodeClick = useCallback(
    (nodeId: string): void => {
      handleNodeClick(nodeId);
    },
    [handleNodeClick]
  );

  const handleSimilarNodesFound = useCallback((nodeIds: string[]): void => {
    setHighlightedNodeIds(nodeIds);
    setTimeout(() => {
      setHighlightedNodeIds([]);
    }, 5000);
  }, []);

  // Tag filtering handlers (Requirements: 42.3, 42.4)
  const handleTagSelect = useCallback((tag: string): void => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleTagDeselect = useCallback((tag: string): void => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagHover = useCallback((tag: string | null): void => {
    setHoveredTag(tag);
  }, []);

  const handleToggleTagPanel = useCallback((): void => {
    setIsTagPanelCollapsed((prev) => !prev);
  }, []);

  const handleCognitiveResult = useCallback((result: CognitiveToolResult): void => {
    setCognitiveResult(result);
  }, []);

  const handleCloseCognitiveResult = useCallback((): void => {
    setCognitiveResult(null);
  }, []);

  const handleNavigateToMemoryFromResult = useCallback(
    (memoryId: string): void => {
      handleNodeClick(memoryId);
      setCognitiveResult(null);
    },
    [handleNodeClick]
  );

  // Note: handleCognitiveAction removed as Memory Details panel is now hidden by default
  // and cognitive actions are handled through the AI Tools toolbar (Requirement 27.2, 27.4)

  return (
    <div className="h-full relative">
      {/* Search Bar & Tag Filter - Top RIGHT edge, tag icon BELOW search */}
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 items-end">
        {/* Search Panel - Top right - use compact mode for narrower width */}
        <div>
          {isLoading && (
            <span className="text-ui-accent-primary text-xs animate-pulse block text-center mb-1">
              Loading...
            </span>
          )}
          {error !== null && error !== '' && (
            <span className="text-status-error text-xs block text-center mb-1">{error}</span>
          )}
          <SearchFilterPanel
            nodes={filteredNodes}
            selectedSectors={selectedSectors}
            minStrength={minStrength}
            minSalience={minSalience}
            onSectorChange={setSelectedSectors}
            onStrengthChange={setMinStrength}
            onSalienceChange={setMinSalience}
            onResultClick={handleSearchResultClick}
            isExpanded={isSearchPanelExpanded}
            onToggleExpand={(): void => {
              setIsSearchPanelExpanded(!isSearchPanelExpanded);
            }}
            compact={true}
          />
        </div>

        {/* Tag Filter - Below search bar, aligned to end */}
        {!isCleanMode && (
          <TagFilterPanel
            tags={tagsWithCounts}
            selectedTags={selectedTags}
            isCollapsed={isTagPanelCollapsed}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onToggleCollapse={handleToggleTagPanel}
            onTagHover={handleTagHover}
          />
        )}
      </div>

      {/* View Mode Controls - Tucked away in bottom right corner (advanced user control) */}
      {/* Matches minimap width (225px) */}
      <div className="absolute bottom-4 right-4 z-40" style={{ width: 225 }}>
        <div className="flex items-center justify-between w-full glass-panel-glow floating-pill px-3 py-1.5 opacity-60 hover:opacity-100 transition-opacity animate-pulse-glow-subtle">
          <select
            value={viewMode}
            onChange={(e): void => {
              setViewMode(e.target.value as ViewMode);
            }}
            className="input-glass text-xs py-0.5 px-2 bg-transparent border-none text-ui-text-secondary rounded-full flex-1"
            title="View Mode (Advanced)"
          >
            <option value="fly">Fly</option>
            <option value="orbit">Orbit</option>
            <option value="timeline">Timeline</option>
            <option value="cluster">Cluster</option>
          </select>
          <button
            onClick={(): void => {
              setShowDebug(!showDebug);
            }}
            className={`px-2 py-0.5 text-xs rounded-full transition-all duration-200 ${
              showDebug
                ? 'bg-ui-accent-primary/30 text-ui-accent-primary'
                : 'text-ui-text-secondary hover:text-ui-accent-primary'
            }`}
            title="Toggle Debug Mode"
          >
            Debug
          </button>
        </div>
      </div>

      {/* 3D Scene */}
      <MemoryGraphScene
        currentNodeId={currentNodeId}
        viewMode={viewMode}
        debug={showDebug}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        warpTargetPosition={warpTargetPosition}
        warpTargetNodeId={warpTargetNodeId}
        warpTrigger={warpTrigger}
        onWarpStart={handleWarpStart}
        onWarpComplete={handleWarpComplete}
        filteredNodeIds={selectedTags.length > 0 ? filteredNodes.map((n) => n.id) : undefined}
        highlightedNodeIds={tagHighlightedNodeIds.length > 0 ? tagHighlightedNodeIds : undefined}
      />

      {/* Tag Filter in Clean Mode - Below search bar position */}
      {isCleanMode && (
        <div className="absolute top-20 right-4 z-40">
          <FloatingTooltipTrigger
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            }
            label="Tags"
            tooltipPosition="left"
          >
            <TagFilterPanel
              tags={tagsWithCounts}
              selectedTags={selectedTags}
              isCollapsed={false}
              onTagSelect={handleTagSelect}
              onTagDeselect={handleTagDeselect}
              onToggleCollapse={handleToggleTagPanel}
              onTagHover={handleTagHover}
            />
          </FloatingTooltipTrigger>
        </div>
      )}

      {/* Related Memories Sidebar - Left side, stops well above bottom icons (Requirements: 45.1-45.6, 46.3, 46.4) */}
      {/* In clean mode: hidden (memory details shown only in expanded node panel per Requirement 46.3) */}
      {/* In normal mode: show sidebar with proper spacing to avoid overlapping bottom controls */}
      {/* bottom-20 = 5rem to clear help icon (bottom-4) + clean mode (bottom-4 left-14) with padding */}
      {!isCleanMode && userId !== null && userId !== '' && (
        <div className="absolute top-4 left-4 bottom-20 z-39 w-96 flex flex-col">
          <RelatedMemoriesSidebar
            currentMemory={currentNode}
            relatedMemories={relatedMemories}
            onMemoryClick={handleNodeClick}
            isLoading={isLoading}
            suggestedTopics={suggestedTopics}
            suggestedMemoriesToLink={suggestedMemoriesToLink}
            onTopicClick={handleTopicClick}
            onCreateLink={handleCreateLink}
            availableMemories={memories}
            userId={userId}
            sessionId={useUserStore.getState().sessionId ?? ''}
            className="h-full flex flex-col"
          />
        </div>
      )}

      {/* MiniMap - Bottom right corner, above view mode controls (Requirements: 46.3, 46.4) */}
      {/* In clean mode: show as floating tooltip trigger, in normal mode: show panel */}
      {/* Rounded square shape with subtle glow */}
      {isCleanMode ? (
        <div className="absolute bottom-14 right-4 z-40">
          <FloatingTooltipTrigger
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            }
            label="Mini Map"
            tooltipPosition="left"
          >
            <MiniMap
              nodes={miniMapNodes}
              edges={miniMapEdges}
              currentNodeId={currentNodeId}
              history={history}
              onNodeClick={handleMiniMapNodeClick}
              width={300}
              height={300}
            />
          </FloatingTooltipTrigger>
        </div>
      ) : (
        <div className="absolute bottom-14 right-4 z-40 floating-rounded-xl overflow-hidden floating-glow">
          <MiniMap
            nodes={miniMapNodes}
            edges={miniMapEdges}
            currentNodeId={currentNodeId}
            history={history}
            onNodeClick={handleMiniMapNodeClick}
            width={225}
            height={225}
          />
        </div>
      )}

      {/* Neighbor Preview Panel */}
      {userId !== null && userId !== '' && (
        <NeighborPreviewPanel
          neighbor={hoveredNeighbor}
          edge={hoveredNeighbor?.edge ?? null}
          isVisible={hoveredNeighbor !== null}
          positionHint={hoverPosition}
          availableMemories={memories}
          onLinkedMemoryClick={handleLinkedMemoryClick}
          userId={userId}
          sessionId={useUserStore.getState().sessionId ?? ''}
        />
      )}

      {/* Connection Tooltip - Shows connected memory titles on hover (Requirement 39.3) */}
      <ConnectionTooltip
        isVisible={showConnectionTooltip && connectedMemories.length > 0}
        connections={connectedMemories}
        position={hoverPosition}
        hoveredNodeTitle={hoveredNodeTitle}
      />

      {/* Bottom Toolbar - AI Tools (Requirement 27.4) */}
      {/* Positioned to match FAB buttons on other screens */}
      <div className="fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50">
        {currentNode && (
          <div className="flex items-center gap-2">
            {/* Collapsible AI Tools */}
            {isAIToolsExpanded ? (
              <div className="flex items-center gap-3 glass-panel-glow floating-rounded-xl px-4 py-2.5 animate-pulse-glow">
                <span className="text-xs font-semibold text-ui-accent-primary whitespace-nowrap">
                  AI Tools
                </span>
                <CognitiveToolsPanel
                  memory={currentNode}
                  onSimilarNodesFound={handleSimilarNodesFound}
                  onShowResult={handleCognitiveResult}
                  className="!p-0 !bg-transparent !border-0 !shadow-none"
                  layout="horizontal"
                />
                <button
                  onClick={(): void => {
                    setIsAIToolsExpanded(false);
                  }}
                  className="p-1.5 rounded-full text-ui-text-secondary hover:text-ui-accent-primary transition-colors hover:bg-ui-accent-primary/10"
                  aria-label="Collapse AI tools"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={(): void => {
                  setIsAIToolsExpanded(true);
                }}
                className="w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
                aria-label="Expand AI tools"
                style={{
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="font-medium text-sm">AI Tools</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Controls Help - Bottom left corner (Requirement 27.5) */}
      {/* Rounded square with glow - matches tags and clean mode buttons */}
      <div className="absolute bottom-4 left-4 z-40">
        <div className="relative">
          <button
            onMouseEnter={(): void => {
              setShowControlsTooltip(true);
            }}
            onMouseLeave={(): void => {
              setShowControlsTooltip(false);
            }}
            onClick={(): void => {
              setShowControlsTooltip(!showControlsTooltip);
            }}
            className="glass-panel-glow p-2.5 rounded-xl text-ui-text-secondary hover:text-ui-accent-primary transition-colors floating-glow"
            aria-label="Show controls help"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Tooltip content - rounded corners with glow */}
          {showControlsTooltip && (
            <div className="absolute bottom-full left-0 mb-2 glass-panel-glow floating-rounded-xl p-3 min-w-[200px] animate-fade-in floating-glow">
              <h4 className="text-xs font-semibold text-ui-accent-primary mb-2">Controls</h4>
              <ul className="text-ui-text-secondary text-xs space-y-1">
                {viewMode === 'fly' ? (
                  <>
                    <li>• Click to enable pointer lock</li>
                    <li>• WASD / Arrows to move</li>
                    <li>• Space/Shift for up/down</li>
                    <li>• Mouse to look around</li>
                    <li>• ESC to release pointer</li>
                  </>
                ) : (
                  <>
                    <li>• Left click + drag to rotate</li>
                    <li>• Right click + drag to pan</li>
                    <li>• Scroll to zoom</li>
                    <li>• Click node to navigate</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Memory Details - Hidden by default, shown in expanded node panel (Requirement 27.2, 27.3, 46.3) */}
      {/* Note: Memory details are now shown in the ExpandedNodePanel component when a node is clicked */}
      {/* In clean mode, memory details are ONLY shown in the expanded node panel (Requirement 46.3) */}

      {/* Clean Mode Controller - Toggle clean mode (Requirements: 46.1, 46.5) */}
      <div className="absolute bottom-4 left-14 z-50">
        <CleanModeController />
      </div>

      {/* Cognitive Result Modal - Displays AI tool results (Requirement 30.1-30.4) */}
      {cognitiveResult !== null && (
        <CognitiveResultModal
          result={cognitiveResult}
          onClose={handleCloseCognitiveResult}
          onNavigateToMemory={handleNavigateToMemoryFromResult}
        />
      )}
    </div>
  );
}

/**
 * App Content with routing
 * Handles navigation and screen rendering
 */
function AppContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const [isQuickAccessExpanded, setIsQuickAccessExpanded] = useState(true);

  // CreateMemoryModal state (Requirement 44.1 - Cmd/Ctrl+N shortcut)
  const [isCreateMemoryOpen, setIsCreateMemoryOpen] = useState(false);

  // Clean mode state for maximizing viewport (Requirement 46.6)
  const { isCleanMode } = useCleanMode();

  // Get user from store
  const userId = useUserStore((state) => state.username);
  const sessionId = useUserStore((state) => state.sessionId);

  // Get current memory context from graph store for CreateMemoryModal (Requirement 44.2)
  const currentNode = useGraphStore((state) => state.currentNode);

  // Get memories from central memory store for WikiLink autocomplete
  const memories = useMemoryStore((state) => state.memories);
  const fetchMemories = useMemoryStore((state) => state.fetchMemories);

  // Fetch memories on mount and when user changes
  useEffect(() => {
    if (userId !== null && userId !== '') {
      void fetchMemories(userId);
    }
  }, [fetchMemories, userId]);

  // Get session store data for QuickAccessPanel
  // Use direct state access and memoize the sorted results to avoid infinite loops
  const rawBookmarks = useSessionStore((state) => state.bookmarks);
  const rawSavedPaths = useSessionStore((state) => state.savedPaths);

  const bookmarks = useMemo(
    () => [...rawBookmarks].sort((a, b) => b.createdAt - a.createdAt),
    [rawBookmarks]
  );

  const savedPaths = useMemo(
    () => [...rawSavedPaths].sort((a, b) => b.createdAt - a.createdAt),
    [rawSavedPaths]
  );

  // Determine active screen from route
  const activeScreen: ScreenId = ROUTE_TO_SCREEN[location.pathname] ?? 'dashboard';

  // Use real memories from store
  const availableMemories = memories;

  // Convert memories to recent memories format - pass full content, let UI handle truncation
  const recentMemories: RecentMemory[] = useMemo(
    () =>
      availableMemories.map((mem) => ({
        id: mem.id,
        contentPreview: mem.content,
        primarySector: mem.primarySector,
        lastAccessed: new Date(mem.lastAccessed).getTime(),
      })),
    [availableMemories]
  );

  // Handle navigation
  const handleNavigate = useCallback(
    (screenId: ScreenId): void => {
      const route = SCREEN_TO_ROUTE[screenId];
      void navigate(route);
    },
    [navigate]
  );

  // Get memory preview action from uiStore
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  // Handle quick access clicks - opens memory preview modal
  const handleMemoryClick = useCallback(
    (memoryId: string): void => {
      // Find the memory and open the preview modal
      const memory = availableMemories.find((m) => m.id === memoryId);
      if (memory) {
        openMemoryPreview(memory);
      }
    },
    [availableMemories, openMemoryPreview]
  );

  const handleBookmarkClick = useCallback(
    (nodeId: string): void => {
      void navigate('/explorer');
      console.log('Navigate to bookmark:', nodeId);
    },
    [navigate]
  );

  const handlePathClick = useCallback(
    (pathId: string): void => {
      void navigate('/explorer');
      console.log('Load path:', pathId);
    },
    [navigate]
  );

  // Create stats from real memories
  const demoStats: QuickStats = useMemo(
    () => ({
      totalMemories: availableMemories.length,
      totalConnections: Math.max(0, availableMemories.length - 1), // Approximate connections
      memoriesThisWeek: availableMemories.filter((m) => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return new Date(m.createdAt).getTime() > weekAgo;
      }).length,
      hubNodes: availableMemories.length > 0 ? 1 : 0,
    }),
    [availableMemories]
  );

  // Create recent memories from real data - pass full content, let UI handle truncation
  const demoRecentMemories: RecentMemoryItem[] = useMemo(
    () =>
      availableMemories.map((mem) => ({
        id: mem.id,
        contentPreview: mem.content,
        primarySector: mem.primarySector,
        lastAccessed: new Date(mem.lastAccessed).getTime(),
      })),
    [availableMemories]
  );

  // Generate graph preview nodes from real memories
  const graphPreviewNodes: GraphPreviewNode[] = useMemo(
    () => memoriesToGraphPreviewNodes(availableMemories),
    [availableMemories]
  );

  // Create demo suggested actions for Dashboard
  const demoSuggestedActions: SuggestedAction[] = useMemo(
    () => [
      {
        id: 'explore-hub',
        type: 'explore' as const,
        title: 'Explore Hub Memory',
        description: 'Navigate to your most connected memory node',
        targetMemoryId: 'mem-1',
      },
      {
        id: 'reason-problem',
        type: 'reason' as const,
        title: 'Start Reasoning Session',
        description: 'Analyze a problem using parallel reasoning',
      },
      {
        id: 'analyze-bias',
        type: 'analyze' as const,
        title: 'Check for Biases',
        description: 'Detect cognitive biases in your recent memories',
      },
      {
        id: 'connect-memories',
        type: 'connect' as const,
        title: 'Find Connections',
        description: 'Discover semantic links between memories',
      },
    ],
    []
  );

  // Handle Dashboard action clicks
  const handleDashboardActionClick = useCallback(
    (action: SuggestedAction): void => {
      switch (action.type) {
        case 'explore':
          void navigate('/explorer');
          break;
        case 'reason':
          void navigate('/reasoning');
          break;
        case 'analyze':
          void navigate('/confidence-bias');
          break;
        case 'connect':
          void navigate('/explorer');
          break;
      }
    },
    [navigate]
  );

  // Handle session resume from Dashboard (Requirement 50.4)
  const handleSessionResume = useCallback(
    (sessionIdToResume: string): void => {
      // Find the session to determine which screen to navigate to
      const session = DEMO_RECENT_SESSIONS.find((s) => s.id === sessionIdToResume);
      if (session !== undefined) {
        switch (session.type) {
          case 'reasoning':
            void navigate('/reasoning');
            break;
          case 'decomposition':
            void navigate('/decomposition');
            break;
          case 'analysis':
            void navigate('/confidence-bias');
            break;
          case 'framework':
            void navigate('/framework');
            break;
        }
        console.log('Resuming session:', sessionIdToResume);
      }
    },
    [navigate]
  );

  // Handle graph preview click from Dashboard (Requirement 50.5)
  const handleGraphPreviewClick = useCallback((): void => {
    void navigate('/explorer');
  }, [navigate]);

  // Get graph store actions for adding new nodes (Requirement 44.6)
  const addNode = useGraphStore((state) => state.addNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const fetchNeighbors = useGraphStore((state) => state.fetchNeighbors);

  // CreateMemoryModal handlers (Requirement 44.1, 44.5, 44.6)
  const handleCreateMemorySave = useCallback(
    (result: CreateMemorySaveResult): void => {
      console.log('Memory created:', result);

      // Close the modal and return focus to 3D view (Requirement 44.5)
      setIsCreateMemoryOpen(false);

      // Always create a new GraphNode from the save result
      const newNode: GraphNode = {
        id: result.memoryId,
        content: result.content,
        primarySector: result.primarySector,
        salience: result.salience,
        strength: result.strength,
        createdAt: new Date().toISOString(),
        metadata: {},
      };

      // Add the new node to the graph store
      addNode(newNode);

      // If the new memory was linked to the current node, create an edge (Requirement 44.6)
      if (result.linkedToCurrent && result.linkedToNodeId !== undefined) {
        // Create an edge connecting the new node to the current node
        const newEdge: GraphEdge = {
          source: result.memoryId,
          target: result.linkedToNodeId,
          linkType: 'semantic',
          weight: 0.8, // Default weight for new links
        };

        // Add the edge to the graph store
        addEdge(newEdge);

        // Refresh neighbors to ensure the new node appears with proper positioning
        void fetchNeighbors(result.linkedToNodeId, 1);
      }

      // Handle wiki links - extract [[memory-id|...]] references and create edges
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      let match;
      while ((match = wikiLinkRegex.exec(result.content)) !== null) {
        const linkedMemoryId = match[1];
        if (linkedMemoryId != null && linkedMemoryId !== '' && linkedMemoryId !== result.memoryId) {
          const wikiEdge: GraphEdge = {
            source: result.memoryId,
            target: linkedMemoryId,
            linkType: 'semantic',
            weight: 0.7,
          };
          addEdge(wikiEdge);
        }
      }
    },
    [addNode, addEdge, fetchNeighbors]
  );

  const handleCreateMemoryClose = useCallback((): void => {
    setIsCreateMemoryOpen(false);
  }, []);

  // Global keyboard shortcut for CreateMemoryModal (Requirement 44.1 - Cmd/Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd/Ctrl+N to open CreateMemoryModal
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreateMemoryOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Render the current screen - requires userId and sessionId
  const renderScreen = (): React.ReactElement => {
    // These should always be set when AppContent renders (guarded by App component)
    const currentUserId = userId ?? '';
    const currentSessionId = sessionId ?? '';

    switch (activeScreen) {
      case 'dashboard':
        return (
          <Dashboard
            stats={demoStats}
            recentMemories={demoRecentMemories}
            suggestedActions={demoSuggestedActions}
            recentSessions={DEMO_RECENT_SESSIONS}
            graphPreviewNodes={graphPreviewNodes}
            availableMemories={availableMemories}
            onMemoryClick={handleMemoryClick}
            onActionClick={handleDashboardActionClick}
            onSessionResume={handleSessionResume}
            onGraphPreviewClick={handleGraphPreviewClick}
            userId={currentUserId}
            sessionId={currentSessionId}
          />
        );
      case 'memory-graph':
        return <MemoryGraphScreen />;
      case 'memory-explorer':
        return <MemoryExplorer userId={currentUserId} sessionId={currentSessionId} />;
      case 'reasoning-console':
        return <ReasoningConsole userId={currentUserId} sessionId={currentSessionId} />;
      case 'framework-analysis':
        return <FrameworkAnalysis userId={currentUserId} sessionId={currentSessionId} />;
      case 'problem-decomposition':
        return <ProblemDecomposition userId={currentUserId} sessionId={currentSessionId} />;
      case 'confidence-bias':
        return <ConfidenceBiasDashboard userId={currentUserId} sessionId={currentSessionId} />;
      case 'emotion-analysis':
        return <EmotionAnalysis userId={currentUserId} sessionId={currentSessionId} />;
      default:
        return (
          <Dashboard
            stats={demoStats}
            recentMemories={demoRecentMemories}
            suggestedActions={demoSuggestedActions}
            recentSessions={DEMO_RECENT_SESSIONS}
            graphPreviewNodes={graphPreviewNodes}
            availableMemories={availableMemories}
            onMemoryClick={handleMemoryClick}
            onActionClick={handleDashboardActionClick}
            onSessionResume={handleSessionResume}
            onGraphPreviewClick={handleGraphPreviewClick}
            userId={currentUserId}
            sessionId={currentSessionId}
          />
        );
    }
  };

  // Determine if we should hide navigation for full-screen viewport (Requirement 46.6)
  // In clean mode on Memory Graph, hide navigation to maximize 3D viewport
  const isFullScreenViewport = isCleanMode && activeScreen === 'memory-graph';

  return (
    <div className="min-h-screen bg-ui-background flex flex-col">
      {/* Main Navigation Bar (Requirement 23.1) */}
      {/* Hidden in clean mode on Memory Explorer to maximize viewport (Requirement 46.6) */}
      {!isFullScreenViewport && (
        <MainNavigation
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          className="fixed top-0 left-0 right-0 z-50"
        />
      )}

      {/* Quick Access Panel (Requirement 23.3) */}
      {/* Only shown on Memory Graph screen, hidden in clean mode (Requirement 46.6) */}
      {!isFullScreenViewport && activeScreen === 'memory-graph' && (
        <div className="fixed top-16 right-4 z-45 w-64">
          <QuickAccessPanel
            recentMemories={recentMemories}
            bookmarks={bookmarks}
            savedPaths={savedPaths}
            onMemoryClick={handleMemoryClick}
            onBookmarkClick={handleBookmarkClick}
            onPathClick={handlePathClick}
            isExpanded={isQuickAccessExpanded}
            onToggleExpand={(): void => {
              setIsQuickAccessExpanded(!isQuickAccessExpanded);
            }}
            maxItems={5}
          />
        </div>
      )}

      {/* Main Content Area with Page Transitions (Requirement 23.2) */}
      {/* Full height when in clean mode on Memory Explorer (Requirement 46.6) */}
      <main
        key={`main-${activeScreen}`}
        className={`flex-1 ${isFullScreenViewport ? '' : 'pt-20'}`}
      >
        <PageTransition pageKey={activeScreen} duration={300}>
          <div className={isFullScreenViewport ? 'h-screen' : 'h-[calc(100vh-5rem)]'}>
            {renderScreen()}
          </div>
        </PageTransition>
      </main>

      {/* CreateMemoryModal - Global keyboard shortcut Cmd/Ctrl+N (Requirement 44.1, 44.2) */}
      <CreateMemoryModal
        isOpen={isCreateMemoryOpen}
        {...(currentNode != null ? { currentMemoryContext: currentNode } : {})}
        onSave={handleCreateMemorySave}
        onClose={handleCreateMemoryClose}
        availableMemories={availableMemories}
        userId={userId ?? ''}
        sessionId={sessionId ?? ''}
      />

      {/* MemoryPreviewModal - Global memory preview modal accessible from any page */}
      <MemoryPreviewModal
        availableMemories={availableMemories}
        userId={userId ?? ''}
        sessionId={sessionId ?? ''}
      />
    </div>
  );
}

/**
 * Main App Component with Router
 * Shows UsernameModal if user hasn't entered their username yet.
 */
function App(): React.ReactElement {
  const username = useUserStore((state) => state.username);
  const setUser = useUserStore((state) => state.setUser);

  const handleUsernameSubmit = useCallback(
    (newUsername: string): void => {
      setUser(newUsername);
    },
    [setUser]
  );

  // Show username modal if user hasn't entered their username
  if (username === null || username === '') {
    return <UsernameModal onSubmit={handleUsernameSubmit} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
