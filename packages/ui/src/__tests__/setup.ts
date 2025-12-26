import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import { expect, vi } from "vitest";

expect.extend(matchers);

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => {}, // Deprecated
      removeListener: (): void => {}, // Deprecated
      addEventListener: (): void => {},
      removeEventListener: (): void => {},
      dispatchEvent: (): boolean => false,
    }) as unknown as MediaQueryList,
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// Mock react-force-graph-3d to avoid WebGL/Three.js issues
vi.mock("react-force-graph-3d", () => ({
  default: (): React.ReactElement =>
    React.createElement("div", { "data-testid": "force-graph-3d" }, "ForceGraph3D"),
}));

// Mock @blocknote/react and @blocknote/mantine to avoid complex editor initialization
vi.mock("@blocknote/react", () => ({
  useCreateBlockNote: (): { document: []; replaceBlocks: unknown } => ({
    document: [],
    replaceBlocks: vi.fn(),
  }),
}));

vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: (): React.ReactElement =>
    React.createElement("div", { "data-testid": "blocknote-editor" }, "BlockNote Editor"),
}));

// Mock BlockNoteEditor/Viewer components to simplify testing
vi.mock("../components/editor/BlockNoteEditor", () => ({
  BlockNoteEditor: (): React.ReactElement =>
    React.createElement("div", { "data-testid": "blocknote-editor" }, "Mock BlockNote Editor"),
}));

vi.mock("../components/editor/BlockNoteViewer", () => ({
  BlockNoteViewer: ({ content }: { content: string }): React.ReactElement =>
    React.createElement("div", { "data-testid": "blocknote-viewer" }, content),
}));
