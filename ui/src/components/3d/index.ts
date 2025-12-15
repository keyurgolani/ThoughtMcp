/**
 * 3D Components Module Exports
 *
 * Re-exports all 3D scene components for the Memory Exploration UI.
 */

export { MemoryExplorerScene } from './MemoryExplorerScene';
export type { MemoryExplorerSceneFullProps } from './MemoryExplorerScene';

export { CameraController } from './CameraController';
export type { CameraControllerProps } from './CameraController';

export { AmbientParticles } from './AmbientParticles';
export type { AmbientParticlesProps } from './AmbientParticles';

export { MemoryNode3D } from './MemoryNode3D';
export type { MemoryNode3DProps } from './MemoryNode3D';

export { Edge3D } from './Edge3D';
export type { Edge3DProps } from './Edge3D';

// Neural network visual style components (Requirements: 25.1-25.6)
export { NeuronNode3D } from './NeuronNode3D';
export type { NeuronNode3DProps } from './NeuronNode3D';

export { AxonEdge3D } from './AxonEdge3D';
export type { AxonEdge3DProps } from './AxonEdge3D';

export { WarpEffect } from './WarpEffect';
export type { WarpEffectProps } from './WarpEffect';

export { LODMemoryNode } from './LODMemoryNode';
export type { LODMemoryNodeProps } from './LODMemoryNode';

export { InstancedNodes, graphNodesToInstancedData } from './InstancedNodes';
export type { InstancedNodeData, InstancedNodesProps } from './InstancedNodes';

export { ClusterNode } from './ClusterNode';
export type { ClusterNodeProps } from './ClusterNode';

export { WarpNavigator } from './WarpNavigator';
export type { WarpNavigatorProps } from './WarpNavigator';

// Node-to-panel transformation component (Requirements: 26.1-26.6)
export { ExpandedNodePanel } from './ExpandedNodePanel';
export type { ExpandedNodePanelProps } from './ExpandedNodePanel';

// Background atmosphere components (Requirements: 34.3, 1.7)
export { StarField } from './StarField';
export type { StarFieldProps } from './StarField';

export { NebulaBg } from './NebulaBg';
export type { NebulaBgProps } from './NebulaBg';

// Connection badge component (Requirements: 39.1)
export { ConnectionBadge3D, getHubThreshold, isHubNode } from './ConnectionBadge3D';
export type { ConnectionBadge3DProps } from './ConnectionBadge3D';
