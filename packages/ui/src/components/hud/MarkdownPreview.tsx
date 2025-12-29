/**
 * MarkdownPreview Component
 *
 * A lightweight markdown renderer optimized for card/row previews.
 * Renders markdown with proper line breaks while supporting line-clamp truncation.
 * Preserves paragraph structure and newlines for better readability.
 */

import { useMemo, type ReactElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================================================
// Types
// ============================================================================

export interface MarkdownPreviewProps {
  /** The markdown content to render */
  content: string;
  /** Maximum number of lines to display (uses line-clamp) */
  maxLines?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Content Sanitization
// ============================================================================

/**
 * Sanitizes content to fix common markdown rendering issues.
 *
 * Specifically handles:
 * 1. Lines wrapped in backticks that aren't actual code - removes the backticks
 * 2. Ensures consecutive lines with inline code render as separate code snippets
 */
function sanitizeContent(content: string): string {
  const lines = content.split("\n");
  const sanitizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? "";
    const trimmedLine = line.trim();

    // Check if line is wrapped in single backticks (not triple backticks for code blocks)
    if (
      trimmedLine.startsWith("`") &&
      trimmedLine.endsWith("`") &&
      !trimmedLine.startsWith("```") &&
      trimmedLine.length > 2
    ) {
      const innerContent = trimmedLine.slice(1, -1);

      // Heuristics to determine if this is actual code or just text wrapped in backticks
      const looksLikeProseOrDescription =
        /:\s/.test(innerContent) ||
        innerContent.split(/\s+/).length > 3 ||
        (/^[A-Z][a-z]/.test(innerContent) && innerContent.length > 20) ||
        /\b(from|with|all|only|both|every|the|and|or)\b/i.test(innerContent);

      const looksLikeCode =
        /[{}()[\];=<>]/.test(innerContent) ||
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(innerContent) ||
        /\.\w+\(/.test(innerContent) ||
        /^[./\\]/.test(innerContent) ||
        /[+\-*/]=/.test(innerContent);

      if (looksLikeProseOrDescription && !looksLikeCode) {
        const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
        line = leadingWhitespace + innerContent;
      } else {
        // This is actual code - add two trailing spaces for markdown hard line break
        const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
        line = leadingWhitespace + trimmedLine + "  ";
      }
    } else if (trimmedLine !== "" && !trimmedLine.startsWith("```")) {
      // For non-empty, non-code-fence lines, add trailing spaces for hard breaks
      line = line + "  ";
    }

    sanitizedLines.push(line);
  }

  return sanitizedLines.join("\n");
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MarkdownPreview - Lightweight markdown renderer for card previews
 *
 * Features:
 * - Renders markdown with proper line breaks preserved
 * - Works with line-clamp for truncation (when maxLines is specified)
 * - Preserves paragraph structure for readability
 * - Preserves basic formatting (bold, italic, code, links)
 * - Supports GFM tables and code blocks
 */
export function MarkdownPreview({
  content,
  maxLines,
  className = "",
}: MarkdownPreviewProps): ReactElement {
  // Sanitize content to fix common markdown issues
  const sanitizedContent = useMemo(() => sanitizeContent(content), [content]);

  // Line clamp class based on maxLines - only apply if maxLines is specified
  const lineClampClass = useMemo(() => {
    if (maxLines === undefined) return "";
    const clampMap: Record<number, string> = {
      1: "line-clamp-1",
      2: "line-clamp-2",
      3: "line-clamp-3",
      4: "line-clamp-4",
      5: "line-clamp-5",
      6: "line-clamp-6",
    };
    return clampMap[maxLines] ?? `line-clamp-${String(maxLines)}`;
  }, [maxLines]);

  return (
    <div className={`markdown-preview ${lineClampClass} ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Render paragraphs as block elements with proper line breaks
          p: ({ children }: { children?: ReactNode }) => <span className="block">{children}</span>,
          // Headings rendered as bold text with line breaks
          h1: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-bold">{children}</strong>
          ),
          h2: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-semibold">{children}</strong>
          ),
          h3: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-semibold">{children}</strong>
          ),
          h4: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-medium">{children}</strong>
          ),
          h5: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-medium">{children}</strong>
          ),
          h6: ({ children }: { children?: ReactNode }) => (
            <strong className="block font-medium">{children}</strong>
          ),
          // Tables - compact preview style
          table: ({ children }: { children?: ReactNode }) => (
            <span className="block overflow-x-auto my-1">
              <table className="text-xs border-collapse border border-ui-border/50 rounded">
                {children}
              </table>
            </span>
          ),
          thead: ({ children }: { children?: ReactNode }) => (
            <thead className="bg-ui-accent-primary/10">{children}</thead>
          ),
          tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
          tr: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
          th: ({ children }: { children?: ReactNode }) => (
            <th className="px-2 py-1 text-left font-semibold text-ui-accent-primary border border-ui-border/30">
              {children}
            </th>
          ),
          td: ({ children }: { children?: ReactNode }) => (
            <td className="px-2 py-1 text-ui-text-primary border border-ui-border/30">
              {children}
            </td>
          ),
          // Lists rendered with proper line breaks
          ul: ({ children }: { children?: ReactNode }) => <span className="block">{children}</span>,
          ol: ({ children }: { children?: ReactNode }) => <span className="block">{children}</span>,
          li: ({ children }: { children?: ReactNode }) => (
            <span className="block">• {children}</span>
          ),
          // Inline code styling
          code: ({
            className: codeClassName,
            children,
          }: {
            className?: string | undefined;
            children?: ReactNode;
          }) => {
            const isInline = codeClassName === undefined || codeClassName === "";
            if (isInline) {
              return (
                <code className="px-1 py-0.5 bg-ui-accent-primary/10 border border-ui-accent-primary/20 rounded text-ui-accent-primary text-[0.85em] font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="text-[0.85em] font-mono text-ui-text-primary whitespace-pre">
                {children}
              </code>
            );
          },
          // Code blocks - compact preview style with preserved whitespace
          pre: ({ children }: { children?: ReactNode }) => (
            <pre className="not-prose block bg-[var(--theme-surface)] rounded px-2 py-1 my-1 text-xs font-mono overflow-x-auto border border-[var(--theme-border)] whitespace-pre">
              {children}
            </pre>
          ),
          // Blockquotes rendered with italic and line break
          blockquote: ({ children }: { children?: ReactNode }) => (
            <em className="block italic text-ui-text-secondary">{children}</em>
          ),
          // Links with accent color
          a: ({ href, children }: { href?: string | undefined; children?: ReactNode }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-accent-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {children}
            </a>
          ),
          // Bold text
          strong: ({ children }: { children?: ReactNode }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Italic text
          em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
          // Horizontal rules - render as subtle separator (not visible in code blocks)
          hr: () => <hr className="border-ui-border/30 my-2" />,
          // Line breaks - actual line breaks
          br: () => <br />,
        }}
      >
        {sanitizedContent}
      </Markdown>
    </div>
  );
}

export default MarkdownPreview;
