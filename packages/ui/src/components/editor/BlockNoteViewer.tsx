/**
 * BlockNoteViewer Component
 *
 * A read-only viewer for BlockNote content. Uses the same BlockNote rendering
 * as the editor to ensure consistent display between edit and view modes.
 *
 * This eliminates the need for custom markdown rendering and ensures
 * what you see when editing is exactly what you see when viewing.
 *
 * Features (BlockNote 0.45+):
 * - Consistent rendering with the editor
 * - Support for all built-in block types
 * - Code blocks with syntax highlighting and toolbar
 * - Tables, callouts, toggle lists
 * - Light and dark theme support
 */

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";

import { useCodeBlockEnhancer } from "./CodeBlockEnhancer";

// ============================================================================
// Types
// ============================================================================

export interface BlockNoteViewerProps {
  /** Content as markdown string */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Theme mode - 'light' or 'dark' */
  theme?: "light" | "dark";
  /** Whether to show code block toolbar (language, copy, wrap) */
  showCodeToolbar?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BlockNoteViewer - Read-only viewer using BlockNote rendering
 *
 * Uses the same BlockNote engine as the editor to ensure consistent
 * rendering between edit and view modes.
 */
export function BlockNoteViewer({
  content,
  className = "",
  theme: themeProp,
  showCodeToolbar = true,
}: BlockNoteViewerProps): React.ReactElement {
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef(content);
  const [isReady, setIsReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Create a read-only BlockNote editor instance with default schema
  const editor = useCreateBlockNote({
    animations: true,
    defaultStyles: true,
  });

  // Enhance code blocks with toolbar
  const codeBlockToolbars = useCodeBlockEnhancer(showCodeToolbar ? wrapperRef : { current: null });

  // Load content when editor is ready or content changes
  useEffect(() => {
    // Check if content has changed or this is initial load
    const contentChanged = lastContentRef.current !== content;
    if (!contentChanged && contentLoadedRef.current) {
      return;
    }

    const loadContent = (): void => {
      if (content && content.trim() !== "") {
        try {
          const blocks = editor.tryParseMarkdownToBlocks(content);
          if (blocks.length > 0) {
            editor.replaceBlocks(editor.document, blocks);
          }
        } catch (error) {
          console.warn("BlockNoteViewer: Failed to parse content:", error);
        }
      }
      contentLoadedRef.current = true;
      lastContentRef.current = content;
      setIsReady(true);
    };

    loadContent();
  }, [editor, content]);

  // Determine theme based on prop or document attribute
  const theme =
    themeProp ??
    (typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme-mode") === "light"
      ? "light"
      : "dark");

  // Type assertion needed due to BlockNote's complex generic types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const typedEditor = editor as any;

  return (
    <div
      ref={wrapperRef}
      className={`blocknote-themed blocknote-viewer-wrapper ${className} ${!isReady ? "opacity-0" : "opacity-100"} transition-opacity duration-150`}
      data-testid="blocknote-viewer"
    >
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      <BlockNoteView editor={typedEditor} editable={false} theme={theme} />
      {codeBlockToolbars}
    </div>
  );
}

export default BlockNoteViewer;
