import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { UsernameModal } from "./components/auth";
import {
  CreateMemoryModal,
  MemoryPreviewModal,
  type CreateMemorySaveResult,
} from "./components/hud";
import {
  MainNavigation,
  PageTransition,
  QuickAccessPanel,
  type ScreenId,
} from "./components/navigation";
import type { RecentMemory } from "./components/navigation/QuickAccessPanel";
import { useCleanMode } from "./hooks/useCleanMode";
import {
  ConfidenceBiasDashboard,
  Dashboard,
  EmotionAnalysis,
  FrameworkAnalysis,
  MemoryExplorer,
  MemoryGraph,
  MemoryGraph1,
  MemoryGraph2,
  MemoryGraph3,
  MemoryGraph4,
  MemoryGraph5,
  ProblemDecomposition,
  ReasoningConsole,
  type CognitiveSession,
  type QuickStats,
  type RecentMemoryItem,
  type SuggestedAction,
} from "./scenes";
import { useGraphStore } from "./stores/graphStore";
import { useMemoryStore } from "./stores/memoryStore";
import { useSessionStore } from "./stores/sessionStore";
import { useUIStore } from "./stores/uiStore";
import { useUserStore } from "./stores/userStore";
import type { GraphEdge, GraphNode } from "./types/api";

// Demo recent cognitive sessions (Requirement 50.4)
const DEMO_RECENT_SESSIONS: CognitiveSession[] = [
  {
    id: "session-1",
    type: "reasoning",
    title: "Analyzing transformer architecture trade-offs",
    timestamp: Date.now() - 3600000, // 1 hour ago
    status: "in-progress",
    preview: "Comparing attention mechanisms vs recurrent approaches...",
  },
  {
    id: "session-2",
    type: "decomposition",
    title: "Breaking down ML pipeline optimization",
    timestamp: Date.now() - 7200000, // 2 hours ago
    status: "completed",
    preview: "Identified 5 sub-problems: data prep, feature engineering...",
  },
  {
    id: "session-3",
    type: "analysis",
    title: "Bias detection in recommendation system",
    timestamp: Date.now() - 86400000, // 1 day ago
    status: "paused",
    preview: "Found potential confirmation bias in user feedback loop...",
  },
  {
    id: "session-4",
    type: "framework",
    title: "First principles analysis of embeddings",
    timestamp: Date.now() - 172800000, // 2 days ago
    status: "completed",
    preview: "Applied first principles to understand vector representations...",
  },
];

// Route to ScreenId mapping
const ROUTE_TO_SCREEN: Record<string, ScreenId> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/explorer": "memory-graph",
  "/memories": "memory-explorer",
  "/reasoning": "reasoning-console",
  "/framework": "framework-analysis",
  "/decomposition": "problem-decomposition",
  "/confidence-bias": "confidence-bias",
  "/emotion": "emotion-analysis",
  // Reference graph routes (isolated for comparison)
  "/memorygraph1": "memory-graph",
  "/memorygraph2": "memory-graph",
  "/memorygraph3": "memory-graph",
  "/memorygraph4": "memory-graph",
  "/memorygraph5": "memory-graph",
};

const SCREEN_TO_ROUTE: Record<ScreenId, string> = {
  dashboard: "/dashboard",
  "memory-graph": "/explorer",
  "memory-explorer": "/memories",
  "reasoning-console": "/reasoning",
  "framework-analysis": "/framework",
  "problem-decomposition": "/decomposition",
  "confidence-bias": "/confidence-bias",
  "emotion-analysis": "/emotion",
};

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
    if (userId !== null && userId !== "") {
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
  const activeScreen: ScreenId = ROUTE_TO_SCREEN[location.pathname] ?? "dashboard";

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
      void navigate("/explorer");
      console.log("Navigate to bookmark:", nodeId);
    },
    [navigate]
  );

  const handlePathClick = useCallback(
    (pathId: string): void => {
      void navigate("/explorer");
      console.log("Load path:", pathId);
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
  // eslint-disable-next-line @typescript-eslint/no-deprecated
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

  // Create demo suggested actions for Dashboard
  const demoSuggestedActions: SuggestedAction[] = useMemo(
    () => [
      {
        id: "explore-hub",
        type: "explore" as const,
        title: "Explore Hub Memory",
        description: "Navigate to your most connected memory node",
        targetMemoryId: "mem-1",
      },
      {
        id: "reason-problem",
        type: "reason" as const,
        title: "Start Reasoning Session",
        description: "Analyze a problem using parallel reasoning",
      },
      {
        id: "analyze-bias",
        type: "analyze" as const,
        title: "Check for Biases",
        description: "Detect cognitive biases in your recent memories",
      },
      {
        id: "connect-memories",
        type: "connect" as const,
        title: "Find Connections",
        description: "Discover semantic links between memories",
      },
    ],
    []
  );

  // Handle Dashboard action clicks
  const handleDashboardActionClick = useCallback(
    (action: SuggestedAction): void => {
      switch (action.type) {
        case "explore":
          void navigate("/explorer");
          break;
        case "reason":
          void navigate("/reasoning");
          break;
        case "analyze":
          void navigate("/confidence-bias");
          break;
        case "connect":
          void navigate("/explorer");
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
          case "reasoning":
            void navigate("/reasoning");
            break;
          case "decomposition":
            void navigate("/decomposition");
            break;
          case "analysis":
            void navigate("/confidence-bias");
            break;
          case "framework":
            void navigate("/framework");
            break;
        }
        console.log("Resuming session:", sessionIdToResume);
      }
    },
    [navigate]
  );

  // Handle graph preview click from Dashboard (Requirement 50.5)
  const handleGraphPreviewClick = useCallback((): void => {
    void navigate("/explorer");
  }, [navigate]);

  // Get graph store actions for adding new nodes (Requirement 44.6)
  const addNode = useGraphStore((state) => state.addNode);
  const addEdge = useGraphStore((state) => state.addEdge);
  const fetchNeighbors = useGraphStore((state) => state.fetchNeighbors);

  // Get memory store action for adding new memories
  const addMemory = useMemoryStore((state) => state.addMemory);

  // CreateMemoryModal handlers (Requirement 44.1, 44.5, 44.6)
  const handleCreateMemorySave = useCallback(
    (result: CreateMemorySaveResult): void => {
      console.log("Memory created:", result);

      // Close the modal and return focus to 3D view (Requirement 44.5)
      setIsCreateMemoryOpen(false);

      const now = new Date().toISOString();

      // Always create a new GraphNode from the save result
      const newNode: GraphNode = {
        id: result.memoryId,
        content: result.content,
        primarySector: result.primarySector,
        salience: result.salience,
        strength: result.strength,
        createdAt: now,
        metadata: {},
      };

      // Add the new node to the graph store
      addNode(newNode);

      // Add the new memory to the memory store so it appears in search/lists
      if (userId !== null && sessionId !== null) {
        addMemory({
          id: result.memoryId,
          userId,
          sessionId,
          content: result.content,
          primarySector: result.primarySector,
          salience: result.salience,
          strength: result.strength,
          createdAt: now,
          lastAccessed: now,
          accessCount: 0,
          metadata: {},
        });
      }

      // If the new memory was linked to the current node, create an edge (Requirement 44.6)
      if (result.linkedToCurrent && result.linkedToNodeId !== undefined) {
        // Create an edge connecting the new node to the current node
        const newEdge: GraphEdge = {
          source: result.memoryId,
          target: result.linkedToNodeId,
          linkType: "semantic",
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
        if (linkedMemoryId != null && linkedMemoryId !== "" && linkedMemoryId !== result.memoryId) {
          const wikiEdge: GraphEdge = {
            source: result.memoryId,
            target: linkedMemoryId,
            linkType: "semantic",
            weight: 0.7,
          };
          addEdge(wikiEdge);
        }
      }
    },
    [addNode, addEdge, fetchNeighbors, addMemory, userId, sessionId]
  );

  const handleCreateMemoryClose = useCallback((): void => {
    setIsCreateMemoryOpen(false);
  }, []);

  // Global keyboard shortcut for CreateMemoryModal (Requirement 44.1 - Cmd/Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd/Ctrl+N to open CreateMemoryModal
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setIsCreateMemoryOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Render the current screen - requires userId and sessionId
  const renderScreen = (): React.ReactElement => {
    // These should always be set when AppContent renders (guarded by App component)
    const currentUserId = userId ?? "";
    const currentSessionId = sessionId ?? "";

    // Handle reference graph routes (isolated for comparison)
    if (location.pathname === "/memorygraph1") return <MemoryGraph1 />;
    if (location.pathname === "/memorygraph2") return <MemoryGraph2 />;
    if (location.pathname === "/memorygraph3") return <MemoryGraph3 />;
    if (location.pathname === "/memorygraph4") return <MemoryGraph4 />;
    if (location.pathname === "/memorygraph5") return <MemoryGraph5 />;

    switch (activeScreen) {
      case "dashboard":
        return (
          <Dashboard
            stats={demoStats}
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            recentMemories={demoRecentMemories}
            suggestedActions={demoSuggestedActions}
            recentSessions={DEMO_RECENT_SESSIONS}
            availableMemories={availableMemories}
            onMemoryClick={handleMemoryClick}
            onActionClick={handleDashboardActionClick}
            onSessionResume={handleSessionResume}
            onGraphPreviewClick={handleGraphPreviewClick}
            userId={currentUserId}
            sessionId={currentSessionId}
          />
        );
      case "memory-graph":
        return <MemoryGraph userId={currentUserId} sessionId={currentSessionId} />;
      case "memory-explorer":
        return <MemoryExplorer userId={currentUserId} sessionId={currentSessionId} />;
      case "reasoning-console":
        return <ReasoningConsole userId={currentUserId} sessionId={currentSessionId} />;
      case "framework-analysis":
        return <FrameworkAnalysis userId={currentUserId} sessionId={currentSessionId} />;
      case "problem-decomposition":
        return <ProblemDecomposition userId={currentUserId} sessionId={currentSessionId} />;
      case "confidence-bias":
        return <ConfidenceBiasDashboard userId={currentUserId} sessionId={currentSessionId} />;
      case "emotion-analysis":
        return <EmotionAnalysis userId={currentUserId} sessionId={currentSessionId} />;
      default:
        return (
          <Dashboard
            stats={demoStats}
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            recentMemories={demoRecentMemories}
            suggestedActions={demoSuggestedActions}
            recentSessions={DEMO_RECENT_SESSIONS}
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
  const isFullScreenViewport = isCleanMode && activeScreen === "memory-graph";

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
      {!isFullScreenViewport && activeScreen === "memory-graph" && (
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
        className={`flex-1 ${isFullScreenViewport ? "" : "pt-20"}`}
      >
        <PageTransition pageKey={activeScreen} duration={300}>
          <div className={isFullScreenViewport ? "h-screen" : "h-[calc(100vh-5rem)]"}>
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
        userId={userId ?? ""}
        sessionId={sessionId ?? ""}
      />

      {/* MemoryPreviewModal - Global memory preview modal accessible from any page */}
      <MemoryPreviewModal
        availableMemories={availableMemories}
        userId={userId ?? ""}
        sessionId={sessionId ?? ""}
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
  if (username === null || username === "") {
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
