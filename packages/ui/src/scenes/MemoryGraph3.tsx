/**
 * MemoryGraph3 Route Page
 *
 * Reference route for graph style 3 comparison.
 * Isolated implementation - will be removed after style selection.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMemoryStore } from "../stores/memoryStore";
import { useThemeStore } from "../stores/themeStore";
import { useUserStore } from "../stores/userStore";
import type { GraphNode } from "../types/api";
import { generateEdges } from "../utils/graphEdges";
import { MemoryGraphStyle3 } from "./reference-graphs";

function memoryToGraphNode(memory: Parameters<typeof generateEdges>[0][0]): GraphNode {
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

export function MemoryGraph3(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const userId = useUserStore((state) => state.username);
  const memories = useMemoryStore((state) => state.memories);
  const fetchMemories = useMemoryStore((state) => state.fetchMemories);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const isLightMode = currentTheme === "light";

  useEffect(() => {
    if (userId !== null) void fetchMemories(userId);
  }, [fetchMemories, userId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: width || 800, height: height || 600 });
      }
    });
    resizeObserver.observe(container);
    return (): void => {
      resizeObserver.disconnect();
    };
  }, []);

  const nodes = useMemo(() => memories.map(memoryToGraphNode), [memories]);
  const edges = useMemo(() => generateEdges(memories), [memories]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <MemoryGraphStyle3
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        onNodeClick={setSelectedNodeId}
        width={dimensions.width}
        height={dimensions.height}
        lightMode={isLightMode}
      />
    </div>
  );
}

export default MemoryGraph3;
