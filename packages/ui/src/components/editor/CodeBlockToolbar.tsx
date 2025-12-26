/**
 * CodeBlockToolbar Component
 *
 * Toolbar injected into code blocks by CodeBlockEnhancer.
 * Provides copy, language display, and wrap toggle features.
 */

import { Check, Copy, WrapText } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export interface CodeBlockToolbarProps {
  codeBlock: HTMLElement;
  onRemove: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CodeBlockToolbar({
  codeBlock,
  onRemove,
}: CodeBlockToolbarProps): ReactElement | null {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [language, setLanguage] = useState<string>("text");
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Extract language from code block
  useEffect(() => {
    const detectLanguage = (): void => {
      // Try to find language from BlockNote's data attributes or class
      const langAttr = codeBlock.getAttribute("data-language");
      if (langAttr !== null && langAttr !== "") {
        setLanguage(langAttr);
        return;
      }

      // Check for language in select element (BlockNote's language selector)
      const select = codeBlock.querySelector("select");
      if (select && select.value) {
        setLanguage(select.value);
        return;
      }

      // Check code element classes for language hints
      const codeEl = codeBlock.querySelector("code");
      if (codeEl) {
        const classes = Array.from(codeEl.classList);
        const langClass = classes.find((c) => c.startsWith("language-") || c.startsWith("lang-"));
        if (langClass !== undefined) {
          setLanguage(langClass.replace(/^(language-|lang-)/, ""));
          return;
        }
      }

      setLanguage("text");
    };

    detectLanguage();

    // Watch for language changes
    const observer = new MutationObserver(detectLanguage);
    observer.observe(codeBlock, {
      attributes: true,
      attributeFilter: ["data-language"],
      subtree: true,
      childList: true,
    });

    return (): void => {
      observer.disconnect();
    };
  }, [codeBlock]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    const codeEl = codeBlock.querySelector("code, pre, textarea");
    const text = codeEl?.textContent ?? "";

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.warn("Failed to copy code:", err);
    }
  }, [codeBlock]);

  // Handle word wrap toggle
  const handleWordWrap = useCallback(() => {
    setWordWrap((prev) => {
      const next = !prev;
      const preEl = codeBlock.querySelector("pre");
      if (preEl) {
        preEl.style.whiteSpace = next ? "pre-wrap" : "pre";
        preEl.style.wordBreak = next ? "break-word" : "normal";
      }
      return next;
    });
  }, [codeBlock]);

  // Check if toolbar is still valid (attached to DOM)
  useEffect(() => {
    const checkValidity = (): void => {
      if (!document.contains(codeBlock)) {
        onRemove();
      }
    };

    const observer = new MutationObserver(checkValidity);
    if (codeBlock.parentElement) {
      observer.observe(codeBlock.parentElement, { childList: true });
    }

    return (): void => {
      observer.disconnect();
    };
  }, [codeBlock, onRemove]);

  // Render using portal to escape BlockNote's overflow:hidden or other constraints
  // Position it relative to the code block
  const [position, setPosition] = useState<{ top: number; right: number; width: number } | null>(
    null
  );

  useEffect(() => {
    const updatePosition = (): void => {
      const rect = codeBlock.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      setPosition({
        top: rect.top + scrollY,
        right: rect.right + scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    // Also update on resize observer for the code block
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(codeBlock);

    return (): void => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
      resizeObserver.disconnect();
    };
  }, [codeBlock]);

  if (!position) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className="code-block-toolbar" // Add class for potential global styling
      style={{
        position: "absolute",
        top: position.top + 8, // 8px from top
        left: position.right - 100, // Approximate width of toolbar from right edge
        zIndex: 50,
        display: "flex",
        gap: "0.25rem",
        padding: "0.25rem",
        backgroundColor: "rgba(30, 41, 59, 0.8)", // Slate-800 with opacity
        backdropFilter: "blur(4px)",
        borderRadius: "0.375rem",
        border: "1px solid rgba(148, 163, 184, 0.1)", // Slate-400 with low opacity
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        alignItems: "center",
        transform: "translateX(-100%)", // Anchor to right edge
      }}
      onMouseDown={(e: React.MouseEvent) => {
        // Prevent stealing focus from editor
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Language Badge */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "#94a3b8", // Slate-400
          fontWeight: 600,
          padding: "0 0.5rem",
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        {language}
      </div>

      <div style={{ width: "1px", height: "12px", backgroundColor: "rgba(148, 163, 184, 0.2)" }} />

      {/* Word Wrap Toggle */}
      <button
        onClick={handleWordWrap}
        title={wordWrap ? "Disable wrap" : "Enable wrap"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.25rem",
          borderRadius: "0.25rem",
          backgroundColor: wordWrap ? "rgba(59, 130, 246, 0.2)" : "transparent",
          color: wordWrap ? "#60a5fa" : "#94a3b8",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
          e.currentTarget.style.color = "#e2e8f0";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = wordWrap
            ? "rgba(59, 130, 246, 0.2)"
            : "transparent";
          e.currentTarget.style.color = wordWrap ? "#60a5fa" : "#94a3b8";
        }}
      >
        <WrapText size={14} />
      </button>

      {/* Copy Button */}
      <button
        onClick={() => {
          void handleCopy();
        }}
        title="Copy code"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.25rem",
          borderRadius: "0.25rem",
          backgroundColor: "transparent",
          color: copied ? "#4ade80" : "#94a3b8",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
          e.currentTarget.style.color = copied ? "#4ade80" : "#e2e8f0";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = copied ? "#4ade80" : "#94a3b8";
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>,
    document.body
  );
}
