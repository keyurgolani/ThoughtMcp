import type { Response } from "express";

/**
 * Stream Manager
 * Handles Server-Sent Events (SSE) for reasoning streams.
 */
export class StreamManager {
  private static instance: StreamManager;
  private connections: Map<string, Response[]> = new Map();

  private constructor() {}

  static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  /**
   * Register a client connection to a stream
   */
  addConnection(streamId: string, res: Response): void {
    // Setup SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const conns = this.connections.get(streamId) ?? [];
    conns.push(res);
    this.connections.set(streamId, conns);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected", streamId })}\n\n`);

    res.on("close", () => {
      this.removeConnection(streamId, res);
    });
  }

  removeConnection(streamId: string, res: Response): void {
    const conns = this.connections.get(streamId);
    if (conns) {
      this.connections.set(
        streamId,
        conns.filter((c) => c !== res)
      );
    }
  }

  /**
   * Broadcast a token or event to all listeners of a stream
   */
  broadcast(
    streamId: string,
    data: { type: string; content?: string; metadata?: Record<string, unknown> }
  ): void {
    const conns = this.connections.get(streamId);
    if (conns) {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      conns.forEach((res) => {
        res.write(payload);
      });
    }
  }
}
