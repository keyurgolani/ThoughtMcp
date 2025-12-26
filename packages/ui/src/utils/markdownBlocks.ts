/**
 * Markdown-Block Conversion Utilities
 *
 * Provides standalone utilities for converting between markdown and BlockNote blocks.
 * Uses BlockNote's ServerBlockNoteEditor for headless operations (BlockNote 0.45+).
 *
 * Requirements: 8.2, 8.3
 */

import type { Block, PartialBlock } from "@blocknote/core";
import { ServerBlockNoteEditor } from "@blocknote/server-util";

// ============================================================================
// Types
// ============================================================================

/**
 * Block type from BlockNote - represents a single block in the editor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockNoteBlock = Block<any, any, any>;

/**
 * Partial block type for creating/updating blocks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PartialBlockNoteBlock = PartialBlock<any, any, any>;

/**
 * Options for markdown conversion
 */
export interface MarkdownConversionOptions {
  /** Whether to trim whitespace from the result */
  trim?: boolean;
}

// ============================================================================
// Headless Editor Instance
// ============================================================================

// Singleton headless editor for performance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let headlessEditor: ServerBlockNoteEditor<any, any, any> | null = null;

/**
 * Gets or creates the singleton headless editor instance.
 * Using a singleton avoids creating multiple editor instances for repeated conversions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHeadlessEditor(): ServerBlockNoteEditor<any, any, any> {
  if (!headlessEditor) {
    headlessEditor = ServerBlockNoteEditor.create();
  }
  return headlessEditor;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts a markdown string to BlockNote blocks.
 *
 * Uses BlockNote's built-in markdown parsing to convert markdown content
 * into an array of blocks that can be used in the editor.
 *
 * Requirements: 8.2, 8.5
 *
 * @param markdown - The markdown string to convert
 * @param options - Optional conversion options
 * @returns Promise resolving to an array of BlockNote blocks
 *
 * @example
 * ```typescript
 * const blocks = await markdownToBlocks("# Hello\n\nThis is **bold** text.");
 * // Returns blocks for heading and paragraph
 * ```
 */
export async function markdownToBlocks(
  markdown: string,
  options: MarkdownConversionOptions = {}
): Promise<BlockNoteBlock[]> {
  // Handle empty input
  if (!markdown) {
    return [];
  }

  const shouldTrim = options.trim === true;
  const content = shouldTrim ? markdown.trim() : markdown;

  if (content === "") {
    return [];
  }

  try {
    const editor = getHeadlessEditor();
    const blocks = await editor.tryParseMarkdownToBlocks(content);
    return blocks;
  } catch (error) {
    console.warn("Failed to parse markdown to blocks:", error);
    // Return a single paragraph block with the raw content as fallback
    return [
      {
        type: "paragraph",
        content: [{ type: "text", text: content, styles: {} }],
      } as BlockNoteBlock,
    ];
  }
}

/**
 * Converts BlockNote blocks to a markdown string.
 *
 * Uses BlockNote's built-in markdown serialization to convert blocks
 * back into markdown format. This is a "lossy" conversion as some
 * block-specific features may not have markdown equivalents.
 *
 * Requirements: 8.3, 8.6
 *
 * @param blocks - The array of BlockNote blocks to convert
 * @param options - Optional conversion options
 * @returns Promise resolving to a markdown string
 *
 * @example
 * ```typescript
 * const markdown = await blocksToMarkdown(blocks);
 * // Returns "# Hello\n\nThis is **bold** text."
 * ```
 */
export async function blocksToMarkdown(
  blocks: PartialBlockNoteBlock[],
  options: MarkdownConversionOptions = {}
): Promise<string> {
  // Handle empty input
  if (blocks.length === 0) {
    return "";
  }

  try {
    const editor = getHeadlessEditor();
    const markdown = await editor.blocksToMarkdownLossy(blocks);
    const shouldTrim = options.trim === true;
    return shouldTrim ? markdown.trim() : markdown;
  } catch (error) {
    console.warn("Failed to convert blocks to markdown:", error);
    // Return empty string as fallback
    return "";
  }
}

/**
 * Converts BlockNote blocks to HTML string.
 *
 * Uses BlockNote's built-in HTML serialization to convert blocks
 * to HTML format suitable for rendering.
 *
 * @param blocks - The array of BlockNote blocks to convert
 * @returns Promise resolving to an HTML string
 */
export async function blocksToHTML(blocks: PartialBlockNoteBlock[]): Promise<string> {
  if (blocks.length === 0) {
    return "";
  }

  try {
    const editor = getHeadlessEditor();
    const html = await editor.blocksToHTMLLossy(blocks);
    return html;
  } catch (error) {
    console.warn("Failed to convert blocks to HTML:", error);
    return "";
  }
}

/**
 * Converts HTML string to BlockNote blocks.
 *
 * Uses BlockNote's built-in HTML parsing to convert HTML content
 * into an array of blocks.
 *
 * @param html - The HTML string to convert
 * @returns Promise resolving to an array of BlockNote blocks
 */
export async function htmlToBlocks(html: string): Promise<BlockNoteBlock[]> {
  if (!html || html.trim() === "") {
    return [];
  }

  try {
    const editor = getHeadlessEditor();
    const blocks = await editor.tryParseHTMLToBlocks(html);
    return blocks;
  } catch (error) {
    console.warn("Failed to parse HTML to blocks:", error);
    return [];
  }
}

/**
 * Performs a round-trip conversion: markdown → blocks → markdown.
 *
 * Useful for normalizing markdown content through BlockNote's parser.
 * Note: This may result in slightly different markdown due to the
 * lossy nature of the conversion.
 *
 * Requirements: 8.2, 8.3
 *
 * @param markdown - The markdown string to normalize
 * @returns Promise resolving to the normalized markdown string
 *
 * @example
 * ```typescript
 * const normalized = await normalizeMarkdown("# Hello\nWorld");
 * // May return "# Hello\n\nWorld" with normalized spacing
 * ```
 */
export async function normalizeMarkdown(markdown: string): Promise<string> {
  const blocks = await markdownToBlocks(markdown);
  return blocksToMarkdown(blocks);
}

/**
 * Checks if a string contains valid markdown that can be parsed.
 *
 * @param markdown - The string to check
 * @returns Promise resolving to true if the markdown is valid
 */
export async function isValidMarkdown(markdown: string): Promise<boolean> {
  if (markdown.trim() === "") {
    return true; // Empty string is valid
  }

  try {
    const blocks = await markdownToBlocks(markdown);
    return blocks.length > 0;
  } catch {
    return false;
  }
}

/**
 * Resets the headless editor instance.
 * Useful for testing or when you need a fresh editor state.
 */
export function resetHeadlessEditor(): void {
  headlessEditor = null;
}
