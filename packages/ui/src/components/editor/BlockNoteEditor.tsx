/**
 * BlockNoteEditor Component
 *
 * A wrapper component for BlockNote that provides a Notion-style block editor
 * with markdown conversion support. Handles bidirectional conversion between
 * markdown and BlockNote's block format.
 *
 * Features (BlockNote 0.45+):
 * - Notion-style block editing with slash commands
 * - Built-in code blocks with syntax highlighting
 * - Markdown-to-blocks conversion on load
 * - Blocks-to-markdown conversion on save
 * - Support for headings, lists, code blocks, links, tables
 * - Toggle lists, callouts, and more block types
 * - Drag and drop block reordering
 * - Keyboard shortcuts for formatting
 *
 * Requirements: 8.1, 8.4, 8.5, 8.6
 */

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface BlockNoteEditorProps {
  /** Initial content as markdown string (Requirements: 8.5) */
  initialContent?: string;
  /** Callback when content changes, receives markdown string (Requirements: 8.6) */
  onChange?: (markdown: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus the editor on mount */
  autoFocus?: boolean;
  /** Theme mode - 'light' or 'dark' */
  theme?: "light" | "dark";
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BlockNoteEditor - A Notion-style block editor with markdown support
 *
 * This component wraps BlockNote to provide:
 * - Rich text editing with blocks (paragraphs, headings, lists, code, tables)
 * - Automatic markdown conversion on load and save
 * - Consistent styling with the Thought UI theme
 * - Built-in code block support with syntax highlighting
 * - Slash commands for quick block insertion
 * - Drag and drop block reordering
 *
 * Requirements: 8.1, 8.4, 8.5, 8.6
 */
export function BlockNoteEditor({
  initialContent = "",
  onChange,
  placeholder: _placeholder = "Start typing or press '/' for commands...",
  readOnly = false,
  className = "",
  autoFocus = false,
  theme = "dark",
}: BlockNoteEditorProps): React.ReactElement {
  // Track if initial content has been loaded
  const initialContentLoadedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Create the BlockNote editor instance with default schema (includes all built-in blocks)
  // BlockNote 0.45+ includes: paragraph, heading, bulletListItem, numberedListItem,
  // checkListItem, toggleListItem, codeBlock, table, image, video, audio, file, callout
  const editor = useCreateBlockNote({
    // Enable animations for smooth block transitions
    animations: true,
    // Use default styles for consistent appearance
    defaultStyles: true,
  });

  // Load initial content when editor is ready (Requirements: 8.5)
  useEffect(() => {
    if (initialContentLoadedRef.current) {
      return;
    }

    const loadInitialContent = (): void => {
      if (initialContent && initialContent.trim() !== "") {
        try {
          // Use BlockNote's built-in markdown parsing
          const blocks = editor.tryParseMarkdownToBlocks(initialContent);
          if (blocks.length > 0) {
            // Replace all blocks with the parsed content
            editor.replaceBlocks(editor.document, blocks);
          }
        } catch (error) {
          console.warn("Failed to load initial content:", error);
        }
      }
      initialContentLoadedRef.current = true;
      setIsReady(true);
    };

    loadInitialContent();
  }, [editor, initialContent]);

  // Handle content changes (Requirements: 8.6)
  const handleChange = useCallback(() => {
    if (!onChange || !isReady) {
      return;
    }

    try {
      // Use BlockNote's built-in markdown serialization
      const blocks = editor.document;
      const markdown = editor.blocksToMarkdownLossy(blocks);
      onChange(markdown);
    } catch (error) {
      console.warn("Failed to convert content to markdown:", error);
    }
  }, [editor, onChange, isReady]);

  // Auto-focus handling
  useEffect(() => {
    if (autoFocus && isReady) {
      // Focus the editor after a short delay to ensure it's fully mounted
      const timeoutId = setTimeout(() => {
        editor.focus();
      }, 100);
      return (): void => {
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [autoFocus, editor, isReady]);

  // Type assertion needed due to BlockNote's complex generic types
  // and exactOptionalPropertyTypes: true in tsconfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const typedEditor = editor as any;

  return (
    <div
      ref={wrapperRef}
      className={`blocknote-themed blocknote-editor-wrapper ${className}`}
      data-testid="blocknote-editor"
    >
      <BlockNoteView
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        editor={typedEditor}
        editable={!readOnly}
        onChange={() => {
          handleChange();
        }}
        theme={theme}
      />
    </div>
  );
}

export default BlockNoteEditor;
