/**
 * BlockNotePreview Component
 *
 * A lightweight BlockNote-based preview renderer for memory cards and lists.
 * Uses BlockNote's built-in rendering for consistent display across the UI.
 * This replaces custom markdown rendering with BlockNote's native capabilities.
 *
 * Features:
 * - Consistent rendering with BlockNoteEditor and BlockNoteViewer
 * - Optimized for card/row previews with line clamping
 * - Caches parsed blocks for performance
 * - Supports light and dark themes
 * - Optional code block toolbar
 */

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useRef, useState, type ReactElement } from "react";

import { useCodeBlockEnhancer } from "../editor/CodeBlockEnhancer";

// ============================================================================
// Types
// ============================================================================

export interface BlockNotePreviewProps {
  /** Markdown content to render */
  content: string;
  /** Maximum number of lines to display (uses CSS line-clamp) */
  maxLines?: number;
  /** Additional CSS classes */
  className?: string;
  /** Theme mode */
  theme?: "light" | "dark";
  /** Whether to show code block toolbar (language, copy, wrap) - default false for previews */
  showCodeToolbar?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BlockNotePreview - Lightweight BlockNote renderer for previews
 *
 * Uses BlockNote's native rendering for consistent display with the editor.
 * Optimized for card previews with line clamping support.
 */
export function BlockNotePreview({
  content,
  maxLines = 2,
  className = "",
  theme: themeProp,
  showCodeToolbar = false,
}: BlockNotePreviewProps): ReactElement {
  const contentLoadedRef = useRef(false);
  const lastContentRef = useRef(content);
  const [isReady, setIsReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Create a minimal BlockNote editor instance for rendering
  const editor = useCreateBlockNote({
    animations: false, // Disable animations for preview performance
    defaultStyles: true,
  });

  // Enhance code blocks with toolbar (only if enabled)
  const codeBlockToolbars = useCodeBlockEnhancer(showCodeToolbar ? wrapperRef : { current: null });

  // Load content when editor is ready or content changes
  useEffect(() => {
    // Editor is always defined from useCreateBlockNote
    const contentChanged = lastContentRef.current !== content;
    if (!contentChanged && contentLoadedRef.current) return;

    const loadContent = (): void => {
      if (content && content.trim() !== "") {
        try {
          const blocks = editor.tryParseMarkdownToBlocks(content);
          if (blocks.length > 0) {
            editor.replaceBlocks(editor.document, blocks);
          }
        } catch (error) {
          // Fallback: just show the raw text if parsing fails
          console.warn("BlockNotePreview: Failed to parse content:", error);
        }
      }
      contentLoadedRef.current = true;
      lastContentRef.current = content;
      setIsReady(true);
    };

    loadContent();
  }, [editor, content]);

  // Determine theme
  const theme =
    themeProp ??
    (typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme-mode") === "light"
      ? "light"
      : "dark");

  // Line clamp class
  const lineClampClass =
    maxLines <= 6 ? `line-clamp-${String(maxLines)}` : `line-clamp-${String(maxLines)}`;

  // Type assertion for BlockNote's complex generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const typedEditor = editor as any;

  return (
    <div
      ref={wrapperRef}
      className={`blocknote-themed blocknote-preview-wrapper ${lineClampClass} ${className} ${!isReady ? "opacity-0" : "opacity-100"} transition-opacity duration-100`}
      data-testid="blocknote-preview"
    >
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      <BlockNoteView editor={typedEditor} editable={false} theme={theme} />
      {codeBlockToolbars}
    </div>
  );
}

export default BlockNotePreview;
