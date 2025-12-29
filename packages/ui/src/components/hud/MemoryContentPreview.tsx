/**
 * MemoryContentPreview Component
 *
 * Renders a preview of memory content with basic markdown formatting.
 * Strips complex markdown and renders simple formatting for preview purposes.
 * Used in memory lists to show rendered content instead of raw markdown.
 */

import { useMemo, type ReactElement } from "react";

export interface MemoryContentPreviewProps {
  /** Raw markdown content */
  content: string;
  /** Maximum number of lines to show (default: 2) */
  maxLines?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Strips markdown syntax and returns plain text with basic formatting preserved
 */
function stripMarkdown(content: string): string {
  let text = content;

  // Remove code blocks (```...```)
  text = text.replace(/```[\s\S]*?```/g, "[code]");

  // Remove inline code (`...`)
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove headers (# ## ### etc)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold (**text** or __text__)
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // Remove italic (*text* or _text_)
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove strikethrough (~~text~~)
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Remove links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove wiki links [[id|text]] -> text
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Remove images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

  // Remove blockquotes (> text)
  text = text.replace(/^>\s+/gm, "");

  // Remove horizontal rules (---, ***, ___)
  text = text.replace(/^[-*_]{3,}$/gm, "");

  // Remove list markers (-, *, +, 1., 2., etc)
  text = text.replace(/^[\s]*[-*+]\s+/gm, "• ");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove task list markers ([ ] or [x])
  text = text.replace(/\[[ x]\]\s*/gi, "");

  // Collapse multiple newlines into single space
  text = text.replace(/\n+/g, " ");

  // Collapse multiple spaces
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

/**
 * MemoryContentPreview - Renders markdown content as plain text preview
 */
export function MemoryContentPreview({
  content,
  maxLines,
  className = "",
}: MemoryContentPreviewProps): ReactElement {
  const previewText = useMemo(() => {
    const stripped = stripMarkdown(content);
    // If maxLines is specified, limit to reasonable length for preview
    if (maxLines !== undefined) {
      const maxLength = maxLines * 80; // ~80 chars per line
      if (stripped.length > maxLength) {
        return stripped.substring(0, maxLength).trim() + "...";
      }
    }
    return stripped;
  }, [content, maxLines]);

  return (
    <span className={`memory-content-preview ${className}`} title={previewText}>
      {previewText}
    </span>
  );
}

export default MemoryContentPreview;
