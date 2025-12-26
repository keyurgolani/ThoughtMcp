import * as THREE from "three";

// From InstancedNodes.tsx
export const TEMP_OBJECT = new THREE.Object3D();
export const TEMP_COLOR = new THREE.Color();
export const TEMP_MATRIX = new THREE.Matrix4();

// From ConnectionStatus.tsx
export interface ConnectionStatusProps {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  className?: string;
}

// From SuggestedActions.tsx
export interface SuggestedActionsProps {
  className?: string;
  onActionClick?: (action: string) => void;
}

// From MainNavigation.tsx
export interface MainNavigationProps {
  className?: string;
}

// From PageTransition.tsx
export interface PageTransitionProps {
  children: React.ReactNode;
  location: string;
}

// From ConfidenceBiasDashboard.tsx
export interface ConfidenceBiasDashboardProps {
  className?: string;
}

// From FrameworkAnalysis.tsx
export interface FrameworkAnalysisProps {
  className?: string;
}
