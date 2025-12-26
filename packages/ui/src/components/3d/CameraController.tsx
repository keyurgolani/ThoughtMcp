/**
 * CameraController Component
 *
 * Manages camera controls for the Memory Exploration UI.
 * Supports first-person (fly) mode with PointerLockControls
 * and orbit mode with OrbitControls.
 *
 * Requirements: 1.6, 12.1, 12.2
 */

import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControlsConfig, ViewMode } from '@types';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface CameraControllerProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Target position for orbit mode */
  target?: [number, number, number];
  /** Whether controls are enabled */
  enabled?: boolean;
  /** Callback when camera moves */
  onCameraMove?: () => void;
  /** Controls configuration overrides */
  config?: Partial<CameraControlsConfig>;
  /** Enable idle camera drift (Requirements 34.6) */
  enableIdleDrift?: boolean;
  /** Enable auto-rotation when idle (Requirements 34.6) */
  enableAutoRotation?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CameraControlsConfig = {
  enableDamping: true,
  dampingFactor: 0.05,
  rotateSpeed: 0.5,
  minDistance: 2,
  maxDistance: 50,
};

// ============================================================================
// Idle Camera Behavior Constants (Requirements 34.6)
// ============================================================================

/** Time in seconds before camera is considered idle */
const IDLE_TIMEOUT = 3;

/** Subtle drift amplitude */
const DRIFT_AMPLITUDE = 0.02;

/** Drift speed */
const DRIFT_SPEED = 0.3;

/** Breathing effect amplitude */
const BREATHING_AMPLITUDE = 0.01;

/** Breathing speed */
const BREATHING_SPEED = 0.5;

/** Auto-rotation speed (radians per second) */
const AUTO_ROTATION_SPEED = 0.05;

// ============================================================================
// Pointer Lock Support Detection
// ============================================================================

/**
 * Check if the Pointer Lock API is supported by the browser
 */
function isPointerLockSupported(): boolean {
  return (
    'pointerLockElement' in document ||
    'mozPointerLockElement' in document ||
    'webkitPointerLockElement' in document
  );
}

// ============================================================================
// First-Person Controls Component
// ============================================================================

interface FirstPersonControlsProps {
  enabled: boolean;
  onCameraMove?: (() => void) | undefined;
  /** Callback when pointer lock state changes */
  onPointerLockChange?: (isLocked: boolean) => void;
  /** Callback when pointer lock fails */
  onPointerLockError?: (error: string) => void;
}

function FirstPersonControls({
  enabled,
  onCameraMove,
  onPointerLockChange,
  onPointerLockError,
}: FirstPersonControlsProps): React.ReactElement | null {
  const { camera, gl } = useThree();
  const reducedMotion = prefersReducedMotion();
  const [pointerLockSupported] = useState(() => isPointerLockSupported());

  // Movement state
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Mouse movement for fallback mode
  const mouseState = useRef({
    isMouseDown: false,
    lastX: 0,
    lastY: 0,
  });

  // Movement speed
  const moveSpeed = reducedMotion ? 0 : 5;
  const lookSpeed = 0.002;

  // Handle pointer lock state changes (Requirement 12.1)
  useEffect(() => {
    if (!enabled) return;

    const handleLockChange = (): void => {
      const locked =
        document.pointerLockElement === gl.domElement ||
        (document as Document & { mozPointerLockElement?: Element }).mozPointerLockElement ===
          gl.domElement ||
        (document as Document & { webkitPointerLockElement?: Element }).webkitPointerLockElement ===
          gl.domElement;

      onPointerLockChange?.(locked);
    };

    const handleLockError = (): void => {
      console.warn('Pointer lock error - falling back to drag-to-look mode');
      onPointerLockError?.('Pointer lock failed. Use click-and-drag to look around.');
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mozpointerlockchange', handleLockChange);
    document.addEventListener('webkitpointerlockchange', handleLockChange);
    document.addEventListener('pointerlockerror', handleLockError);
    document.addEventListener('mozpointerlockerror', handleLockError);
    document.addEventListener('webkitpointerlockerror', handleLockError);

    return (): void => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mozpointerlockchange', handleLockChange);
      document.removeEventListener('webkitpointerlockchange', handleLockChange);
      document.removeEventListener('pointerlockerror', handleLockError);
      document.removeEventListener('mozpointerlockerror', handleLockError);
      document.removeEventListener('webkitpointerlockerror', handleLockError);
    };
  }, [enabled, gl.domElement, onPointerLockChange, onPointerLockError]);

  // Fallback mouse controls for browsers without pointer lock support
  useEffect(() => {
    if (!enabled || pointerLockSupported) return;

    const handleMouseDown = (event: MouseEvent): void => {
      if (event.button === 0) {
        // Left click
        mouseState.current.isMouseDown = true;
        mouseState.current.lastX = event.clientX;
        mouseState.current.lastY = event.clientY;
      }
    };

    const handleMouseUp = (): void => {
      mouseState.current.isMouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent): void => {
      if (!mouseState.current.isMouseDown) return;

      const deltaX = event.clientX - mouseState.current.lastX;
      const deltaY = event.clientY - mouseState.current.lastY;

      mouseState.current.lastX = event.clientX;
      mouseState.current.lastY = event.clientY;

      // Rotate camera based on mouse movement
      camera.rotation.y -= deltaX * lookSpeed;
      camera.rotation.x -= deltaY * lookSpeed;

      // Clamp vertical rotation
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return (): void => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, pointerLockSupported, camera, gl.domElement, lookSpeed]);

  // Handle keyboard input
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveState.current.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveState.current.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveState.current.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveState.current.right = true;
        break;
      case 'Space':
        moveState.current.up = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        moveState.current.down = true;
        break;
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        moveState.current.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        moveState.current.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        moveState.current.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        moveState.current.right = false;
        break;
      case 'Space':
        moveState.current.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        moveState.current.down = false;
        break;
    }
  }, []);

  // Set up keyboard listeners
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  // Update camera position based on movement
  useFrame((_, delta) => {
    if (!enabled || reducedMotion) return;

    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get camera direction
    camera.getWorldDirection(direction);
    right.crossVectors(direction, camera.up).normalize();

    let moved = false;

    if (moveState.current.forward) {
      camera.position.addScaledVector(direction, moveSpeed * delta);
      moved = true;
    }
    if (moveState.current.backward) {
      camera.position.addScaledVector(direction, -moveSpeed * delta);
      moved = true;
    }
    if (moveState.current.left) {
      camera.position.addScaledVector(right, -moveSpeed * delta);
      moved = true;
    }
    if (moveState.current.right) {
      camera.position.addScaledVector(right, moveSpeed * delta);
      moved = true;
    }
    if (moveState.current.up) {
      camera.position.y += moveSpeed * delta;
      moved = true;
    }
    if (moveState.current.down) {
      camera.position.y -= moveSpeed * delta;
      moved = true;
    }

    if (moved && onCameraMove !== undefined) {
      onCameraMove();
    }
  });

  if (!enabled) return null;

  // Only use PointerLockControls if supported, otherwise fallback is handled above
  if (pointerLockSupported) {
    return <PointerLockControls args={[camera, gl.domElement]} />;
  }

  // Fallback: no PointerLockControls, mouse drag handled in useEffect above
  return null;
}

// ============================================================================
// Orbit Controls Component
// ============================================================================

interface OrbitControlsWrapperProps {
  enabled: boolean;
  target: [number, number, number];
  config: CameraControlsConfig;
  onCameraMove?: (() => void) | undefined;
}

function OrbitControlsWrapper({
  enabled,
  target,
  config,
  onCameraMove,
}: OrbitControlsWrapperProps): React.ReactElement | null {
  const reducedMotion = prefersReducedMotion();

  if (!enabled) return null;

  // Create a stable onChange handler
  const handleChange = onCameraMove
    ? (): void => {
        onCameraMove();
      }
    : undefined;

  return (
    <OrbitControls
      target={target}
      enableDamping={reducedMotion ? false : config.enableDamping}
      dampingFactor={config.dampingFactor}
      rotateSpeed={config.rotateSpeed}
      minDistance={config.minDistance}
      maxDistance={config.maxDistance}
      enablePan={true}
      enableZoom={true}
      // makeDefault=false ensures OrbitControls doesn't capture all pointer events
      // This allows click events to propagate to 3D objects for node selection (Requirements 4.1, 12.2)
      makeDefault={false}
      // Configure mouse buttons for orbit controls
      // Left mouse for rotate, middle for zoom, right for pan
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      enableRotate={true}
      {...(handleChange && { onChange: handleChange })}
    />
  );
}

// ============================================================================
// Idle Camera Behavior Component (Requirements 34.6)
// ============================================================================

interface IdleCameraBehaviorProps {
  enabled: boolean;
  enableDrift: boolean;
  enableAutoRotation: boolean;
  onActivity: () => void;
}

function IdleCameraBehavior({
  enabled,
  enableDrift,
  enableAutoRotation,
  onActivity,
}: IdleCameraBehaviorProps): null {
  const { camera } = useThree();
  const reducedMotion = prefersReducedMotion();
  const lastActivityRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const basePositionRef = useRef<THREE.Vector3 | null>(null);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = (): void => {
      lastActivityRef.current = Date.now();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        basePositionRef.current = null;
        onActivity();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('wheel', handleActivity);

    return (): void => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, [enabled, onActivity]);

  // Apply idle camera effects
  useFrame((state) => {
    if (!enabled || reducedMotion) return;

    const timeSinceActivity = (Date.now() - lastActivityRef.current) / 1000;

    // Check if camera should be idle
    if (timeSinceActivity > IDLE_TIMEOUT) {
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        basePositionRef.current = camera.position.clone();
      }

      const time = state.clock.elapsedTime;

      // Apply subtle drift effect
      if (enableDrift && basePositionRef.current) {
        const driftX = Math.sin(time * DRIFT_SPEED) * DRIFT_AMPLITUDE;
        const driftY = Math.cos(time * DRIFT_SPEED * 0.7) * DRIFT_AMPLITUDE;

        // Breathing effect (subtle forward/back movement)
        const breathing = Math.sin(time * BREATHING_SPEED) * BREATHING_AMPLITUDE;

        camera.position.x = basePositionRef.current.x + driftX;
        camera.position.y = basePositionRef.current.y + driftY;
        camera.position.z = basePositionRef.current.z + breathing;
      }

      // Apply auto-rotation (very subtle)
      if (enableAutoRotation) {
        camera.rotation.y += AUTO_ROTATION_SPEED * 0.01;
      }
    }
  });

  return null;
}

// ============================================================================
// Main Camera Controller Component
// ============================================================================

export function CameraController({
  viewMode,
  target = [0, 0, 0],
  enabled = true,
  onCameraMove,
  config: configOverrides = {},
  enableIdleDrift = true,
  enableAutoRotation = false,
}: CameraControllerProps): React.ReactElement | null {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };

  // Determine which controls to use based on view mode
  const useFlyMode = viewMode === 'fly';
  const useOrbitMode = viewMode === 'orbit' || viewMode === 'timeline' || viewMode === 'cluster';

  // Handle activity callback for idle behavior
  const handleActivity = useCallback(() => {
    onCameraMove?.();
  }, [onCameraMove]);

  return (
    <>
      {/* Idle camera behavior for ambient movement (Requirements 34.6) */}
      <IdleCameraBehavior
        enabled={enabled && useOrbitMode}
        enableDrift={enableIdleDrift}
        enableAutoRotation={enableAutoRotation}
        onActivity={handleActivity}
      />

      {/* First-person controls for fly mode (Requirement 12.1) */}
      {useFlyMode && <FirstPersonControls enabled={enabled} onCameraMove={onCameraMove} />}

      {/* Orbit controls for orbit/timeline/cluster modes (Requirement 12.2) */}
      {useOrbitMode && (
        <OrbitControlsWrapper
          enabled={enabled}
          target={target}
          config={config}
          onCameraMove={onCameraMove}
        />
      )}
    </>
  );
}

export default CameraController;
