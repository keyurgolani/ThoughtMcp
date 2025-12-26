/**
 * 3D Components Module Exports
 *
 * Re-exports all 3D scene components for the Memory Exploration UI.
 */

export { MemoryGraphScene } from "./MemoryExplorerScene";
export type { MemoryGraphSceneFullProps } from "./MemoryExplorerScene";

export { CameraController } from "./CameraController";
export type { CameraControllerProps } from "./CameraController";

export { AmbientParticles } from "./AmbientParticles";
export type { AmbientParticlesProps } from "./AmbientParticles";

export { MemoryNode3D } from "./MemoryNode3D";
export type { MemoryNode3DProps } from "./MemoryNode3D";

export { Edge3D } from "./Edge3D";
export type { Edge3DProps } from "./Edge3D";

// Neural network visual style components (Requirements: 25.1-25.6)
export { NeuronNode3D } from "./NeuronNode3D";
export type { NeuronNode3DProps } from "./NeuronNode3D";

export { AxonEdge3D } from "./AxonEdge3D";
export type { AxonEdge3DProps } from "./AxonEdge3D";

export { WarpEffect } from "./WarpEffect";
export type { WarpEffectProps } from "./WarpEffect";

// Export utilities from graphUtils
export {
  getHubThreshold,
  graphNodesToInstancedData,
  isHubNode,
  type InstancedNodeData,
} from "../../utils/graphUtils";

export { LODMemoryNode } from "./LODMemoryNode";
export type { LODMemoryNodeProps } from "./LODMemoryNode";

export type { InstancedNodesProps } from "./InstancedNodes";

export { ClusterNode } from "./ClusterNode";
export type { ClusterNodeProps } from "./ClusterNode";

export type { WarpNavigatorProps } from "./WarpNavigator";

// Connection badge component (Requirements: 39.1)
export { ConnectionBadge3D } from "./ConnectionBadge3D";
export type { ConnectionBadge3DProps } from "./ConnectionBadge3D";
