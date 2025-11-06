/**
 * Stream Synchronization Manager
 *
 * Manages real-time coordination and synchronization between reasoning streams
 */

import {
  ConflictDetection,
  ConflictResolution,
  CoordinationStatus,
  InformationSharing,
  IStreamSynchronizationManager,
  ReasoningStream,
  SynchronizationPoint,
} from "../interfaces/parallel-reasoning.js";

export class StreamSynchronizationManager
  implements IStreamSynchronizationManager
{
  private activeStreams: Map<string, ReasoningStream> = new Map();
  private synchronizationInterval: number = 1000; // 1 second default
  private synchronizationTimer?: NodeJS.Timeout;
  private coordinationStatus: CoordinationStatus;
  private informationSharingLog: InformationSharing[] = [];
  private synchronizationPoints: SynchronizationPoint[] = [];
  private conflictsDetected: ConflictDetection[] = [];
  private conflictsResolved: ConflictResolution[] = [];
  private initialized: boolean = false;

  constructor() {
    this.coordinationStatus = {
      active_streams: 0,
      synchronization_points: 0,
      conflicts_detected: 0,
      conflicts_resolved: 0,
      last_synchronization: 0,
      coordination_efficiency: 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize coordination status
    this.coordinationStatus = {
      active_streams: 0,
      synchronization_points: 0,
      conflicts_detected: 0,
      conflicts_resolved: 0,
      last_synchronization: Date.now(),
      coordination_efficiency: 1.0,
    };

    this.initialized = true;
  }

  async scheduleSynchronization(
    streams: ReasoningStream[],
    interval_ms: number
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Update active streams
    this.activeStreams.clear();
    for (const stream of streams) {
      this.activeStreams.set(stream.id, stream);
    }

    this.synchronizationInterval = interval_ms;
    this.coordinationStatus.active_streams = streams.length;

    // Clear existing timer
    if (this.synchronizationTimer) {
      clearInterval(this.synchronizationTimer);
    }

    // Schedule periodic synchronization
    this.synchronizationTimer = setInterval(async () => {
      try {
        await this.executeSynchronization(streams);
      } catch {
        // Synchronization error occurred
        this.coordinationStatus.coordination_efficiency *= 0.9; // Reduce efficiency on errors
      }
    }, interval_ms);
  }

  async executeSynchronization(
    streams: ReasoningStream[]
  ): Promise<SynchronizationPoint> {
    const timestamp = Date.now();
    const participating_streams = streams.map((s) => s.id);
    const shared_insights: string[] = [];

    // Gather insights from active streams
    for (const stream of streams) {
      const status = stream.getStatus();
      if (status.active && !status.processing) {
        shared_insights.push(
          `${stream.type} stream: ${
            status.last_activity > timestamp - this.synchronizationInterval
              ? "recently active"
              : "idle"
          }`
        );
      }
    }

    // Detect any conflicts that need attention
    const conflicts = await this.monitorConflicts(streams);
    if (conflicts.length > 0) {
      shared_insights.push(
        `${conflicts.length} conflicts detected requiring resolution`
      );
    }

    // Create synchronization point
    const synchronizationPoint: SynchronizationPoint = {
      timestamp,
      participating_streams,
      shared_insights,
      coordination_type:
        conflicts.length > 0 ? "conflict_resolution" : "information_exchange",
    };

    // Update tracking
    this.synchronizationPoints.push(synchronizationPoint);
    this.coordinationStatus.synchronization_points =
      this.synchronizationPoints.length;
    this.coordinationStatus.last_synchronization = timestamp;

    // Update coordination efficiency
    this.updateCoordinationEfficiency(streams, conflicts);

    return synchronizationPoint;
  }

  async enableRealTimeCoordination(streams: ReasoningStream[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Enable real-time coordination with frequent synchronization
    await this.scheduleSynchronization(streams, 500); // 500ms intervals for real-time

    // Set up information sharing channels
    for (const stream of streams) {
      this.activeStreams.set(stream.id, stream);
    }

    // Real-time coordination enabled
  }

  async shareInformation(
    from_stream: string,
    to_stream: string,
    information: string
  ): Promise<void> {
    const timestamp = Date.now();

    // Validate streams exist
    if ( !this.activeStreams.has(from_stream) || !this.activeStreams.has(to_stream)
    ) {
      throw new Error("Invalid stream IDs for information sharing");
    }

    // Create information sharing record
    const sharing: InformationSharing = {
      from_stream,
      to_stream,
      shared_information: information,
      information_type: this.classifyInformation(information),
      timestamp,
    };

    // Log the sharing
    this.informationSharingLog.push(sharing);

    // In a real implementation, this would actually pass information between streams
    // For now, we just log it
    // Information shared between streams
  }

  async monitorConflicts(
    streams: ReasoningStream[]
  ): Promise<ConflictDetection[]> {
    const conflicts: ConflictDetection[] = [];

    // Check for processing conflicts (streams taking too long)
    const processingStreams = streams.filter((s) => s.getStatus().processing);
    const longRunningStreams = processingStreams.filter((s) => {
      const status = s.getStatus();
      return (
        Date.now() - status.last_activity > this.synchronizationInterval * 5
      ); // 5x interval threshold
    });

    if (longRunningStreams.length > 0) {
      conflicts.push({
        stream_ids: longRunningStreams.map((s) => s.id),
        conflict_type: "reasoning",
        description: "Streams exceeding expected processing time",
        severity: 0.6,
      });
    }

    // Check for error conflicts
    const errorStreams = streams.filter((s) => s.getStatus().error);
    if (errorStreams.length > 0) {
      conflicts.push({
        stream_ids: errorStreams.map((s) => s.id),
        conflict_type: "reasoning",
        description: "Streams reporting errors",
        severity: 0.8,
      });
    }

    // Update tracking
    this.conflictsDetected.push(...conflicts);
    this.coordinationStatus.conflicts_detected = this.conflictsDetected.length;

    return conflicts;
  }

  async facilitateResolution(
    conflict: ConflictDetection,
    _streams: ReasoningStream[]
  ): Promise<ConflictResolution> {
    // Add to detected conflicts if not already present
    if (
      !this.conflictsDetected.some(
        (c) =>
          c.stream_ids.join(",") === conflict.stream_ids.join(",") &&
          c.description === conflict.description
      )
    ) {
      this.conflictsDetected.push(conflict);
      this.coordinationStatus.conflicts_detected =
        this.conflictsDetected.length;
    }
    let resolution_strategy: string;
    let resolved_conclusion: string;
    let confidence: number;

    switch (conflict.conflict_type) {
      case "reasoning":
        if (conflict.description.includes("processing time")) {
          resolution_strategy = "Timeout management and graceful degradation";
          resolved_conclusion =
            "Continue with available results, mark slow streams as degraded";
          confidence = 0.7;

          // Reset slow streams
          for (const streamId of conflict.stream_ids) {
            const stream = this.activeStreams.get(streamId);
            if (stream) {
              stream.reset();
            }
          }
        } else if (conflict.description.includes("errors")) {
          resolution_strategy = "Error recovery and stream restart";
          resolved_conclusion =
            "Restart error streams with fallback configuration";
          confidence = 0.6;

          // Attempt to restart error streams
          for (const streamId of conflict.stream_ids) {
            const stream = this.activeStreams.get(streamId);
            if (stream) {
              try {
                stream.reset();
                await stream.initialize();
              } catch {
                // Failed to restart stream
              }
            }
          }
        } else {
          resolution_strategy = "General conflict mediation";
          resolved_conclusion = "Apply standard conflict resolution protocols";
          confidence = 0.5;
        }
        break;

      default:
        resolution_strategy = "Default resolution protocol";
        resolved_conclusion = "Apply general conflict resolution approach";
        confidence = 0.4;
    }

    const resolution: ConflictResolution = {
      conflicting_streams: conflict.stream_ids,
      conflict_description: conflict.description,
      resolution_strategy,
      resolved_conclusion,
      confidence,
    };

    // Update tracking
    this.conflictsResolved.push(resolution);
    this.coordinationStatus.conflicts_resolved = this.conflictsResolved.length;

    return resolution;
  }

  getCoordinationStatus(): CoordinationStatus {
    return { ...this.coordinationStatus };
  }

  async shutdown(): Promise<void> {
    // Clear synchronization timer
    if (this.synchronizationTimer) {
      clearInterval(this.synchronizationTimer);
      this.synchronizationTimer = undefined;
    }

    // Clear active streams
    this.activeStreams.clear();

    // Reset status
    this.coordinationStatus = {
      active_streams: 0,
      synchronization_points: this.synchronizationPoints.length,
      conflicts_detected: this.conflictsDetected.length,
      conflicts_resolved: this.conflictsResolved.length,
      last_synchronization: this.coordinationStatus.last_synchronization,
      coordination_efficiency: this.coordinationStatus.coordination_efficiency,
    };

    this.initialized = false;
  }

  // Additional utility methods

  getSynchronizationHistory(): SynchronizationPoint[] {
    return [...this.synchronizationPoints];
  }

  getInformationSharingLog(): InformationSharing[] {
    return [...this.informationSharingLog];
  }

  getConflictHistory(): {
    detected: ConflictDetection[];
    resolved: ConflictResolution[];
  } {
    return {
      detected: [...this.conflictsDetected],
      resolved: [...this.conflictsResolved],
    };
  }

  private classifyInformation(
    information: string
  ): "insight" | "evidence" | "assumption" | "conclusion" {
    const lowerInfo = information.toLowerCase();

    if (lowerInfo.includes("insight") ?? lowerInfo.includes("understanding")) {
      return "insight";
    } else if (lowerInfo.includes("evidence") ?? lowerInfo.includes("data")) {
      return "evidence";
    } else if (lowerInfo.includes("assume") ?? lowerInfo.includes("premise")) {
      return "assumption";
    } else {
      return "conclusion";
    }
  }

  private updateCoordinationEfficiency(
    streams: ReasoningStream[],
    conflicts: ConflictDetection[]
  ): void {
    const activeStreamCount = streams.filter(
      (s) => s.getStatus().active
    ).length;
    const totalStreamCount = streams.length;
    const conflictSeverity = conflicts.reduce((sum, c) => sum + c.severity, 0);

    // Calculate efficiency based on active streams and conflict severity
    const activeRatio =
      totalStreamCount > 0 ? activeStreamCount / totalStreamCount : 0;
    const conflictPenalty = Math.min(0.5, conflictSeverity * 0.1);

    const newEfficiency = activeRatio - conflictPenalty;

    // Smooth the efficiency change
    this.coordinationStatus.coordination_efficiency =
      this.coordinationStatus.coordination_efficiency * 0.8 +
      newEfficiency * 0.2;

    // Ensure efficiency stays within bounds
    this.coordinationStatus.coordination_efficiency = Math.max(
      0,
      Math.min(1, this.coordinationStatus.coordination_efficiency)
    );
  }

  // Performance monitoring methods

  getAverageResponseTime(): number {
    if (this.synchronizationPoints.length < 2) {
      return 0;
    }

    const intervals = [];
    for (let i = 1; i < this.synchronizationPoints.length; i++) {
      const interval =
        this.synchronizationPoints[i].timestamp -
        this.synchronizationPoints[i - 1].timestamp;
      intervals.push(interval);
    }

    return (
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    );
  }

  getConflictResolutionRate(): number {
    if (this.conflictsDetected.length === 0) {
      return 1.0; // No conflicts is perfect resolution rate
    }

    return this.conflictsResolved.length / this.conflictsDetected.length;
  }

  getInformationSharingRate(): number {
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    const recentSharing = this.informationSharingLog.filter(
      (sharing) => now - sharing.timestamp < timeWindow
    );

    return recentSharing.length / (timeWindow / 1000); // Sharing per second
  }
}
