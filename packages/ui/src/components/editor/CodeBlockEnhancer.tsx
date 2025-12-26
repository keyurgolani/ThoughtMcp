/**
 * CodeBlockEnhancer Component
 *
 * Enhances BlockNote code blocks with:
 * - Language tag display
 * - Copy to clipboard button
 * - Word wrap toggle button
 *
 * Uses MutationObserver to detect new code blocks and inject toolbars.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import { CodeBlockToolbar } from "./CodeBlockToolbar";

// ============================================================================
// Main Hook
// ============================================================================

interface CodeBlockState {
  element: HTMLElement;
  id: string;
}

/**
 * useCodeBlockEnhancer - Hook to enhance code blocks with toolbars
 *
 * @param containerRef - Ref to the container element to watch for code blocks
 */
export function useCodeBlockEnhancer(
  containerRef: React.RefObject<HTMLElement | null>
): ReactElement[] {
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockState[]>([]);
  const processedBlocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const processCodeBlocks = (): void => {
      // Find all code blocks (BlockNote uses [data-content-type="codeBlock"])
      const blocks = container.querySelectorAll<HTMLElement>(
        '[data-content-type="codeBlock"], .bn-code-block'
      );

      const newBlocks: CodeBlockState[] = [];

      blocks.forEach((block) => {
        // Generate a unique ID for this block
        let blockId = block.getAttribute("data-toolbar-id");
        if (blockId === null) {
          blockId = `cb-${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;
          block.setAttribute("data-toolbar-id", blockId);
        }

        // Skip if already processed
        if (processedBlocksRef.current.has(blockId)) {
          // Check if block still exists in our state
          const existsInState = codeBlocks.some((cb) => cb.id === blockId);
          if (existsInState) {
            newBlocks.push({ element: block, id: blockId });
          } else {
            // Re-add if it was removed but block still exists
            newBlocks.push({ element: block, id: blockId });
          }
          return;
        }

        processedBlocksRef.current.add(blockId);
        newBlocks.push({ element: block, id: blockId });
      });

      // Clean up removed blocks from processed set
      const currentIds = new Set(newBlocks.map((b) => b.id));
      processedBlocksRef.current.forEach((id) => {
        if (!currentIds.has(id)) {
          processedBlocksRef.current.delete(id);
        }
      });

      setCodeBlocks(newBlocks);
    };

    // Initial scan
    processCodeBlocks();

    // Watch for new code blocks
    const observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(
        (m) =>
          m.type === "childList" ||
          (m.type === "attributes" && m.attributeName === "data-content-type")
      );
      if (hasRelevantChanges) {
        processCodeBlocks();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-content-type"],
    });

    return (): void => {
      observer.disconnect();
    };
  }, [containerRef, codeBlocks]);

  const handleRemove = useCallback((id: string) => {
    processedBlocksRef.current.delete(id);
    setCodeBlocks((prev) => prev.filter((cb) => cb.id !== id));
  }, []);

  return codeBlocks.map((cb) => (
    <CodeBlockToolbar
      key={cb.id}
      codeBlock={cb.element}
      onRemove={() => {
        handleRemove(cb.id);
      }}
    />
  ));
}

export default useCodeBlockEnhancer;
