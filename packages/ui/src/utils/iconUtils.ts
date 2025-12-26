import React, { ReactElement } from "react";
import type { IconSize } from "../components/icons/Icons";
import {
  DefaultSectorIcon,
  EmotionalIcon,
  EpisodicIcon,
  ProceduralIcon,
  ReflectiveIcon,
  SemanticIcon,
} from "../components/icons/Icons";

export type MemorySectorType = "episodic" | "semantic" | "procedural" | "emotional" | "reflective";

export function getSectorIcon(sector: string, size: IconSize = "md"): ReactElement {
  const props = { size };
  switch (sector) {
    case "episodic":
      return React.createElement(EpisodicIcon, props);
    case "semantic":
      return React.createElement(SemanticIcon, props);
    case "procedural":
      return React.createElement(ProceduralIcon, props);
    case "emotional":
      return React.createElement(EmotionalIcon, props);
    case "reflective":
      return React.createElement(ReflectiveIcon, props);
    default:
      return React.createElement(DefaultSectorIcon, props);
  }
}
