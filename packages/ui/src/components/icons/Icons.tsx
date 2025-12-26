/**
 * Icons Component
 *
 * Centralized icon library using Lucide React icons.
 * Replaces emoji usage throughout the UI with professional, consistent icons.
 */

import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  Cog,
  Compass,
  Dna,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Heart,
  Layers,
  Lightbulb,
  Link2,
  MessageCircle,
  Microscope,
  Palette,
  Puzzle,
  RefreshCw,
  Ruler,
  Scale,
  Search,
  Sparkles,
  Star,
  Target,
  TreeDeciduous,
  TrendingUp,
  XCircle,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ReactElement } from "react";

// ============================================================================
// Types
// ============================================================================

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

export interface IconProps extends Omit<LucideProps, "size"> {
  size?: IconSize;
}

// ============================================================================
// Size Mapping
// ============================================================================

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 32,
  "4xl": 40,
};

// ============================================================================
// Sector Icons
// ============================================================================

export function EpisodicIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Calendar size={SIZE_MAP[size]} {...props} />;
}

export function SemanticIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <BookOpen size={SIZE_MAP[size]} {...props} />;
}

export function ProceduralIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Cog size={SIZE_MAP[size]} {...props} />;
}

export function EmotionalIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Heart size={SIZE_MAP[size]} {...props} />;
}

export function ReflectiveIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Sparkles size={SIZE_MAP[size]} {...props} />;
}

export function DefaultSectorIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <FileText size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Action Icons
// ============================================================================

export function QuickActionsIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Zap size={SIZE_MAP[size]} {...props} />;
}

export function RecentMemoriesIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <ClipboardList size={SIZE_MAP[size]} {...props} />;
}

export function MemoriesIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Brain size={SIZE_MAP[size]} {...props} />;
}

export function ConnectionsIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Link2 size={SIZE_MAP[size]} {...props} />;
}

export function HubNodesIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Star size={SIZE_MAP[size]} {...props} />;
}

export function ThisWeekIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Calendar size={SIZE_MAP[size]} {...props} />;
}

export function StatsIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <BarChart3 size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Navigation Icons
// ============================================================================

export function ExplorerIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Layers size={SIZE_MAP[size]} {...props} />;
}

export function ReasoningIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <MessageCircle size={SIZE_MAP[size]} {...props} />;
}

export function FrameworkIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <BarChart3 size={SIZE_MAP[size]} {...props} />;
}

export function DecomposeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Search size={SIZE_MAP[size]} {...props} />;
}

export function BiasIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Scale size={SIZE_MAP[size]} {...props} />;
}

export function EmotionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Heart size={SIZE_MAP[size]} {...props} />;
}

export function GraphIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Globe size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Suggested Action Icons
// ============================================================================

export function ExploreActionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Compass size={SIZE_MAP[size]} {...props} />;
}

export function ReasonActionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <MessageCircle size={SIZE_MAP[size]} {...props} />;
}

export function AnalyzeActionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Search size={SIZE_MAP[size]} {...props} />;
}

export function ConnectActionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Link2 size={SIZE_MAP[size]} {...props} />;
}

export function SuggestionIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Lightbulb size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Framework Icons
// ============================================================================

export function ScientificMethodIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Microscope size={SIZE_MAP[size]} {...props} />;
}

export function DesignThinkingIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Palette size={SIZE_MAP[size]} {...props} />;
}

export function SystemsThinkingIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <RefreshCw size={SIZE_MAP[size]} {...props} />;
}

export function CriticalThinkingIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Brain size={SIZE_MAP[size]} {...props} />;
}

export function CreativeProblemSolvingIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Lightbulb size={SIZE_MAP[size]} {...props} />;
}

export function RootCauseAnalysisIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Search size={SIZE_MAP[size]} {...props} />;
}

export function FirstPrinciplesIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Puzzle size={SIZE_MAP[size]} {...props} />;
}

export function ScenarioPlanningIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Eye size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Reasoning Mode Icons
// ============================================================================

export function AnalyticalModeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Microscope size={SIZE_MAP[size]} {...props} />;
}

export function CreativeModeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Palette size={SIZE_MAP[size]} {...props} />;
}

export function CriticalModeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Search size={SIZE_MAP[size]} {...props} />;
}

export function SyntheticModeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Link2 size={SIZE_MAP[size]} {...props} />;
}

export function ParallelModeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <MessageCircle size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Status Icons
// ============================================================================

export function SuccessIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <CheckCircle2 size={SIZE_MAP[size]} {...props} />;
}

export function ErrorIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <XCircle size={SIZE_MAP[size]} {...props} />;
}

export function WarningIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <AlertCircle size={SIZE_MAP[size]} {...props} />;
}

export function LoadingIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Clock size={SIZE_MAP[size]} {...props} />;
}

export function TrendUpIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <TrendingUp size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Severity/Complexity Icons
// ============================================================================

export function HighSeverityIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <CircleDot size={SIZE_MAP[size]} className="text-red-500" {...props} />;
}

export function MediumSeverityIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <CircleDot size={SIZE_MAP[size]} className="text-yellow-500" {...props} />;
}

export function LowSeverityIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <CircleDot size={SIZE_MAP[size]} className="text-green-500" {...props} />;
}

// ============================================================================
// Empty State Icons
// ============================================================================

export function EmptyMemoriesIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Star size={SIZE_MAP[size]} {...props} />;
}

export function EmptyBrainIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Brain size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Misc Icons
// ============================================================================

export function NewMemoryIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <FileText size={SIZE_MAP[size]} {...props} />;
}

export function SearchIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Search size={SIZE_MAP[size]} {...props} />;
}

export function TargetIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Target size={SIZE_MAP[size]} {...props} />;
}

export function TreeIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <TreeDeciduous size={SIZE_MAP[size]} {...props} />;
}

export function RulerIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Ruler size={SIZE_MAP[size]} {...props} />;
}

export function DnaIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <Dna size={SIZE_MAP[size]} {...props} />;
}

export function GitBranchIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <GitBranch size={SIZE_MAP[size]} {...props} />;
}

export function ClipboardIcon({ size = "md", ...props }: IconProps): ReactElement {
  return <ClipboardList size={SIZE_MAP[size]} {...props} />;
}

// ============================================================================
// Export all icons for direct use
// ============================================================================

export {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  Cog,
  Compass,
  Dna,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Heart,
  Layers,
  Lightbulb,
  Link2,
  MessageCircle,
  Microscope,
  Palette,
  Puzzle,
  RefreshCw,
  Ruler,
  Scale,
  Search,
  Sparkles,
  Star,
  Target,
  TreeDeciduous,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
